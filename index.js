const authmakerVerify = require('authmaker-verify');
const winston = require('winston');
const Q = require('q');

// remove it so to add it with my settings
try {
  winston.remove(winston.transports.Console);
} catch (e) { // do nothing
}

const winstonOptions = {
  colorize: true,
  timestamp: true,
  handleExceptions: true,
  prettyPrint: true,
};

if (process.env.LOG_LEVEL) {
  winstonOptions.level = process.env.LOG_LEVEL;
} else if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  winstonOptions.level = 'debug';
} else {
  winstonOptions.level = 'info';
}

if (!process.env.NO_LOG) {
  winston.add(winston.transports.Console, winstonOptions);
}

function generateRateLimit(tag, defaultScope) {
  return function rateLimit(req, res, next) {
    if (!req.headers.authorization) {
      return res.status(401).send('No Access token provided');
    }

    // take the accessToken as the last delimited entry in authorization
    const accessToken = req.headers.authorization.split(/\s+/).pop();

    // verify the access-token
    return authmakerVerify.mongoRateLimited(accessToken, tag, defaultScope)

      .then((oauthSession) => {
        req.oauthSession = oauthSession;

        // add the user to the req.user
        return authmakerVerify.models.user.findOne({
          _id: oauthSession.userId,
        }).exec().then((user) => {
          req.user = user;
        });
      })

      .then(() => {
        next();
      })

      .then(null, (err) => {
        winston.error('Error while authorizing session', {
          error: err.message,
          stask: err.stack,
          authorisation: req.headers.authorization,
        });

        if (err.message.indexOf('Not Authorized') >= 0) {
          res.status(401);
        } else if (err.message.indexOf('Too Many Requests') >= 0) {
          res.status(429);
          return res.send('Too Many Requests: Rate limit exceeded.');
        } else {
          res.status(500);
        }

        return res.send(err.message);
      });
  };
}

function generateVerify(tag, options) {
  return function (req, res, next) {
    // verify the access-token
    return Q.fcall(() => {
      if (!req.headers.authorization) {
        throw new Error('Not Authorized: No Access token provided');
      }

      // take the accessToken as the last delimited entry in authorization
      const accessToken = req.headers.authorization.split(/\s+/).pop();

      return authmakerVerify.mongo(accessToken, tag);
    })

      .then((oauthSession) => {
        req.oauthSession = oauthSession;

        // add the user to the req.user
        return authmakerVerify.models.user.findOne({
          _id: oauthSession.userId,
        }).exec().then((user) => {
          req.user = user;
        });
      })

      .then(() => {
        next();
      })

      .then(null, (err) => {
        winston.error('Error while authorizing session', {
          error: err.message,
          stask: err.stack,
          authorisation: req.headers.authorization,
        });

        if (options && options.passError) {
          return next(err);
        }

        if (err.message.indexOf('Not Authorized') >= 0) {
          res.status(401);
        } else {
          res.status(500);
        }

        return res.send(err.message);
      });
  };
}

function getExternalIdentities(req, res, next) {
  if (!req.user) {
    return next('req.user not defined - must use mongo(), mongoRateLimited() or mongoRateLimitedDefault() before this middleware');
  }

  return authmakerVerify.models.externalIdentity.find({
    _id: req.user.externalIdentities,
  }).exec().then((externalIdentities) => {
    req.externalIdentities = externalIdentities;

    next();
  }).then(null, (err) => {
    next(err);
  });
}

module.exports = {
  mongoRateLimited(tag, defaultScope) {
    return generateRateLimit(tag, defaultScope);
  },

  mongoRateLimitedDefault(tag, defaultScope) {
    console.warn('This function is deprecated, just use mongoRateLimited(tag, defaultScope) instead');
    return generateRateLimit(tag, defaultScope);
  },

  mongo(tag, options) {
    return generateVerify(tag, options);
  },

  externalIdentities: getExternalIdentities,

  init(nconf) {
    // initialise the db
    return authmakerVerify.init(nconf);
  },

  models: authmakerVerify.models,

  authmakerVerify,
};
