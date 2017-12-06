const authmakerVerify = require('authmaker-verify');
const moment = require('moment');
const mongoose = require('mongoose');
const Q = require('q');

const sessionsToCreate = [{
  accessToken: 'valid_access_token_1',
  expiry: moment().add(1, 'hours').toDate(),
  userId: mongoose.Types.ObjectId(),
}, {
  accessToken: 'valid_face_permission',
  expiry: moment().add(1, 'hours').toDate(),
  scopes: ['face_permissions'],
  userId: mongoose.Types.ObjectId(),
}, {
  accessToken: 'expired_access_token',
  expiry: moment().subtract(1, 'seconds').toDate(),
  userId: mongoose.Types.ObjectId(),
}, {
  accessToken: 'valid_rate_limit_5_days',
  expiry: moment().add(1, 'hours').toDate(),
  scopes: ['face_limit_5_days'],
  userId: mongoose.Types.ObjectId(),
}, {
  accessToken: 'valid_rate_limit_5_days_user2',
  expiry: moment().add(1, 'hours').toDate(),
  scopes: ['face_limit_5_days'],
  userId: mongoose.Types.ObjectId(),
}, {
  accessToken: 'valid_rate_limit_5_second',
  expiry: moment().add(1, 'hours').toDate(),
  scopes: ['face_limit_5_seconds'],
  userId: mongoose.Types.ObjectId(),
}];

function init() {
  return authmakerVerify.models.oauthSession.create(sessionsToCreate);
}

function reset() {
  // only allow this in test
  if (process.env.NODE_ENV === 'test') {
    return authmakerVerify.getConnection().then(function (connection) {
      const collections = connection.collections;

      const promises = Object.keys(collections).map(function (collection) {
        return Q.ninvoke(collections[collection], 'remove');
      });

      return Q.all(promises);
    });
  }
  const errorMessage = 'Excuse me kind sir, but may I enquire as to why you are currently running reset() in a non test environment? I do propose that it is a beastly thing to do and kindly ask you to refrain from this course of action. Sincerely yours, The Computer.';
  console.log(errorMessage);
  console.error(errorMessage);
  throw new Error(errorMessage);
}

module.exports = {
  init,
  reset,
};
