// server/src/routes/recognitionCache.routes.js
const express = require('express');
const router = express.Router();
const recognitionCacheController = require('../controllers/recognitionCache.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Cerca nella cache
router.post('/find-by-ocr', recognitionCacheController.findByOcrText);
router.post('/find-by-keywords', recognitionCacheController.findByKeywords);

// Aggiorna la cache
router.post('/add', recognitionCacheController.addToCache);
router.post('/false-positive', recognitionCacheController.registerFalsePositive);
router.post('/correction', recognitionCacheController.registerCorrection);

// Ricerca combinata OCR + Google Books
router.post('/search-with-ocr', recognitionCacheController.searchWithOcr);


// Statistiche e amministrazione
router.get('/statistics', recognitionCacheController.getStatistics);
router.post('/prepopulate', recognitionCacheController.prepopulateCache);

module.exports = router;


