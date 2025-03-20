const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userBookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Library'
  },
  readStatus: {
    type: String,
    enum: ['to-read', 'reading', 'completed', 'abandoned', 'lent'],
    default: 'to-read'
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  notes: String,
  startedReading: Date,
  finishedReading: Date,
  
  // Nuovo campo per i preferiti
  isFavorite: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indici per ottimizzare le ricerche
userBookSchema.index({ userId: 1, bookId: 1 }, { unique: true });
userBookSchema.index({ userId: 1, libraryId: 1 });
userBookSchema.index({ userId: 1, readStatus: 1 });

const UserBook = mongoose.model('UserBook', userBookSchema);

module.exports = UserBook;