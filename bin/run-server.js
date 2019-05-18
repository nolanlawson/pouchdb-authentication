var http = require('http');
var utils = require('./utils');

function runServer(serverName, runTests) {

  var tmp = serverName == null ? null : serverName.split(':');
  var server = serverName == null ? null : {
    name: tmp[0] || 'couchdb',
    version: tmp[1] || 'latest',
  };

  return Promise.resolve().then(function () {
    if (!server) {
      return {
        handlePromise: Promise.resolve(null),
        serverHost: process.env.SERVER_HOST || 'http://localhost:5984',
      };
    }

    // CouchDB
    if (server.name === 'couchdb') {
      var dockerImage = 'couchdb:' + server.version;
      return {
        handlePromise: utils.dockerRun(dockerImage, ['3000:5984']),
        serverHost: 'http://localhost:3000',
      };
    }

    // PouchDB Server
    else if (server.name === 'pouchdb-server') {
      return {
        handlePromise: utils.npmRunDaemon('pouchdb-server', ['--in-memory', '--port', '3000']),
        serverHost: 'http://localhost:3000',
      };
    }

    // Unknown
    throw new Error('Unknown SERVER \'' + server.name + '\'. Did you mean pouchdb-server?');
  }).then(function (result) {
    var handlePromise = result.handlePromise;
    var serverHost = result.serverHost;

    return handlePromise.then(function (handle) {
      return waitForCouch(serverHost)
      .then(function () {
        // To workaround pouchdb/add-cors-to-couchdb#24
        if (server && server.name !== 'pouchdb-server') {
          console.log('\nExecuting add-cors-to-couchdb');
          return utils.npmRun('add-cors-to-couchdb', [serverHost]);
        }
      }).then(function () {
        return runTests(serverHost);
      }).catch(function (exitCode) {
        if (typeof exitCode !== 'number') {
          console.error(exitCode);
          exitCode = 1;
        }
        return Promise.resolve().then(function () {
          if (handle) {
            return handle.destroy();
          }
        }).then(function () {
          process.exit(exitCode);
        });
      }).then(function () {
        if (handle) {
          return handle.destroy();
        }
      });
    });
  });
}

function waitForCouch(url) {
  return new Promise(function (resolve) {
    var interval = setInterval(function () {
      var request = http.request(url, function (res) {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
      });
      request.on('error', function () {
        console.info('Waiting for CouchDB on ' + url);
      });
      request.end();
    }, 1000);
  });
}

module.exports = runServer;
