const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  bookId: {
    type: Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  text: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true
});

// Indici per ottimizzare le ricerche
reviewSchema.index({ bookId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;