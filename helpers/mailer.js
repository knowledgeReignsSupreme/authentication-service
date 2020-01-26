const config = require('../config')
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
function loadEmailTemplates() {
  return new Promise((resolve, reject) => {
    if (!isTemplatesLoaded) {
      const templates = []
      const templatesDir = path.join(__dirname, '..', 'server', 'emailtemplates')
      fs.readdir(templatesDir, (errDir, files) => {
        if (errDir) {
          return reject(errDir)
        }
        const errors = []
        files
          .reduce(
            (chain, file) => {
              return chain.then(() => {
                // filter only html files
                if (file.substring(file.lastIndexOf('.')) === '.html') {
                  const templatePath = path.join(templatesDir, file)
                  const index = file.substring(0, file.lastIndexOf('.'))
                  return loadEmailTemplate(templatePath)
                    .then((template) => {
                      templates[index] = template
                    })
                    .catch((err) => {
                      templates[index] = ''
                      errors[index] = 'email template not found'
                    })
                } else {
                  return Promise.resolve()
                }
              })
            },
            Promise.resolve()
          )
          .then(() => {
            if (errors.length > 0) {
              return reject(errors)
            }
            isTemplatesLoaded = true
            emailTemplates = templates
            return resolve()
          })
          .catch((err) => reject(err))
      })
    } else {
      return resolve()
    }
  })
}

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

module.exports = { mailer, loadEmailTemplates }
