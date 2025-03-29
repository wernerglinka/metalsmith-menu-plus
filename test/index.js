/**
 * Unit tests for the Metalsmith Menu Plugin
 *
 * Tests the navigation structure generation with support for nested directories
 * and proper hierarchical representation.
 */

import assert from 'node:assert/strict';
import Metalsmith from 'metalsmith';
import navigationPlugin from '../src/index.js';

describe('Metalsmith Menu Plugin', () => {
  // Mock files object that represents the filesystem structure
  const mockFiles = {
    'index.html': { title: 'Home Page' },
    'page3.html': { title: 'Page 3' },
    'page4.html': { title: 'Page 4' },
    'blog/index.html': { title: 'Blog Index' },
    'blog/blogpost-1.html': { title: 'Blog Post 1' },
    'blog/blogpost-2.html': { title: 'Blog Post 2' },
    'blog/blogpost-3.html': { title: 'Blog Post 3' },
    'page2/index.html': { title: 'Page 2' },
    'page2/page2.2/index.html': { title: 'Page 2.2' },
    'page2/page2.2/page2.2.2/index.html': { title: 'Page 2.2.2' }
  };

  // Create a Metalsmith instance for testing
  function createMetalsmith() {
    return Metalsmith('test').metadata({}).source('src').destination('build');
  }

  it('should create a properly nested navigation structure with permalinks', (done) => {
    // Create an instance of the plugin with permalinks enabled
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'testNav'
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our mock objects
    plugin(mockFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().testNav;

      // Verify the structure
      assert.ok(Array.isArray(navigation), 'Navigation should be an array');

      // Find the home item
      const homeItem = navigation.find((item) => item.title === 'Home Page');
      assert.ok(homeItem, 'Home item should exist');
      assert.strictEqual(homeItem.path, '/', 'Home path should be /');

      // Find the blog item
      const blogItem = navigation.find((item) => item.title === 'Blog Index');
      assert.ok(blogItem, 'Blog item should exist');
      assert.strictEqual(blogItem.path, '/blog/', 'Blog path should be /blog/');
      assert.ok(Array.isArray(blogItem.children), 'Blog children should be an array');
      assert.strictEqual(blogItem.children.length, 3, 'Blog should have 3 children');

      // Test breadcrumbs
      const deeplyNestedFile = mockFiles['page2/page2.2/page2.2.2/index.html'];
      assert.ok(deeplyNestedFile.navigation, 'File should have navigation metadata');
      assert.ok(Array.isArray(deeplyNestedFile.navigation.breadcrumbs), 'Breadcrumbs should be an array');

      done();
    });
  });

  it('should exclude items marked with navExclude', (done) => {
    // Create a modified files object with exclusion metadata
    const filesWithExclusion = { ...mockFiles };
    filesWithExclusion['page4.html'] = {
      title: 'Page 4',
      navigation: { navExclude: true }
    };

    // Create an instance of the plugin
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'testNav'
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our mock objects
    plugin(filesWithExclusion, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().testNav;

      // Verify the excluded item is not in the navigation
      const excludedItem = navigation.find((item) => item.title === 'Page 4');
      assert.strictEqual(excludedItem, undefined, 'Excluded item should not be in navigation');

      // Check that blog items are findable
      const blogItem = navigation.find((item) => item.title === 'Blog Index');
      assert.ok(blogItem, 'Blog item should exist');

      done();
    });
  });

  it('should respect navLabel and title metadata', (done) => {
    // Create a modified files object with navigation metadata
    const filesWithMeta = { ...mockFiles };
    filesWithMeta['blog/blogpost-1.html'] = {
      title: 'Blog Post 1',
      navigation: { navLabel: 'Custom Label' }
    };

    // Create an instance of the plugin
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'testNav'
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our mock objects
    plugin(filesWithMeta, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().testNav;

      // Find the blog item
      const blogItem = navigation.find((item) => item.title === 'Blog Index');

      // Find the custom labeled blog post
      const customLabelItem = blogItem.children.find((item) => item.title === 'Custom Label');
      assert.ok(customLabelItem, 'Custom labeled item should exist');

      done();
    });
  });

  it('should generate section-specific navigation with rootPath option', (done) => {
    // Create an instance of the plugin with rootPath set to blog section
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'blogNav',
      rootPath: '/blog/'
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our mock objects
    plugin(mockFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().blogNav;

      // Verify the structure - should only contain blog posts, not the main site nav
      assert.ok(Array.isArray(navigation), 'Navigation should be an array');
      assert.strictEqual(navigation.length, 3, 'Blog nav should have 3 items (the blog posts)');

      // Check that the items are the blog posts
      const blogPost1 = navigation.find((item) => item.title === 'Blog Post 1');
      const blogPost2 = navigation.find((item) => item.title === 'Blog Post 2');
      const blogPost3 = navigation.find((item) => item.title === 'Blog Post 3');

      assert.ok(blogPost1, 'Blog Post 1 should exist in the navigation');
      assert.ok(blogPost2, 'Blog Post 2 should exist in the navigation');
      assert.ok(blogPost3, 'Blog Post 3 should exist in the navigation');

      // Make sure no root-level items are included
      const homePage = navigation.find((item) => item.title === 'Home Page');
      assert.strictEqual(homePage, undefined, 'Home page should not be in blog-specific navigation');

      done();
    });
  });

  it('should return empty navigation when rootPath section does not exist', (done) => {
    // Create an instance of the plugin with rootPath set to a non-existent section
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'nonExistentNav',
      rootPath: '/does-not-exist/'
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our mock objects
    plugin(mockFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().nonExistentNav;

      // Verify the structure - should be an empty array
      assert.ok(Array.isArray(navigation), 'Navigation should be an array');
      assert.strictEqual(navigation.length, 0, 'Navigation should be empty');

      done();
    });
  });

  it('should handle custom sorting functions properly', (done) => {
    // Create an instance of the plugin with custom sorting
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'sortedNav',
      sortBy: (a, b) => {
        // Sort by title in reverse alphabetical order
        return b.title.localeCompare(a.title);
      }
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our mock objects
    plugin(mockFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().sortedNav;

      // Find items that are at the same navIndex level to check sorting
      // The blog posts should be sorted in reverse alphabetical order
      const blogItem = navigation.find((item) => item.title === 'Blog Index');
      assert.ok(blogItem, 'Blog item should exist');

      // Get the blog post titles to verify sorting
      const blogPostTitles = blogItem.children.map((child) => child.title);

      // Check that they're in reverse alphabetical order
      assert.deepStrictEqual(
        blogPostTitles,
        ['Blog Post 3', 'Blog Post 2', 'Blog Post 1'],
        'Blog posts should be sorted in reverse alphabetical order'
      );

      done();
    });
  });

  it('should handle navIndex correctly from frontmatter and options', (done) => {
    // Create modified files with navIndex in frontmatter
    const filesWithNavIndex = { ...mockFiles };
    filesWithNavIndex['page3.html'] = {
      title: 'Page 3',
      navigation: { navIndex: 5 }
    };

    // Need to also add a navIndex for home page
    filesWithNavIndex['index.html'] = {
      title: 'Home Page',
      navigation: { navIndex: 1 } // Ensure home page comes first
    };

    // Create an instance of the plugin with navIndex in options
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'indexedNav',
      navIndex: {
        '/page4': 10,
        '/blog': 20
      }
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our modified files
    plugin(filesWithNavIndex, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().indexedNav;

      // Find the items with specific navIndex
      const homePage = navigation.find((item) => item.title === 'Home Page');
      const page3 = navigation.find((item) => item.title === 'Page 3');
      const page4 = navigation.find((item) => item.title === 'Page 4');
      const blogIndex = navigation.find((item) => item.title === 'Blog Index');

      assert.ok(homePage, 'Home Page should exist');
      assert.ok(page3, 'Page 3 should exist');
      assert.ok(page4, 'Page 4 should exist');
      assert.ok(blogIndex, 'Blog Index should exist');

      // Verify their navIndex values
      assert.strictEqual(homePage.navIndex, 1, 'Home Page should have navIndex of 1');
      assert.strictEqual(page3.navIndex, 5, 'Page 3 should have navIndex of 5 from frontmatter');
      assert.strictEqual(page4.navIndex, 10, 'Page 4 should have navIndex of 10 from options');
      assert.strictEqual(blogIndex.navIndex, 20, 'Blog Index should have navIndex of 20 from options');

      // Verify they're in the correct positions
      const positions = navigation.map((item) => item.title);
      assert.strictEqual(positions[0], 'Home Page', 'Home should be first');
      assert.strictEqual(positions[1], 'Page 3', 'Page 3 should be second');
      assert.strictEqual(positions[2], 'Page 4', 'Page 4 should be third');
      assert.strictEqual(positions[3], 'Blog Index', 'Blog Index should be fourth');

      done();
    });
  });

  it('should handle navigation without permalinks enabled', (done) => {
    // Create an instance of the plugin with permalinks disabled
    const plugin = navigationPlugin({
      usePermalinks: false,
      metadataKey: 'regularNav'
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our mock objects
    plugin(mockFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().regularNav;

      // Find specific items to check their paths
      const homePage = navigation.find((item) => item.title === 'Home Page');
      const blogIndex = navigation.find((item) => item.title === 'Blog Index');
      const blogPost = blogIndex.children.find((item) => item.title === 'Blog Post 1');
      const nestedIndex = navigation.find((item) => item.title === 'Page 2');

      // Home page is special - it's still / even without permalinks
      assert.strictEqual(homePage.path, '/', 'Home page should have path /');
      assert.strictEqual(blogIndex.path, '/blog/index.html', 'Blog index should have path /blog/index.html');
      assert.strictEqual(blogPost.path, '/blog/blogpost-1.html', 'Blog post should have path /blog/blogpost-1.html');
      assert.strictEqual(nestedIndex.path, '/page2/index.html', 'Nested index should have path /page2/index.html');

      done();
    });
  });

  it('should generate titles from filenames when no explicit title is provided', (done) => {
    // Create modified files with no titles for some files
    const filesWithoutTitles = {
      'index.html': { title: 'Home Page' },
      'no-title.html': {}, // No title provided
      'another_file.html': {}, // No title, with underscore
      'blog/index.html': { title: 'Blog Index' }
    };

    // Create an instance of the plugin
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'noTitlesNav'
    });

    // Create a metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin function with our modified files
    plugin(filesWithoutTitles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the generated navigation
      const navigation = metalsmith.metadata().noTitlesNav;

      // Find the items with auto-generated titles
      const noTitlePage = navigation.find((item) => item.path === '/no-title/');
      const anotherFilePage = navigation.find((item) => item.path === '/another_file/');

      // Verify the auto-generated titles (should be converted to title case)
      assert.ok(noTitlePage, 'Page without title should exist in navigation');
      assert.strictEqual(noTitlePage.title, 'No Title', 'Title should be generated from filename with hyphens');

      assert.ok(anotherFilePage, 'Page with underscore in name should exist in navigation');
      assert.strictEqual(
        anotherFilePage.title,
        'Another File',
        'Title should be generated from filename with underscore'
      );

      done();
    });
  });

  it('should correctly map non-index file paths with permalinks', (done) => {
    // Create test files with various path types
    const pathTestFiles = {
      'index.html': { title: 'Home' },
      'about.html': { title: 'About' },
      'deep/path/file.html': { title: 'Deep File' },
      'deep/path/index.html': { title: 'Deep Index' },
      'deep/index.html': { title: 'Mid-Level Index' }
    };

    // Create an instance of the plugin with permalinks
    const permalinkPlugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'testNav'
    });

    // Create metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin
    permalinkPlugin(pathTestFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the navigation
      const navigation = metalsmith.metadata().testNav;

      // Find specific items to check their paths
      const homePage = navigation.find((item) => item.title === 'Home');
      const aboutPage = navigation.find((item) => item.title === 'About');
      const midLevelPage = navigation.find((item) => item.title === 'Mid-Level Index');
      const deepIndexPage = midLevelPage.children.find((item) => item.title === 'Deep Index');

      // Verify the permalink paths
      assert.strictEqual(homePage.path, '/', 'Home page should have path /');
      assert.strictEqual(aboutPage.path, '/about/', 'About page should have permalink format /about/');
      assert.strictEqual(midLevelPage.path, '/deep/', 'Mid-level index should have path /deep/');
      assert.strictEqual(deepIndexPage.path, '/deep/path/', 'Deep index should have path /deep/path/');

      done();
    });
  });

  it('should correctly map directory paths without permalinks', (done) => {
    // Create test files with nested directories
    const dirTestFiles = {
      'index.html': { title: 'Home' },
      'docs/index.html': { title: 'Docs Index' },
      'docs/getting-started/index.html': { title: 'Getting Started' }
    };

    // Create an instance of the plugin without permalinks
    const nonPermalinkPlugin = navigationPlugin({
      usePermalinks: false,
      metadataKey: 'dirNav'
    });

    // Create metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin
    nonPermalinkPlugin(dirTestFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the navigation
      const navigation = metalsmith.metadata().dirNav;

      // Find specific items to check their paths
      const docsIndex = navigation.find((item) => item.title === 'Docs Index');
      const gettingStartedPage = docsIndex.children.find((item) => item.title === 'Getting Started');

      // Verify the non-permalink paths for directories
      assert.strictEqual(docsIndex.path, '/docs/index.html', 'Docs index should have path /docs/index.html');
      assert.strictEqual(
        gettingStartedPage.path,
        '/docs/getting-started/index.html',
        'Getting Started should have path /docs/getting-started/index.html'
      );

      done();
    });
  });

  it('should handle all types of exclusion patterns', (done) => {
    // Create test files with various files for exclusion testing
    const exclusionTestFiles = {
      'index.html': { title: 'Home' },
      'about.html': { title: 'About' },
      'private/secret.html': { title: 'Secret', navigation: { navExclude: true } },
      'temp/file1.html': { title: 'Temp File 1' },
      'temp/file2.html': { title: 'Temp File 2' },
      'drafts/draft1.html': { draft: true, title: 'Draft 1' },
      'special-case.html': { title: 'Special Case' }
    };

    // Create an instance of the plugin with various exclusion patterns
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'exclusionNav',
      navExcludePatterns: [
        // String pattern
        'special-case.html',
        // RegExp pattern
        /\/temp\//,
        // Function pattern
        (path, file) => file && file.draft === true
      ]
    });

    // Create metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin
    plugin(exclusionTestFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Get the navigation
      const navigation = metalsmith.metadata().exclusionNav;

      // Verify items are excluded properly
      const homePage = navigation.find((item) => item.title === 'Home');
      const aboutPage = navigation.find((item) => item.title === 'About');
      const secretPage = navigation.find((item) => item.title === 'Secret');
      const tempFile = navigation.find((item) => item.title === 'Temp File 1');
      const draftPage = navigation.find((item) => item.title === 'Draft 1');
      const specialPage = navigation.find((item) => item.title === 'Special Case');

      assert.ok(homePage, 'Home page should exist in navigation');
      assert.ok(aboutPage, 'About page should exist in navigation');
      assert.strictEqual(secretPage, undefined, 'Secret page should be excluded by file metadata');
      assert.strictEqual(tempFile, undefined, 'Temp files should be excluded by RegExp pattern');
      assert.strictEqual(draftPage, undefined, 'Draft files should be excluded by function pattern');
      assert.strictEqual(specialPage, undefined, 'Special page should be excluded by string pattern');

      done();
    });
  });

  it('should handle non-index child paths with and without permalinks', (done) => {
    // Create test files for child path tests
    const childPathFiles = {
      'index.html': { title: 'Home' },
      'products/index.html': { title: 'Products' },
      'products/item1.html': { title: 'Product 1' },
      'products/item2.html': { title: 'Product 2' }
    };

    // Create one instance with permalinks and one without
    const permalinkPlugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'permalinkNav'
    });

    const nonPermalinkPlugin = navigationPlugin({
      usePermalinks: false,
      metadataKey: 'htmlNav'
    });

    // Create metalsmith instances
    const permalinkMetalsmith = createMetalsmith();
    const htmlMetalsmith = createMetalsmith();

    // Call the plugins sequentially
    permalinkPlugin(childPathFiles, permalinkMetalsmith, (err) => {
      if (err) {return done(err);}

      nonPermalinkPlugin(childPathFiles, htmlMetalsmith, (err) => {
        if (err) {return done(err);}

        // Check permalink version
        const permalinkNav = permalinkMetalsmith.metadata().permalinkNav;
        const permalinkProducts = permalinkNav.find((item) => item.title === 'Products');
        const permalinkItem = permalinkProducts.children.find((item) => item.title === 'Product 1');

        // Check non-permalink version
        const htmlNav = htmlMetalsmith.metadata().htmlNav;
        const htmlProducts = htmlNav.find((item) => item.title === 'Products');
        const htmlItem = htmlProducts.children.find((item) => item.title === 'Product 1');

        // Verify the paths
        assert.strictEqual(permalinkItem.path, '/products/item1/', 'With permalinks, child should have clean URL');
        assert.strictEqual(
          htmlItem.path,
          '/products/item1.html',
          'Without permalinks, child should have .html extension'
        );

        done();
      });
    });
  });

  it('should add the path to the file navigation object for active state detection', (done) => {
    // Create test files
    const activePathFiles = {
      'index.html': { title: 'Home' },
      'about.html': { title: 'About' },
      'blog/index.html': { title: 'Blog' },
      'blog/post1.html': { title: 'Blog Post 1' }
    };

    // Create an instance of the plugin
    const plugin = navigationPlugin({
      usePermalinks: true,
      metadataKey: 'activePathNav'
    });

    // Create metalsmith instance
    const metalsmith = createMetalsmith();

    // Call the plugin
    plugin(activePathFiles, metalsmith, (err) => {
      if (err) {return done(err);}

      // Check that the path is added to the navigation object of each file
      assert.strictEqual(activePathFiles['index.html'].navigation.path, '/', 'Home page navigation should have path /');
      assert.strictEqual(
        activePathFiles['about.html'].navigation.path,
        '/about/',
        'About page navigation should have path /about/'
      );
      assert.strictEqual(
        activePathFiles['blog/index.html'].navigation.path,
        '/blog/',
        'Blog index navigation should have path /blog/'
      );
      assert.strictEqual(
        activePathFiles['blog/post1.html'].navigation.path,
        '/blog/post1/',
        'Blog post navigation should have path /blog/post1/'
      );

      done();
    });
  });
});
