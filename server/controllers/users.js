const { Types: { ObjectId } } = require('mongoose')
const User = require('../models/user')
const { isObjectId } = require('../../helpers/mongo-utils')

const privilegedUserFields = 'email name roles isEmailVerified lastVerifiedEmail lastEmailChanged'

function getUsers (req, res) {
  const isPrivileged = !!(req.userPayload && req.userPayload.isPrivileged)

  const users = (req.query.users || '')
    .split(',')
    .map(id => {
      const val = id.trim()
      if (isObjectId(val)) {
        return ObjectId(val)
      }
      return false
    })
    .filter(Boolean)

  if (!(isPrivileged || users.length)) {
    return res.status(200).json([]).end()
  }

  const query = isPrivileged && !users.length ? {} : { _id: { $in: users } }
  query.tenant = req.headers.tenant

  return User.find(query)
    .select(isPrivileged ? privilegedUserFields : 'name')
    .lean()
    .then(users => {
      return res.status(200).json(users || []).end()
    })
    .catch(() => res.status(404).json({ message: 'could not load users' }).end())
}

function getUser (req, res) {
  const isPrivileged = !!(req.userPayload && req.userPayload.isPrivileged)

  return User.findOne({ _id: req.params.userId, tenant: req.headers.tenant })
    .select(isPrivileged ? privilegedUserFields : 'name')
    .lean()
    .then(user => {
      if (!user) {
        return Promise.reject(null)
      }
      return res.status(200).json(user).end()
    })
    .catch(() => res.status(404).json({ message: 'user not exists' }).end())
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
    if (email) {
      user.email = email
    }
    if (roles) {
      user.roles = roles
    }
    if (name) {
      user.name = name
    }
    await user.save()
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
          .then(() => res.status(200).json({}).end())
      }
      return res.status(200).json({ errors: { '': 'EMAIL_ROLLBACK_ALREADY_DISABLED' } }).end()
    })
    .catch(err => res.status(400).json({ message: 'disable email rollback failed' }).end())
}

module.exports = {
  getUsers,
  createUser,
  getUser,
  updateUser,
  removeUser,
  disableRollback
}
