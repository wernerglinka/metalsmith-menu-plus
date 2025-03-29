/**
 * Determines if a file should be excluded from navigation
 * @param {string} path - The file path
 * @param {Object} file - The file metadata
 * @param {Object} options - Plugin options
 * @returns {boolean} - True if the file should be excluded
 */
function shouldExclude(path, file, options) {
  // Check if navigation.navExclude is true
  if (file && file.navigation && file.navigation.navExclude === true) {
    return true;
  }

  // Check if path matches any of the exclusion patterns
  if (options.navExcludePatterns && options.navExcludePatterns.length > 0) {
    for (const pattern of options.navExcludePatterns) {
      if (typeof pattern === 'string') {
        // String literal match
        if (path === pattern) {
          return true;
        }
      } else if (pattern instanceof RegExp) {
        // RegExp pattern match
        if (pattern.test(path)) {
          return true;
        }
      } else if (typeof pattern === 'function') {
        // Function that returns true if path should be excluded
        if (pattern(path, file)) {
          return true;
        }
      }
    }
  }

  // File should not be excluded
  return false;
} /**
 * Generate breadcrumbs for each file and add to its navigation metadata
 * @param {Object} files - The Metalsmith files object
 * @param {Array} navigation - The navigation structure
 * @param {Object} options - Plugin options
 */
function generateBreadcrumbs(files, navigation, options) {
  Object.keys(files).forEach((path) => {
    const file = files[path];
    if (!file.navigation) {
      file.navigation = {};
    }

    // Generate URL path for this file using the same logic as in the main plugin
    const name = path.split('/').pop().replace('.html', '');
    const segments = path.split('/');
    const parentDir = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

    let urlPath;
    if (segments.length === 1) {
      urlPath = createPath(path, name, options);
    } else {
      urlPath = createChildPath(path, name, parentDir, options);
    }

    // Find breadcrumb path for this file
    const breadcrumbs = findBreadcrumbs(urlPath, navigation);
    file.navigation.breadcrumbs = breadcrumbs;
  });
}

/**
 * Find a section by its path in the navigation structure
 * @param {string} sectionPath - The path of the section to find
 * @param {Array} navigation - The navigation structure
 * @returns {Object|null} - The section navigation item or null if not found
 */
function findSectionByPath(sectionPath, navigation) {
  // Normalize the section path for comparison
  const normalizedSectionPath = normalizePath(sectionPath);

  // Look for the section in the navigation
  for (const item of navigation) {
    const normalizedItemPath = normalizePath(item.path);

    // If we found the section
    if (normalizedItemPath === normalizedSectionPath) {
      return item;
    }

    // Recursively search in children
    if (item.children && item.children.length > 0) {
      const result = findSectionByPath(sectionPath, item.children);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Find children for a specific section to create contextual menus
 * @param {string} sectionPath - The path of the section to find children for
 * @param {Array} navigation - The navigation structure
 * @returns {Array|null} - Array of child navigation items or null if not found
 */
// Function commented out as it's not currently used
/* function findSectionChildren(sectionPath, navigation) {
  // Find the section first
  const section = findSectionByPath(sectionPath, navigation);

  // Return its children if found
  if (section) {
    return section.children || [];
  }

  return null;
} */

/**
 * Find breadcrumb path for a given URL
 * @param {string} urlPath - The URL path to find breadcrumbs for
 * @param {Array} navigation - The navigation structure
 * @param {Array} [currentPath=[]] - The current breadcrumb path (used recursively)
 * @returns {Array} - Array of breadcrumb items
 */
function findBreadcrumbs(urlPath, navigation, currentPath = []) {
  // Always start with the root element if not already in path
  if (currentPath.length === 0) {
    const homeItem = navigation.find((item) => item.path === '/');
    if (homeItem) {
      currentPath = [
        {
          title: homeItem.title,
          path: homeItem.path
        }
      ];

      // For homepage, return early
      if (urlPath === '/') {
        return currentPath;
      }
    }
  }

  return searchBreadcrumbs(urlPath, navigation, currentPath);
}

/**
 * Helper function to search for breadcrumbs in the navigation structure
 * @param {string} urlPath - The URL path to find breadcrumbs for
 * @param {Array} navigation - The navigation structure to search within
 * @param {Array} currentPath - The current breadcrumb path
 * @returns {Array} - Array of breadcrumb items
 */
function searchBreadcrumbs(urlPath, navigation, currentPath) {
  // Search for matching item at this level
  for (const item of navigation) {
    // Check if this is the item we're looking for
    if (normalizePath(item.path) === normalizePath(urlPath)) {
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
      (urlPath.startsWith(`${normalizePath(item.path)}/`) || (item.path === '/' && urlPath !== '/'))
    ) {
      // Add this item to the current path and search its children
      // Skip adding root again if it's already in the path
      const newPath =
        item.path === '/' && currentPath.some((p) => p.path === '/')
          ? currentPath
          : [
              ...currentPath,
              {
                title: item.title,
                path: item.path
              }
            ];

      const result = searchBreadcrumbs(urlPath, item.children, newPath);
      if (result) {
        return result;
      }
    }
  }

  // No matches in this branch
  return currentPath.length > 0 ? currentPath : null;
}

/**
 * Normalize path for consistent comparison
 * @param {string} path - The path to normalize
 * @returns {string} - Normalized path
 */
function normalizePath(path) {
  // Remove trailing slash except for root
  return path === '/' ? path : path.replace(/\/$/, '');
} /**
 * Metalsmith Navigation Plugin with Permalinks Support
 *
 * Creates a hierarchical navigation structure from files in your Metalsmith build
 * with support for permalinked URLs (e.g., page1/ instead of page1.html)
 */

/**
 * Factory function for the plugin
 * @param {Object} options - Plugin options
 * @param {string} [options.metadataKey='navigation'] - The key to use in the metadata
 * @param {function} [options.sortBy] - Function to sort navigation items
 * @param {boolean} [options.usePermalinks=false] - Whether to use permalink-style URLs
 * @param {Array} [options.navExcludePatterns=[]] - Patterns (string, RegExp, or function) to exclude files from navigation
 * @param {Object} [options.navIndex={}] - Object mapping page paths to numeric index values for custom ordering
 * @param {string} [options.rootPath='/'] - The root path to start building navigation from
 * @returns {Function} - The plugin function
 */
function navigationPlugin(options = {}) {
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
   * The actual plugin function that Metalsmith will call
   * @param {Object} files - The Metalsmith files object
   * @param {Object} metalsmith - The Metalsmith instance
   * @param {Function} done - Callback function
   */
  return function (files, metalsmith, done) {
    // Get the file paths as an array
    const filePaths = Object.keys(files);

    // Filter out excluded files
    const includedPaths = filePaths.filter((path) => !shouldExclude(path, files[path], opts));

    // Create the full navigation structure first
    const fullNavigation = createNavigationStructure(includedPaths, files, opts);

    // Apply custom sorting based on navIndex and sortBy function
    sortNavigation(fullNavigation, opts);

    // If rootPath is not '/', find the subsection to use as the root
    let navigation = fullNavigation;
    if (opts.rootPath !== '/') {
      // Normalize the root path
      const normalizedRootPath = normalizePath(opts.rootPath);

      // Find the subsection in the full navigation
      const rootSection = findSectionByPath(normalizedRootPath, fullNavigation);

      if (rootSection) {
        // If we found the section, use its children as the navigation
        navigation = rootSection.children || [];
      } else {
        // If section not found, use empty navigation
        navigation = [];
      }
    }

    // Add the navigation structure to the metalsmith metadata
    const metadata = metalsmith.metadata();
    metadata[opts.metadataKey] = navigation;

    // Generate breadcrumbs for each file and add to file metadata
    // Use the FULL navigation for breadcrumbs to ensure complete paths
    generateBreadcrumbs(files, fullNavigation, opts);

    // Also add the current file path to each file's metadata for active state detection in templates
    Object.keys(files).forEach((path) => {
      const file = files[path];
      const name = path.split('/').pop().replace('.html', '');
      const segments = path.split('/');
      const parentDir = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

      // Generate the URL path based on the same logic as the navigation
      let urlPath;
      if (segments.length === 1) {
        // Root level file
        urlPath = createPath(path, name, opts);
      } else {
        // Nested file
        urlPath = createChildPath(path, name, parentDir, opts);
      }

      // Add the URL path to the file's metadata
      file.urlPath = urlPath;

      // Initialize navigation object if it doesn't exist
      if (!file.navigation) {
        file.navigation = {};
      }

      // Add the path to the navigation object for active path detection
      file.navigation.path = urlPath;

      // File navigation is now set up
    });

    metalsmith.metadata(metadata);

    // Call the done callback to signal completion
    done();
  };
}

/**
 * Sort the navigation structure using navIndex and sortBy function
 * @param {Array} items - The navigation items to sort
 * @param {Object} options - Plugin options
 */
function sortNavigation(items, options) {
  if (!items || !items.length) {return;}

  // First apply navIndex from frontmatter and options
  if (options.navIndex && Object.keys(options.navIndex).length > 0) {
    // Add a 'navIndex' property to each item based on the navIndex option (if not already set by frontmatter)
    items.forEach((item) => {
      // Skip if navIndex is already set from file metadata
      if (item.navIndex !== null && item.navIndex !== undefined) {
        return;
      }

      // Get the normalized path (without trailing slash for permalinks)
      const normalizedPath = item.path.endsWith('/') ? item.path.slice(0, -1) : item.path;

      // Apply index if it exists for this path
      if (options.navIndex[normalizedPath] !== undefined) {
        item.navIndex = options.navIndex[normalizedPath];
      } else if (options.navIndex[item.path] !== undefined) {
        item.navIndex = options.navIndex[item.path];
      } else {
        // Default to a high number for items without explicit index
        item.navIndex = 1000;
      }
    });
  }

  // Sort items by navIndex
  items.sort((a, b) => {
    const indexA = a.navIndex !== null && a.navIndex !== undefined ? a.navIndex : 1000;
    const indexB = b.navIndex !== null && b.navIndex !== undefined ? b.navIndex : 1000;
    return indexA - indexB;
  });

  // Apply custom sorting function if provided
  if (typeof options.sortBy === 'function') {
    items.sort((a, b) => {
      // If navIndexes are the same, use sortBy function
      if (a.navIndex === b.navIndex) {
        return options.sortBy(a, b);
      }
      // Otherwise keep the navIndex ordering
      return 0;
    });
  }

  // Recursively sort children
  items.forEach((item) => {
    if (item.children && item.children.length > 0) {
      sortNavigation(item.children, options);
    }
  });
}

/**
 * Creates a hierarchical navigation structure from an array of file paths
 * @param {Array<string>} paths - Array of file paths
 * @param {Object} files - The Metalsmith files object (for accessing metadata)
 * @param {Object} options - Plugin options
 * @returns {Array} - Array of navigation objects with nested children
 */
function createNavigationStructure(paths, files, options) {
  // Initialize the root level navigation structure

  // Create a proper tree structure reflecting the directory hierarchy
  const navTree = {};

  // First, create a map of all directories
  paths.forEach((path) => {
    const segments = path.split('/');
    let currentLevel = navTree;

    // Build the tree structure for directories
    if (segments.length > 1) {
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (!currentLevel[segment]) {
          currentLevel[segment] = {
            __files: [],
            __dirs: {}
          };
        }
        currentLevel = currentLevel[segment].__dirs;
      }
    }

    // Add the file to the appropriate level
    if (segments.length === 1) {
      // Root level file
      if (!navTree.__files) {
        navTree.__files = [];
      }
      navTree.__files.push(path);
    } else {
      // Get the parent directory level
      let parentLevel = navTree;
      for (let i = 0; i < segments.length - 2; i++) {
        parentLevel = parentLevel[segments[i]].__dirs;
      }
      const parentDir = segments[segments.length - 2];
      parentLevel[parentDir].__files.push(path);
    }
  });

  // Now convert the tree to navigation items
  function processTree(tree, parentPath = '') {
    const items = [];

    // Process root-level special case
    if (parentPath === '') {
      // Add the home/index item if it exists
      const rootIndex = tree.__files?.find((f) => f === 'index.html');
      if (rootIndex) {
        items.push(createNavItem('home', files[rootIndex], '/', []));
      }

      // Add all other root level files (except index.html)
      tree.__files?.forEach((path) => {
        if (path !== 'index.html') {
          const name = path.replace('.html', '');
          const urlPath = createPath(path, name, options);
          items.push(createNavItem(name, files[path], urlPath, []));
        }
      });

      // Process directories
      Object.keys(tree).forEach((dirName) => {
        if (dirName !== '__files' && dirName !== '__dirs') {
          const dirItem = processDirectory(dirName, tree[dirName], dirName);
          if (dirItem) {
            items.push(dirItem);
          }
        }
      });
    }

    return items;
  }

  // Process a directory and its contents
  function processDirectory(dirName, dirData, dirPath) {
    const children = [];

    // Check if the directory has an index file
    const indexPath = `${dirPath}/index.html`;
    const indexFile = files[indexPath];

    // Process all non-index files in this directory
    dirData.__files?.forEach((path) => {
      if (!path.endsWith('/index.html')) {
        // Get just the filename without extension
        const segments = path.split('/');
        const fileName = segments[segments.length - 1];
        const name = fileName.replace('.html', '');

        // Create the URL path
        const urlPath = createChildPath(path, name, dirPath, options);

        // Add to children
        children.push(createNavItem(name, files[path], urlPath, []));
      }
    });

    // Process subdirectories
    Object.keys(dirData.__dirs).forEach((subDirName) => {
      const subDirPath = `${dirPath}/${subDirName}`;
      const subDirItem = processDirectory(subDirName, dirData.__dirs[subDirName], subDirPath);
      if (subDirItem) {
        children.push(subDirItem);
      }
    });

    // Create the directory item (using index file metadata if available)
    const dirUrlPath = createDirectoryPath(dirPath, options);
    const navItem = createNavItem(dirName, indexFile || null, dirUrlPath, children);

    return navItem;
  }

  // Start processing from the root
  return processTree(navTree);
}

/**
 * Creates a navigation item object
 * @param {string} name - The default name derived from filename
 * @param {Object} fileData - The file data object
 * @param {string} path - The URL path
 * @param {Array} [children=[]] - Child navigation items
 * @returns {Object} - The navigation item
 */
function createNavItem(name, fileData, path, children = []) {
  // Determine the title to use - prioritize in this order:
  // 1. navigation.navLabel (if it exists)
  // 2. file.title (if it exists)
  // 3. Formatted version of the filename
  let title;

  if (fileData && fileData.navigation && fileData.navigation.navLabel) {
    title = fileData.navigation.navLabel;
  } else if (fileData && fileData.title) {
    title = fileData.title;
  } else {
    title = toTitleCase(name);
  }

  // Check for custom navigation index in file metadata
  let navIndex = null;
  if (fileData && fileData.navigation && fileData.navigation.navIndex !== undefined) {
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
 * Create a path for a file based on permalink settings
 * @param {string} path - The file path
 * @param {string} name - The file name without extension
 * @param {Object} options - Plugin options
 * @returns {string} - The URL path
 */
function createPath(path, name, options) {
  if (options.usePermalinks) {
    // For permalinks, we use the pattern (typically '/:path/')
    if (name === 'index') {
      return '/';
    }
    return `/${name}/`;
  } 
    // For regular links, we keep the original extension
    return `/${path}`;
  
}

/**
 * Create a path for a directory
 * @param {string} dirPath - The directory path
 * @param {Object} options - Plugin options
 * @returns {string} - The URL path
 */
function createDirectoryPath(dirPath, options) {
  if (options.usePermalinks) {
    return `/${dirPath}/`;
  } 
    // In non-permalink mode, link to the directory index
    return `/${dirPath}/index.html`;
  
}

/**
 * Create a path for a child file
 * @param {string} path - The file path
 * @param {string} name - The file name without extension
 * @param {string} parentDir - The parent directory
 * @param {Object} options - Plugin options
 * @returns {string} - The URL path
 */
function createChildPath(path, name, parentDir, options) {
  if (options.usePermalinks) {
    if (name === 'index') {
      // If this is an index file, link to the parent directory
      return `/${parentDir}/`;
    }
    // For permalinks, use the clean URL format
    return `/${parentDir}/${name}/`;
  } 
    // For regular links, preserve the file extension
    return `/${parentDir}/${name}.html`;
  
}

/**
 * Helper function to convert a string to title case
 * @param {string} str - The string to convert
 * @returns {string} - Title-cased string
 */
function toTitleCase(str) {
  return str
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Export the plugin
export default navigationPlugin;
