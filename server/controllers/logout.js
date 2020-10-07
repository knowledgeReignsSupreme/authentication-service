const { deleteToken } = require('../services/users');
const { setCookie } = require('../services/tokens')

async function logout(req, res, next) {
	let relatedToken, authType;
	if (req.cookies.token || req.signedCookies.token) {
		relatedToken = req.cookies.token || req.signedCookies.token;
		authType = 'cookie';
	} else if (req.headers.authorization) {
		relatedToken = req.headers.authorization;
		authType = 'oauth'
	} else {
		return next();
	}

	if (!(await deleteToken(req.body.sub, req.body.tenant, authType, (authType === 'oauth'), relatedToken))) {
		res.status(500).json({
			errors: {
			  token: 'FAILED_TO_DELETE_TOKEN'
			}
		  })
	} else {
		if (authType === 'cookie') {
			res = setCookie(res, '', -1);
		}
		res.status(200).end();
	}

	return next();
}

module.exports = logout