const { Router } = require('express');

const router = Router();

router
  .post('/api/signin', require('../controllers/signin'))
  .post('/api/signup', require('../controllers/signup'))
  .post('/api/token/refresh', require('../controllers/refresh-token'))
  .post(
    '/api/logout',
    verifyUser,
    onlyAuthenticated,
    require('../controllers/logout')
  );