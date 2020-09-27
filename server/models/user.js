const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const config = require('../../config')
const { createUniqueId } = require('../services/tokens')

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

UserSchema.methods.getToken = function getToken (authType) {
  const secretParams = {
    sub: this._id,
	tenant: this.tenant,
	email: this.email,
	name: this.name,
	roles: this.roles  
  }

  if (authType === 'cookie') {
	const tokenIdentifier = createUniqueId();
	secretParams.tokenIdentifier = tokenIdentifier;
	this.tokens.push({
		kind: authType, 
		tokenIdentifier
	});
  }

  return jwt.sign(secretParams, config.jwtSecret, { expiresIn: config.tokenExpiration })
}

UserSchema.methods.getRefreshToken = function getRefreshToken () {
  const creationTime = Date.now();
	
  this.tokens.push({
	kind: 'cookie', 
	tokenIdentifier: createUniqueId(creationTime)
  });

  return jwt.sign({
    sub: this._id,
    tenant: this.tenant,
	created: creationTime.toJSON()
  }, config.refreshTokenSecret, { expiresIn: config.refreshTokenExpiration })
}

UserSchema.methods.updateToken = function updateToken(authType, currentToken, newToken) {
	this.tokens = this.tokens.filter(token => token.kind === authType && token.tokenIdentifier === currentToken);
	this.tokens.push({ kind:authType, tokenIdentifier: newToken });

	return this.save();
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
