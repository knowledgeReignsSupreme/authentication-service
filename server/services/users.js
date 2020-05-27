const config = require('../../config')

const { verificationEmailTypes, sendVerificationEmail } = require('./email-verification')

function getEmailVerified (user) {
  if (user.isEmailVerified) {
    return { isEmailVerified: false, lastVerifiedEmail: user.email }
  }
  return { lastEmailChanged: new Date() }
}

async function sendRelevantEmail (user, checkForSpam = true) {
  // spam prevention
  if (checkForSpam && user.lastEmailChanged) {
    const secondsDiff = (new Date() - user.lastEmailChanged) / 1000
    if (secondsDiff <= config.spamIntervals.changeEmail) {
      const until = new Date(user.lastEmailChanged.getTime() + config.spamIntervals.changeEmail * 1000)
      const err = new Error('CHANGE_EMAIL_SPAM')
      err.until = until
      throw err
    }
  }
  user = await Object.assign(user, getEmailVerified(user)).save()

  // send rollback email first if exists
  if (user.lastVerifiedEmail) {
    return sendVerificationEmail(user, verificationEmailTypes.ROLLBACK).then(rollbackEmailStatus => {
      return { rollbackEmailStatus }
    })
  } else {
    return sendVerificationEmail(user, verificationEmailTypes.REVERIFY)
      .then(reVerifyEmailStatus => {
          return { reVerifyEmailStatus }
        }
      )
  }
}
