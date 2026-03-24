const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Inizializza l'app Express
const app = express();

const mongoose = require('mongoose');

// Middleware
app.use(cors());
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

// Rotte API di base
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BookSnap API funzionante!' });
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
