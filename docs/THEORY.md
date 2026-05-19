# Theory of Operations

This document explains how `metalsmith-menu-plus` functions and why it is
built this way. Read it once before making non-trivial changes to the plugin.

---

## 1. The job

The plugin runs once per Metalsmith build and produces three pieces of
output from the `files` object:

1. A nested navigation tree, written to `metalsmith.metadata()[opts.metadataKey]`
   (default `navigation`). Each node has `{ title, path, navIndex, children }`.
2. Per-file URL and breadcrumb metadata, written onto each HTML file:
   - `file.urlPath` — the file's computed URL
   - `file.navigation.path` — same value, for active-state detection in templates
   - `file.navigation.breadcrumbs` — array of `{ title, path }` from root to this file
3. Nothing else. The plugin does not transform contents, generate files,
   write to disk, or emit assets.

Inputs the plugin actually reads:

- The Metalsmith `files` keys (treated as paths) and the file metadata
  (`title`, `draft`, `navigation.navLabel`, `navigation.navIndex`,
  `navigation.navExclude`).
- The user's options object.

The plugin operates **only on `.html` files**. Non-HTML entries in the
`files` object are ignored entirely — they get no `urlPath`, no breadcrumbs,
and do not appear in the navigation tree. Run this plugin after any
markdown-to-HTML conversion and before your layout plugin.

## 2. Architecture

```
src/
├── index.js                  # Entry point: options merge, .html filter,
│                             # orchestrates the pipeline, writes results
├── processors/
│   ├── index.js              # Re-exports
│   ├── navigation.js         # Tree build, find-by-path, sort
│   └── breadcrumbs.js        # Breadcrumb resolution per file
└── utils/
    ├── index.js              # Re-exports
    ├── paths.js              # All URL computation
    └── exclusions.js         # File exclusion rules
```

Everything is pure except the entry point, which is the only place that
mutates `files[*]` and `metalsmith.metadata()`. The processors take input,
return output. The utilities are stateless functions.

The plugin is **synchronous**. It does not accept a `done` callback;
Metalsmith treats two-argument plugins as either sync or promise-returning.
No I/O happens inside the plugin, so sync is sufficient and simpler.

## 3. Data flow

For a build with `usePermalinks: true`:

```
Object.keys(files)
       │
       ▼  filter to .html
   htmlPaths
       │
       ▼  shouldExclude() — drafts, navExclude, options.navExcludePatterns
   includedPaths
       │
       ▼  createNavigationStructure() — walks paths into a tree
   fullNavigation
       │
       ▼  sortNavigation() — resolves navIndex per item, sorts in place
   sorted fullNavigation
       │
       ├──▶ if opts.rootPath !== '/': findSectionByPath() ──▶ narrowed tree
       │
       ▼
   metalsmith.metadata()[opts.metadataKey] = navigation

   for each htmlPath:
       fileUrlPath(path, opts)  ──▶  file.urlPath, file.navigation.path
       findBreadcrumbs(urlPath, fullNavigation)  ──▶  file.navigation.breadcrumbs
```

Breadcrumbs are resolved against the **full** tree, not the narrowed
`rootPath` view — otherwise pages outside the configured section would
have no breadcrumb trail back to home.

The tree itself is built in two passes inside `createNavigationStructure`:

1. **Path-to-tree pass**: walk every included path's segments, materializing
   directory nodes on demand. Files attach to their parent directory's
   `__files` list; directories nest under their parent's `__dirs`.
2. **Tree-to-navItems pass**: `processTree` handles the root level (where
   directory names live as direct keys on the tree object); `processDirectory`
   recurses into nested directories. Both look for sibling `.html` files that
   match a subdirectory name and pair them.

## 4. Design invariants

- **All URL computation goes through `src/utils/paths.js`.** Any URL emitted
  by the plugin — tree node `path`, `file.urlPath`, breadcrumb entries —
  comes from `fileUrlPath`, `createPath`, `createChildPath`, or
  `createDirectoryPath`. Never build a URL by string concatenation outside
  this module.

- **`.html`-only filtering happens once, at the entry point.** Every
  function downstream of the filter assumes its input paths end in `.html`.
  Adding a code path that bypasses this filter would break the title and
  child-pairing logic.

- **Title resolution order is `navigation.navLabel` → `file.title` → raw
  filename.** The filename is used verbatim — no title-casing, no separator
  substitution. Users who want pretty labels set them in frontmatter.
  Enforced in `createNavItem` ([src/processors/navigation.js](../src/processors/navigation.js)).

- **`navIndex` resolution order is `item.navIndex` (frontmatter) →
  `options.navIndex[path]` → `Infinity` (nulls-last).** A single
  comparator in `sortNavigation` handles ordering; `lookupOptionsNavIndex`
  is the only place that consults `options.navIndex`. Frontmatter wins over
  options. No magic numbers.

- **Breadcrumbs always return an array.** `findBreadcrumbs` returns `[]`
  rather than `null` for unmatched paths so templates can iterate safely
  without null checks.

- **Sibling pairing works at any depth.** When a directory has a sibling
  `.html` file of the same name (e.g. `blog/posts.html` next to `blog/posts/`),
  the file becomes the nav item and the directory's children become its
  children. This is implemented in `processDirectory` and applies recursively;
  `processTree` does the equivalent at the root level.

## 5. Deliberate non-features

- **No automatic title prettification.** `about-us.html` becomes the title
  `about-us`, not `About Us`. Acronyms (`API`, `iOS`) defeat naive title
  casing in practice; frontmatter is the escape hatch and the plugin trusts
  it.

- **No CommonJS build.** The plugin is ESM-only. Users on CommonJS must
  use dynamic `import()` or migrate their project to ESM.

- **No support for non-HTML files in the navigation.** Markdown-to-HTML
  conversion is the caller's responsibility and must happen before this
  plugin runs. Supporting `.md`, `.markdown`, etc. would require
  per-extension title parsing and would duplicate concerns better handled
  upstream.

- **No way to disable draft filtering.** Files with `draft: true` are
  always excluded from the navigation. A user who wants drafts in the menu
  during preview builds should set `draft: false` in those builds or strip
  the flag with a separate plugin before this one runs.

- **No async / no I/O.** The plugin does not read files from disk, fetch
  anything, or yield to the event loop. If you find yourself wanting to
  add async work here, reconsider — it almost certainly belongs in a
  different plugin.

- **`createChildPath` ignores its first parameter.** The function takes
  `(path, name, parentDir, options)` for call-site symmetry with
  `createPath`, but `path` is unused; URL construction relies entirely on
  `parentDir` and `name`. Kept as-is for API stability.

## 6. Testing notes

Tests live in [test/index.js](../test/index.js) and run with the native
`node:test` runner (`node --test`). They use **real Metalsmith instances**
against fixture directories under `test/fixtures/`. The plugin's contract
is with Metalsmith itself, so we don't mock the framework — instead, each
test builds a small fixture site and runs the plugin in the real pipeline
via `await ms.process()`.

Coverage runs through Node's native `--experimental-test-coverage` with
the lcov reporter, scoped to `src/**/*.js`. There's no separate c8 step.

Test categories:

- **Structural**: nested directory layout with permalinks and without.
- **Metadata-driven**: `title`, `navigation.navLabel`, `navigation.navIndex`,
  `draft`, `navigation.navExclude`.
- **Options-driven**: `navIndex`, `sortBy`, `navExcludePatterns` (string,
  RegExp, and function forms), `rootPath`, `usePermalinks`.
- **Per-file output**: verifies `file.urlPath`, `file.navigation.path`,
  and `file.navigation.breadcrumbs` are set correctly.

## 7. Known sharp edges

- **Sibling pairing is silent.** If a project has both `blog.html` and a
  `blog/` directory and the author expected two separate nav entries, the
  plugin will merge them. The pairing is intentional (it's the whole point
  of the parent-html fixture) but easy to be surprised by.

- **The internal tree has an asymmetric shape.** Top-level directories
  live as direct keys on the navTree object (`navTree.blog`); nested
  directories live under their parent's `__dirs` (`navTree.blog.__dirs.drafts`).
  This is why there are two functions, `processTree` and `processDirectory`,
  doing similar work — normalizing the shape would be cleaner but the
  current code is well-tested and known to work.

- **`Array.sort` stability matters.** `sortNavigation` relies on V8's
  stable sort to preserve the insertion order of items with equal
  `navIndex` and no `sortBy`. Stable since Node 12, so safe on the
  Node 22+ engine target — but worth knowing if porting the comparator
  logic elsewhere.

- **`rootPath` must match a directory-style path that exists in the tree.**
  Trailing-slash differences are handled by `normalizePath`, but typos like
  `/blogs/` when the tree has `/blog/` will silently yield an empty
  navigation. There's a test that exercises the empty case explicitly.

- **`navigation.path` is the same value as `urlPath`.** The duplication is
  there because templates conventionally read `navigation.path` for
  active-state highlighting, while `urlPath` is the more general field.
  If you rename one, rename the other in lockstep.
