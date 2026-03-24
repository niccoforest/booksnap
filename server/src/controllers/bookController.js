const Book = require('../models/Book');
const connectDB = require('../config/db');

// @desc    Ottieni tutti i libri di un utente
// @route   GET /api/books
// @access  Private
exports.getBooks = async (req, res) => {
  try {
    await connectDB();
    // req.user.id viene passato dal middleware auth
    const books = await Book.find({ user: req.user.id }).sort({ addedAt: -1 });
    res.json(books);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore Server');
  }
};

// @desc    Aggiungi un nuovo libro scansionato
// @route   POST /api/books
// @access  Private
exports.addBook = async (req, res) => {
  try {
    await connectDB();

    // Per ora non facciamo validazioni complesse (si faranno nel middleware frontend/backend)
    const newBook = new Book({
      user: req.user.id,
      title: req.body.title,
      author: req.body.author,
      isbn: req.body.isbn,
      coverImage: req.body.coverImage,
      description: req.body.description,
      metadata: req.body.metadata,
    });

    const book = await newBook.save();
    res.json(book);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore Server');
  }
};