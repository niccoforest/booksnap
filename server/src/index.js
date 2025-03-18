const bookRoutes = require('./routes/book.routes');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
// Commentiamo temporaneamente le parti problematiche
// const session = require('express-session');
// const passport = require('./config/passport');

// Carica le variabili d'ambiente
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Importa le rotte (commentiamo temporaneamente le rotte di autenticazione)
// const authRoutes = require('./routes/auth.routes');

// Recupera la stringa di connessione MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

console.log('Variabili d\'ambiente caricate:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Definito' : 'Non definito');

// Inizializza l'app Express
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Commentiamo temporaneamente la configurazione di Passport
/*
app.use(session({
  secret: process.env.JWT_SECRET || 'secret_di_fallback',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());

// Rotte di autenticazione
app.use('/api/auth', authRoutes);
*/

// Rotte API di base
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BookSnap API funzionante!' });
});
app.use('/api/books', bookRoutes);

// Connessione MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connesso con successo a MongoDB Atlas'))
  .catch(err => console.error('Errore connessione MongoDB:', err));

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