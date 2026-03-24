const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Ogni libro è associato a un utente
  },
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
  },
  isbn: {
    type: String,
  },
  coverImage: {
    type: String, // Può essere l'URL o la stringa in Base64
  },
  description: {
    type: String,
  },
  metadata: {
    type: Object, // Salveremo qui le risposte grezze di Google Books / OpenRouter
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Book || mongoose.model('Book', BookSchema);