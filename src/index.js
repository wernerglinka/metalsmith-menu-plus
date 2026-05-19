/**
 * Plugin options for metalsmith-menu-plus
 * @typedef {Object} Options
 * @property {string} [metadataKey='navigation'] - The key to use in the Metalsmith metadata
 * @property {Function|null} [sortBy=null] - Function to sort navigation items at the same level
 * @property {boolean} [usePermalinks=false] - Whether to use permalink-style URLs
 * @property {Array<string|RegExp|Function>} [navExcludePatterns=[]] - Patterns to exclude files from navigation
 * @property {Object<string, number>} [navIndex={}] - Object mapping page paths to numeric index values
 * @property {string} [rootPath='/'] - The root path to start building navigation from
 */

/**
 * Navigation item in the generated structure
 * @typedef {Object} NavItem
 * @property {string} title - Display title for the navigation item
 * @property {string} path - URL path for the navigation item
 * @property {number|null} navIndex - Numeric index for custom ordering
 * @property {NavItem[]} children - Child navigation items
 */

/**
 * Breadcrumb item
 * @typedef {Object} BreadcrumbItem
 * @property {string} title - Display title
 * @property {string} path - URL path
 */

import {
  createNavigationStructure,
  findSectionByPath,
  generateBreadcrumbs,
  sortNavigation
} from './processors/index.js';
import { fileUrlPath, normalizePath, shouldExclude } from './utils/index.js';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Validate user-provided options. Throws a TypeError with a clear message
 * for any malformed input so misconfigurations surface at build start
 * rather than as silently-wrong navigation output.
 * @param {Options} options - User-provided options (pre-merge)
 */
function validateOptions(options) {
  const fail = (msg) => {
    throw new TypeError(`metalsmith-menu-plus: ${msg}`);
  };

  if (options.metadataKey !== undefined && (typeof options.metadataKey !== 'string' || !options.metadataKey)) {
    fail(`option 'metadataKey' must be a non-empty string`);
  }
  if (options.usePermalinks !== undefined && typeof options.usePermalinks !== 'boolean') {
    fail(`option 'usePermalinks' must be a boolean`);
  }
  if (options.sortBy !== undefined && options.sortBy !== null && typeof options.sortBy !== 'function') {
    fail(`option 'sortBy' must be a function or null`);
  }
  if (options.navExcludePatterns !== undefined && !Array.isArray(options.navExcludePatterns)) {
    fail(`option 'navExcludePatterns' must be an array`);
  }
  if (options.navIndex !== undefined && !isPlainObject(options.navIndex)) {
    fail(`option 'navIndex' must be a plain object`);
  }
  if (options.rootPath !== undefined && (typeof options.rootPath !== 'string' || !options.rootPath.startsWith('/'))) {
    fail(`option 'rootPath' must be a string starting with '/'`);
  }
}

/**
 * Metalsmith Navigation Plugin with Permalinks Support
 *
 * Creates a hierarchical navigation structure from HTML files in your
 * Metalsmith build with support for permalinked URLs (e.g., page1/ instead
 * of page1.html). Non-HTML files are ignored — run this plugin after any
 * markdown-to-HTML conversion.
 *
 * @param {Options} options - Plugin configuration options
 * @returns {import('metalsmith').Plugin} Metalsmith plugin function
 * @throws {TypeError} If any option has the wrong type
 */
function navigationPlugin(options = {}) {
  validateOptions(options);

  const opts = {
    metadataKey: 'navigation',
    sortBy: null,
    usePermalinks: false,
    navExcludePatterns: [],
    navIndex: {},
    rootPath: '/',
    ...options
  };

  /**
   * @param {Object} files - The Metalsmith files object
   * @param {import('metalsmith')} metalsmith - The Metalsmith instance
   */
  const plugin = (files, metalsmith) => {
    const htmlPaths = Object.keys(files).filter((path) => path.endsWith('.html'));
    const includedPaths = htmlPaths.filter((path) => !shouldExclude(path, files[path], opts));

    const fullNavigation = createNavigationStructure(includedPaths, files, opts);
    sortNavigation(fullNavigation, opts);

    let navigation = fullNavigation;
    if (opts.rootPath !== '/') {
      const normalizedRootPath = normalizePath(opts.rootPath);
      const rootSection = findSectionByPath(normalizedRootPath, fullNavigation);
      navigation = rootSection ? rootSection.children || [] : [];
    }

    const metadata = metalsmith.metadata();
    metadata[opts.metadataKey] = navigation;

    // Use the full navigation for breadcrumbs so paths are complete even when rootPath is set.
    generateBreadcrumbs(files, htmlPaths, fullNavigation, opts);

    htmlPaths.forEach((path) => {
      const file = files[path];
      const urlPath = fileUrlPath(path, opts);
      file.urlPath = urlPath;
      if (!file.navigation) {
        file.navigation = {};
      }
      file.navigation.path = urlPath;
    });

    metalsmith.metadata(metadata);
  };

  return plugin;
}

// Set function name for better debugging and plugin identification
Object.defineProperty(navigationPlugin, 'name', {
  value: 'menuPlus',
  configurable: true
});

export default navigationPlugin;
