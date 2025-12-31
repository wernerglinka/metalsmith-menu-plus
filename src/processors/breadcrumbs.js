/**
 * Breadcrumb generation for metalsmith-menu-plus
 */

import { normalizePath, createPath, createChildPath } from '../utils/index.js';

/**
 * Generate breadcrumbs for each file and add to its navigation metadata
 * @param {Object} files - The Metalsmith files object
 * @param {Array} navigation - The navigation structure
 * @param {Object} options - Plugin options
 */
export function generateBreadcrumbs( files, navigation, options ) {
  Object.keys( files ).forEach( ( path ) => {
    const file = files[ path ];
    if ( !file.navigation ) {
      file.navigation = {};
    }

    // Generate URL path for this file using the same logic as in the main plugin
    const name = path.split( '/' ).pop().replace( '.html', '' );
    const segments = path.split( '/' );
    const parentDir = segments.length > 1 ? segments.slice( 0, -1 ).join( '/' ) : '';

    let urlPath;
    if ( segments.length === 1 ) {
      urlPath = createPath( path, name, options );
    } else {
      urlPath = createChildPath( path, name, parentDir, options );
    }

    // Find breadcrumb path for this file
    const breadcrumbs = findBreadcrumbs( urlPath, navigation );
    file.navigation.breadcrumbs = breadcrumbs;
  } );
}

/**
 * Find breadcrumb path for a given URL
 * @param {string} urlPath - The URL path to find breadcrumbs for
 * @param {Array} navigation - The navigation structure
 * @param {Array} [currentPath=[]] - The current breadcrumb path (used recursively)
 * @returns {Array} Array of breadcrumb items
 */
export function findBreadcrumbs( urlPath, navigation, currentPath = [] ) {
  // Always start with the root element if not already in path
  if ( currentPath.length === 0 ) {
    const homeItem = navigation.find( ( item ) => item.path === '/' );
    if ( homeItem ) {
      currentPath = [
        {
          title: homeItem.title,
          path: homeItem.path
        }
      ];

      // For homepage, return early
      if ( urlPath === '/' ) {
        return currentPath;
      }
    }
  }

  return searchBreadcrumbs( urlPath, navigation, currentPath );
}

/**
 * Helper function to search for breadcrumbs in the navigation structure
 * @param {string} urlPath - The URL path to find breadcrumbs for
 * @param {Array} navigation - The navigation structure to search within
 * @param {Array} currentPath - The current breadcrumb path
 * @returns {Array} Array of breadcrumb items
 */
function searchBreadcrumbs( urlPath, navigation, currentPath ) {
  // Search for matching item at this level
  for ( const item of navigation ) {
    // Check if this is the item we're looking for
    if ( normalizePath( item.path ) === normalizePath( urlPath ) ) {
      return [
        ...currentPath,
        {
          title: item.title,
          path: item.path
        }
      ];
    }

    // Check if this could be a parent (URL is a substring)
    if (
      item.children &&
      item.children.length &&
      ( urlPath.startsWith( `${ normalizePath( item.path ) }/` ) || ( item.path === '/' && urlPath !== '/' ) )
    ) {
      // Add this item to the current path and search its children
      // Skip adding root again if it's already in the path
      const newPath =
        item.path === '/' && currentPath.some( ( p ) => p.path === '/' )
          ? currentPath
          : [
            ...currentPath,
            {
              title: item.title,
              path: item.path
            }
          ];

      const result = searchBreadcrumbs( urlPath, item.children, newPath );
      if ( result ) {
        return result;
      }
    }
  }

  // No matches in this branch
  return currentPath.length > 0 ? currentPath : null;
}
