var http = require('http');
var nconf = require('nconf');

var express = require('express');

var authmakerVerify = require('authmaker-verify');
var authmakerCommon = require('authmaker-common');

var httpServer;

nconf.defaults({
    "mongo": {
        "authmaker": {
            "db": "authmaker-verify-test",
            "host": "localhost",
            "port": 27017
        }
    }
});

before(function() {
    global.app = express();
    //create http server
    httpServer = http.createServer(global.app).listen(56773);
    authmakerVerify.connectMongo(nconf);
    authmakerCommon.init(nconf);
});

after(function(done) {
    httpServer.close(done);
});
