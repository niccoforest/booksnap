const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

// Rotte per le recensioni
router.get('/books/:bookId', reviewController.getBookReviews);
router.get('/users/:userId', reviewController.getUserReviews);
router.get('/:id', reviewController.getReviewById);
router.post('/', reviewController.createReview);
router.put('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);

module.exports = router;