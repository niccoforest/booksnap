const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// Ottieni tutti i libri
router.get('/', bookController.getBooks);

// Invia l'immagine della libreria (Base64) per la scansione
// NOTA: Per immagini grandi il limite del payload Express andrà alzato (vedi index.js)
router.post('/scan', bookController.scanLibrary);

module.exports = router;
const auth = require('../middlewares/authMiddleware');
const { getBooks, addBook } = require('../controllers/bookController');

// @route   GET api/books
// @desc    Prendi tutti i libri per un utente
// @access  Private (necessita auth token)
router.get('/', auth, getBooks);

// @route   POST api/books
// @desc    Aggiungi un libro scansionato
// @access  Private
router.post('/', auth, addBook);

module.exports = router;
