/**
 * Navigation structure generation for metalsmith-menu-plus
 */

import { normalizePath, createPath, createDirectoryPath, createChildPath } from '../utils/index.js';

/**
 * Creates a navigation item object
 *
 * Title resolution order: navigation.navLabel → file.title → raw filename.
 * Filename is used verbatim — no transformation — so set `title` or
 * `navigation.navLabel` in frontmatter for human-readable labels.
 *
 * @param {string} name - The default name derived from filename
 * @param {Object} fileData - The file data object
 * @param {string} path - The URL path
 * @param {Array} [children=[]] - Child navigation items
 * @returns {Object} The navigation item
 */
export function createNavItem(name, fileData, path, children = []) {
  let title;

  if (fileData && fileData.navigation && fileData.navigation.navLabel) {
    title = fileData.navigation.navLabel;
  } else if (fileData && fileData.title) {
    title = fileData.title;
  } else {
    title = name;
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
 * Creates a hierarchical navigation structure from an array of file paths
 * @param {Array<string>} paths - Array of file paths
 * @param {Object} files - The Metalsmith files object (for accessing metadata)
 * @param {Object} options - Plugin options
 * @returns {Array} Array of navigation objects with nested children
 */
export function createNavigationStructure(paths, files, options) {
  // Initialize the root level navigation structure
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

  // Process a directory and its contents.
  // Subdirectories are paired with sibling .html files of the same name
  // (e.g. blog/posts.html next to blog/posts/) so the file becomes the
  // nav item and the directory's contents become its children.
  function processDirectory(dirName, dirData, dirPath) {
    const children = [];
    const indexPath = `${dirPath}/index.html`;
    const indexFile = files[indexPath];

    const subDirNames = Object.keys(dirData.__dirs);
    const pairedFilePaths = new Set();

    subDirNames.forEach((subDirName) => {
      const subDirPath = `${dirPath}/${subDirName}`;
      const siblingFilePath = `${dirPath}/${subDirName}.html`;
      const siblingFile = dirData.__files?.includes(siblingFilePath) ? files[siblingFilePath] : null;

      const subDirItem = processDirectory(subDirName, dirData.__dirs[subDirName], subDirPath);

      if (siblingFile) {
        pairedFilePaths.add(siblingFilePath);
        const urlPath = createChildPath(siblingFilePath, subDirName, dirPath, options);
        children.push(createNavItem(subDirName, siblingFile, urlPath, subDirItem.children));
      } else {
        children.push(subDirItem);
      }
    });

    dirData.__files?.forEach((path) => {
      if (path.endsWith('/index.html')) {
        return;
      }
      if (pairedFilePaths.has(path)) {
        return;
      }
      const segments = path.split('/');
      const fileName = segments[segments.length - 1];
      const name = fileName.replace('.html', '');
      const urlPath = createChildPath(path, name, dirPath, options);
      children.push(createNavItem(name, files[path], urlPath, []));
    });

    const dirUrlPath = createDirectoryPath(dirPath, options);
    return createNavItem(dirName, indexFile || null, dirUrlPath, children);
  }

  // Now convert the tree to navigation items
  function processTree(tree) {
    const items = [];

    // Add the home/index item if it exists
    const rootIndex = tree.__files?.find((f) => f === 'index.html');
    if (rootIndex) {
      items.push(createNavItem('home', files[rootIndex], '/', []));
    }

    // Process all directories at root level
    Object.keys(tree).forEach((dirName) => {
      if (dirName !== '__files' && dirName !== '__dirs') {
        // Check if there's a corresponding HTML file for this directory
        const dirFile = `${dirName}.html`;
        const hasMatchingFile = tree.__files?.includes(dirFile);

        // Process the directory's children
        const dirPath = dirName;
        const children = processDirectory(dirName, tree[dirName], dirPath).children;

        if (hasMatchingFile) {
          // If there's a matching file, add children to that nav item
          const name = dirFile.replace('.html', '');
          const urlPath = createPath(dirFile, name, options);
          items.push(createNavItem(name, files[dirFile], urlPath, children));
        } else {
          // Otherwise create a directory item
          const dirUrlPath = createDirectoryPath(dirPath, options);
          const indexPath = `${dirPath}/index.html`;
          const indexFile = files[indexPath];
          items.push(createNavItem(dirName, indexFile || null, dirUrlPath, children));
        }
      }
    });

    // Add remaining root level files (except index.html and those matching directories)
    const processedDirs = Object.keys(tree).filter((key) => key !== '__files' && key !== '__dirs');
    const processedFiles = [`index.html`, ...processedDirs.map((dir) => `${dir}.html`)];

    tree.__files?.forEach((path) => {
      if (!processedFiles.includes(path)) {
        const name = path.replace('.html', '');
        const urlPath = createPath(path, name, options);
        items.push(createNavItem(name, files[path], urlPath, []));
      }
    });

    return items;
  }

  // Start processing from the root
  return processTree(navTree);
}

/**
 * Find a section by its path in the navigation structure
 * @param {string} sectionPath - The path of the section to find
 * @param {Array} navigation - The navigation structure
 * @returns {Object|null} The section navigation item or null if not found
 */
export function findSectionByPath(sectionPath, navigation) {
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
 * Look up a navIndex value for an item's path in options.navIndex.
 * Tries the raw path first, then the path without trailing slash.
 * @param {Object} item - Navigation item
 * @param {Object} options - Plugin options
 * @returns {number|undefined} The navIndex from options, or undefined if not set
 */
function lookupOptionsNavIndex(item, options) {
  if (!options.navIndex) {
    return undefined;
  }
  if (options.navIndex[item.path] !== undefined) {
    return options.navIndex[item.path];
  }
  const normalizedPath = item.path !== '/' && item.path.endsWith('/') ? item.path.slice(0, -1) : item.path;
  if (options.navIndex[normalizedPath] !== undefined) {
    return options.navIndex[normalizedPath];
  }
  return undefined;
}

/**
 * Sort the navigation structure using navIndex and an optional sortBy function.
 * Resolution order for each item: existing item.navIndex (from frontmatter) →
 * options.navIndex[path] → Infinity (nulls-last). The sortBy function acts as
 * a tiebreaker when two items share the same effective navIndex.
 * @param {Array} items - The navigation items to sort
 * @param {Object} options - Plugin options
 */
export function sortNavigation(items, options) {
  if (!items || !items.length) {
    return;
  }

  // Fill in navIndex from options for items that didn't get one from frontmatter.
  // Items with no explicit index remain null and fall through to Infinity in sort.
  items.forEach((item) => {
    if (item.navIndex !== null && item.navIndex !== undefined) {
      return;
    }
    const fromOptions = lookupOptionsNavIndex(item, options);
    if (fromOptions !== undefined) {
      item.navIndex = fromOptions;
    }
  });

  items.sort((a, b) => {
    const ai = a.navIndex !== null && a.navIndex !== undefined ? a.navIndex : Infinity;
    const bi = b.navIndex !== null && b.navIndex !== undefined ? b.navIndex : Infinity;
    if (ai !== bi) {
      return ai - bi;
    }
    return typeof options.sortBy === 'function' ? options.sortBy(a, b) : 0;
  });

  items.forEach((item) => {
    if (item.children && item.children.length > 0) {
      sortNavigation(item.children, options);
    }
  });
}
