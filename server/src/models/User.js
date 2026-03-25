const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6, // Esempio: "pippo123" sarà salvata come hash crittografato
  },
  name: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Nota: se la collection 'User' esiste già su Mongoose, usa quella
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);