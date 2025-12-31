/**
 * Path utility functions for metalsmith-menu-plus
 */

/**
 * Normalize path for consistent comparison
 * @param {string} path - The path to normalize
 * @returns {string} Normalized path
 */
export function normalizePath( path ) {
  // Remove trailing slash except for root
  return path === '/' ? path : path.replace( /\/$/, '' );
}

/**
 * Create a path for a file based on permalink settings
 * @param {string} path - The file path
 * @param {string} name - The file name without extension
 * @param {Object} options - Plugin options
 * @returns {string} The URL path
 */
export function createPath( path, name, options ) {
  if ( options.usePermalinks ) {
    // For permalinks, we use the pattern (typically '/:path/')
    if ( name === 'index' ) {
      return '/';
    }
    return `/${ name }/`;
  }
  // For regular links, we keep the original extension
  return `/${ path }`;
}

/**
 * Create a path for a directory
 * @param {string} dirPath - The directory path
 * @param {Object} options - Plugin options
 * @returns {string} The URL path
 */
export function createDirectoryPath( dirPath, options ) {
  if ( options.usePermalinks ) {
    return `/${ dirPath }/`;
  }
  // In non-permalink mode, link to the directory index
  return `/${ dirPath }/index.html`;
}

/**
 * Create a path for a child file
 * @param {string} path - The file path
 * @param {string} name - The file name without extension
 * @param {string} parentDir - The parent directory
 * @param {Object} options - Plugin options
 * @returns {string} The URL path
 */
export function createChildPath( path, name, parentDir, options ) {
  if ( options.usePermalinks ) {
    if ( name === 'index' ) {
      // If this is an index file, link to the parent directory
      return `/${ parentDir }/`;
    }
    // For permalinks, use the clean URL format
    return `/${ parentDir }/${ name }/`;
  }
  // For regular links, preserve the file extension
  return `/${ parentDir }/${ name }.html`;
}
