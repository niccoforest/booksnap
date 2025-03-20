const UserBook = require('../models/userbook.model');
const Book = require('../models/book.model');
const Library = require('../models/library.model');
const mongoose = require('mongoose');

/**
 * Ottiene tutti i libri di un utente (con paginazione e filtri)
 */
const getUserBooks = async (req, res) => {
  try {
    // Nota: in una vera app, l'userId verrebbe preso dal token JWT
    const userId = req.query.userId || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente richiesto' 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Costruisci il filtro in base ai parametri della query
    const filter = { userId };
    
    if (req.query.libraryId) {
      filter.libraryId = req.query.libraryId;
    }
    
    if (req.query.readStatus) {
      filter.readStatus = req.query.readStatus;
    }
    
    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating);
    }
    
    // Recupera i libri dell'utente con paginazione
    const userBooks = await UserBook.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('bookId'); // Popola i dettagli del libro
    
    // Conta il totale per la paginazione
    const total = await UserBook.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: userBooks.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: userBooks
    });
  } catch (error) {
    console.error('Errore nel recupero dei libri dell\'utente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero dei libri dell\'utente' 
    });
  }
};

/**
 * Ottiene un record UserBook specifico per ID
 */
const getUserBookById = async (req, res) => {
  try {
    const userBookId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userBookId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID UserBook non valido' 
      });
    }
    
    const userBook = await UserBook.findById(userBookId)
      .populate('bookId')
      .populate('libraryId');
    
    if (!userBook) {
      return res.status(404).json({ 
        success: false, 
        error: 'Libro dell\'utente non trovato' 
      });
    }
    
    // Verifica proprietà (in una vera app userebbe req.user._id dal token)
    const requestUserId = req.query.userId || req.user?._id;
    if (!requestUserId || userBook.userId.toString() !== requestUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Non autorizzato ad accedere a questo record' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: userBook
    });
  } catch (error) {
    console.error('Errore nel recupero del libro dell\'utente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero del libro dell\'utente' 
    });
  }
};

/**
 * Aggiunge un libro alla biblioteca dell'utente
 */
const addUserBook = async (req, res) => {
  try {
    // Estrai i dati dalla richiesta
    const { 
      bookId, 
      libraryId, 
      readStatus, 
      rating, 
      notes, 
      startedReading, 
      finishedReading 
    } = req.body;
    
    // Nota: in una vera app l'userId verrebbe preso dal token JWT
    const userId = req.body.userId || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente richiesto' 
      });
    }
    
    if (!bookId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID libro richiesto' 
      });
    }
    
    // Verifica che il libro esista
    const bookExists = await Book.exists({ _id: bookId });
    if (!bookExists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Libro non trovato' 
      });
    }
    
    // Se non è specificata una libreria, trova la libreria predefinita dell'utente
    let finalLibraryId = libraryId;
    if (!finalLibraryId) {
      const defaultLibrary = await Library.findOne({ 
        userId, 
        isDefault: true 
      });
      
      if (defaultLibrary) {
        finalLibraryId = defaultLibrary._id;
      } else {
        // Se non esiste una libreria predefinita, creane una
        const newLibrary = new Library({
          userId,
          name: 'La mia libreria',
          description: 'Libreria predefinita',
          isDefault: true,
          isPublic: false
        });
        
        const savedLibrary = await newLibrary.save();
        finalLibraryId = savedLibrary._id;
      }
    } else {
      // Verifica che la libreria specificata esista e appartenga all'utente
      const libraryExists = await Library.exists({ 
        _id: finalLibraryId, 
        userId 
      });
      
      if (!libraryExists) {
        return res.status(404).json({ 
          success: false, 
          error: 'Libreria non trovata o non appartiene all\'utente' 
        });
      }
    }
    
    // Verifica se il libro è già nella libreria dell'utente
    const existingUserBook = await UserBook.findOne({
      userId,
      bookId
    });
    
    if (existingUserBook) {
      return res.status(400).json({ 
        success: false, 
        error: 'Questo libro è già nella tua biblioteca',
        data: existingUserBook
      });
    }
    
    // Crea il nuovo record UserBook
    const userBook = new UserBook({
      userId,
      bookId,
      libraryId: finalLibraryId,
      readStatus: readStatus || 'to-read',
      rating,
      notes,
      startedReading,
      finishedReading
    });
    
    await userBook.save();
    
    // Popola i dettagli del libro e della libreria per la risposta
    const populatedUserBook = await UserBook.findById(userBook._id)
      .populate('bookId')
      .populate('libraryId');
    
    res.status(201).json({
      success: true,
      message: 'Libro aggiunto alla biblioteca con successo',
      data: populatedUserBook
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta del libro alla biblioteca:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nell\'aggiunta del libro alla biblioteca' 
    });
  }
};

/**
 * Aggiorna il record UserBook di un utente
 */
const updateUserBook = async (req, res) => {
  try {
    const userBookId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userBookId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID UserBook non valido' 
      });
    }
    
    // Trova il record UserBook
    const userBook = await UserBook.findById(userBookId);
    
    if (!userBook) {
      return res.status(404).json({ 
        success: false, 
        error: 'Libro dell\'utente non trovato' 
      });
    }
    
    // Verifica proprietà (in una vera app userebbe req.user._id dal token)
    const requestUserId = req.body.userId || req.user?._id;
    if (!requestUserId || userBook.userId.toString() !== requestUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Non autorizzato a modificare questo record' 
      });
    }
    
    // Estrai i campi da aggiornare
    const { 
      libraryId, 
      readStatus, 
      rating, 
      notes, 
      startedReading, 
      finishedReading 
    } = req.body;
    
    // Prepara i dati da aggiornare
    const updateData = {};
    
    if (libraryId) {
      // Verifica che la libreria esista e appartenga all'utente
      const libraryExists = await Library.exists({ 
        _id: libraryId, 
        userId: userBook.userId 
      });
      
      if (!libraryExists) {
        return res.status(404).json({ 
          success: false, 
          error: 'Libreria non trovata o non appartiene all\'utente' 
        });
      }
      
      updateData.libraryId = libraryId;
    }
    
    if (readStatus) updateData.readStatus = readStatus;
    if (rating !== undefined) updateData.rating = rating;
    if (notes !== undefined) updateData.notes = notes;
    if (startedReading !== undefined) updateData.startedReading = startedReading;
    if (finishedReading !== undefined) updateData.finishedReading = finishedReading;
    
    // Aggiorna il record UserBook
    const updatedUserBook = await UserBook.findByIdAndUpdate(
      userBookId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .populate('bookId')
    .populate('libraryId');
    
    res.status(200).json({
      success: true,
      message: 'Libro dell\'utente aggiornato con successo',
      data: updatedUserBook
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento del libro dell\'utente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nell\'aggiornamento del libro dell\'utente' 
    });
  }
};

/**
 * Rimuove un libro dalla biblioteca dell'utente
 */
const removeUserBook = async (req, res) => {
  try {
    const userBookId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userBookId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID UserBook non valido' 
      });
    }
    
    // Trova il record UserBook
    const userBook = await UserBook.findById(userBookId);
    
    if (!userBook) {
      return res.status(404).json({ 
        success: false, 
        error: 'Libro dell\'utente non trovato' 
      });
    }
    
    // Verifica proprietà (in una vera app userebbe req.user._id dal token)
    const requestUserId = req.query.userId || req.user?._id;
    if (!requestUserId || userBook.userId.toString() !== requestUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Non autorizzato a rimuovere questo libro' 
      });
    }
    
    await UserBook.findByIdAndDelete(userBookId);
    
    res.status(200).json({
      success: true,
      message: 'Libro rimosso dalla biblioteca con successo'
    });
    
  } catch (error) {
    console.error('Errore nella rimozione del libro dalla biblioteca:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nella rimozione del libro dalla biblioteca' 
    });
  }
};

/**
 * Trova i libri letti di recente dall'utente
 */
const getRecentlyReadBooks = async (req, res) => {
  try {
    // Nota: in una vera app, l'userId verrebbe preso dal token JWT
    const userId = req.query.userId || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente richiesto' 
      });
    }
    
    const limit = parseInt(req.query.limit) || 5;
    
    // Trova i libri con stato "completed" e ordinali per data di fine lettura
    const recentlyRead = await UserBook.find({
      userId,
      readStatus: 'completed',
      finishedReading: { $exists: true, $ne: null }
    })
    .sort({ finishedReading: -1 })
    .limit(limit)
    .populate('bookId');
    
    res.status(200).json({
      success: true,
      count: recentlyRead.length,
      data: recentlyRead
    });
    
  } catch (error) {
    console.error('Errore nel recupero dei libri letti di recente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero dei libri letti di recente' 
    });
  }
};

/**
 * Aggiorna lo stato preferito di un libro nella libreria dell'utente
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const userBookId = req.params.id;
    const { isFavorite } = req.body;
    
    // Verifica che isFavorite sia definito e sia un boolean
    if (typeof isFavorite !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'Il parametro isFavorite deve essere un valore booleano'
      });
    }
    
    // Aggiorna lo stato preferito del libro
    const userBook = await UserBook.findByIdAndUpdate(
      userBookId, 
      { isFavorite, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!userBook) {
      return res.status(404).json({ 
        success: false, 
        error: 'Libro non trovato nella libreria dell\'utente'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: userBook
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dei preferiti:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante l\'aggiornamento dei preferiti'
    });
  }
};

/**
 * Ottiene tutti i libri preferiti dell'utente
 */
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user._id);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente richiesto' 
      });
    }
    
    // Trova tutti i libri preferiti dell'utente
    const favorites = await UserBook.find({
      userId,
      isFavorite: true
    })
    .populate('bookId')
    .sort({ updatedAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (error) {
    console.error('Errore durante il recupero dei preferiti:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante il recupero dei preferiti'
    });
  }
};


/**
 * Trova i libri attualmente in lettura dall'utente
 */
const getCurrentlyReadingBooks = async (req, res) => {
  try {
    // Nota: in una vera app, l'userId verrebbe preso dal token JWT
    const userId = req.query.userId || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente richiesto' 
      });
    }
    
    // Trova i libri con stato "reading"
    const currentlyReading = await UserBook.find({
      userId,
      readStatus: 'reading'
    })
    .sort({ startedReading: -1 })
    .populate('bookId');
    
    res.status(200).json({
      success: true,
      count: currentlyReading.length,
      data: currentlyReading
    });
    
  } catch (error) {
    console.error('Errore nel recupero dei libri in lettura:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero dei libri in lettura' 
    });
  }
};

module.exports = {
  getUserBooks,
  getUserBookById,
  addUserBook,
  updateUserBook,
  removeUserBook,
  getRecentlyReadBooks,
  getCurrentlyReadingBooks,
  // Aggiungi queste due funzioni all'esportazione
  toggleFavorite: exports.toggleFavorite,
  getFavorites: exports.getFavorites
};