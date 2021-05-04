const app = require('@greenpress/api-kit').app();
const me = require('../controllers/me');
const { onlyAuthenticated } = require('../middleware/auth-check');
const verifyUser = require('../middleware/verify-user');

app.use(require('cookie-parser')());

app
  .route('/api/me', verifyUser, onlyAuthenticated)
  .post(me.setMe)
  .get(me.getMe);

app.use(require('./users'));
app.use(require('./auth'));
