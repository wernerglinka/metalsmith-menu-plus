/* global describe, it */

const assert = require( 'node:assert' ).strict;
const Metalsmith = require( 'metalsmith' );

// Import the plugin using CommonJS format
const navigationPlugin = require( '../lib/index.cjs' );

describe( 'metalsmith-menu-plus (CommonJS)', () => {
  // Verify the module loads correctly and exports a function
  it( 'should be properly importable as a CommonJS module', () => {
    assert.strictEqual( typeof navigationPlugin, 'function', 'Plugin should be a function when required with CommonJS' );
    assert.strictEqual( typeof navigationPlugin(), 'function', 'Plugin should return a function when called' );
  } );

  // Basic functional test
  it( 'should generate a navigation structure in CommonJS mode', ( done ) => {
    // Create basic test files
    const files = {
      'index.html': { title: 'Home Page' },
      'about.html': { title: 'About Us' },
      'services/index.html': { title: 'Our Services' },
      'services/service1.html': { title: 'Service One' }
    };

    // Create metalsmith instance
    const metalsmith = Metalsmith( 'test' )
      .metadata( {} )
      .source( 'src' )
      .destination( 'build' );

    // Run the plugin
    const plugin = navigationPlugin( {
      metadataKey: 'menu',
      usePermalinks: true
    } );

    plugin( files, metalsmith, ( err ) => {
      if ( err ) { return done( err ); }

      // Check if navigation was generated
      const navigation = metalsmith.metadata().menu;

      // Basic structure tests
      assert.ok( Array.isArray( navigation ), 'Navigation should be an array' );
      assert.ok( navigation.length > 0, 'Navigation should not be empty' );

      // Home page test
      const homePage = navigation.find( item => item.title === 'Home Page' );
      assert.ok( homePage, 'Home page should exist in navigation' );
      assert.strictEqual( homePage.path, '/', 'Home path should be /' );

      // Services section test
      const servicesSection = navigation.find( item => item.title === 'Our Services' );
      assert.ok( servicesSection, 'Services section should exist in navigation' );
      assert.strictEqual( servicesSection.path, '/services/', 'Services path should be /services/' );
      assert.ok( Array.isArray( servicesSection.children ), 'Services should have children array' );
      assert.strictEqual( servicesSection.children.length, 1, 'Services should have 1 child' );
      assert.strictEqual( servicesSection.children[ 0 ].title, 'Service One', 'Service One should be child of Services' );

      done();
    } );
  } );

  // Test navigation exclusion
  it( 'should respect navExclude in CommonJS mode', ( done ) => {
    // Create test files with exclusion
    const files = {
      'index.html': { title: 'Home Page' },
      'about.html': { title: 'About Us' },
      'secret.html': {
        title: 'Secret Page',
        navigation: { navExclude: true }
      }
    };

    // Create metalsmith instance
    const metalsmith = Metalsmith( 'test' )
      .metadata( {} )
      .source( 'src' )
      .destination( 'build' );

    // Run the plugin
    const plugin = navigationPlugin( {
      metadataKey: 'menu',
      usePermalinks: true
    } );

    plugin( files, metalsmith, ( err ) => {
      if ( err ) { return done( err ); }

      // Check if navigation was generated
      const navigation = metalsmith.metadata().menu;

      // Verify excluded page is not in the navigation
      const secretPage = navigation.find( item => item.title === 'Secret Page' );
      assert.strictEqual( secretPage, undefined, 'Secret page should be excluded from navigation' );

      done();
    } );
  } );

  // Test rootPath option in CommonJS
  it( 'should respect rootPath option in CommonJS mode', ( done ) => {
    // Create test files with a services section
    const files = {
      'index.html': { title: 'Home Page' },
      'about.html': { title: 'About Us' },
      'services/index.html': { title: 'Our Services' },
      'services/service1.html': { title: 'Service One' },
      'services/service2.html': { title: 'Service Two' },
      'services/service3.html': { title: 'Service Three' }
    };

    // Create metalsmith instance
    const metalsmith = Metalsmith( 'test' )
      .metadata( {} )
      .source( 'src' )
      .destination( 'build' );

    // Run the plugin with rootPath set to services
    const plugin = navigationPlugin( {
      metadataKey: 'servicesMenu',
      usePermalinks: true,
      rootPath: '/services/'
    } );

    plugin( files, metalsmith, ( err ) => {
      if ( err ) { return done( err ); }

      // Check if navigation was generated
      const navigation = metalsmith.metadata().servicesMenu;

      // Verify structure - should only contain services, not main site pages
      assert.ok( Array.isArray( navigation ), 'Navigation should be an array' );
      assert.strictEqual( navigation.length, 3, 'Services menu should have 3 items' );

      // Check that the items are the service pages
      const service1 = navigation.find( item => item.title === 'Service One' );
      const service2 = navigation.find( item => item.title === 'Service Two' );
      const service3 = navigation.find( item => item.title === 'Service Three' );

      assert.ok( service1, 'Service One should exist in services menu' );
      assert.ok( service2, 'Service Two should exist in services menu' );
      assert.ok( service3, 'Service Three should exist in services menu' );

      // Make sure no root-level items are included
      const homePage = navigation.find( item => item.title === 'Home Page' );
      assert.strictEqual( homePage, undefined, 'Home page should not be in services menu' );

      done();
    } );
  } );

  // Test directory nesting in non-permalink mode
  it( 'should properly nest directory children under parent HTML files in CommonJS mode', ( done ) => {
    // Create test files with a directory and corresponding HTML file
    const files = {
      'index.html': { title: 'Home Page' },
      'services.html': { title: 'Services Overview' },
      'services/service1.html': { title: 'Service One' },
      'services/service2.html': { title: 'Service Two' }
    };

    // Create metalsmith instance
    const metalsmith = Metalsmith( 'test' )
      .metadata( {} )
      .source( 'src' )
      .destination( 'build' );

    // Run the plugin WITHOUT permalinks
    const plugin = navigationPlugin( {
      metadataKey: 'nonPermalinkMenu',
      usePermalinks: false
    } );

    plugin( files, metalsmith, ( err ) => {
      if ( err ) { return done( err ); }

      // Check if navigation was generated
      const navigation = metalsmith.metadata().nonPermalinkMenu;

      // Find the services page
      const servicesPage = navigation.find( item => item.title === 'Services Overview' );

      // Verify structure
      assert.ok( servicesPage, 'Services page should exist in navigation' );
      assert.strictEqual( servicesPage.path, '/services.html', 'Services page should have path /services.html' );

      // Verify children are properly nested
      assert.ok( Array.isArray( servicesPage.children ), 'Services page should have children array' );
      assert.strictEqual( servicesPage.children.length, 2, 'Services page should have 2 children' );

      // Verify specific children
      const service1 = servicesPage.children.find( item => item.title === 'Service One' );
      assert.ok( service1, 'Service One should be a child of Services Overview' );
      assert.strictEqual( service1.path, '/services/service1.html', 'Service path should include .html extension' );

      // Verify no duplicate entries for directories
      const servicesDir = navigation.find( item => item.path === '/services/' );
      assert.strictEqual( servicesDir, undefined, 'Services directory should not exist as a separate entry' );

      done();
    } );
  } );
} );
