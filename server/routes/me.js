function getMe(req, res) {
	return res.status(200).jsonp({
		_id: req.user._id,
		email: req.user.email,
		name: req.user.name,
		roles: req.user.roles,
		isEmailVerified: req.user.isEmailVerified
	}).end();
}

module.exports = getMe;
