const Book = require('../models/book.model');

// Recupera tutti i libri (con paginazione e filtri)
const getBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Costruisci il filtro in base ai parametri della query
    const filter = {};
    
    if (req.query.title) {
      filter.title = { $regex: req.query.title, $options: 'i' };
    }
    
    if (req.query.author) {
      filter.author = { $regex: req.query.author, $options: 'i' };
    }
    
    if (req.query.genre) {
      filter.genres = req.query.genre;
    }
    
    // Recupera i libri
    const books = await Book.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Conta il totale per la paginazione
    const total = await Book.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: books.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: books
    });
  } catch (error) {
    console.error('Errore nel recupero dei libri:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei libri',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Recupera un singolo libro per ID
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Libro non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Errore nel recupero del libro:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del libro',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Crea un nuovo libro
const createBook = async (req, res) => {
  try {
    // Verifica se il libro esiste già (per ISBN o GoogleBooksId)
    let existingBook = null;
    
    if (req.body.isbn) {
      existingBook = await Book.findOne({ isbn: req.body.isbn });
      if (existingBook) {
        return res.status(200).json({
          success: true,
          message: 'Libro già esistente',
          data: existingBook
        });
      }
    }
    
    if (req.body.googleBooksId) {
      existingBook = await Book.findOne({ googleBooksId: req.body.googleBooksId });
      if (existingBook) {
        return res.status(200).json({
          success: true,
          message: 'Libro già esistente',
          data: existingBook
        });
      }
    }
    
    // Crea il nuovo libro
    const newBook = new Book(req.body);
    await newBook.save();
    
    res.status(201).json({
      success: true,
      message: 'Libro creato con successo',
      data: newBook
    });
  } catch (error) {
    console.error('Errore nella creazione del libro:', error);
    res.status(400).json({
      success: false,
      message: 'Errore nella creazione del libro',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Aggiorna un libro esistente
const updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Libro non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Libro aggiornato con successo',
      data: book
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del libro:', error);
    res.status(400).json({
      success: false,
      message: 'Errore nell\'aggiornamento del libro',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Elimina un libro
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Libro non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Libro eliminato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del libro:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del libro',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Ricerca libri (ricerca testuale)
const searchBooks = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Termine di ricerca non specificato'
      });
    }
    
    const books = await Book.find({
      $text: { $search: searchTerm }
    }, {
      score: { $meta: 'textScore' }
    })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
    
    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Errore nella ricerca dei libri:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella ricerca dei libri',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  searchBooks
};