var PouchDB = require('./test-pouchdb');

var getConfig = function () {
  return typeof window !== 'undefined' ? window.__karma__.config : global.__testConfig__;
}

module.exports.getConfig = getConfig;

module.exports.ensureUsersDatabaseExists = function () {
  var usersDb = new PouchDB(getConfig().serverHost + '/_users');
  return usersDb.info();
};

module.exports.deleteUsers = function (users) {
  var usersDb = new PouchDB(getConfig().serverHost + '/_users');
  return usersDb.allDocs({
    include_docs: true,
    keys: users.map(function (user) {
      return 'org.couchdb.user:' + user;
    }),
  }).then(function (res) {
    var rows = res.rows.filter(function (row) {
      return row.doc;
    });
    var docs = rows.map(function (row) {
      row.doc._deleted = true;
      return row.doc;
    });
    return usersDb.bulkDocs({docs: docs});
  });
};
