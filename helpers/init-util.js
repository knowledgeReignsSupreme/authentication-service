/**
 * this file used to initiate basic data inside the authentication service
 */
const User = require('mongoose').model('User');
const config = require('../config');

function init() {
	const user = new User({
		email: 'test@test.com',
		name: 'Administrator',
		password: 'admin',
		roles: [config.privilegedRoles[0]],
		isEmailVerified: true,
		emailVerificationTokenCreated: new Date()
	});

	return user.save().then((lastUser) => {
		return lastUser
	});
}

function reset() {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV !== 'production') {
      User.deleteMany({}, err => {
        if (err) {
          return reject(err)
        }
        User.syncIndexes({}, errIdx => {
          if (errIdx) {
            return reject(errIdx)
          }
          return resolve()
        })
      });
    } else {
      return reject(new Error('cannot reset production'))
    }
  })
}

module.exports = { init, reset }
