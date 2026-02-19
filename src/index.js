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

import { normalizePath, createPath, createChildPath, shouldExclude } from './utils/index.js';
import {
  createNavigationStructure,
  findSectionByPath,
  sortNavigation,
  generateBreadcrumbs
} from './processors/index.js';

/**
 * Metalsmith Navigation Plugin with Permalinks Support
 *
 * Creates a hierarchical navigation structure from files in your Metalsmith build
 * with support for permalinked URLs (e.g., page1/ instead of page1.html).
 *
 * This plugin uses the two-phase factory pattern:
 * 1. Factory phase: Configure the plugin with options
 * 2. Plugin phase: Process files during Metalsmith build
 *
 * @param {Options} options - Plugin configuration options
 * @returns {import('metalsmith').Plugin} Metalsmith plugin function
 */
function navigationPlugin( options = {} ) {
  // Set default options
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
   * The plugin function that Metalsmith will call
   * @param {Object} files - The Metalsmith files object
   * @param {import('metalsmith')} metalsmith - The Metalsmith instance
   * @param {Function} done - Callback function
   */
  const plugin = function( files, metalsmith, done ) {
    // Get the file paths as an array
    const filePaths = Object.keys( files );

    // Filter out excluded files
    const includedPaths = filePaths.filter( ( path ) => !shouldExclude( path, files[ path ], opts ) );

    // Create the full navigation structure first
    const fullNavigation = createNavigationStructure( includedPaths, files, opts );

    // Apply custom sorting based on navIndex and sortBy function
    sortNavigation( fullNavigation, opts );

    // If rootPath is not '/', find the subsection to use as the root
    let navigation = fullNavigation;
    if ( opts.rootPath !== '/' ) {
      // Normalize the root path
      const normalizedRootPath = normalizePath( opts.rootPath );

      // Find the subsection in the full navigation
      const rootSection = findSectionByPath( normalizedRootPath, fullNavigation );

      if ( rootSection ) {
        // If we found the section, use its children as the navigation
        navigation = rootSection.children || [];
      } else {
        // If section not found, use empty navigation
        navigation = [];
      }
    }

    // Add the navigation structure to the metalsmith metadata
    const metadata = metalsmith.metadata();
    metadata[ opts.metadataKey ] = navigation;

    // Generate breadcrumbs for each file and add to file metadata
    // Use the FULL navigation for breadcrumbs to ensure complete paths
    generateBreadcrumbs( files, fullNavigation, opts );

    // Also add the current file path to each file's metadata for active state detection in templates
    Object.keys( files ).forEach( ( path ) => {
      const file = files[ path ];
      const name = path.split( '/' ).pop().replace( '.html', '' );
      const segments = path.split( '/' );
      const parentDir = segments.length > 1 ? segments.slice( 0, -1 ).join( '/' ) : '';

      // Generate the URL path based on the same logic as the navigation
      let urlPath;
      if ( segments.length === 1 ) {
        // Root level file
        urlPath = createPath( path, name, opts );
      } else {
        // Nested file
        urlPath = createChildPath( path, name, parentDir, opts );
      }

      // Add the URL path to the file's metadata
      file.urlPath = urlPath;

      // Initialize navigation object if it doesn't exist
      if ( !file.navigation ) {
        file.navigation = {};
      }

      // Add the path to the navigation object for active path detection
      file.navigation.path = urlPath;

      // File navigation is now set up
    } );

    metalsmith.metadata( metadata );

    // Call the done callback to signal completion
    done();
  };

  return plugin;
}

// Set function name for better debugging and plugin identification
Object.defineProperty( navigationPlugin, 'name', {
  value: 'menuPlus',
  configurable: true
} );

export default navigationPlugin;
