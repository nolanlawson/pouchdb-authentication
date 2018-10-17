'use strict';

var utils = require('./test-utils');
var chai = require('chai');
chai.should();

var PouchDB = utils.TestPouch;

describe('urls', function () {

  var hostUrl = 'http://example.com';
  var dbName = 'testdb';
  var dbUrl = hostUrl + '/' + dbName;

  it('Correct users database url for database without trailing slash', function () {
    var db = new PouchDB(dbUrl);
    var usersUrl = db.getUsersDatabaseUrl();
    usersUrl.should.equal(hostUrl + '/_users');
  });

  it('Correct users database url for database with trailing slash', function () {
    var db = new PouchDB(dbUrl + '/');
    var usersUrl = db.getUsersDatabaseUrl();
    usersUrl.should.equal(hostUrl + '/_users');
  });

  it('Correct users database url using prefix without trailing slash', function () {
    var PouchWithPrefix = PouchDB.defaults({prefix: hostUrl});
    var db = new PouchWithPrefix(dbName);
    var usersUrl = db.getUsersDatabaseUrl();
    usersUrl.should.equal(hostUrl + '/_users');
  });

  it('Correct users database url using prefix with trailing slash', function () {
    var PouchWithPrefix = PouchDB.defaults({prefix: hostUrl + '/'});
    var db = new PouchWithPrefix(dbName);
    var usersUrl = db.getUsersDatabaseUrl();
    usersUrl.should.equal(hostUrl + '/_users');
  });

  it('Correct users database url for cloudant-style database urls', function () {
    var db = new PouchDB(hostUrl + '/');
    var usersUrl = db.getUsersDatabaseUrl();
    usersUrl.should.equal(hostUrl + '/_users');
  });

  it('Correct users database url for proxied database urls (issue-215)', function () {
    var db = new PouchDB(hostUrl + '/db/' + dbName);
    var usersUrl = db.getUsersDatabaseUrl();
    usersUrl.should.equal(hostUrl + '/db/_users');
  });
});
