const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true, // Commentato per ora (singolo utente temporaneo o opzionale)
  },
  title: {
    type: String,
    required: true,
  },
  authors: [{
    type: String
  }],
  author: {
    type: String,
  },
  isbn: {
    type: String,
    sparse: true,
  },
  coverUrl: {
    type: String, // Può essere l'URL o la stringa in Base64
  },
  coverImage: {
    type: String,
  },
  description: {
    type: String,
  },
  publishedDate: {
    type: String,
  },
  pageCount: {
    type: Number,
  },
  categories: [{
    type: String
  }],
  metadata: {
    type: Object, // Salveremo qui le risposte grezze di Google Books / OpenRouter
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Book || mongoose.model('Book', bookSchema);
