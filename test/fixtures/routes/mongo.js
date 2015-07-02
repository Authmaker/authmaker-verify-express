var authmakerVerifyExpress = rootRequire('./index');

function success(req, res){
    return res.send("Success");
}

module.exports.autoroute = {
    get: {
        '/noverify': success,
        '/verify': [authmakerVerifyExpress.mongo(), success],
        '/scope': [authmakerVerifyExpress.mongo("face_permissions"), success],
        '/jointrated': [authmakerVerifyExpress.mongoRateLimited("face"), success],
        '/defaultScope': [authmakerVerifyExpress.mongoRateLimitedDefault("face", "face_limit_10_minutes"), success],
        // '/splitrated': [authmakerVerifyExpress.mongo, authmakerVerifyExpress.rateLimited, success]
    }
};
