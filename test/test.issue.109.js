'use strict';

var utils = require('./test-utils');
var chai = require('chai');
chai.should();

var PouchDB = utils.TestPouch;

var serverHost = utils.getConfig().serverHost;

describe('issue-109', function () {

  var dbName = serverHost + '/testdb';

  var db;

  beforeEach(function () {
    db = new PouchDB(dbName);
    return utils.ensureUsersDatabaseExists(db).then(function () {
      return db.signUpAdmin('anna', 'secret');
    }).then(function () {
      return db.signUp('spiderman', 'will-forget');
    });
  });

  afterEach(function () {
    return db.logIn('anna', 'secret').then(function () {
      return db.deleteUser('spiderman');
    }).then(function () {
      return db.deleteAdmin('anna');
    }).then(function () {
      return db.logOut();
    }).then(function () {
      return db.destroy();
    });
  });

  it('Test admin change user password with cookie authentication', function () {
    return db.logIn('anna', 'secret').then(function () {
      return db.changePassword('spiderman', 'will-remember');
    }).then(function (res) {
      res.ok.should.equal(true);
    }).then(function () {
      return db.logIn('spiderman', 'will-remember');
    }).then(function (res) {
      res.ok.should.equal(true);
    }).then(function () {
      return db.logOut();
    });
  });

  it('Test admin change user password with basic authentication', function () {
    var dbNameWithAuth = dbName.replace('http://', 'http://anna:secret@');
    var dbWithBasicAuth = new PouchDB(dbNameWithAuth, {skip_setup: true});
    return dbWithBasicAuth.changePassword('spiderman', 'will-remember').then(function (res) {
      res.ok.should.equal(true);
    }).then(function () {
      return db.logIn('spiderman', 'will-remember');
    }).then(function (res) {
      res.ok.should.equal(true);
    }).then(function () {
      return db.logOut();
    });
  });
});
