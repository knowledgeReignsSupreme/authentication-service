const app = require('@greenpress/api-kit').app()

const verifyUser = require('../middleware/verify-user')
const { onlyAuthenticated } = require('../middleware/auth-check')

app.use(require('cookie-parser')());

app
	.post('/api/signin', require('../controllers/signin'))
	.post('/api/signup', require('../controllers/signup'))
	.post('/api/token/refresh', require('./refresh-token'))
	.post('/api/logout', verifyUser, require('../controllers/logout'))
	.get('/api/me', verifyUser, onlyAuthenticated, require('./me'))

app.use(require('./users'))
