const User = require('mongoose').model('User')
const { isObjectId } = require('../../helpers/mongo-utils')
const { sendVerificationEmail, verificationEmailTypes } = require('../../helpers/email-verification')
const config = require('../../config')
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
  return User.find(isPrivileged && !users.length ? {} : { _id: { $in: users } })
    .select(isPrivileged ? privilegedUserFields : 'name')
    .lean()
    .then(users => {
      return res.status(200).jsonp(users || []).end()
    })
    .catch(() => res.status(404).jsonp({ message: 'could not load users' }).end())
}

function getUser (req, res) {
  const isPrivileged = !!(req.user && req.user.isPrivileged)

  return User.findById(req.params.userId)
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

function changeEmailVerified(user) {
  if (user.isEmailVerified) {
    user.isEmailVerified = false
    user.lastVerifiedEmail = user.email
  }
  user.lastEmailChanged = new Date()
}

function updateUser (req, res) {
  const body = req.body || {}

  let emailChanged = false, rollbackEmailStatus, reverifyEmailStatus;
  User.findById(req.params.userId)
    .then(user => {
      // Invalidate email verification
      if (body.email && user.email !== body.email) {
        // spam prevention
        if (user.lastEmailChanged) {
          const secondsDiff = (new Date() - user.lastEmailChanged) / 1000
          if (secondsDiff > config.spamIntervals.changeEmail) {
            changeEmailVerified(user)
            emailChanged = true
          } else {
            const until = new Date(user.lastEmailChanged.getTime() + config.spamIntervals.changeEmail * 1000)
            const err = new Error('CHANGE_EMAIL_SPAM')
            err.until = until
            throw err
          }
        } else {
          changeEmailVerified(user)
          emailChanged = true
        }
      }
      return Object.assign(user, body).save()
    })
    .then(savedUser => {
      // send rollback email first if exists
      if (emailChanged && savedUser.lastVerifiedEmail) {
        return sendVerificationEmail(savedUser, verificationEmailTypes.ROLLBACK)
          .then(emailStatus => {
            rollbackEmailStatus = emailStatus
            return savedUser
          })
          .catch(err => {
            rollbackEmailStatus = err
            return savedUser
          })
      }
      return savedUser
    })
    .then(savedUser => {
      if (emailChanged) {
        return sendVerificationEmail(savedUser, verificationEmailTypes.REVERIFY)
          .then(emailStatus => {
            reverifyEmailStatus = emailStatus
            return savedUser
          })
          .catch(err => {
            reverifyEmailStatus = err
            return savedUser
          })
      }
      return savedUser
    })
    .then(({ email, name, roles, _id }) => {
      return res.status(200).jsonp({ email, name, roles, _id, rollbackEmailStatus, reverifyEmailStatus }).end()
    })
    .catch(err => {
      if (err && err.message === 'CHANGE_EMAIL_SPAM') {
        res.status(200).jsonp({
          errors: {
            '': err.message,
            until: err.until
          }
        }).end()
      } else {
        res.status(400).jsonp({ message: 'user update failed' }).end()
      }
    })
}

/**
 * to dump last verified email for security reason
*/
function disableRollback(req, res) {
  User.findById(req.params.userId)
    .then(user => {
      if (user.lastVerifiedEmail) {
        user.lastVerifiedEmail = null
        return user.save()
          .then(() => res.status(200).jsonp({}).end())
      }
      return res.status(200).jsonp({ errors: {'': 'EMAIL_ROLLBACK_ALREADY_DISABLED'} }).end()
    })
    .catch(err => res.status(400).jsonp({ message: 'disable email rollback failed' }).end())
}

module.exports = { getUsers, updateUser, getUser, disableRollback }
