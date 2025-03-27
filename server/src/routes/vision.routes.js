// In server/src/routes/vision.routes.js
const express = require('express');
const visionController = require('../controllers/vision.controller');
const router = express.Router();

router.post('/', visionController.processImage);

module.exports = router;

// Poi aggiungi in server/src/index.js
const visionRoutes = require('./routes/vision.routes');
app.use('/api/vision', visionRoutes);