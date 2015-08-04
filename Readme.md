[![Build Status](https://img.shields.io/travis/Authmaker/authmaker-verify-express/master.svg)](https://travis-ci.org/Authmaker/authmaker-verify-express)
[![Code Climate](https://img.shields.io/codeclimate/github/Authmaker/authmaker-verify-express.svg)](https://codeclimate.com/github/Authmaker/authmaker-verify-express)

[![Version npm](https://img.shields.io/npm/v/authmaker-verify-express.svg)](https://www.npmjs.com/package/authmaker-verify-express)
[![Dependencies](https://img.shields.io/david/Authmaker/authmaker-verify-express.svg)](https://david-dm.org/Authmaker/authmaker-verify-express)
[![npm Downloads](https://img.shields.io/npm/dm/authmaker-verify-express.svg)](https://www.npmjs.com/package/authmaker-verify-express)

# Authmaker Verify Express
This package allows you to use [Authmaker verify](https://www.npmjs.com/package/authmaker-verify) extremely easily in an ExpressJS based Node application.

## Installation
```
npm install --save authmaker-verify-express
```

### Usage
This package currently makes use of the Mongo connection for Authmaker Verify so you need to initialise the database connection before use:
```
var authmakerVerify = require('authmaker-verify');
authmakerVerify.connectMongo(nconf);
```

You need to pass a [nconf](https://github.com/indexzero/nconf) object into the connectMongo call that has access to at least the following parameters:

```
{
    "mongo": {
        "authmaker": {
            "db": "your-db-name",
            "host": "localhost",
            "port": 27017
        }
    }
}
```

you can also optionally include `username` and `password`. Each of these config entries are accessed asynchronously so you can use any of the asynchronous stores for nconf

#### Middlewares
To actually use this package you just need to include middlewares in your ExpressJS app. Here are a few examples of ways you can use authmaker-verify-express. Please note that all of these examples use a simple "success" callback that does nothing but responds with a 200 response code. They have also already imported required modules:

```
var authmakerVerifyExpress = require('authmaker-verify-express');
var express = require('express');
var app = express();

function success(req, res){
    return res.send("Success");
}
```

Requires users with valid, in date access tokens in the request:
```
app.get('/verify': [authmakerVerifyExpress.mongo(), success]);
```

Requires users with valid, in date access tokens with the scope "my_awesome_permission":
```
app.get('/scope': [authmakerVerifyExpress.mongo("my_awesome_permission"), success]);
```

Requires users with valid, in date access tokens with a rate limited scope (suffix `_limit_<num>_<timeframe>`)
```
app.get('/jointrated': [authmakerVerifyExpress.mongoRateLimited("face"), success]);
```

Requires users with valid, in date access token but if they don't have a rate limited scope it uses `face_limit_10_minutes` as a default scope:
```
app.get('/defaultScope': [authmakerVerifyExpress.mongoRateLimited("face", "face_limit_10_minutes"), success]);
```

### API

#### mongoRateLimited - function - returns middleware
```
mongoRateLimited: function(tag, defaultScope)
```

#### mongoRateLimitedDefault - function - returns middleware
```
mongoRateLimitedDefault: function(tag, defaultScope)
```

#### mongo - function - returns middleware
```
mongo: function(tag)
```

#### connectMongo - function
```
connectMongo: function(nconf) {
    //initialise the db
    authmakerVerify.connectMongo(nconf);
}
```

#### authmakerVerify - object
If you ever need to access the [authmaker-verify](https://github.com/Authmaker/authmaker-verify) object that is powering authmaker-verify-express to access any lower level apis you can access it directly like this:
```
var authmakerVerifyExpress = require('authmaker-verify-express');
authmakerVerifyExpress.authmakerVerify;
```
