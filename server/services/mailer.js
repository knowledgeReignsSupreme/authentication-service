const config = require('../../config')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

let emailTemplates
let isTemplatesLoaded = false

function createEmailTransport() {
  const smtpOptions = {
    service: config.mailProvider.service
  }
  if (config.mailProvider.authType === 'basic') {
    smtpOptions.auth = {
      user: config.mailProvider.email,
      pass: config.mailProvider.password
    }
  } else {
    // TODO other email authentication
    throw new Error('email_provider_not_implemented_yet')
  }
  return nodemailer.createTransport(smtpOptions)
}

function loadEmailTemplate(templatePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(templatePath, 'utf8', (err, template) => {
      if (err) {
        return reject(err)
      }
      return resolve(template)
    })
  })
}

/**
 * load all html files in ../server/emailtemplates directory
 *
 * @returns {object} Promise
 */

const smtpTransport = createEmailTransport()

const mailer = {}
mailer.send = (mailOptions) => {
  return new Promise((resolve, reject) => {
    if (!mailOptions) {
      return reject({ message: 'mailOptions required' })
    }

    mailOptions.from = config.mailProvider.email

    return smtpTransport.sendMail(mailOptions, (err, info) => {
      if (err) {
        return reject(err)
      }
      return resolve(info)
    })
  })
}
mailer.getTemplate = (templateIndex) => {
  if (isTemplatesLoaded) {
    return emailTemplates[templateIndex];
  }
  return ''
}

module.exports = { mailer }
