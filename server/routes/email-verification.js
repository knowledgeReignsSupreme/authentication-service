const User = require('../models/user')
const { Router } = require('express')
const populateUser = require('../middleware/populate-user')

const { verifyEmailVerificationToken } = require('../services/tokens')
const { verificationEmailTypes, checkIsEmailVerified, sendVerificationEmail } = require('../services/email-verification')

function resendVerificationEmail (req, res) {
  if (req.user) {
    return res.json({
      errors: {
        emailVerification: 'ALREADY_SIGNED_IN'
      }
    })
  }
  return checkIsEmailVerified({ email: req.body.email, tenant: req.headers.tenant })
    .then(user => sendVerificationEmail(user, verificationEmailTypes.RESEND))
    .then(result => res.json(result))
    .catch(err => {
      if (err.message) {
        return res.status(404).jsonp(err).end()
      }
      return res.json(err)
    })
}

function verifyEmail (req, res) {
  if (!req.body || !req.body.token) {
    return res.status(400).jsonp({ message: 'email verification token required' }).end()
  }
  return verifyEmailVerificationToken(req.body.token, req.headers.tenant)
    .then(decoded => {
      return checkIsEmailVerified({ _id: decoded.userId })
        .then(user => {
          if (user.emailVerificationTokenCreated.toJSON() === decoded.created) {
            user.isEmailVerified = true

            return user.save()
              .then(() => res.jsonp({}).end())
              .catch(() => res.status(400).jsonp({ message: 'email verification failed' }).end())
          }
          return res.status(400).jsonp({ message: 'email verification failed' }).end()
        })
        .catch(err => {
          if (err.message) {
            return res.status(404).jsonp(err).end()
          }
          return res.json(err)
        })
    })
    .catch(err => res.status(401).jsonp({ message: 'you are not authorized' }).end())
}

function rollbackEmail (req, res) {
  if (!req.body || !req.body.token) {
    return res.status(400).jsonp({ message: 'email rollback token required' }).end()
  }
  return verifyEmailVerificationToken(req.body.token, req.headers.tenant)
    .then(decoded => {
      return User.findOne({ _id: decoded.userId, tenant: req.headers.tenant })
        .then(user => {
          if (user.emailVerificationTokenCreated.toJSON() === decoded.created && user.email !== user.lastVerifiedEmail) {
            if (!user.lastVerifiedEmail) {
              return res.status(400).jsonp({ message: 'email rollback disabled' }).end()
            }
            user.isEmailVerified = true
            user.email = user.lastVerifiedEmail
            user.lastVerifiedEmail = null
            user.lastEmailChanged = new Date()
            user.emailVerificationTokenCreated = new Date()

            return user.save()
              .then(() => res.jsonp({}).end())
              .catch(() => res.status(400).jsonp({ message: 'email rollback failed' }).end())
          }
          return res.status(400).jsonp({ message: 'email rollback failed' }).end()
        })
        .catch(err => {
          if (err.message) {
            return res.status(404).jsonp(err).end()
          }
          return res.json(err)
        })
    })
    .catch(err => res.status(401).jsonp({ message: 'you are not authorized' }).end())
}

const router = Router()

router
  .post('/api/verification/email', verifyEmail)
  .post('/api/verification/email/resend', populateUser, resendVerificationEmail)
  .post('/api/verification/email/rollback', rollbackEmail)

module.exports = router
