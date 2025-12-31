/**
 * String utility functions for metalsmith-menu-plus
 */

/**
 * Convert a string to title case
 * @param {string} str - The string to convert
 * @returns {string} Title-cased string
 */
export function toTitleCase( str ) {
  return str
    .split( /[_-]/ )
    .map( ( word ) => word.charAt( 0 ).toUpperCase() + word.slice( 1 ).toLowerCase() )
    .join( ' ' );
}
