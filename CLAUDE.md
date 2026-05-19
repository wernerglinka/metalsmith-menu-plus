# metalsmith-menu-plus - Development Context

## Project Overview

This is a Metalsmith plugin generated using the enhanced standards from `metalsmith-plugin-mcp-server`. It follows modern JavaScript patterns with dual ESM/CommonJS support and comprehensive testing.

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with `metalsmith-plugin-mcp-server`.
When working on this plugin, AI assistants (Claude) MUST use the MCP server
tools rather than improvising equivalents.

### Essential MCP Commands

```bash
list-templates                          # See what's available
get-template plugin/CLAUDE.md           # Retrieve exact template content
get-template configs/biome.json
get-template configs/release-it.json
validate .                              # Plugin validation + recommendations
diff-template .                         # Drift check vs current scaffold
configs .                               # Generate config files
show-template release-it                # Reference config templates
update-deps .                           # Dependency update
```

### CRITICAL RULES for AI Assistants

1. **Use MCP server templates verbatim** — never paraphrase or "simplify"
2. **Run `list-templates` before guessing** at template names
3. **When `validate` produces a recommendation, copy it exactly** — including
   the exact command suggested
4. **Ask the user** before modifying `.release-it.json`, `package.json`,
   `biome.json`, or any other `.json` / `.yml` / `.config.js` file
5. **Never set `npm.publish` to `true`** in `.release-it.json` — releases
   here are deliberately manual

## Pre-Commit and Release Workflow

### CRITICAL: Always Run Pre-Commit Validation

**Before ANY commit or release, ALWAYS run these commands in order:**

```bash
npm run lint          # Fix linting issues
npm run format        # Format code consistently
npm test              # Ensure all tests pass
```

**If any of these commands fail, you MUST fix the issues before proceeding with commits or releases.**

### Common Development Commands

```bash
# Build the plugin (required before testing)
npm run build

# Run tests for both ESM and CommonJS
npm test

# Run tests with coverage
npm run test:coverage

# Run linting and auto-fix issues
npm run lint

# Format code
npm run format

# Check formatting without making changes
npm run format:check
```

### Release Commands

Only after successful pre-commit validation:

```bash
npm run release:patch  # For bug fixes (0.0.X)
npm run release:minor  # For new features (0.X.0)
npm run release:major  # For breaking changes (X.0.0)
```

## Development Architecture

### Complementary CI/CD Architecture

This plugin includes professional GitHub workflows for automated quality assurance:

**GitHub Workflows** (`.github/workflows/`):

- **`test.yml`**: Automated CI/CD pipeline
  - Runs on every push and pull request
  - Tests across Node.js versions
  - Automatic coverage calculation and README badge updates
  - Build verification

- **`claude-code.yml`**: AI-assisted code review
  - Automatic code review on pull requests
  - Integration with Claude Code for intelligent feedback
  - Requires `ANTHROPIC_API_KEY` secret in repository settings

**Release Scripts** (`scripts/`):

- **`release.sh`**: Manual release control with secure GitHub CLI authentication
- **`release-notes.sh`**: Custom release notes generation filtering maintenance commits

**Benefits**:

- ✅ **Automated Quality Gates**: Every PR/push runs tests and updates coverage
- ✅ **Human Release Control**: Developers control release timing, not automation
- ✅ **Professional Standards**: Coverage tracking, AI code review, secure authentication

### Dual Module Support

This plugin supports both ESM and CommonJS:

- **Source**: Write in ESM in `src/index.js`
- **Build**: Creates both `lib/index.js` (ESM) and `lib/index.cjs` (CommonJS)
- **Testing**: Tests run against built files for both formats

### File Organization

```
metalsmith-menu-plus/
├── src/
│   └── index.js              # Main plugin source
├── test/
│   ├── index.js              # ESM tests
│   ├── cjs.test.cjs          # CommonJS tests
│   └── fixtures/             # Test data
├── lib/                      # Built files (auto-generated)
└── CLAUDE.md                 # This file
```

### Plugin Features

This plugin uses standard synchronous processing patterns.

## Testing Strategy

### Test Structure

- **ESM Tests**: `test/index.test.js` - Tests the built ESM version
- **CommonJS Tests**: `test/index.test.cjs` - Tests the built CommonJS version
- **Fixtures**: `test/fixtures/` - Sample files for testing transformations

### Running Tests

```bash
# Build first (required!)
npm run build

# Run all tests
npm test

# Run specific test format
npm run test:esm
npm run test:cjs

# Coverage reporting
npm run test:coverage
```

### Important: Build Before Testing

**Always run `npm run build` before running tests** - the tests execute against the built files in `lib/`, not the source files in `src/`.

## Code Quality Standards

### ESLint Configuration

- Uses ESLint 9.x flat configuration (`eslint.config.js`)
- Automatically fixes common issues with `npm run lint`
- Modern JavaScript patterns enforced

### Formatting

- Prettier configuration for consistent code style
- Auto-format with `npm run format`
- Check formatting with `npm run format:check`

### Documentation

- JSDoc comments for all public functions
- README with comprehensive usage examples
- Type definitions in `types/` directory

### Enhanced Quality Validation (v1.4.0)

This plugin is validated against enhanced quality standards that catch common professional plugin issues. The MCP server validation includes:

#### 1. Marketing Language Detection (`marketing-language`)

**What it catches**: Buzzwords and marketing language in documentation

- ❌ Avoid: "intelligent", "smart", "seamless", "revolutionary", "cutting-edge"
- ✅ Use: Technical descriptions of actual functionality

**Examples:**

```javascript
// ❌ Marketing language
'This intelligent plugin seamlessly transforms content';

// ✅ Technical description
'Transforms markdown content to HTML with configurable options';
```

#### 2. Module System Consistency (`module-consistency`)

**What it catches**: Dangerous CJS/ESM mixing in README examples that causes runtime errors

- ❌ Avoid: Mixed `require()` and `import` in the same example
- ✅ Use: Consistent module syntax that matches package.json type

**Examples:**

```javascript
// ❌ Mixed module systems (causes runtime errors)
const Metalsmith = require('metalsmith');
import myPlugin from 'my-plugin';

// ✅ Consistent ESM
import Metalsmith from 'metalsmith';
import myPlugin from 'my-plugin';

// ✅ Consistent CJS
const Metalsmith = require('metalsmith');
const myPlugin = require('my-plugin');
```

#### 3. Hardcoded Values Detection (`hardcoded-values`)

**What it catches**: Values that should be user-configurable options

- ❌ Avoid: Hardcoded wordsPerMinute, viewport settings, timeouts
- ✅ Use: Configurable options with sensible defaults

**Examples:**

```javascript
// ❌ Hardcoded values
const wordsPerMinute = 200;
const viewport = { width: 1200, height: 800 };

// ✅ Configurable with defaults
function myPlugin(options = {}) {
  const config = {
    wordsPerMinute: 200,
    viewport: { width: 1200, height: 800 },
    ...options
  };
  // ...
}
```

#### 4. Performance Pattern Analysis (`performance-patterns`)

**What it catches**: Objects recreated inside functions and redundant utilities

- ❌ Avoid: Objects redefined in functions, redundant utilities (get, pick, identity)
- ✅ Use: Module-level constants, established libraries

**Examples:**

```javascript
// ❌ Object recreation inside function (performance killer)
function processFiles(files) {
  const typeMap = {
    // Recreated on every call!
    '.md': 'markdown',
    '.html': 'html'
  };
  // ...
}

// ✅ Module-level constant
const TYPE_MAP = {
  '.md': 'markdown',
  '.html': 'html'
};

function processFiles(files) {
  // Use TYPE_MAP constant
}

// ❌ Redundant utility functions
const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const pick = (obj, keys) => keys.reduce((r, k) => ({ ...r, [k]: obj[k] }), {});

// ✅ Use established libraries or native methods
import { get, pick } from 'lodash';
// or use native Object methods where appropriate
```

#### 5. Internationalization Readiness (`i18n-readiness`)

**What it catches**: English-only text outputs that prevent global plugin adoption

- ❌ Avoid: Hardcoded English strings in output
- ✅ Use: Data objects that templates can customize

**Examples:**

```javascript
// ❌ English-only output (limits global usage)
function readingTime(content) {
  const minutes = Math.ceil(content.length / 1000);
  return `${minutes} minute read`; // Hardcoded English!
}

// ✅ Return data objects for template customization
function readingTime(content) {
  const minutes = Math.ceil(content.length / 1000);
  return {
    minutes,
    seconds: ((content.length / 1000) * 60) % 60,
    words: content.split(/\s+/).length
  };
}
```

### Running Quality Validation

```bash
# Run comprehensive validation including enhanced quality checks
npx metalsmith-plugin-mcp-server validate . --functional

# The validation automatically includes all enhanced quality rules:
# - marketing-language
# - module-consistency
# - hardcoded-values
# - performance-patterns
# - i18n-readiness
```

These enhanced quality standards help create plugins that meet professional standards and avoid common pitfalls identified by Metalsmith maintainers.

## Plugin Development Patterns

### Basic Plugin Structure

```javascript
/**
 * Automatic hierarchical navigation generator for Metalsmith sites
 * @param {Object} options - Plugin configuration
 * @returns {Function} Metalsmith plugin function
 */
function menuPlus(options = {}) {
  return function (files, metalsmith, callback) {
    // Plugin logic here
    callback();
  };
}

export default menuPlus;
```

### Quality-Compliant Plugin Structure

Following the enhanced quality standards, here's a pattern that avoids common pitfalls:

```javascript
// ✅ Module-level constants (avoid performance-patterns violations)
const DEFAULT_CONFIG = {
  // ✅ Configurable values (avoid hardcoded-values violations)
  wordsPerMinute: 200,
  timeout: 5000,
  batchSize: 10
};

const FILE_TYPE_MAP = {
  '.md': 'markdown',
  '.html': 'html',
  '.txt': 'text'
};

/**
 * Processes files with configurable options
 * ✅ Technical description (avoid marketing-language violations)
 * @param {Object} options - Plugin configuration
 * @returns {Function} Metalsmith plugin function
 */
function menuPlus(options = {}) {
  // ✅ Merge user options with defaults
  const config = { ...DEFAULT_CONFIG, ...options };

  return function (files, metalsmith, callback) {
    try {
      // ✅ Use metalsmith native methods (prefer over external deps)
      const debug = metalsmith.debug('metalsmith-menu-plus');

      Object.keys(files).forEach((filename) => {
        // ✅ Use module-level constants
        const fileType = FILE_TYPE_MAP[path.extname(filename)];

        if (fileType) {
          // ✅ Return data objects for i18n-readiness
          files[filename].metadata = {
            type: fileType,
            processedAt: Date.now(),
            // Return structured data instead of formatted strings
            stats: {
              size: files[filename].contents.length,
              estimatedReadTime: Math.ceil(files[filename].contents.length / config.wordsPerMinute)
            }
          };
        }
      });

      callback();
    } catch (error) {
      callback(error);
    }
  };
}

export default menuPlus;
```

### Error Handling

```javascript
function menuPlus(options = {}) {
  return function (files, metalsmith, callback) {
    try {
      // Plugin processing
      callback();
    } catch (error) {
      callback(error);
    }
  };
}
```

## Release Process

### Automated Release Process

The release process uses an improved release notes system that generates clean, version-specific GitHub releases:

**Key Features:**

- ✅ Clean, professional release notes
- ✅ Only current version changes (no "Unreleased" sections)
- ✅ Automatic commit filtering (excludes chore, ci, dev commits)
- ✅ Proper GitHub markdown formatting with commit links

**Release Commands:**

```bash
npm run release:patch  # Bug fixes (1.2.3 → 1.2.4)
npm run release:minor  # New features (1.2.3 → 1.3.0)
npm run release:major  # Breaking changes (1.2.3 → 2.0.0)
```

The release notes are automatically generated using `scripts/release-notes.sh` which:

1. Gets commits since the previous tag
2. Filters out merge commits and maintenance commits
3. Formats with proper GitHub links
4. Includes full changelog link

### Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- All tests passing
- Code properly linted and formatted

This automatically:

- Updates version in package.json
- Generates changelog
- Creates git tag
- Pushes to GitHub
- Creates GitHub release with clean, professional notes

## Quality Standards Best Practices

### Avoiding Common Validation Issues

When developing this plugin, follow these patterns to pass enhanced quality validation:

#### Documentation Writing

```markdown
<!-- ❌ Marketing language -->

This intelligent plugin seamlessly transforms your content with cutting-edge algorithms.

<!-- ✅ Technical description -->

Transforms markdown files to HTML with configurable syntax highlighting and custom template support.
```

#### README Examples

```javascript
// ❌ Mixed module systems (causes runtime errors when copy-pasted)
const Metalsmith = require('metalsmith');
import myPlugin from 'my-plugin';

// ✅ Consistent module system
import Metalsmith from 'metalsmith';
import myPlugin from 'my-plugin';
```

#### Configuration Management

```javascript
// ❌ Hardcoded values
function myPlugin() {
  const wordsPerMinute = 200; // Should be configurable!
  // ...
}

// ✅ Configurable with defaults
function myPlugin(options = {}) {
  const config = {
    wordsPerMinute: 200,
    ...options
  };
  // ...
}
```

#### Performance Optimization

```javascript
// ❌ Object recreation (performance killer)
function processFiles(files) {
  const typeMap = { '.md': 'markdown' }; // Created every call!
  // ...
}

// ✅ Module-level constants
const TYPE_MAP = { '.md': 'markdown' };
function processFiles(files) {
  // Use TYPE_MAP
}
```

#### Internationalization Support

```javascript
// ❌ English-only output
function getReadingTime(wordCount) {
  return `${Math.ceil(wordCount / 200)} minute read`;
}

// ✅ Return data for template customization
function getReadingTime(wordCount) {
  return {
    minutes: Math.ceil(wordCount / 200),
    words: wordCount,
    estimatedSeconds: (wordCount / 200) * 60
  };
}
```

### Pre-Development Checklist

Before writing code, ensure you understand:

1. **What configurable options should be available?** (Avoid hardcoded values)
2. **What data should the plugin return?** (Avoid English-only strings)
3. **What objects can be defined at module level?** (Avoid recreation in functions)
4. **How will users actually use this plugin?** (Ensure consistent module examples)
5. **What does this plugin actually do?** (Use technical language, not marketing speak)

## Common Development Tasks

### Adding New Features

1. Write feature in `src/index.js`
2. Add comprehensive tests in `test/`
3. Update JSDoc documentation
4. Run pre-commit validation
5. Test with real Metalsmith projects

### Debugging

```javascript
// Add debug logging
import { debuglog } from 'util';
const debug = debuglog('metalsmith-menu-plus');

function menuPlus(options = {}) {
  return function (files, metalsmith, callback) {
    debug('Processing %d files', Object.keys(files).length);
    // ... plugin logic
  };
}
```

### Performance Optimization

- Use `metalsmith.match()` for file filtering
- Avoid unnecessary file system operations
- Process files in batches for large sites
- Cache expensive computations

## Integration Testing

Test your plugin with real Metalsmith projects:

```javascript
import Metalsmith from 'metalsmith';
import menuPlus from 'metalsmith-menu-plus';

const metalsmith = Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(
    menuPlus({
      // your options
    })
  )
  .build((err) => {
    if (err) throw err;
    console.log('Build complete!');
  });
```

## Communication Style

### When Working on This Plugin

- **Be specific** - Include exact error messages and file paths
- **Test thoroughly** - Both ESM and CommonJS formats
- **Follow patterns** - Use existing utilities and conventions
- **Document changes** - Update JSDoc and README as needed

This plugin follows the enhanced standards from `metalsmith-plugin-mcp-server` and is designed for modern Metalsmith development workflows.
