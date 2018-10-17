'use strict';

var utils = require('./test-utils');
var chai = require('chai');
var should = chai.should();

var PouchDB = utils.TestPouch;

var serverHost = utils.getConfig().serverHost;

describe('admins', function () {

  var dbHost = serverHost;
  var dbName = dbHost + '/testdb';

  var db;

  beforeEach(function () {
    db = new PouchDB(dbName);
    return utils.ensureUsersDatabaseExists(db);
  });

  afterEach(function () {
    return db.logOut().then(function () {
      return db.destroy();
    });
  });

  it('Create and delete admin', function () {
    return testCreateDeleteAdmin({});
  });

  it('Create and delete admin with config url', function () {
    return db.getMembership().then(function (membership) {
      // Some couchdb-2.x-like server
      return membership.all_nodes[0];
    }).catch(function () {
      // Some couchdb-1.x-like server
      return undefined;
    }).then(function (nodeName) {
      var opts = {
        configUrl: (nodeName ? '/_node/' + nodeName : '') + '/_config',
      };

      return testCreateDeleteAdmin(opts);
    });
  });

  function testCreateDeleteAdmin(opts) {
    return db.signUpAdmin('anna', 'secret', opts).then(function (res) {
      should.exist(res);

      return db.logIn('anna', 'secret').then(function (res) {
        res.ok.should.equal(true);

        return db.deleteAdmin('anna', opts).then(function (res) {
          should.exist(res);

          return db.logOut().then(function () {

            return db.logIn('anna', 'secret').then(function () {
              should.fail('shouldn\'t have worked');
            }, function (err) {
              should.exist(err);
              err.error.should.equal('unauthorized');
              err.reason.should.equal('Name or password is incorrect.');
            });
          });
        });
      });
    });
  }
});
