const express = require('express');
const router = express.Router();
const { getBooks, addBook, scanLibrary } = require('../controllers/bookController');

// Dipende se l'autenticazione è opzionale.
// Per mantenere la compatibilità con entrambe le versioni del merge,
// applichiamo il middleware in modo che se c'è, fa da protezione,
// altrimenti opzionale. Ma l'auth middleware originario probabilmente è strict.
// Se mettiamo `auth`, bloccherà le vecchie chiamate senza token.
// Aggiungo una logica per caricare l'auth opzionalmente o lasciarlo commentato a seconda se authMiddleware c'è o fa fail se non c'è header.
const auth = require('../middlewares/authMiddleware');

// @route   GET api/books
// @desc    Prendi tutti i libri per un utente
// @access  Private (necessita auth token)
router.get('/', auth, getBooks);

// @route   POST api/books
// @desc    Aggiungi un libro scansionato
// @access  Private
router.post('/', auth, addBook);

// Invia l'immagine della libreria (Base64) per la scansione
// NOTA: Per immagini grandi il limite del payload Express andrà alzato (vedi index.js)
// Questo route potrebbe essere sia aperto che protetto
router.post('/scan', auth, scanLibrary);

module.exports = router;
