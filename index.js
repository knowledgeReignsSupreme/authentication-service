String.prototype.replaceAll = function (search, replacement) {
  return this.replace(new RegExp(search, 'g'), replacement)
}

const { mongoUri } = require('./config')
const { loadEmailTemplates } = require('./server/services/mailer')

// connect to the database and load models
require('./server/models').connect(mongoUri)

// load passport strategies
require('./server/passport')
require('./server/routes')

// start the server
loadEmailTemplates().then(() => {
  require('@greenpress/api-kit')
    .start('Authentication Service',
      process.env.PORT || 8000,
      process.env.IP || '0.0.0.0')
})
