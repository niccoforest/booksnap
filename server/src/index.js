const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Inizializza l'app Express
const app = express();

const mongoose = require('mongoose');
// Gestione dinamica CORS per Vercel
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Permetti richieste senza origin (come cURL, app mobile) in sviluppo
    // Oppure se origin è negli allowedOrigins (es: l'url del frontend react deployato su Vercel)
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Se ci servono i cookie / token in futuro
};

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Permetti richieste senza origin (come quelle da server o app mobili)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Non consentito da CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));

// Incrementa il limite del payload JSON per gestire le immagini Base64 grandi
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connessione a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/booksnap';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connesso a MongoDB!'))
  .catch((err) => console.error('❌ Errore di connessione a MongoDB:', err));
app.use(express.json({ limit: '50mb' })); // Per immagini base64 dallo scanner
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Tentativo di connessione al database (utile per lo sviluppo locale)
if (process.env.NODE_ENV !== 'production') {
  connectDB().catch(console.error);
}

// Rotte API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BookSnap API funzionante e architettura aggiornata!' });
});

// Importa e usa le rotte dei libri
const bookRoutes = require('./routes/bookRoutes');
app.use('/api/books', bookRoutes);

// Importa e usa le rotte per la chat del bibliotecario
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);

// Gestione errori di base
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Errore interno del server' });
});

// In produzione, servi i file statici del frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// Porta del server
const PORT = process.env.PORT || 5000;

// Avvia il server
app.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
});
