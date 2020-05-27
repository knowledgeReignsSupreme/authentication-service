function routes (app) {
  const populateUser = require('../middleware/populate-user')
  const { onlyAuthenticated } = require('../middleware/auth-check')

  app
    .post('/api/signin', require('./signin'))
    .post('/api/signup', require('./signup'))
    .post('/api/token/refresh', require('./refresh-token'))
    .get('/api/me', populateUser, onlyAuthenticated, require('./me'))

  app.use(require('./users'))
  app.use(require('./email-verification'))
}

module.exports = routes
