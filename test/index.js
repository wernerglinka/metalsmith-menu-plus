/**
 * Integration tests for the Metalsmith Menu Plugin
 *
 * Tests the navigation structure generation with support for nested directories
 * and proper hierarchical representation using real Metalsmith builds.
 */

import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import Metalsmith from 'metalsmith';
import navigationPlugin from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixture(p) {
  return resolve(__dirname, 'fixtures', p);
}

describe('Metalsmith Menu Plugin', () => {
  it('should export a named plugin function matching package.json name', () => {
    assert.strictEqual(navigationPlugin.name, 'menuPlus');
  });

  it('should create a properly nested navigation structure with permalinks', async () => {
    const ms = Metalsmith(fixture('basic')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'testNav'
      })
    );

    const files = await ms.process();
    const navigation = ms.metadata().testNav;

    assert.ok(Array.isArray(navigation), 'Navigation should be an array');

    const homeItem = navigation.find((item) => item.title === 'Home Page');
    assert.ok(homeItem, 'Home item should exist');
    assert.strictEqual(homeItem.path, '/', 'Home path should be /');

    const blogItem = navigation.find((item) => item.title === 'Blog Index');
    assert.ok(blogItem, 'Blog item should exist');
    assert.strictEqual(blogItem.path, '/blog/', 'Blog path should be /blog/');
    assert.ok(Array.isArray(blogItem.children), 'Blog children should be an array');
    assert.strictEqual(blogItem.children.length, 3, 'Blog should have 3 children');

    const deeplyNestedFile = files['page2/page2.2/page2.2.2/index.html'];
    assert.ok(deeplyNestedFile.navigation, 'File should have navigation metadata');
    assert.ok(Array.isArray(deeplyNestedFile.navigation.breadcrumbs), 'Breadcrumbs should be an array');
  });

  it('should exclude items marked with navExclude', async () => {
    const ms = Metalsmith(fixture('nav-exclude')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'testNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().testNav;

    const excludedItem = navigation.find((item) => item.title === 'Page 4');
    assert.strictEqual(excludedItem, undefined, 'Excluded item should not be in navigation');

    const blogItem = navigation.find((item) => item.title === 'Blog Index');
    assert.ok(blogItem, 'Blog item should exist');
  });

  it('should respect navLabel and title metadata', async () => {
    const ms = Metalsmith(fixture('nav-label')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'testNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().testNav;

    const blogItem = navigation.find((item) => item.title === 'Blog Index');
    const customLabelItem = blogItem.children.find((item) => item.title === 'Custom Label');
    assert.ok(customLabelItem, 'Custom labeled item should exist');
  });

  it('should generate section-specific navigation with rootPath option', async () => {
    const ms = Metalsmith(fixture('basic')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'blogNav',
        rootPath: '/blog/'
      })
    );

    await ms.process();
    const navigation = ms.metadata().blogNav;

    assert.ok(Array.isArray(navigation), 'Navigation should be an array');
    assert.strictEqual(navigation.length, 3, 'Blog nav should have 3 items (the blog posts)');

    const blogPost1 = navigation.find((item) => item.title === 'Blog Post 1');
    const blogPost2 = navigation.find((item) => item.title === 'Blog Post 2');
    const blogPost3 = navigation.find((item) => item.title === 'Blog Post 3');

    assert.ok(blogPost1, 'Blog Post 1 should exist in the navigation');
    assert.ok(blogPost2, 'Blog Post 2 should exist in the navigation');
    assert.ok(blogPost3, 'Blog Post 3 should exist in the navigation');

    const homePage = navigation.find((item) => item.title === 'Home Page');
    assert.strictEqual(homePage, undefined, 'Home page should not be in blog-specific navigation');
  });

  it('should return empty navigation when rootPath section does not exist', async () => {
    const ms = Metalsmith(fixture('basic')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'nonExistentNav',
        rootPath: '/does-not-exist/'
      })
    );

    await ms.process();
    const navigation = ms.metadata().nonExistentNav;

    assert.ok(Array.isArray(navigation), 'Navigation should be an array');
    assert.strictEqual(navigation.length, 0, 'Navigation should be empty');
  });

  it('should handle custom sorting functions properly', async () => {
    const ms = Metalsmith(fixture('basic')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'sortedNav',
        sortBy: (a, b) => b.title.localeCompare(a.title)
      })
    );

    await ms.process();
    const navigation = ms.metadata().sortedNav;

    const blogItem = navigation.find((item) => item.title === 'Blog Index');
    assert.ok(blogItem, 'Blog item should exist');

    const blogPostTitles = blogItem.children.map((child) => child.title);
    assert.deepStrictEqual(
      blogPostTitles,
      ['Blog Post 3', 'Blog Post 2', 'Blog Post 1'],
      'Blog posts should be sorted in reverse alphabetical order'
    );
  });

  it('should handle navIndex correctly from frontmatter and options', async () => {
    const ms = Metalsmith(fixture('nav-index')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'indexedNav',
        navIndex: {
          '/page4': 10,
          '/blog': 20
        }
      })
    );

    await ms.process();
    const navigation = ms.metadata().indexedNav;

    const homePage = navigation.find((item) => item.title === 'Home Page');
    const page3 = navigation.find((item) => item.title === 'Page 3');
    const page4 = navigation.find((item) => item.title === 'Page 4');
    const blogIndex = navigation.find((item) => item.title === 'Blog Index');

    assert.ok(homePage, 'Home Page should exist');
    assert.ok(page3, 'Page 3 should exist');
    assert.ok(page4, 'Page 4 should exist');
    assert.ok(blogIndex, 'Blog Index should exist');

    assert.strictEqual(homePage.navIndex, 1, 'Home Page should have navIndex of 1');
    assert.strictEqual(page3.navIndex, 5, 'Page 3 should have navIndex of 5 from frontmatter');
    assert.strictEqual(page4.navIndex, 10, 'Page 4 should have navIndex of 10 from options');
    assert.strictEqual(blogIndex.navIndex, 20, 'Blog Index should have navIndex of 20 from options');

    const positions = navigation.map((item) => item.title);
    assert.strictEqual(positions[0], 'Home Page', 'Home should be first');
    assert.strictEqual(positions[1], 'Page 3', 'Page 3 should be second');
    assert.strictEqual(positions[2], 'Page 4', 'Page 4 should be third');
    assert.strictEqual(positions[3], 'Blog Index', 'Blog Index should be fourth');
  });

  it('should handle navigation without permalinks enabled', async () => {
    const ms = Metalsmith(fixture('basic')).use(
      navigationPlugin({
        usePermalinks: false,
        metadataKey: 'regularNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().regularNav;

    const homePage = navigation.find((item) => item.title === 'Home Page');
    const blogIndex = navigation.find((item) => item.title === 'Blog Index');
    const blogPost = blogIndex.children.find((item) => item.title === 'Blog Post 1');
    const nestedIndex = navigation.find((item) => item.title === 'Page 2');

    assert.strictEqual(homePage.path, '/', 'Home page should have path /');
    assert.strictEqual(blogIndex.path, '/blog/index.html', 'Blog index should have path /blog/index.html');
    assert.strictEqual(blogPost.path, '/blog/blogpost-1.html', 'Blog post should have path /blog/blogpost-1.html');
    assert.strictEqual(nestedIndex.path, '/page2/index.html', 'Nested index should have path /page2/index.html');
  });

  it('should fall back to raw filename when no title or navLabel is provided', async () => {
    const ms = Metalsmith(fixture('no-title')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'noTitlesNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().noTitlesNav;

    const noTitlePage = navigation.find((item) => item.path === '/no-title/');
    const anotherFilePage = navigation.find((item) => item.path === '/another_file/');

    assert.ok(noTitlePage, 'Page without title should exist in navigation');
    assert.strictEqual(noTitlePage.title, 'no-title', 'Title should be the raw filename');

    assert.ok(anotherFilePage, 'Page with underscore in name should exist in navigation');
    assert.strictEqual(anotherFilePage.title, 'another_file', 'Title should be the raw filename');
  });

  it('should correctly map non-index file paths with permalinks', async () => {
    const ms = Metalsmith(fixture('deep-paths')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'testNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().testNav;

    const homePage = navigation.find((item) => item.title === 'Home');
    const aboutPage = navigation.find((item) => item.title === 'About');
    const midLevelPage = navigation.find((item) => item.title === 'Mid-Level Index');
    const deepIndexPage = midLevelPage.children.find((item) => item.title === 'Deep Index');

    assert.strictEqual(homePage.path, '/', 'Home page should have path /');
    assert.strictEqual(aboutPage.path, '/about/', 'About page should have permalink format /about/');
    assert.strictEqual(midLevelPage.path, '/deep/', 'Mid-level index should have path /deep/');
    assert.strictEqual(deepIndexPage.path, '/deep/path/', 'Deep index should have path /deep/path/');
  });

  it('should correctly map directory paths without permalinks', async () => {
    const ms = Metalsmith(fixture('docs')).use(
      navigationPlugin({
        usePermalinks: false,
        metadataKey: 'dirNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().dirNav;

    const docsIndex = navigation.find((item) => item.title === 'Docs Index');
    const gettingStartedPage = docsIndex.children.find((item) => item.title === 'Getting Started');

    assert.strictEqual(docsIndex.path, '/docs/index.html', 'Docs index should have path /docs/index.html');
    assert.strictEqual(
      gettingStartedPage.path,
      '/docs/getting-started/index.html',
      'Getting Started should have path /docs/getting-started/index.html'
    );
  });

  it('should exclude files marked as draft', async () => {
    const ms = Metalsmith(fixture('draft')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'draftNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().draftNav;

    const homePage = navigation.find((item) => item.title === 'Home Page');
    const aboutPage = navigation.find((item) => item.title === 'About Us');
    const publishedPost = navigation.find((item) => item.title === 'Published Post');
    const blogIndex = navigation.find((item) => item.title === 'Blog Index');

    assert.ok(homePage, 'Home page should exist in navigation');
    assert.ok(aboutPage, 'About page should exist in navigation');
    assert.ok(publishedPost, 'Published post should exist in navigation');
    assert.ok(blogIndex, 'Blog index should exist in navigation');

    const draftPost = navigation.find((item) => item.title === 'Draft Post');
    assert.strictEqual(draftPost, undefined, 'Draft post should be excluded from navigation');

    const publishedArticle = blogIndex.children.find((item) => item.title === 'Published Article');
    const draftArticle = blogIndex.children.find((item) => item.title === 'Draft Article');

    assert.ok(publishedArticle, 'Published article should exist in blog navigation');
    assert.strictEqual(draftArticle, undefined, 'Draft article should be excluded from blog navigation');

    assert.ok(publishedPost, 'File with draft: false should be included in navigation');
  });

  it('should handle all types of exclusion patterns', async () => {
    const ms = Metalsmith(fixture('exclusion')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'exclusionNav',
        navExcludePatterns: ['special-case.html', /\/temp\//, (_path, file) => file && file.draft === true]
      })
    );

    await ms.process();
    const navigation = ms.metadata().exclusionNav;

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
  });

  it('should handle non-index child paths with and without permalinks', async () => {
    const msPermalink = Metalsmith(fixture('child-paths')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'permalinkNav'
      })
    );
    await msPermalink.process();

    const msHtml = Metalsmith(fixture('child-paths')).use(
      navigationPlugin({
        usePermalinks: false,
        metadataKey: 'htmlNav'
      })
    );
    await msHtml.process();

    const permalinkNav = msPermalink.metadata().permalinkNav;
    const permalinkProducts = permalinkNav.find((item) => item.title === 'Products');
    const permalinkItem = permalinkProducts.children.find((item) => item.title === 'Product 1');

    const htmlNav = msHtml.metadata().htmlNav;
    const htmlProducts = htmlNav.find((item) => item.title === 'Products');
    const htmlItem = htmlProducts.children.find((item) => item.title === 'Product 1');

    assert.strictEqual(permalinkItem.path, '/products/item1/', 'With permalinks, child should have clean URL');
    assert.strictEqual(htmlItem.path, '/products/item1.html', 'Without permalinks, child should have .html extension');
  });

  it('should add the path to the file navigation object for active state detection', async () => {
    const ms = Metalsmith(fixture('child-paths')).use(
      navigationPlugin({
        usePermalinks: true,
        metadataKey: 'activePathNav'
      })
    );

    const files = await ms.process();

    assert.strictEqual(files['index.html'].navigation.path, '/', 'Home page navigation should have path /');
    assert.strictEqual(
      files['products/index.html'].navigation.path,
      '/products/',
      'Products index navigation should have path /products/'
    );
    assert.strictEqual(
      files['products/item1.html'].navigation.path,
      '/products/item1/',
      'Product item navigation should have path /products/item1/'
    );
  });

  it('should properly nest directory children under parent HTML files in non-permalink mode', async () => {
    const ms = Metalsmith(fixture('parent-html')).use(
      navigationPlugin({
        usePermalinks: false,
        metadataKey: 'nonPermalinkNav'
      })
    );

    await ms.process();
    const navigation = ms.metadata().nonPermalinkNav;

    const blogPage = navigation.find((item) => item.title === 'Blog Page');
    const productsPage = navigation.find((item) => item.title === 'Products');

    assert.ok(blogPage, 'Blog page should exist in navigation');
    assert.ok(productsPage, 'Products page should exist in navigation');

    assert.ok(Array.isArray(blogPage.children), 'Blog page should have children array');
    assert.strictEqual(blogPage.children.length, 2, 'Blog page should have 2 children');

    assert.ok(Array.isArray(productsPage.children), 'Products page should have children array');
    assert.strictEqual(productsPage.children.length, 2, 'Products page should have 2 children');

    const blogPost1 = blogPage.children.find((item) => item.title === 'Blog Post 1');
    const productItem1 = productsPage.children.find((item) => item.title === 'Product 1');

    assert.ok(blogPost1, 'Blog Post 1 should be a child of Blog Page');
    assert.ok(productItem1, 'Product 1 should be a child of Products page');

    assert.strictEqual(blogPage.path, '/blog.html', 'Blog page should have path /blog.html');
    assert.strictEqual(blogPost1.path, '/blog/post1.html', 'Blog post should have path /blog/post1.html');

    const blogDir = navigation.find((item) => item.path === '/blog/');
    assert.strictEqual(blogDir, undefined, 'Blog directory should not exist as a separate entry');
  });
});
