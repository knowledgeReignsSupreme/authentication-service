function routes (app) {
  const populateUser = require('../middleware/populate-user')
  const { onlyAuthenticated, onlyPrivileged } = require('../middleware/auth-check')

  const { getUsers, updateUser, getUser, disableRollback } = require('./users')
  const { resendVerificationEmail, verifyEmail, rollbackEmail } = require('./email-verification')

  app
    .post('/api/signin', require('./signin'))
    .post('/api/signup', require('./signup'))
    .post('/api/token/refresh', require('./refresh-token'))
    .post('/api/users/:userId/disable-rollback', populateUser, onlyPrivileged, disableRollback)
    .post('/api/verification/email', verifyEmail)
    .post('/api/verification/email/resend', populateUser, resendVerificationEmail)
    .post('/api/verification/email/rollback', rollbackEmail)
    .get('/api/me', populateUser, onlyAuthenticated, require('./me'))
    .get('/api/users', populateUser, getUsers)
    .get('/api/users/:userId', populateUser, getUser)
    .put('/api/users/:userId', populateUser, onlyPrivileged, updateUser)
}

module.exports = routes
