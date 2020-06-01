const User = require('../models/user')
const { Router } = require('express')
const populateUser = require('../middleware/populate-user')
const { onlyPrivileged } = require('../middleware/auth-check')
const { isObjectId } = require('../../helpers/mongo-utils')

const privilegedUserFields = 'email name roles isEmailVerified lastVerifiedEmail lastEmailChanged'

function getUsers (req, res) {
  const isPrivileged = !!(req.user && req.user.isPrivileged)

  const users = (req.query.users || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => isObjectId(id))

  if (!(isPrivileged || users.length)) {
    return res.status(200).jsonp([]).end()
  }
  const query = isPrivileged && !users.length ? {} : { _id: { $in: users } }
  query.tenant = req.headers.tenant

  return User.find(query)
    .select(isPrivileged ? privilegedUserFields : 'name')
    .lean()
    .then(users => {
      return res.status(200).jsonp(users || []).end()
    })
    .catch(() => res.status(404).jsonp({ message: 'could not load users' }).end())
}

function getUser (req, res) {
  const isPrivileged = !!(req.user && req.user.isPrivileged)

  return User.findOne({ _id: req.params.userId, tenant: req.headers.tenant })
    .select(isPrivileged ? privilegedUserFields : 'name')
    .lean()
    .then(user => {
      if (!user) {
        return Promise.reject(null)
      }
      return res.status(200).jsonp(user).end()
    })
    .catch(() => res.status(404).jsonp({ message: 'user not exists' }).end())
}

async function createUser (req, res) {
  const user = new User(req.body)
  user.tenant = req.headers.tenant

  // privileged user creating this user, so no need to verify email
  user.isEmailVerified = true

  try {
    const { _id, name, email, roles } = await user.save()
    res.status(200).json({ _id, name, email, roles }).end()
  } catch (e) {
    res.status(400).json({ message: 'user creation failed' }).end()
  }
}

async function updateUser (req, res) {
  const { email, roles, name } = req.body || {}

  try {
    const user = await User.findOne({ _id: req.params.userId, tenant: req.headers.tenant })
    await Object.assign(user, { email, roles, name }).save()
    res.status(200).json({ email: user.email, name: user.name, roles: user.roles, _id: user._id }).end()
  } catch (e) {
    res.status(400).json({ message: 'user update failed' }).end()
  }
}

async function removeUser (req, res) {
  try {
    await User.deleteOne({ _id: req.params.userId, tenant: req.headers.tenant })
    res.status(200).json({ _id: req.params.userId }).end()
  } catch (e) {
    res.status(400).json({ message: 'user deletion failed' }).end()
  }
}

/**
 * to dump last verified email for security reason
 */
function disableRollback (req, res) {
  User.findOne({ _id: req.params.userId, tenant: req.headers.tenant })
    .then(user => {
      if (user.lastVerifiedEmail) {
        user.lastVerifiedEmail = null
        return user.save()
          .then(() => res.status(200).jsonp({}).end())
      }
      return res.status(200).jsonp({ errors: { '': 'EMAIL_ROLLBACK_ALREADY_DISABLED' } }).end()
    })
    .catch(err => res.status(400).jsonp({ message: 'disable email rollback failed' }).end())
}

const router = Router()

router
  .get('/api/users', populateUser, getUsers)
  .post('/api/users', populateUser, createUser)
  .get('/api/users/:userId', populateUser, getUser)
  .put('/api/users/:userId', populateUser, onlyPrivileged, updateUser)
  .delete('/api/users/:userId', populateUser, onlyPrivileged, removeUser)
  .post('/api/users/:userId/disable-rollback', populateUser, onlyPrivileged, disableRollback)

module.exports = router
