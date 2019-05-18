'use strict';

import inherits from 'inherits';
import { Headers } from 'pouchdb-fetch';


function getConfigUrl(nodeName) {
  return (nodeName ? '/_node/' + nodeName  : '') + '/_config';
}

function wrapError(err) {
  if (err.name === 'unknown_error') {
    err.message = (err.message || '') +
        ' Unknown error!  Did you remember to enable CORS?';
  }
  throw err;
}

// Wrapper around the fetch API to send and receive JSON objects
// Similar to fetchJSON in pouchdb-adapter-http, but both functions are private.
// Consider extracting them to a common library.
function fetchJSON(dbFetch, path, options) {
  options = options || {}

  if (options.body) {
    options.body = JSON.stringify(options.body);
  }

  options.headers = options.headers || new Headers();
  options.headers.set('Content-Type', 'application/json');
  options.headers.set('Accept', 'application/json');

  return dbFetch(path, options).then(response => {
    if (response.ok) {
      return response.json();
    } else {
      return response.json().then(responseError => {
        throw responseError;
      });
    }
  }).catch(wrapError);
}

// toCallback takes a function that returns a promise,
// and returns a function that can be used with a callback as the last argument,
// but still retains the ability to be used without a callback and return a promise.
// (Roughly speaking, the opposite of `toPromise` from pouchdb-utils,
// but more suited for `fetch`, that returns a promise by default.)
function toCallback(func) {
  return function (...args) {
    if (typeof args[-1] === 'function') {
      var callback = args[-1];
      return func.apply(this, args.slice(0, -2)).then(
        res => callback(null, res),
        err => callback(err)
      );
    } else {
      return func.apply(this, args);
    }
  };
}

function AuthError(message) {
  this.status = 400;
  this.name = 'authentication_error';
  this.message = message;
  this.error = true;
  try {
    Error.captureStackTrace(this, AuthError);
  } catch (e) {}
}

inherits(AuthError, Error);

export {
  AuthError,
  getConfigUrl,
  fetchJSON,
  toCallback
};
