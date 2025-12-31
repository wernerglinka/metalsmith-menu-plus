/**
 * Navigation structure generation for metalsmith-menu-plus
 */

import { normalizePath, createPath, createDirectoryPath, createChildPath, toTitleCase } from '../utils/index.js';

/**
 * Creates a navigation item object
 * @param {string} name - The default name derived from filename
 * @param {Object} fileData - The file data object
 * @param {string} path - The URL path
 * @param {Array} [children=[]] - Child navigation items
 * @returns {Object} The navigation item
 */
export function createNavItem( name, fileData, path, children = [] ) {
  // Determine the title to use - prioritize in this order:
  // 1. navigation.navLabel (if it exists)
  // 2. file.title (if it exists)
  // 3. Formatted version of the filename
  let title;

  if ( fileData && fileData.navigation && fileData.navigation.navLabel ) {
    title = fileData.navigation.navLabel;
  } else if ( fileData && fileData.title ) {
    title = fileData.title;
  } else {
    title = toTitleCase( name );
  }

  // Check for custom navigation index in file metadata
  let navIndex = null;
  if ( fileData && fileData.navigation && fileData.navigation.navIndex !== undefined ) {
    navIndex = fileData.navigation.navIndex;
  }

  return {
    title: title,
    path: path,
    navIndex: navIndex,
    children: children
  };
}

/**
 * Creates a hierarchical navigation structure from an array of file paths
 * @param {Array<string>} paths - Array of file paths
 * @param {Object} files - The Metalsmith files object (for accessing metadata)
 * @param {Object} options - Plugin options
 * @returns {Array} Array of navigation objects with nested children
 */
export function createNavigationStructure( paths, files, options ) {
  // Initialize the root level navigation structure
  const navTree = {};

  // First, create a map of all directories
  paths.forEach( ( path ) => {
    const segments = path.split( '/' );
    let currentLevel = navTree;

    // Build the tree structure for directories
    if ( segments.length > 1 ) {
      for ( let i = 0; i < segments.length - 1; i++ ) {
        const segment = segments[ i ];
        if ( !currentLevel[ segment ] ) {
          currentLevel[ segment ] = {
            __files: [],
            __dirs: {}
          };
        }
        currentLevel = currentLevel[ segment ].__dirs;
      }
    }

    // Add the file to the appropriate level
    if ( segments.length === 1 ) {
      // Root level file
      if ( !navTree.__files ) {
        navTree.__files = [];
      }
      navTree.__files.push( path );
    } else {
      // Get the parent directory level
      let parentLevel = navTree;
      for ( let i = 0; i < segments.length - 2; i++ ) {
        parentLevel = parentLevel[ segments[ i ] ].__dirs;
      }
      const parentDir = segments[ segments.length - 2 ];
      parentLevel[ parentDir ].__files.push( path );
    }
  } );

  // Process a directory and its contents
  function processDirectory( dirName, dirData, dirPath ) {
    const children = [];

    // Check if the directory has an index file
    const indexPath = `${ dirPath }/index.html`;
    const indexFile = files[ indexPath ];

    // Process all non-index files in this directory
    dirData.__files?.forEach( ( path ) => {
      if ( !path.endsWith( '/index.html' ) ) {
        // Get just the filename without extension
        const segments = path.split( '/' );
        const fileName = segments[ segments.length - 1 ];
        const name = fileName.replace( '.html', '' );

        // Create the URL path
        const urlPath = createChildPath( path, name, dirPath, options );

        // Add to children
        children.push( createNavItem( name, files[ path ], urlPath, [] ) );
      }
    } );

    // Process subdirectories
    Object.keys( dirData.__dirs ).forEach( ( subDirName ) => {
      const subDirPath = `${ dirPath }/${ subDirName }`;
      const subDirItem = processDirectory( subDirName, dirData.__dirs[ subDirName ], subDirPath );
      if ( subDirItem ) {
        children.push( subDirItem );
      }
    } );

    // Create the directory item (using index file metadata if available)
    const dirUrlPath = createDirectoryPath( dirPath, options );
    const navItem = createNavItem( dirName, indexFile || null, dirUrlPath, children );

    return navItem;
  }

  // Now convert the tree to navigation items
  function processTree( tree ) {
    const items = [];

    // Add the home/index item if it exists
    const rootIndex = tree.__files?.find( ( f ) => f === 'index.html' );
    if ( rootIndex ) {
      items.push( createNavItem( 'home', files[ rootIndex ], '/', [] ) );
    }

    // Process all directories at root level
    Object.keys( tree ).forEach( ( dirName ) => {
      if ( dirName !== '__files' && dirName !== '__dirs' ) {
        // Check if there's a corresponding HTML file for this directory
        const dirFile = `${ dirName }.html`;
        const hasMatchingFile = tree.__files?.includes( dirFile );

        // Process the directory's children
        const dirPath = dirName;
        const children = processDirectory( dirName, tree[ dirName ], dirPath ).children;

        if ( hasMatchingFile ) {
          // If there's a matching file, add children to that nav item
          const name = dirFile.replace( '.html', '' );
          const urlPath = createPath( dirFile, name, options );
          items.push( createNavItem( name, files[ dirFile ], urlPath, children ) );
        } else {
          // Otherwise create a directory item
          const dirUrlPath = createDirectoryPath( dirPath, options );
          const indexPath = `${ dirPath }/index.html`;
          const indexFile = files[ indexPath ];
          items.push( createNavItem( dirName, indexFile || null, dirUrlPath, children ) );
        }
      }
    } );

    // Add remaining root level files (except index.html and those matching directories)
    const processedDirs = Object.keys( tree ).filter( ( key ) => key !== '__files' && key !== '__dirs' );
    const processedFiles = [ `index.html`, ...processedDirs.map( ( dir ) => `${ dir }.html` ) ];

    tree.__files?.forEach( ( path ) => {
      if ( !processedFiles.includes( path ) ) {
        const name = path.replace( '.html', '' );
        const urlPath = createPath( path, name, options );
        items.push( createNavItem( name, files[ path ], urlPath, [] ) );
      }
    } );

    return items;
  }

  // Start processing from the root
  return processTree( navTree );
}

/**
 * Find a section by its path in the navigation structure
 * @param {string} sectionPath - The path of the section to find
 * @param {Array} navigation - The navigation structure
 * @returns {Object|null} The section navigation item or null if not found
 */
export function findSectionByPath( sectionPath, navigation ) {
  // Normalize the section path for comparison
  const normalizedSectionPath = normalizePath( sectionPath );

  // Look for the section in the navigation
  for ( const item of navigation ) {
    const normalizedItemPath = normalizePath( item.path );

    // If we found the section
    if ( normalizedItemPath === normalizedSectionPath ) {
      return item;
    }

    // Recursively search in children
    if ( item.children && item.children.length > 0 ) {
      const result = findSectionByPath( sectionPath, item.children );
      if ( result ) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Sort the navigation structure using navIndex and sortBy function
 * @param {Array} items - The navigation items to sort
 * @param {Object} options - Plugin options
 */
export function sortNavigation( items, options ) {
  if ( !items || !items.length ) {
    return;
  }

  // First apply navIndex from frontmatter and options
  if ( options.navIndex && Object.keys( options.navIndex ).length > 0 ) {
    // Add a 'navIndex' property to each item based on the navIndex option (if not already set by frontmatter)
    items.forEach( ( item ) => {
      // Skip if navIndex is already set from file metadata
      if ( item.navIndex !== null && item.navIndex !== undefined ) {
        return;
      }

      // Get the normalized path (without trailing slash for permalinks)
      const normalizedPath = item.path.endsWith( '/' ) ? item.path.slice( 0, -1 ) : item.path;

      // Apply index if it exists for this path
      if ( options.navIndex[ normalizedPath ] !== undefined ) {
        item.navIndex = options.navIndex[ normalizedPath ];
      } else if ( options.navIndex[ item.path ] !== undefined ) {
        item.navIndex = options.navIndex[ item.path ];
      } else {
        // Default to a high number for items without explicit index
        item.navIndex = 1000;
      }
    } );
  }

  // Sort items by navIndex
  items.sort( ( a, b ) => {
    const indexA = a.navIndex !== null && a.navIndex !== undefined ? a.navIndex : 1000;
    const indexB = b.navIndex !== null && b.navIndex !== undefined ? b.navIndex : 1000;
    return indexA - indexB;
  } );

  // Apply custom sorting function if provided
  if ( typeof options.sortBy === 'function' ) {
    items.sort( ( a, b ) => {
      // If navIndexes are the same, use sortBy function
      if ( a.navIndex === b.navIndex ) {
        return options.sortBy( a, b );
      }
      // Otherwise keep the navIndex ordering
      return 0;
    } );
  }

  // Recursively sort children
  items.forEach( ( item ) => {
    if ( item.children && item.children.length > 0 ) {
      sortNavigation( item.children, options );
    }
  } );
}
