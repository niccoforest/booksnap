const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userBookSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookId: {
    type: Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  libraryId: {
    type: Schema.Types.ObjectId,
    ref: 'Library'
  },
  readStatus: {
    type: String,
    enum: ['to-read', 'reading', 'completed', 'abandoned', 'lent'],
    default: 'to-read'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  notes: {
    type: String
  },
  startedReading: {
    type: Date
  },
  finishedReading: {
    type: Date
  }
}, { 
  timestamps: true
});

// Indici per ottimizzare le ricerche
userBookSchema.index({ userId: 1, bookId: 1 }, { unique: true });
userBookSchema.index({ userId: 1, libraryId: 1 });
userBookSchema.index({ userId: 1, readStatus: 1 });

const UserBook = mongoose.model('UserBook', userBookSchema);

module.exports = UserBook;