const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Inizializza l'app Express
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotte API di base
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BookSnap API funzionante!' });
});

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

// Connessione MongoDB
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/booksnap';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch(err => console.error('Errore connessione MongoDB:', err));