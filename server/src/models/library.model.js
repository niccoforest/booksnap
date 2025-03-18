const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const librarySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  shareableLink: {
    type: String
  }
}, { 
  timestamps: true
});

// Indici per ottimizzare le ricerche
librarySchema.index({ userId: 1 });
librarySchema.index({ isPublic: 1 });

const Library = mongoose.model('Library', librarySchema);

module.exports = Library;