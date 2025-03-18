// server/src/routes/library.routes.js
const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/library.controller');

// Rotte per le librerie
router.get('/', libraryController.getUserLibraries);
router.post('/', libraryController.createLibrary);
router.get('/:id', libraryController.getLibraryById);
router.put('/:id', libraryController.updateLibrary);
router.delete('/:id', libraryController.deleteLibrary);
router.get('/shared/:link', libraryController.getLibraryByShareableLink);

module.exports = router;