const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs')
const config = require('../../config')
const { createNewToken } = require('../services/tokens');

// define the User model schema
const UserSchema = new mongoose.Schema({
  tenant: {
    type: String,
    index: true,
    default: '0'
  },
  email: {
    type: String,
    required: true
  },
  password: String,
  name: String,
  salt: String,
  roles: {
    type: [String],
    validate (roles) {
      const notValidRole = roles.find(role => !config.roles.includes(role))
      if (notValidRole) {
        return Promise.reject({ message: 'role not valid', role: notValidRole })
      }
      return Promise.resolve()
    }
  },
  tokens: {
	  type: [{
		  kind: {
			  type: String,
			  enum: ['cookie', 'oauth'],
			  default: 'cookie'
		  },
		  tokenIdentifier: String
	  }]
  },
  created: {
    type: Date,
    default: Date.now
  }
})

UserSchema.index({ tenant: 1, email: 1 }, { unique: true })

/**
 * Compare the passed password with the value in the database. A model method.
 *
 * @param {string} password
 * @param {function} callback
 * @returns {object} callback
 */
UserSchema.methods.comparePassword = function comparePassword (password, callback) {
  bcrypt.compare(password, this.password, callback)
}

UserSchema.methods.getToken = function getToken () {
  return jwt.sign({
    sub: this._id,
    tenant: this.tenant,
    email: this.email,
    name: this.name,
    roles: this.roles
  }, config.jwtSecret, { expiresIn: config.tokenExpiration })
}

UserSchema.methods.getRefreshToken = function getRefreshToken () {
  const creationDate = Date.now();	

  this.tokens.push(createNewToken('oauth', creationDate));

  return jwt.sign({
    sub: this._id,
    tenant: this.tenant,
    created: creationDate.toJSON()
  }, config.refreshTokenSecret, { expiresIn: config.refreshTokenExpiration })
}

UserSchema.methods.getCookieToken = function getCookie (cookie) {
  this.tokens.push(createNewToken('cookie'));

  return jwt.sign({
	  sub: this._id,
	  tenant: this.tenant,
	  email: this.email,
	  name: this.name,
	  roles: this.roles,
	  tokenIdentifier: this.tokens[this.tokens.length - 1].tokenIdentifier
  }, config.jwtSecret, { expiresIn: config.tokenExpiration});
}

/**
 * The pre-save hook method.
 */
UserSchema.pre('save', function saveHook (next) {
  const user = this

  // define role for new user
  if (!user.roles || user.roles.length === 0) {
    user.roles = [config.defaultRole]
  }

  if (!this.salt) {
    this.salt = bcrypt.genSaltSync()
  }

  // proceed further only if the password is modified or the user is new
  if (!user.isModified('password')) return next()

  return bcrypt.genSalt((saltError, salt) => {
    if (saltError) {
      return next(saltError)
    }

    return bcrypt.hash(user.password, salt, (hashError, hash) => {
      if (hashError) {
        return next(hashError)
      }

      // replace a password string with hash value
      user.password = hash

      return next()
    })
  })
})

module.exports = mongoose.model('User', UserSchema)
