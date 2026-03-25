const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./config/db');

// Inizializza l'app Express
const app = express();

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

// Incrementa il limite del payload JSON per gestire le immagini Base64 grandi (aumentato a 50mb per scanner)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connessione a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/booksnap';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connesso a MongoDB!'))
  .catch((err) => console.error('❌ Errore di connessione a MongoDB:', err));

// Tentativo di connessione al database (utile per lo sviluppo locale)
if (process.env.NODE_ENV !== 'production') {
  connectDB().catch(console.error);
}

// Rotte API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BookSnap API funzionante e architettura aggiornata!' });
});

// Gestione errori di base
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Errore interno del server' });
});

// Nota: Il blocco sottostante per servire file statici è necessario solo se non si usa Vercel o
// un proxy per servire i file frontend. Con l'attuale configurazione di vercel.json,
// Vercel redirige internamente alla route '/client/build/index.html'. Tuttavia, questa
// configurazione di fallback server-side permette all'app Node di servire l'SPA se
// ospitata in modi tradizionali (es. su Heroku, VPS etc). È importante però gestire l'app.get('*')
// con attenzione: siccome stiamo servendo un'API, in genere l'API restituirebbe 404 per
// rotte non trovate in un'architettura microservizi. Ma con una build monolitica va bene,
// a patto che questo venga DOPO le `/api/*` (ed è così).
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    // Escludiamo eventuali hit all'API non trovate, inviando 404 invece di servire index.html
    // per rotte API inesistenti, che era probabilmente il motivo per cui alcune chiamate API
    // non valide potevano fallire "silenziosamente" (restituendo l'HTML al posto del JSON).
    if (req.originalUrl.startsWith('/api/')) {
       return res.status(404).json({ error: 'Endpoint API non trovato' });
    }
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// Porta del server
const PORT = process.env.PORT || 5000;

// Avvia il server
if (process.env.NODE_ENV !== 'production') {
   app.listen(PORT, () => {
     console.log(`Server in esecuzione sulla porta ${PORT}`);
   });
}

// Esporta l'app per Vercel
module.exports = app;
