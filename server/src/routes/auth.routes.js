const express = require('express');
const passport = require('passport');
const { googleCallback, getCurrentUser } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Rotta per iniziare l'autenticazione Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback per l'autenticazione Google
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// Rotta per ottenere l'utente corrente (protetta)
router.get('/me', protect, getCurrentUser);

module.exports = router;