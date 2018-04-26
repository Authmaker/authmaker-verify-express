const http = require('http');
const nconf = require('nconf');

const express = require('express');

const authmakerVerify = require('authmaker-verify');

let httpServer;

nconf.defaults({
  authmaker: {
    mongo: {
      db: 'authmaker-verify-express-test',
      host: 'localhost',
      port: 27017,
    },
  },
});

before(() => {
  global.app = express();
  // create http server
  httpServer = http.createServer(global.app).listen(56773);
  return authmakerVerify.init(nconf);
});

after((done) => {
  httpServer.close(done);
});
