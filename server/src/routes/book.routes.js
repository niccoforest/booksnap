const express = require('express');
const {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  searchBooks
} = require('../controllers/book.controller');

const router = express.Router();
const bookController = require('../controllers/book.controller');


// GET /api/books - Recupera tutti i libri (con paginazione e filtri)
router.get('/', getBooks);

// GET /api/books/search - Ricerca libri
router.get('/search', searchBooks);

router.get('/check-in-library/:googleBooksId/:userId', bookController.checkBookInLibrary);

// GET /api/books/:id - Recupera un singolo libro
router.get('/:id', getBookById);

// POST /api/books - Crea un nuovo libro
router.post('/', createBook);

// PUT /api/books/:id - Aggiorna un libro esistente
router.put('/:id', updateBook);

// DELETE /api/books/:id - Elimina un libro
router.delete('/:id', deleteBook);




module.exports = router;