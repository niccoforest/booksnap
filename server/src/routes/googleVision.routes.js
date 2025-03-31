// server/src/routes/googleVision.routes.js
const express = require('express');
const router = express.Router();
const googleVisionController = require('../controllers/googleVision.controller');

// Rilevamento testo
router.post('/text-detection', googleVisionController.detectText);

// Stato configurazione
router.get('/status', googleVisionController.getStatus);

module.exports = router;