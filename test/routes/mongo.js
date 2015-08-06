var expect = require('chai').expect;
var request = require('supertest');
var autoroute = require('express-autoroute');
var Q = require('q');

var fixture = rootRequire('test/fixtures/users');

function promiseRequest(params) {
    var deferred = Q.defer();

    var req = request(global.app)
        .get(params.route);

    if (params.access_token) {
        req.set('authorization', 'bearer: ' + params.access_token);
    }

    req.expect(200)
        .end(function(err) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve();
        });

    return deferred.promise;
}

function manyRequests(params, number, done) {
    var promises = [];

    for(var i = 0; i < number; i++ ){
        promises.push(promiseRequest(params));
    }

    Q.all(promises).then(function() {
        done();
    }, function(err) {
        done(err);
    });
}

describe("mongo verify functions", function() {

    before(function() {
        autoroute(global.app, {
            throwErrors: true,
            routeFile: rootPath('test/fixtures/routes/mongo.js')
        });
    });

    beforeEach(function() {
        return fixture.init();
    });

    afterEach(function() {
        fixture.reset();
    });

    it("should success every time with no verify", function(done) {
        request(global.app)
            .get('/noverify')
            .expect(200, done);
    });

    describe("verify only", function() {
        it("should fail when there is no access token", function(done) {
            request(global.app)
                .get('/verify')
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'No Access token provided');
                })
                .end(done);
        });
        it("should fail when there is an access token but it doesn't match the database", function(done) {
            request(global.app)
                .get('/verify')
                .set('authorization', "Bearer: this_doesnt_really_exist")
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Not Authorized: session not found with that access token');
                })
                .end(done);
        });
        it("should succeed when there is a valid access token", function(done) {
            request(global.app)
                .get('/verify')
                .set('authorization', "bearer: valid_access_token_1")
                .expect(200)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Success');
                })
                .end(done);
        });
        it("it should fail if there is a valid, expired access token", function(done) {
            request(global.app)
                .get('/verify')
                .set('authorization', "bearer: expired_access_token")
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Not Authorized: session has expired');
                })
                .end(done);
        });
        it("should fail if the endpoint needs a scope permission but the session doesn't have any", function(done) {
            request(global.app)
                .get('/scope')
                .set('authorization', "bearer: valid_access_token_1")
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Not Authorized: No scope associated with face_permissions');
                })
                .end(done);
        });
        it("should fail if the endpoint needs a scope permission but the session has the wrong one", function(done) {
            request(global.app)
                .get('/scope')
                .set('authorization', "bearer: valid_rate_limit_5_days")
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Not Authorized: No scope associated with face_permissions');
                })
                .end(done);
        });
        it("should succeed if the endpoint needs a scope permission and it is on the session", function(done) {
            request(global.app)
                .get('/scope')
                .set('authorization', "bearer: valid_face_permission")
                .expect(200)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Success');
                })
                .end(done);
        });
    });

    describe("rate limited", function() {
        it("should fail when there is no access token", function(done) {
            request(global.app)
                .get('/jointrated')
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'No Access token provided');
                })
                .end(done);
        });
        it("should fail when there is an access token but it doesn't match the database", function(done) {
            request(global.app)
                .get('/jointrated')
                .set('authorization', "Bearer: this_doesnt_really_exist")
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Not Authorized: session not found with that access token');
                })
                .end(done);
        });
        it("it should fail if there is a valid, expired access token", function(done) {
            request(global.app)
                .get('/jointrated')
                .set('authorization', "bearer: expired_access_token")
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Not Authorized: session has expired');
                })
                .end(done);
        });
        it("should fail if there is no scope and no default", function(done) {
            request(global.app)
                .get('/jointrated')
                .set('authorization', "bearer: expired_access_token")
                .expect(401)
                .expect(function(res) {
                    expect(res).to.have.property('text', 'Not Authorized: session has expired');
                })
                .end(done);
        });
        it("should suceed if there is a default scope", function(done) {
            request(global.app)
                .get('/defaultScope')
                .set('authorization', "bearer: valid_access_token_1")
                .expect(200)
                .end(done);
        });
        it("should allow 5 requests for a scope that ends with _limit_5_days", function(done) {
            manyRequests({
                route: '/jointrated',
                access_token: 'valid_rate_limit_5_days'
            }, 5, done);
        });
        it("should fail with 6 requests for a scope that ends with _limit_5_days", function(done){
            manyRequests({
                route: '/jointrated',
                access_token: 'valid_rate_limit_5_days'
            }, 5, function(err){
                if(err){
                    done(err);
                }
                request(global.app)
                    .get('/jointrated')
                    .set('authorization', "bearer: valid_rate_limit_5_days")
                    .expect(429)
                    .expect(function(res) {
                        expect(res).to.have.property('text', 'Too Many Requests: Rate limit exceeded.');
                    })
                    .end(done);
            });
        });

        it("should allow 10 requests for a scope that ends with _limit_5_seconds where there is a 1 second gap after the first 5 requests",  function(done){

            this.timeout(6000);
            manyRequests({
                route: '/jointrated',
                access_token: 'valid_rate_limit_5_second'
            }, 5, function(err){
                if(err){
                    done(err);
                }
                setTimeout(function(){
                    manyRequests({
                        route: '/jointrated',
                        access_token: 'valid_rate_limit_5_second'
                    }, 5, done);
                }, 1000);
            });
        });
        it("should fail with 11 requests for a scope that ends with _limit_5_seconds where there is a 1 second gap after the first 5 requests",  function(done){
            manyRequests({
                route: '/jointrated',
                access_token: 'valid_rate_limit_5_second'
            }, 5, function(err){
                if(err){
                    done(err);
                }
                setTimeout(function(){
                    manyRequests({
                        route: '/jointrated',
                        access_token: 'valid_rate_limit_5_second'
                    }, 5, function(err){
                        if(err){
                            done(err);
                        }
                        request(global.app)
                            .get('/jointrated')
                            .set('authorization', "bearer: valid_rate_limit_5_second")
                            .expect(429)
                            .expect(function(res) {
                                expect(res).to.have.property('text', 'Too Many Requests: Rate limit exceeded.');
                            })
                            .end(done);
                    });
                }, 1000);
            });
        });

        it("should allow 2 users to send 5 requests each for a scope that ends with _limit_5_days", function(done){
            manyRequests({
                route: '/jointrated',
                access_token: 'valid_rate_limit_5_days'
            }, 5, function(err){
                if(err){
                    done(err);
                }
                manyRequests({
                    route: '/jointrated',
                    access_token: 'valid_rate_limit_5_days_user2'
                }, 5, done);
            });
        });
    });
});
