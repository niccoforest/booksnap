const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Ottieni il token dall'header
  const token = req.header('x-auth-token');

  // Verifica se non c'è il token
  if (!token) {
    return res.status(401).json({ msg: 'Nessun token fornito, autorizzazione negata' });
  }

  // Verifica il token
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET missing in production');
      }
    }
    const decoded = jwt.verify(token, secret || 'fallback_secret_for_dev_only');

    // Imposta l'utente nella request (estrapolando id dal token)
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token non valido' });
  }
};