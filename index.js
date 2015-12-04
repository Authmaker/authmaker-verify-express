var authmakerVerify = require('authmaker-verify');
var winston = require('winston');

//remove it so to add it with my settings
try{winston.remove(winston.transports.Console);}catch(e){//do nothing
}

var winstonOptions = {
    colorize: true,
    timestamp: true,
    handleExceptions: true,
    prettyPrint: true
};

if(process.env.LOG_LEVEL){
    winstonOptions.level = process.env.LOG_LEVEL;
} else if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'){
    winstonOptions.level = "debug";
} else {
    winstonOptions.level = "info";
}

if(!process.env.NO_LOG) {
    winston.add(winston.transports.Console, winstonOptions);
}

function generateRateLimit(tag, defaultScope){
    return function(req, res, next){
    if (!req.headers.authorization) {
        return res.status(401).send("No Access token provided");
    }

    //take the accessToken as the last delimited entry in authorization
    var accessToken = req.headers.authorization.split(/\s+/).pop();

    //verify the access-token
    return authmakerVerify.mongoRateLimited(accessToken, tag, defaultScope)
        .then(function(oauthSession) {
            req.oauthSession = oauthSession;

            next();
        })
        .then(null, function(err) {
            winston.error("Error while authorizing session", {
                error: err.message,
                stask: err.stack,
                authorisation: req.headers.authorization
            });

            if (err.message.indexOf("Not Authorized") >= 0) {
                res.status(401);
            } else if (err.message.indexOf("Too Many Requests") >= 0) {
                res.status(429);
                return res.send("Too Many Requests: Rate limit exceeded.");
            } else {
                res.status(500);
            }

            return res.send(err.message);
        });
    };
}

function generateVerify(tag, options){
    return function(req, res, next){
        if (!req.headers.authorization) {
            return res.status(401).send("No Access token provided");
        }

        //take the accessToken as the last delimited entry in authorization
        var accessToken = req.headers.authorization.split(/\s+/).pop();

        //verify the access-token
        return authmakerVerify.mongo(accessToken, tag)
            .then(function(oauthSession) {
                req.oauthSession = oauthSession;

                next();
            })
            .then(null, function(err) {
                winston.error("Error while authorizing session", {
                    error: err.message,
                    stask: err.stack,
                    authorisation: req.headers.authorization
                });

                if (options && options.passError) {
                    return next(err);
                }

                if (err.message.indexOf("Not Authorized") >= 0) {
                    res.status(401);
                } else {
                    res.status(500);
                }

                return res.send(err.message);
            });
    };
}

module.exports = {
    mongoRateLimited: function(tag, defaultScope) {
        return generateRateLimit(tag, defaultScope);
    },

    mongoRateLimitedDefault: function(tag, defaultScope){
        console.warn("This function is deprecated, just use mongoRateLimited(tag, defaultScope) instead");
        return generateRateLimit(tag, defaultScope);
    },

    mongo: function(tag, options) {
        return generateVerify(tag, options);
    },

    connectMongo: function(nconf) {
        //initialise the db
        authmakerVerify.connectMongo(nconf);
    },

    authmakerVerify: authmakerVerify
};

//pass on models and mongoose for tests
if(process.env.NODE_ENV === "test"){
    module.exports.models = authmakerVerify.models;
    module.exports.mongoose = authmakerVerify.mongoose;
}
