const User = require('mongoose').model('User')
const config = require('../config')
const { mailer } = require('./mailer')

const verificationEmailTypes = {
  WELCOME: 1,
  RESEND: 2,
  REVERIFY: 3,
  ROLLBACK: 4
}

function checkIsEmailVerified(query) {
  return User.findOne(query).exec()
    .then(user => {
      if (!user) {
        return Promise.reject({ message: 'user not exists' })
      }
      if (user.isEmailVerified) {
        return Promise.reject({
          errors: {
            emailVerification: 'EMAIL_ALREADY_VERIFIED'
          }
        });
      }
      return user
    })
}

function getTemplate(emailType) {
  let template, subject
  switch(emailType) {
    case verificationEmailTypes.WELCOME:
      template = mailer.getTemplate('welcomeVerification')
      subject = 'Welcome'
      break
    case verificationEmailTypes.RESEND:
      template = mailer.getTemplate('verification')
      subject = 'Email Verification'
      break
    case verificationEmailTypes.REVERIFY:
      template = mailer.getTemplate('reverification')
      subject = 'Email Changed'
      break
    case verificationEmailTypes.ROLLBACK:
      template = mailer.getTemplate('rollbackEmail')
      subject = 'Email Changed'
  }
  if (template) {
    return Promise.resolve({template, subject})
  } else {
    return Promise.reject({ message: 'load email template failed'})
  }
}

function sendMail(mailOptions) {
  return mailer.send(mailOptions)
    .then(() => {})
    .catch(err => Promise.reject({
      errors: {
        emailVerification: 'SEND_VERIFICATION_EMAIL_FAILED'
      }
    }))
}

function getEmailVerificationToken(user, emailType) {
  if (!user) {
    return Promise.reject({ message: 'user not exists' })
  }
  if (!emailType) {
    return Promise.reject({ message: 'unknown verification email type' })
  }
  // resend spam prevention
  if (user.emailVerificationTokenCreated && emailType === verificationEmailTypes.RESEND) {
    const secondsDiff = (new Date() - user.emailVerificationTokenCreated) / 1000;
    if (secondsDiff <= config.spamIntervals.resendVerificationEmail) {
      return Promise.reject({
        errors: {
          emailVerification: 'RESEND_VERIFICATION_EMAIL_SPAM',
          until: new Date(user.emailVerificationTokenCreated.getTime() + config.spamIntervals.resendVerificationEmail * 1000)
        }
      });
    }
  }
  const shouldNotCreateNewToken = user.lastVerifiedEmail && emailType === verificationEmailTypes.REVERIFY
  const emailVerificationToken = shouldNotCreateNewToken ? user.getExistingEmailVerificationToken() : user.getEmailVerificationToken()
  const to = emailType === verificationEmailTypes.ROLLBACK ? user.lastVerifiedEmail : user.email;

  if (shouldNotCreateNewToken) {
    return Promise.resolve(emailVerificationToken)
  } else {
    return user.save()
      .then(() => emailVerificationToken)
      .catch(err => reject({ message: 'user update failed'}))
  }
}

function sendVerificationEmail(user, emailType) {
  return new Promise((resolve, reject) => {
    getEmailVerificationToken(user, emailType)
      .then(token => {
        getTemplate(emailType).then(templateData => {
          const to = emailType === verificationEmailTypes.ROLLBACK ? user.lastVerifiedEmail : user.email;
          const extraUrl = emailType === verificationEmailTypes.ROLLBACK ? 'rollback/' : '';
          const emailVerificationUrl = config.applicationUrl + '/verification/email/' + extraUrl + token
          templateData.template = templateData.template.replace('{{emailVerificationUrl}}', emailVerificationUrl)
          templateData.template = templateData.template.replaceAll('{{applicationName}}', config.applicationName)
          templateData.template = templateData.template.replaceAll('{{name}}', user.name)

          const mailOptions = {
            to: to,
            subject: templateData.subject,
            html: templateData.template
          }

          sendMail(mailOptions).then(resolve).catch(reject)
        })
      })
  })
}

module.exports = { sendVerificationEmail, checkIsEmailVerified, verificationEmailTypes, getEmailVerificationToken }
