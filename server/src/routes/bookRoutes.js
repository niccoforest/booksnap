const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// Ottieni tutti i libri
router.get('/', bookController.getBooks);

// Invia l'immagine della libreria (Base64) per la scansione
// NOTA: Per immagini grandi il limite del payload Express andrà alzato (vedi index.js)
router.post('/scan', bookController.scanLibrary);

module.exports = router;
