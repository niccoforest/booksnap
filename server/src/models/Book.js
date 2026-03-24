const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
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
