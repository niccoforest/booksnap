const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
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
  authors: [{
    type: String
  }],
  isbn: {
    type: String,
    sparse: true,
  },
  coverUrl: {
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
  // Associazione a un utente (predisposizione multi-utente)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true, // Commentato per ora (singolo utente temporaneo)
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Book', bookSchema);
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
