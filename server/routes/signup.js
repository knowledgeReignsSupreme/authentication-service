const passport = require('passport');
const {validateBasicSignInSignUpForm} = require('../../helpers/form-validations');
const { sendVerificationEmail, verificationEmailTypes } = require('../../helpers/email-verification')

/**
 * Validate the sign up form
 *
 * @param {object} payload - the HTTP body message
 * @returns {object} The result of validation. Object contains a boolean validation result,
 *                   errors tips, and a global message for the whole form.
 */
function validateSignUpForm(payload) {
	const errors = validateBasicSignInSignUpForm(payload);

	if (!payload || (typeof payload.name !== 'string') || !/^[a-zA-Z]+([\-\s]?[a-zA-Z]+)*$/.test(payload.name.trim())) {
		errors.name = {
			code: 'INVALID_NAME'
		};
	}

	if (!payload || typeof payload.password !== 'string' || payload.password.trim().length < 8) {
		errors.password = {
			code: 'INVALID_PASSWORD'
		};
	}

	return errors;
}

function signup(req, res, next) {
	const validationErrors = validateSignUpForm(req.body);

	if (Object.keys(validationErrors).length > 0) {
		return res.json({errors: validationErrors});
	}

	return passport.authenticate('local-signup', (err) => {
		if (err) {
			if (err.name === 'MongoError' && err.code === 11000) {
				// the 11000 Mongo code is for a duplication email error
				return res.json({
					errors: {
						email: 'DUPLICATED_EMAIL'
					}
				});
			}

			return res.json({
				errors: {
					'': 'FORM_SUBMISSION_FAILED'
				}
			});
		}

		return sendVerificationEmail(req.user, verificationEmailTypes.WELCOME)
      .then(payload => res.json(payload))
      .catch(err => res.json(err))
	})(req, res, next)
}

module.exports = signup;
