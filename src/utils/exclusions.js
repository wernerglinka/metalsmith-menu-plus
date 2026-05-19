/**
 * File exclusion utilities for metalsmith-menu-plus
 */

/**
 * Determines if a file should be excluded from navigation
 * @param {string} path - The file path
 * @param {Object} file - The file metadata
 * @param {Object} options - Plugin options
 * @returns {boolean} True if the file should be excluded
 */
export function shouldExclude( path, file, options ) {
  // Check if file is marked as draft
  if ( file && file.draft === true ) {
    return true;
  }

  // Check if navigation.navExclude is true
  if ( file && file.navigation && file.navigation.navExclude === true ) {
    return true;
  }

  // Check if path matches any of the exclusion patterns
  if ( options.navExcludePatterns && options.navExcludePatterns.length > 0 ) {
    for ( const pattern of options.navExcludePatterns ) {
      if ( typeof pattern === 'string' ) {
        // String literal match
        if ( path === pattern ) {
          return true;
        }
      } else if ( pattern instanceof RegExp ) {
        // RegExp pattern match
        if ( pattern.test( path ) ) {
          return true;
        }
      } else if ( typeof pattern === 'function' ) {
        // Function that returns true if path should be excluded
        if ( pattern( path, file ) ) {
          return true;
        }
      }
    }
  }

  // File should not be excluded
  return false;
}
