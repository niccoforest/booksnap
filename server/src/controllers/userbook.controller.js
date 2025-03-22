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
// In userbook.controller.js, verifica toggleFavorite
exports.toggleFavorite = async (req, res) => {
  try {
    const userBookId = req.params.id;
    const { isFavorite, userId } = req.body;
    
    console.log(`[Server] toggleFavorite richiesto: userBookId=${userBookId}, isFavorite=${isFavorite}, userId=${userId}`);
    
    // Verifica parametri
    if (typeof isFavorite !== 'boolean') {
      console.error('[Server] isFavorite non è un booleano:', isFavorite);
      return res.status(400).json({ 
        success: false, 
        error: 'Il parametro isFavorite deve essere un valore booleano'
      });
    }
    
    // Cerca il libro dell'utente
    const userBook = await UserBook.findById(userBookId);
    
    if (!userBook) {
      console.error(`[Server] UserBook ${userBookId} non trovato`);
      return res.status(404).json({ 
        success: false, 
        error: 'Libro non trovato nella libreria dell\'utente'
      });
    }
    
    console.log(`[Server] UserBook trovato: ${userBook._id}, userId=${userBook.userId}, isFavorite=${userBook.isFavorite}`);
    
    // Verifica che l'utente sia il proprietario (opzionale in fase di test)
    // if (userId && userBook.userId.toString() !== userId.toString()) {
    //   console.error(`[Server] L'utente ${userId} non è il proprietario del libro ${userBookId}`);
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Non autorizzato a modificare questo libro'
    //   });
    // }
    
    // Aggiorna lo stato preferito
    userBook.isFavorite = isFavorite;
    userBook.updatedAt = Date.now();
    await userBook.save();
    
    console.log(`[Server] UserBook aggiornato: ${userBook._id}, nuovo isFavorite=${userBook.isFavorite}`);
    
    return res.status(200).json({
      success: true,
      data: userBook
    });
  } catch (error) {
    console.error('[Server] Errore in toggleFavorite:', error);
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
    // Problema: l'userId potrebbe essere diverso da quello che ci aspettiamo
    const userId = req.query.userId || (req.user && req.user._id);
    
    console.log(`[Server] getFavorites richiesto con userId:`, req.query);
    
    // Per il momento, permetti un userId anche se è una stringa
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente richiesto' 
      });
    }
    
    // Cerca nei preferiti
    let query = {
      userId: userId
    };
    
    // Aggiungi il filtro isFavorite
    query.isFavorite = true;
    
    console.log(`[Server] Query per i preferiti:`, query);
    
    // Trova tutti i libri preferiti dell'utente
    const favorites = await UserBook.find(query)
      .populate('bookId')
      .sort({ updatedAt: -1 });
    
    console.log(`[Server] Trovati ${favorites.length} preferiti`);
    
    return res.status(200).json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (error) {
    console.error('[Server] Errore durante il recupero dei preferiti:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante il recupero dei preferiti'
    });
  }
};

/**
 * Sincronizza i preferiti tra client e server
 */
exports.syncFavorites = async (req, res) => {
  try {
    const userId = req.body.userId || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente richiesto' 
      });
    }
    
    // Ottieni l'elenco dei preferiti dal client
    const { favorites } = req.body;
    
    if (!favorites || typeof favorites !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'L\'elenco dei preferiti non è valido'
      });
    }
    
    // Recupera tutti i libri dell'utente
    const userBooks = await UserBook.find({ userId });
    
    // Oggetto per tracciare le operazioni
    const operations = {
      updated: 0,
      unchanged: 0,
      errors: 0
    };
    
    // Processa ogni libro dell'utente
    const updatePromises = userBooks.map(async (userBook) => {
      try {
        const bookId = userBook._id.toString();
        const shouldBeFavorite = !!favorites[bookId];
        
        // Aggiorna solo se lo stato è diverso
        if (userBook.isFavorite !== shouldBeFavorite) {
          await UserBook.findByIdAndUpdate(
            bookId,
            { 
              isFavorite: shouldBeFavorite,
              updatedAt: Date.now()
            }
          );
          operations.updated++;
        } else {
          operations.unchanged++;
        }
      } catch (error) {
        console.error(`Errore nell'aggiornamento del libro ${userBook._id}:`, error);
        operations.errors++;
      }
    });
    
    // Attendi il completamento di tutte le operazioni
    await Promise.all(updatePromises);
    
    // Ottieni l'elenco aggiornato dei preferiti
    const updatedFavorites = await UserBook.find({
      userId,
      isFavorite: true
    })
    .populate('bookId')
    .sort({ updatedAt: -1 });
    
    return res.status(200).json({
      success: true,
      message: 'Sincronizzazione completata',
      operations,
      data: updatedFavorites
    });
  } catch (error) {
    console.error('Errore durante la sincronizzazione dei preferiti:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante la sincronizzazione dei preferiti'
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
  
  toggleFavorite: exports.toggleFavorite,
  getFavorites: exports.getFavorites,
  syncFavorites: exports.syncFavorites
};