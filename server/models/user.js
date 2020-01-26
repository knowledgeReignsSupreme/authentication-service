const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../config');

// define the User model schema
const UserSchema = new mongoose.Schema({
	email: {
		type: String,
		index: {unique: true}
	},
	password: String,
	name: String,
	salt: String,
	roles: {
		type: [String],
		validate(roles) {
			const notValidRole = roles.find(role => !config.roles.includes(role));
			if (notValidRole) {
				return Promise.reject({message: 'role not valid', role: notValidRole});
			}
			return Promise.resolve();
		}
	},
	tokenCreated: Date,
	refreshTokenCreated: Date,
	emailVerificationTokenCreated: Date,
	isEmailVerified: {
		type: Boolean,
		default: false
	},
	lastVerifiedEmail: {
		type: String,
		required: false,
	  index: {
	    unique: true,
	    partialFilterExpression: { lastVerifiedEmail: { $type: 'string' } },
	  },
	  default: null,
	},
	lastEmailChanged: Date
});


/**
 * Compare the passed password with the value in the database. A model method.
 *
 * @param {string} password
 * @param {function} callback
 * @returns {object} callback
 */
UserSchema.methods.comparePassword = function comparePassword(password, callback) {
	bcrypt.compare(password, this.password, callback);
};

UserSchema.methods.getToken = function getToken() {
	this.tokenCreated = new Date();
	return jwt.sign({
			sub: this._id,
			created: this.tokenCreated.toJSON()
		}, config.jwtSecret, {expiresIn: config.tokenExpiration});
};

UserSchema.methods.getRefreshToken = function getRefreshToken() {
	this.refreshTokenCreated = new Date();
	return jwt.sign({
		sub: this._id,
		created: this.refreshTokenCreated.toJSON()
	}, config.refreshTokenSecret, {expiresIn: config.refreshTokenExpiration});
};

UserSchema.methods.getEmailVerificationToken = function getEmailVerificationToken() {
	this.emailVerificationTokenCreated = new Date();
	return this.getExistingEmailVerificationToken();
};

UserSchema.methods.getExistingEmailVerificationToken = function getExistingEmailVerificationToken() {
	return jwt.sign({
		sub: this._id,
		created: this.emailVerificationTokenCreated.toJSON()
	}, config.jwtSecret, {expiresIn: config.emailVerificationTokenExpiration});
};

/**
 * The pre-save hook method.
 */
UserSchema.pre('save', function saveHook(next) {
	const user = this;

	// define role for new user
	if (!user._id && (!user.roles || user.roles.length === 0)) {
		user.roles = [config.defaultRole];
	}

	if (!this.salt) {
		this.salt = bcrypt.genSaltSync();
	}

	// proceed further only if the password is modified or the user is new
	if (!user.isModified('password')) return next();


	return bcrypt.genSalt((saltError, salt) => {
		if (saltError) {
			return next(saltError);
		}

		return bcrypt.hash(user.password, salt, (hashError, hash) => {
			if (hashError) {
				return next(hashError);
			}

			// replace a password string with hash value
			user.password = hash;

			return next();
		});
	});
});


module.exports = mongoose.model('User', UserSchema);
