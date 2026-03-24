const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const connectDB = require('../config/db');

// @desc    Registrazione di un nuovo utente
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    await connectDB(); // Sempre connettersi a Mongoose in serverless
    const { name, email, password } = req.body;

    // Check se l'utente esiste
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'L\'utente esiste già' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Ritorna il payload JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET missing in production');
      }
    }

    jwt.sign(
      payload,
      secret || 'fallback_secret_for_dev_only',
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore Server: ' + err.message);
  }
};

// @desc    Login Utente
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;

    // Controlla l'utente
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Credenziali non valide' });
    }

    // Confronta password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Credenziali non valide' });
    }

    // Invia Token
    const payload = {
      user: {
        id: user.id,
      },
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET missing in production');
      }
    }

    jwt.sign(
      payload,
      secret || 'fallback_secret_for_dev_only',
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore Server');
  }
};