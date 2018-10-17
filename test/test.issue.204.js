'use strict';

var utils = require('./test-utils');
var chai = require('chai');
chai.should();

var PouchDB = utils.TestPouch;

var serverHost = utils.getConfig().serverHost;

describe('issue-204', function () {

  var dbName = serverHost + '/testdb';

  var db;

  beforeEach(function () {
    db = new PouchDB(dbName);
    return utils.ensureUsersDatabaseExists(db).then(function () {
      return db.signUpAdmin('anna', 'secret');
    }).then(function () {
      return db.signup('spiderman', 'will-remember');
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

  function testGetUser(db) {
    return db.getUser('spiderman').then(function (res) {
      res.name.should.equal('spiderman');
    });
  }

  it('Test get user with basic authentication through URL', function () {
    var dbNameWithAuth = dbName.replace('http://', 'http://spiderman:will-remember@');
    var dbWithBasicAuth = new PouchDB(dbNameWithAuth, {skip_setup: true});
    return testGetUser(dbWithBasicAuth);
  });

  it('Test get user with basic authentication through PouchDB opts', function () {
    var dbWithBasicAuth = new PouchDB(dbName, {
      skip_setup: true,
      auth: {
        username: 'spiderman',
        password: 'will-remember',
      },
    });
    return testGetUser(dbWithBasicAuth);
  });
});
