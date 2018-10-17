import { AuthError, doFetch, getBasicAuthHeaders } from './utils';

import { assign, toPromise } from 'pouchdb-utils';

function getConfigUrl(db, nodeName) {
  return (nodeName ? '/_node/' + nodeName : '') + '/_config';
}

var getMembership = toPromise(function (opts, callback) {
  var db = this;
  if (typeof callback === 'undefined') {
    callback = opts;
    opts = {};
  }

  var url = '/_membership';
  var ajaxOpts = assign({
    method: 'GET',
    headers: getBasicAuthHeaders(db),
  }, opts.ajax || {});

  return doFetch(db, url, ajaxOpts, callback);
});

var signUpAdmin = toPromise(function (username, password, opts, callback) {
  var db = this;
  if (typeof callback === 'undefined') {
    callback = typeof opts === 'undefined' ? (typeof password === 'undefined' ?
      username : password) : opts;
    opts = {};
  }
  if (['http', 'https'].indexOf(db.type()) === -1) {
    return callback(new AuthError('This plugin only works for the http/https adapter. ' +
      'So you should use new PouchDB("http://mysite.com:5984/mydb") instead.'));
  } else if (!username) {
    return callback(new AuthError('You must provide a username'));
  } else if (!password) {
    return callback(new AuthError('You must provide a password'));
  }

  db.getMembership(opts, function (error, membership) {
    var nodeName;
    if (error) {
      if (error.error !== 'illegal_database_name') {
        return callback(error);
      } else {
        // Some couchdb-1.x-like server
        nodeName = undefined;
      }
    } else {
      // Some couchdb-2.x-like server
      nodeName = membership.all_nodes[0];
    }

    var configUrl = getConfigUrl(db, nodeName);
    var url = (opts.configUrl || configUrl) + '/admins/' + encodeURIComponent(username);
    var ajaxOpts = assign({
      method: 'PUT',
      processData: false,
      headers: getBasicAuthHeaders(db),
      body: '"' + password + '"',
    }, opts.ajax || {});

    return doFetch(db, url, ajaxOpts, callback);
  });
});

var deleteAdmin = toPromise(function (username, opts, callback) {
  var db = this;
  if (typeof callback === 'undefined') {
    callback = typeof opts === 'undefined' ? username : opts;
    opts = {};
  }
  if (['http', 'https'].indexOf(db.type()) === -1) {
    return callback(new AuthError('This plugin only works for the http/https adapter. ' +
      'So you should use new PouchDB("http://mysite.com:5984/mydb") instead.'));
  } else if (!username) {
    return callback(new AuthError('You must provide a username'));
  }

  db.getMembership(opts, function (error, membership) {
    var nodeName;
    if (error) {
      if (error.error !== 'illegal_database_name') {
        return callback(error);
      } else {
        // Some couchdb-1.x-like server
        nodeName = undefined;
      }
    } else {
      // Some couchdb-2.x-like server
      nodeName = membership.all_nodes[0];
    }

    var configUrl = getConfigUrl(db, nodeName);
    var url = (opts.configUrl || configUrl) + '/admins/' + encodeURIComponent(username);
    var ajaxOpts = assign({
      method: 'DELETE',
      processData: false,
      headers: getBasicAuthHeaders(db),
    }, opts.ajax || {});

    return doFetch(db, url, ajaxOpts, callback);
  });
});

export { getMembership, deleteAdmin, signUpAdmin };