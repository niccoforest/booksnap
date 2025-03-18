const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Inserisci un indirizzo email valido']
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true  // Permette valori null/undefined (per utenti che non usano Google)
  },
  profilePicture: {
    type: String,
    default: ''
  },
  preferences: {
    favoriteGenres: [String],
    favoriteAuthors: [String],
    tags: [String]
  },
  privacy: {
    reviewVisibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    enableRecommendations: {
      type: Boolean,
      default: true
    }
  }
}, { 
  timestamps: true // Aggiunge createdAt e updatedAt
});

// Indice per ricerche rapide
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;