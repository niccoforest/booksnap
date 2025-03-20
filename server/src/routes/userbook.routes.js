const express = require('express');
const router = express.Router();
const userBookController = require('../controllers/userbook.controller');

// Rotte per i libri dell'utente
router.get('/', userBookController.getUserBooks);
router.post('/', userBookController.addUserBook);
router.get('/recently-read', userBookController.getRecentlyReadBooks);
router.get('/currently-reading', userBookController.getCurrentlyReadingBooks);
router.get('/:id', userBookController.getUserBookById);
router.put('/:id', userBookController.updateUserBook);
router.delete('/:id', userBookController.removeUserBook);

router.get('/favorites', userBookController.getFavorites);
router.put('/:id/favorite', userBookController.toggleFavorite);

module.exports = router;