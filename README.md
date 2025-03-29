# metalsmith-menu-plus

Automatic hierarchical navigation generator for Metalsmith sites

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]
[![coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]

## Features

- Creates a nested navigation structure reflecting your content hierarchy
- Supports permalink-style URLs (`/page/` instead of `/page.html`)
- Custom ordering via frontmatter or global configuration
- Breadcrumb generation for each page
- Flexible exclusion patterns for omitting files from navigation
- Automatic title generation from filenames

## Installation

```bash
npm install metalsmith-menu-plus
```

## Usage

This plugin follows the standard Metalsmith plugin pattern and can be used both with ESM and CommonJS.

> **IMPORTANT**: This plugin must be used **before** the layout plugin in the Metalsmith build chain, because it expects HTML files.

### ESM (preferred)

```javascript
import metalsmith from 'metalsmith';
import markdown from 'metalsmith-markdown';
import layouts from 'metalsmith-layouts';
import navMenu from 'metalsmith-menu-plus';

metalsmith(__dirname)
  ...
  .use(markdown()) // Convert Markdown to HTML
  .use(navMenu({   // Then generate navigation
    metadataKey: 'siteNav',
    usePermalinks: true
  }))
  .use(layouts())  // Apply layouts
  .build((err) => {
    if (err) throw err;
    console.log('Build complete!');
  });
```

### CommonJS

```javascript
const metalsmith = require('metalsmith');
const markdown = require('metalsmith-markdown');
const layouts = require('metalsmith-layouts');
const navigationMenu = require('metalsmith-menu-plus');

metalsmith(__dirname)
  ...
  .use(markdown()) // Convert Markdown to HTML
  .use(navMenu({   // Then generate navigation
    metadataKey: 'siteNav',
    usePermalinks: true
  }))
  .use(layouts())  // Apply layouts
  .build((err) => {
    if (err) throw err;
    console.log('Build complete!');
  });
```

## Options

| Option             | Type                  | Default       | Description                                                                                              |
|--------------------|----------------------|---------------|----------------------------------------------------------------------------------------------------------|
| metadataKey        | String               | 'navigation'  | The key to use in the Metalsmith metadata where the navigation structure will be stored                  |
| usePermalinks      | Boolean              | false         | Whether to use permalink-style URLs (e.g., `/page/` instead of `/page.html`)                            |
| navIndex           | Object               | {}            | Custom ordering for navigation items, with paths as keys and numeric indices as values                   |
| sortBy             | Function             | null          | Custom sorting function for navigation items at the same level with the same navIndex                     |
| navExcludePatterns | Array                | []            | Patterns (string, RegExp, or function) to exclude files from navigation                                  |
| rootPath           | String               | '/'           | The root path to start building the navigation from (e.g., '/blog/' to only show blog navigation)        |

### Frontmatter Options

Individual pages can customize their navigation properties using frontmatter:

```yaml
---
title: About Us
layout: page.njk
navigation:
  navLabel: About Our Company  # Custom navigation label
  navIndex: 5                  # Custom order in navigation
  navExclude: true             # Exclude this page from navigation
---
```

## Navigation Structure

The plugin adds a hierarchical navigation structure to the Metalsmith metadata, accessible via the configured `metadataKey`. The structure looks like:

```javascript
[
  {
    title: "Home Page",
    path: "/",
    navIndex: 0,
    children: []
  },
  {
    title: "Blog",
    path: "/blog/",
    navIndex: 10,
    children: [
      {
        title: "First Post",
        path: "/blog/first-post/",
        navIndex: null,
        children: []
      }
    ]
  }
]
```

### Breadcrumbs

The plugin also generates breadcrumbs for each file and adds them to the file's metadata. The breadcrumbs are accessible via:

```javascript
navigation.breadcrumbs
```

Each breadcrumb is an object with a `title` and `path` property.

### Active State Path

The plugin adds the current page's path to the file's `navigation` object, making it easy to detect the active page in templates:

```javascript
navigation.path
```

This path can be compared with navigation item paths to highlight the active page in the navigation menu.

## Template Usage

### Basic Navigation Menu

```nunjucks
{% if siteNav %}
  <nav>
    <ul>
      {% for item in siteNav %}
        <li>
          <a href="{{ item.path }}" {% if navigation.path === item.path %}class="active"{% endif %}>
            {{ item.title }}
          </a>
          
          {% if item.children.length > 0 %}
            <ul>
              {% for child in item.children %}
                <li>
                  <a href="{{ child.path }}" {% if navigation.path === child.path %}class="active"{% endif %}>
                    {{ child.title }}
                  </a>
                </li>
              {% endfor %}
            </ul>
          {% endif %}
          
        </li>
      {% endfor %}
    </ul>
  </nav>
{% endif %}
```

### Breadcrumbs

```nunjucks
{% if navigation.breadcrumbs and navigation.breadcrumbs.length > 1 %}
  <nav aria-label="Breadcrumb">
    <ol class="breadcrumbs">
      {% for crumb in navigation.breadcrumbs %}
        <li>
          {% if loop.last %}
            <span aria-current="page">{{ crumb.title }}</span>
          {% else %}
            <a href="{{ crumb.path }}">{{ crumb.title }}</a>
          {% endif %}
        </li>
      {% endfor %}
    </ol>
  </nav>
{% endif %}
```


## Advanced Configuration

### Section-Specific Navigation

You can create navigation that only shows a specific section:

```javascript
// Main site navigation
.use(navigationMenu({
  metadataKey: 'siteNav',
  usePermalinks: true
}))

// Blog-specific navigation
.use(navigationMenu({
  metadataKey: 'blogNav',
  usePermalinks: true,
  rootPath: '/blog/'  // Only show blog section
}))
```

This is useful for creating specialized navigation for different sections of your site.

### Custom Ordering

```javascript
.use(navigationMenu({
  metadataKey: 'siteNav',
  usePermalinks: true,
  navIndex: {
    '/': 0,           // Home page first
    '/blog': 10,      // Blog section second
    '/about': 20      // About page third  
  },
  sortBy: (a, b) => {
    // Sort by title (applies to items with same navIndex)
    return a.title.localeCompare(b.title);
  }
}))
```

### Custom Exclusion Rules

```javascript
.use(navigationMenu({
  metadataKey: 'siteNav',
  navExcludePatterns: [
    // Exclude draft content
    (path, file) => file && file.draft === true,
    // Exclude specific paths
    'private/secret-page.html',
    // Exclude with regex
    /\/temp\//
  ]
}))
```

## Test Coverage

This plugin maintains high test coverage to ensure reliability. Current test coverage is displayed in the badge at the top of this README.

To run tests locally:

```bash
npm test
```

To view coverage details:

```bash
npm run coverage
```

## Debug

This plugin uses the [debug](https://www.npmjs.com/package/debug) module for debugging. To enable debug logs, set the `DEBUG` environment variable:

```bash
DEBUG=metalsmith-menu-plus node your-metalsmith-build.js
```

## CLI Usage

To use this plugin with the Metalsmith CLI, add it to your `metalsmith.json` file:

```json
{
  "plugins": {
    "metalsmith-menu-plus": {
      "metadataKey": "siteNav",
      "usePermalinks": true,
      "navIndex": {
        "/": 0,
        "/blog": 10,
        "/about": 20
      },
      "rootPath": "/"
    }
  }
}
```

You can also use the plugin multiple times to create different navigation structures:

```json
{
  "plugins": {
    "metalsmith-menu-plus#main": {
      "metadataKey": "siteNav",
      "usePermalinks": true,
      "rootPath": "/"
    },
    "metalsmith-menu-plus#blog": {
      "metadataKey": "blogNav",
      "usePermalinks": true,
      "rootPath": "/blog/"
    }
  }
}
```

## License

MIT

[npm-badge]: https://img.shields.io/npm/v/metalsmith-menu-plus.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-menu-plus
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-menu-plus
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-98%25-brightgreen
[coverage-url]: #test-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue