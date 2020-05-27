const { verifyRefreshToken } = require('../services/tokens')

function refreshToken (req, res) {
	if (!req.headers.authorization) {
		return res.status(401).end()
	}

	// get the last part from a authorization header string like "bearer token-value"
	const token = req.headers.authorization.split(' ')[1]

	return verifyRefreshToken(token).then(user => {
		const token = user.getToken()
		const refreshToken = user.getRefreshToken()

		return user.save().then(() => {
			return res.jsonp({
				payload: {
					user: {
						email: user.email,
						name: user.name,
						roles: user.roles,
					},
					token,
					refreshToken,
				}
			}).end()
		})
	}).catch(() => res.status(401).end())
}

module.exports = refreshToken
