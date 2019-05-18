'use strict';

import { AuthError, fetchJSON, toCallback } from './utils';
import { assign } from 'pouchdb-utils';

var sessionPath = '/_session';

var logIn = toCallback(function (username, password, opts) {
  var db = this;
  if (typeof opts === 'undefined') {
    opts = {};
  }
  if (['http', 'https'].indexOf(db.type()) === -1) {
    return Promise.reject(new AuthError('this plugin only works for the http/https adapter'));
  }

  if (!username) {
    return Promise.reject(new AuthError('you must provide a username'));
  } else if (!password) {
    return Promise.reject(new AuthError('you must provide a password'));
  }

  var path = sessionPath;
  var ajaxOpts = assign({
    method: 'POST',
    body: {name: username, password: password},
  }, opts.ajax || {});
  return fetchJSON(db.fetch, path, ajaxOpts);
});

var logOut = toCallback(function (opts) {
  var db = this;
  if (typeof opts === 'undefined') {
    opts = {};
  }

  var path = sessionPath;
  var ajaxOpts = assign({
    method: 'DELETE'
  }, opts.ajax || {});
  return fetchJSON(db.fetch, path, ajaxOpts);
});

var getSession = toCallback(function (opts) {
  var db = this;
  if (typeof opts === 'undefined') {
    opts = {};
  }

  var path = sessionPath;
  var ajaxOpts = assign({
    method: 'GET'
  }, opts.ajax || {});
  return fetchJSON(db.fetch, path, ajaxOpts);
});

export { logIn, logOut, getSession };
