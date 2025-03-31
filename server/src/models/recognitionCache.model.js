// server/src/models/recognitionCache.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recognitionCacheSchema = new Schema({
  // Il testo OCR normalizzato
  normalizedText: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // Parole chiave estratte dal testo per la ricerca veloce
  keywords: [String],
  
  // Informazioni sul libro associato
  bookData: {
    googleBooksId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    publisher: { type: String },
    publishedYear: { type: Number },
    isbn: { type: String },
    isbn10: { type: String },
    isbn13: { type: String },
    pageCount: { type: Number },
    language: { type: String },
    genres: [String],
    coverImage: { type: String },
    largeImage: { type: String },
    description: { type: String }
  },
  
  // Fonte del riconoscimento
  source: {
    type: String,
    enum: ['user', 'prepopulated', 'corrected', 'google_books'],
    default: 'user'
  },
  
  // Livello di confidenza nel riconoscimento
  confidence: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1.0
  },
  
  // Numero di volte che questa entry è stata usata
  usageCount: {
    type: Number,
    default: 1
  },
  
  // Flag per gestire falsi positivi
  isFalsePositive: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indici per query rapide
recognitionCacheSchema.index({ normalizedText: 'text' });
recognitionCacheSchema.index({ keywords: 1 });
recognitionCacheSchema.index({ 'bookData.title': 'text', 'bookData.author': 'text' });
recognitionCacheSchema.index({ usageCount: -1 });

// Pre-save hook per aggiornare updatedAt
recognitionCacheSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Metodo statico per cercare per parole chiave
recognitionCacheSchema.statics.findByKeywords = function(keywords, limit = 10) {
  return this.find({ keywords: { $in: keywords }, isFalsePositive: { $ne: true } })
    .sort({ usageCount: -1, confidence: -1 })
    .limit(limit);
};

const RecognitionCache = mongoose.model('RecognitionCache', recognitionCacheSchema);

module.exports = RecognitionCache;