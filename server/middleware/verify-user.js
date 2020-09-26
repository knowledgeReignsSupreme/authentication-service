const { verifyToken } = require('../services/tokens')
const { privilegedRoles } = require('../../config')

function oAuthVerify (req, res, next) {
	// get the last part from a authorization header string like "bearer token-value"
	const token = req.headers.authorization.split(' ')[1]
	const tenant = req.headers.tenant = req.headers.tenant || '0'

	return verifyToken(token, tenant)
		.then(payload => {
			// pass user details onto next route
			req.userPayload = payload
			req.userPayload.isPrivileged = payload.roles.some(role => privilegedRoles.includes(role))
			return next()
		})
		.catch(() => {
			return next()
		})
}

function cookieVerify (req, res, next) {
	// get the last part from a authorization header string like "bearer token-value"
	const token = req.cookies.token || req.signedCookies.token
	const tenant = req.headers.tenant = req.headers.tenant || '0'

}

/**
 *  The Auth Checker middleware function.
 */
module.exports = (req, res, next) => {
	if (req.cookies.token || req.signedCookies.token) {
		return cookieVerify(req, res, next)
	} else if (req.headers.authorization) {
		return oAuthVerify(req, res, next)
	}
	return next()
}
