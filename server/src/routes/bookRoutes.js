const express = require('express');
const router = express.Router();
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