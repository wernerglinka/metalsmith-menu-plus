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

import { normalizePath, fileUrlPath, shouldExclude } from './utils/index.js';
import {
  createNavigationStructure,
  findSectionByPath,
  sortNavigation,
  generateBreadcrumbs
} from './processors/index.js';

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
 */
function navigationPlugin( options = {} ) {
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
  const plugin = function ( files, metalsmith ) {
    const htmlPaths = Object.keys( files ).filter( ( path ) => path.endsWith( '.html' ) );
    const includedPaths = htmlPaths.filter( ( path ) => !shouldExclude( path, files[path], opts ) );

    const fullNavigation = createNavigationStructure( includedPaths, files, opts );
    sortNavigation( fullNavigation, opts );

    let navigation = fullNavigation;
    if ( opts.rootPath !== '/' ) {
      const normalizedRootPath = normalizePath( opts.rootPath );
      const rootSection = findSectionByPath( normalizedRootPath, fullNavigation );
      navigation = rootSection ? rootSection.children || [] : [];
    }

    const metadata = metalsmith.metadata();
    metadata[opts.metadataKey] = navigation;

    // Use the full navigation for breadcrumbs so paths are complete even when rootPath is set.
    generateBreadcrumbs( files, htmlPaths, fullNavigation, opts );

    htmlPaths.forEach( ( path ) => {
      const file = files[path];
      const urlPath = fileUrlPath( path, opts );
      file.urlPath = urlPath;
      if ( !file.navigation ) {
        file.navigation = {};
      }
      file.navigation.path = urlPath;
    } );

    metalsmith.metadata( metadata );
  };

  return plugin;
}

// Set function name for better debugging and plugin identification
Object.defineProperty( navigationPlugin, 'name', {
  value: 'menuPlus',
  configurable: true
} );

export default navigationPlugin;
