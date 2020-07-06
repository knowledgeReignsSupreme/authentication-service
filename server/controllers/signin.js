const passport = require('passport')
const { validateBasicSignInSignUpForm } = require('../../helpers/form-validations')

/**
 * Validate the login form
 *
 * @param {object} payload - the HTTP body message
 * @returns {object} The result of validation. Object contains a boolean validation result,
 *                   errors tips, and a global message for the whole form.
 */
function validateSignInForm (payload) {
  const errors = validateBasicSignInSignUpForm(payload)

  if (!payload || typeof payload.password !== 'string' || payload.password.trim().length === 0) {
    errors.password = {
      code: 'EMPTY_PASSWORD'
    }
  }

  return errors
}

function signin (req, res, next) {
  const validationErrors = validateSignInForm(req.body)

  if (Object.keys(validationErrors).length > 0) {
    return res.json({ errors: validationErrors })
  }

  return passport.authenticate('local-login', (error, data) => {
    if (error !== null) {
      return res.json({
        errors: {
          [error.code === 'INCORRECT_CREDENTIALS' ? 'password' : '']: error
        }
      })
    }
    if (!data) {
      return res.json({
        errors: {
          'password': 'password is incorrect'
        }
      })
    }
    const { token, refreshToken, user } = data
    return res.json({
      payload: {
        token,
        refreshToken,
        user
      }
    })
  })(req, res, next)
}

module.exports = signin
