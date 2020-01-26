const User = require('mongoose').model('User')
const PassportLocalStrategy = require('passport-local').Strategy

module.exports = new PassportLocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  session: false,
  passReqToCallback: true
}, (req, email, password, done) => {
  const query = { email: email.trim() }
  if (req.body.roles && req.body.roles instanceof Array) {
    query.roles = { $in: req.body.roles }
  }
  return User.findOne(query, (err, user) => {
    if (err) {
      return done({ code: 'FORM_SUBMISSION_FAILED', info: err })
    }

    if (!user) {
      return done({ code: 'INCORRECT_CREDENTIALS' })
    }

    if (!user.isEmailVerified) {
      return done({ code: 'EMAIL_VERIFICATION_REQUIRED' })
    }

    return user.comparePassword(password.trim(), (passwordErr, isMatch) => {
      if (passwordErr) {
        return done({ code: 'FORM_SUBMISSION_FAILED', info: passwordErr })
      }

      if (!isMatch) {
        return done({ code: 'INCORRECT_CREDENTIALS' })
      }

      const token = user.getToken()
      const refreshToken = user.getRefreshToken()

      return user.save().then(() => {
        return done(
          null,
          {
            token,
            refreshToken,
            user: {
              email: user.email,
              name: user.name,
              roles: user.roles
            }
          }
        )
      })
    })
  })
})
