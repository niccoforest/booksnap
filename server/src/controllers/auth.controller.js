const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Genera token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Handler per il callback di Google OAuth
const googleCallback = async (req, res) => {
  try {
    // A questo punto l'utente è già autenticato tramite passport
    if (!req.user) {
      return res.status(400).json({ success: false, message: 'Autenticazione fallita' });
    }

    // Genera token JWT
    const token = generateToken(req.user._id);

    // In produzione, reindirizza al frontend con il token
    if (process.env.NODE_ENV === 'production') {
      return res.redirect(`${process.env.FRONTEND_URL}/auth-callback?token=${token}`);
    }

    // In sviluppo, puoi restituire il token come JSON per i test
    res.status(200).json({
      success: true,
      token,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profilePicture: req.user.profilePicture
      }
    });
  } catch (error) {
    console.error('Errore nel callback Google:', error);
    res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
};

// Recupera profilo utente corrente
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
};

module.exports = {
  googleCallback,
  getCurrentUser
};