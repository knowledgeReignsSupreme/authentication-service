const jwt = require('jsonwebtoken')
const { jwtSecret, refreshTokenSecret, tokenExpiration, cookieTokenExpiration } = require('../../config')

function verifyToken (token, tenant) {
	if (!token.trim()) {
		return Promise.reject()
	}
	return verify(token, tenant, jwtSecret)
}

function verifyRefreshToken (refreshToken, tenant) {
	return verify(refreshToken, tenant, refreshTokenSecret)
}

function verify (token, tenant, secret) {
	return new Promise((resolve, reject) => {
		jwt.verify(token, secret, (err, decoded) => {
			if (err || !decoded || decoded.tenant !== tenant) {
				// the 401 code is for unauthorized status
				return reject(err || { message: 'token is empty' })
			}
			return resolve(decoded)
		})
	})
}

function getUniqueId (creationTime = Date.now().toString()) {
	return creationTime + ':' + Buffer.from(Math.random().toString()).toString('base64')
}

function setCookie (res, cookieId, maxAge = cookieTokenExpiration) {
	res.cookie('token', cookieId, { maxAge, httpOnly: true })
	return res
}

function getSignedToken (user, tokenIdentifier) {
	const secretParams = {
		sub: user._id,
		tenant: user.tenant,
		email: user.email,
		name: user.name,
		roles: user.roles
	}
	if (tokenIdentifier) {
		secretParams.tokenIdentifier = tokenIdentifier
	}
	return {
		payload: secretParams,
		token: jwt.sign(secretParams, jwtSecret, { expiresIn: tokenExpiration })
	}
}

module.exports = {
	verifyToken,
	verifyRefreshToken,
	getUniqueId,
	setCookie,
	getSignedToken
}
