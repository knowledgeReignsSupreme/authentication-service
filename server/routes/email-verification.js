const { Router } = require('express')
const verifyUser = require('../middleware/verify-user')
const { verifyEmail, resendVerificationEmail, rollbackEmail } = require('../controllers/email-verification')

const router = Router()

router
  .post('/api/verification/email', verifyEmail)
  .post('/api/verification/email/resend', verifyUser, resendVerificationEmail)
  .post('/api/verification/email/rollback', rollbackEmail)

module.exports = router
