'use strict';

import { AuthError, doFetch, getBasicAuthHeaders } from './utils';

import { assign, clone, parseUri, toPromise } from 'pouchdb-utils';

function getBaseUrl(db) {
  // Use PouchDB.defaults' prefix, if any
  let fullName;
  if (db.__opts && db.__opts.prefix) {
    var prefix = db.__opts.prefix;
    fullName = prefix + (prefix.endsWith('/') ? '' : '/') + db.name;
  } else {
    fullName = db.name;
  }

  var uri = parseUri(fullName);

  // Compute parent path for databases not hosted on domain root (see #215)
  var path = uri.path;
  var normalizedPath = path.endsWith('/') ? path.substr(0, -1) : path;
  var parentPath = normalizedPath.split('/').slice(0, -1).join('/');

  return uri.protocol + '://' +
      uri.host +
      (uri.port ? ':' + uri.port : '') +
      parentPath;
}

var getUsersDatabaseUrl = function () {
  var db = this;
  return getBaseUrl(db) + '/_users';
};

function updateUser(db, user, opts, callback) {
  var reservedWords = [
    '_id',
    '_rev',
    'name',
    'type',
    'roles',
    'password',
    'password_scheme',
    'iterations',
    'derived_key',
    'salt',
  ];

  if (opts.metadata) {
    for (var key in opts.metadata) {
      if (opts.metadata.hasOwnProperty(key) && reservedWords.indexOf(key) !== -1) {
        return callback(new AuthError('cannot use reserved word in metadata: "' + key + '"'));
      }
    }
    user = assign(user, opts.metadata);
  }

  if (opts.roles) {
    user = assign(user, {roles: opts.roles});
  }

  var url = '/_users/' + encodeURIComponent(user._id);
  var ajaxOpts = assign({
    method: 'PUT',
    body: user,
    headers: getBasicAuthHeaders(db),
  }, opts.ajax || {});

  doFetch(db, url, ajaxOpts, callback);
}

var signUp = toPromise(function (username, password, opts, callback) {
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

  var userId = 'org.couchdb.user:' + username;
  var user = {
    name: username,
    password: password,
    roles: [],
    type: 'user',
    _id: userId,
  };

  updateUser(db, user, opts, callback);
});

var getUser = toPromise(function (username, opts, callback) {
  var db = this;
  if (typeof callback === 'undefined') {
    callback = typeof opts === 'undefined' ? username : opts;
    opts = {};
  }
  if (!username) {
    return callback(new AuthError('you must provide a username'));
  }

  var url = '/_users/' + encodeURIComponent('org.couchdb.user:' + username);
  var ajaxOpts = assign({
    method: 'GET',
    headers: getBasicAuthHeaders(db),
  }, opts.ajax || {});

  doFetch(db, url, ajaxOpts, callback);
});

var putUser = toPromise(function (username, opts, callback) {
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

  db.getUser(username, opts, function (error, user) {
    if (error) {
      return callback(error);
    }

    updateUser(db, user, opts, callback);
  });
});

var deleteUser = toPromise(function (username, opts, callback) {
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

  db.getUser(username, opts, function (error, user) {
    if (error) {
      return callback(error);
    }

    var url = '/_users/' + encodeURIComponent(user._id) + '?rev=' + user._rev;
    var ajaxOpts = assign({
      method: 'DELETE',
      headers: getBasicAuthHeaders(db),
    }, opts.ajax || {});

    doFetch(db, url, ajaxOpts, callback);
  });
});

var changePassword = toPromise(function (username, password, opts, callback) {
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

  db.getUser(username, opts, function (error, user) {
    if (error) {
      return callback(error);
    }

    user.password = password;

    var url = '/_users/' + encodeURIComponent(user._id);
    var ajaxOpts = assign({
      method: 'PUT',
      headers: getBasicAuthHeaders(db),
      body: user,
    }, opts.ajax || {});

    doFetch(db, url, ajaxOpts, callback);
  });
});

var changeUsername = toPromise(function (oldUsername, newUsername, opts, callback) {
  var db = this;
  var USERNAME_PREFIX = 'org.couchdb.user:';
  var fetch = function (url, opts) {
    return new Promise(function (resolve, reject) {
      doFetch(db, url, opts, function (err, res) {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  };
  var updateUser = function (user, opts) {
    var url = '/_users/' + encodeURIComponent(user._id);
    var updateOpts = assign({
      method: 'PUT',
      headers: getBasicAuthHeaders(db),
      body: user,
    }, opts.ajax);

    return fetch(url, updateOpts);
  };
  if (typeof callback === 'undefined') {
    callback = opts;
    opts = {};
  }
  opts.ajax = opts.ajax || {};
  if (['http', 'https'].indexOf(db.type()) === -1) {
    return callback(new AuthError('This plugin only works for the http/https adapter. ' +
        'So you should use new PouchDB("http://mysite.com:5984/mydb") instead.'));
  }
  if (!newUsername) {
    return callback(new AuthError('You must provide a new username'));
  }
  if (!oldUsername) {
    return callback(new AuthError('You must provide a username to rename'));
  }

  db.getUser(newUsername, opts)
      .then(function () {
        var error = new AuthError('user already exists');
        error.taken = true;
        throw error;
      }, function () {
        return db.getUser(oldUsername, opts);
      })
      .then(function (user) {
        var newUser = clone(user);
        delete newUser._rev;
        newUser._id = USERNAME_PREFIX + newUsername;
        newUser.name = newUsername;
        newUser.roles = opts.roles || user.roles || {};
        return updateUser(newUser, opts).then(function () {
          user._deleted = true;
          return updateUser(user, opts);
        });
      }).then(function (res) {
    callback(null, res);
  }).catch(callback);
});

export {
  getUsersDatabaseUrl,
  signUp,
  getUser,
  putUser,
  deleteUser,
  changePassword,
  changeUsername,
};
