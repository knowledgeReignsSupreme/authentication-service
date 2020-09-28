const User = require('../models/user')

async function getUser (query) {
	try {
		const user = await User.findOne(query)
		if (user) {
			return user
		}
	} catch (err) {
		throw { code: 'FORM_SUBMISSION_FAILED', info: err }
	}

	throw { code: 'INCORRECT_CREDENTIALS' }
}

function updateUser (user, tenant = null, email = null, password = null, name = null, roles = null) {

}

function deleteUser(user) {

}

function comparePassword (user, password) {
	return new Promise((resolve, reject) => {
		return user.comparePassword(password.trim(), (passwordErr, isMatch) => {
			if (passwordErr) {
				return reject({ code: 'FORM_SUBMISSION_FAILED', info: passwordErr })
			}
			if (!isMatch) {
				return reject({ code: 'INCORRECT_CREDENTIAL' })
			}
			resolve(user)
		})
	})
}

function setToken (user, authType) {
	if (authType === 'oauth') {
		return setOAuthAuthentication(user, authType)
	}
	if (authType === 'cookie') {
		return setCookieAuthentication(user)
	}
	throw { code: 'INVALID AUTH TYPE' }
}

function updateToken (user, authType, currentToken, newToken) {
	return user.updateToken(authType, currentToken, newToken)
	       .catch(err => Promise.reject({ code: 'UPDATE TOKEN FAILED', info: err }));
}

function deleteToken(user, authType, token) {

}

function setOAuthAuthentication (user) {
	const token = user.getToken('oauth');
	const refreshToken = user.getRefreshToken();

	return user.save().then(() => {
		return {
			token,
			refreshToken,
			user
		}
	})
}

function setCookieAuthentication (user) {
	return { user, cookieToken: user.getToken('cookie') }
}

module.exports = {
	getUser,
	updateUser,
	deleteUser,
	comparePassword,
	setToken,
	updateToken,
	deleteToken
}
