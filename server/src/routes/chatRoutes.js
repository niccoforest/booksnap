const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Invia messaggi della chat e ottieni la risposta
router.post('/', chatController.chat);

module.exports = router;
