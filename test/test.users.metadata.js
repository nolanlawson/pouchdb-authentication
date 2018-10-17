'use strict';

var utils = require('./test-utils');
var chai = require('chai');
var should = chai.should();

var PouchDB = utils.TestPouch;

var serverHost = utils.getConfig().serverHost;

describe('users.metadata', function () {

  var dbName = serverHost + '/testdb';
  var users = ['robin'];

  var db;

  beforeEach(function () {
    db = new PouchDB(dbName);
    return utils.ensureUsersDatabaseExists(db);
  });

  afterEach(function () {
    return db.logout().then(function () {
      return db.destroy().then(function () {
        // remove the fake users, hopefully we're in the admin party
        return utils.deleteUsers(db, users);
      });
    });
  });

  it('Test metadata', function () {
    var metadata = {alias: 'boywonder', profession: 'acrobat'};
    var opts = {metadata: metadata};
    return db.signup('robin', 'dickgrayson', opts).then(function (res) {
      res.ok.should.equal(true);
      return db.login('robin', 'dickgrayson');
    }).then(function () {
      return db.getUser('robin');
    }).then(function (user) {
      user.name.should.equal('robin');
      user.alias.should.equal('boywonder');
      user.profession.should.equal('acrobat');
    });
  });

  it('Test changing metadata', function () {
    var metadata = {alias: 'boywonder', profession: 'acrobat'};
    var newMetadata = {alias: 'rednowyob', profession: 'taborca'};
    var opts = {metadata: metadata};
    return db.signup('robin', 'dickgrayson', opts).then(function (res) {
      res.ok.should.equal(true);
      return db.login('robin', 'dickgrayson');
    }).then(function () {
      return db.getUser('robin');
    }).then(function (user) {
      user.name.should.equal('robin');
      user.alias.should.equal('boywonder');
      user.profession.should.equal('acrobat');
    }).then(function () {
      return db.putUser('robin', {metadata: newMetadata});
    }).then(function () {
      return db.getUser('robin');
    }).then(function (user) {
      user.name.should.equal('robin');
      user.alias.should.equal('rednowyob');
      user.profession.should.equal('taborca');
    });
  });

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
    'salt'
  ];

  reservedWords.forEach(function (key) {
    it('Test changing metadata using reserved word "' + key + '"', function () {
      return db.signup('robin', 'dickgrayson').then(function (res) {
        res.ok.should.equal(true);
        return db.login('robin', 'dickgrayson');
      }).then(function () {
        return db.getUser('robin').then(function (user) {
          var metadata = {};
          metadata[key] = 'test';
          return db.putUser('robin', {metadata: metadata}).then(function (res) {
            res.ok.should.not.equal(true);
          }).catch(function (err) {
            should.exist(err);
            err.status.should.equal(400);
            err.name.should.equal('authentication_error');
            err.message.should.equal('cannot use reserved word in metadata: "' + key + '"');
            err.error.should.equal(true);

            if (key === 'password') {
              return db.login('robin', 'dickgrayson').then(function (res) {
                res.ok.should.equal(true);
              }).catch(function (err) {
                should.not.exist(err);
              });
            } else {
              return db.getUser('robin').then(function (changedUser) {
                changedUser[key].should.deep.equal(user[key]);
              }).catch(function (err) {
                should.not.exist(err);
              });
            }
          });
        });
      });
    });
  });

  it('Test changing metadata using non-reserved word "metadata"', function () {
    var metadata = {test: 'test'};
    return db.signup('robin', 'dickgrayson').then(function (res) {
      res.ok.should.equal(true);
      return db.login('robin', 'dickgrayson');
    }).then(function () {
      return db.putUser('robin', {metadata: {metadata: metadata}});
    }).then(function (res) {
      res.ok.should.equal(true);
      return db.getUser('robin');
    }).then(function (changedUser) {
      changedUser.metadata.should.deep.equal(metadata);
    }).catch(function (err) {
      should.not.exist(err);
    });
  });
});
