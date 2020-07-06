module.exports = function getMe (req, res) {
  return res.status(200).json({
    _id: req.userPayload.sub,
    email: req.userPayload.email,
    name: req.userPayload.name,
    roles: req.userPayload.roles,
  }).end()
}
