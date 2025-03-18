const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  isbn: {
    type: String,
    trim: true,
    index: true
  },
  publisher: {
    type: String,
    trim: true
  },
  publishedYear: {
    type: Number
  },
  pageCount: {
    type: Number
  },
  description: {
    type: String
  },
  language: {
    type: String,
    trim: true
  },
  genres: [{
    type: String,
    trim: true
  }],
  coverImage: {
    type: String
  },
  dominantColor: {
    type: String  // Colore dominante copertina (formato HEX)
  },
  googleBooksId: {
    type: String,
    trim: true,
    index: true
  },
  statistics: {
    averageRating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    topTags: [{
      tag: String,
      count: Number
    }]
  }
}, { 
  timestamps: true // Aggiunge createdAt e updatedAt
});

// Indici per ottimizzare le ricerche
bookSchema.index({ title: 'text', author: 'text' });
bookSchema.index({ genres: 1 });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;