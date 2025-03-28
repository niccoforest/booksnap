const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');



// Carica le variabili d'ambiente
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Importa le rotte
const bookRoutes = require('./routes/book.routes');
const libraryRoutes = require('./routes/library.routes');
const userBookRoutes = require('./routes/userbook.routes');
const reviewRoutes = require('./routes/review.routes');
const recognitionCacheRoutes = require('./routes/recognitionCache.routes');


// Recupera la stringa di connessione MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

console.log('Variabili d\'ambiente caricate:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Definito' : 'Non definito');

// Inizializza l'app Express
const app = express();

// Middleware
// Configurazione CORS
app.use(cors({
  origin: '*',  // In produzione, usa un'origine specifica
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotte API
app.use('/api/books', bookRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/user-books', userBookRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BookSnap API funzionante!' });
});

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

app.use('/api/recognition-cache', recognitionCacheRoutes);

// Porta del server
const PORT = process.env.PORT || 5000;

// Avvia il server
app.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
});
