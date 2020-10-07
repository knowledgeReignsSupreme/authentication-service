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
	if (authType === 'cookie') {
		setCookie(res, '', -1);
	}
	deleteToken(req.userPayload.sub, req.headers.tenant, authType, (authType === 'oauth'), relatedToken).catch(Promise.resolve)
	res.status(200).end();

	return next();
}

module.exports = logout
