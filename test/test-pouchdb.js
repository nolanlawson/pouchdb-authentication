if (typeof window !== 'undefined') {
  // polyfill PhantomJS
  require('whatwg-fetch');
  if (!window.Promise) {
    window.Promise = require('promise-polyfill');
  }

  module.exports = require('pouchdb-browser');
} else {
  module.exports = require('pouchdb-node');
}
