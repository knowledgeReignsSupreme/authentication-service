const jwt = require('jsonwebtoken')
const User = require('mongoose').model('User')
const config = require('../config')

function verifyToken (token) {
  if (!token.trim()) {
    return Promise.reject()
  }
  return verify(token, config.jwtSecret).then(({ user, decoded }) => {
    if (user.tokenCreated.toJSON() === decoded.created) {
      return user
    }
    return Promise.reject()
  })
}

function verifyRefreshToken (refreshToken) {
  return verify(refreshToken, config.refreshTokenSecret).then(({ user, decoded }) => {
    if (user.refreshTokenCreated.toJSON() === decoded.created) {
      return user
    }
    return Promise.reject()
  })
}

function verify (token, secret) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err || !decoded) {
        // the 401 code is for unauthorized status
        return reject(err || { message: 'token is empty' })
      }

      const userId = decoded.sub

      // check if a user exists
      return User.findById(userId, (userErr, user) => {
        if (userErr || !user) {
          return reject(userErr || { message: 'user not exists' })
        }

        if (!user.isEmailVerified) {
          return reject({ message: 'user email verification required' })
        }
        resolve({ user, decoded })
      })
    })
  })
}

function verifyEmailVerificationToken (token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err || !decoded) {
        // the 401 code is for unauthorized status
        return reject(err || { message: 'token is empty' })
      }

      resolve({userId: decoded.sub, created: decoded.created})
    })
  })
}

module.exports = {
  verifyToken,
  verifyRefreshToken,
  verifyEmailVerificationToken
}
