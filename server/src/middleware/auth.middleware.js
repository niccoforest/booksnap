const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware per proteggere le rotte
const protect = async (req, res, next) => {
  let token;

  // Verifica se il token è presente nell'header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Estrai il token dall'header
      token = req.headers.authorization.split(' ')[1];

      // Verifica il token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Recupera l'utente dal token, escludendo la password
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error('Errore di autenticazione:', error);
      res.status(401).json({ success: false, message: 'Non autorizzato, token non valido' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Non autorizzato, token mancante' });
  }
};

module.exports = { protect };