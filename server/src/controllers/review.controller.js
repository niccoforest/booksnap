const Review = require('../models/review.model');
const Book = require('../models/book.model');
const mongoose = require('mongoose');
const User = require('../models/user.model'); 

/**
 * Ottiene tutte le recensioni di un libro
 */
const getBookReviews = async (req, res) => {
  try {
    const bookId = req.params.bookId;
    
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID libro non valido' 
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Per default mostra solo recensioni pubbliche, a meno che non sia specificato
    const showPrivate = req.query.showPrivate === 'true';
    
    // Costruisci il filtro
    const filter = { 
      bookId 
    };
    
    // Se non è richiesto di mostrare le recensioni private, filtra solo quelle pubbliche
    if (!showPrivate) {
      filter.isPublic = true;
    }
    
    // Se è richiesto di filtrare per utente specifico
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    // Recupera le recensioni
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name profilePicture'); // Popola solo i campi necessari dell'utente
    
    // Conta il totale per la paginazione
    const total = await Review.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews
    });
  } catch (error) {
    console.error('Errore nel recupero delle recensioni:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero delle recensioni' 
    });
  }
};

/**
 * Ottiene tutte le recensioni di un utente
 */
const getUserReviews = async (req, res) => {
  try {
    // Nota: in una vera app, per le recensioni private l'userId verrebbe preso dal token JWT
    const userId = req.params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente non valido' 
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Per default mostra solo recensioni pubbliche, a meno che non sia l'utente stesso
    const isCurrentUser = req.user?._id?.toString() === userId.toString();
    const showPrivate = isCurrentUser || req.query.showPrivate === 'true';
    
    // Costruisci il filtro
    const filter = { 
      userId 
    };
    
    // Se non è richiesto di mostrare le recensioni private, filtra solo quelle pubbliche
    if (!showPrivate) {
      filter.isPublic = true;
    }
    
    // Recupera le recensioni
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('bookId', 'title author coverImage'); // Popola solo i campi necessari del libro
    
    // Conta il totale per la paginazione
    const total = await Review.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews
    });
  } catch (error) {
    console.error('Errore nel recupero delle recensioni dell\'utente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero delle recensioni dell\'utente' 
    });
  }
};

/**
 * Ottiene una recensione specifica
 */
const getReviewById = async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID recensione non valido' 
      });
    }
    
    const review = await Review.findById(reviewId)
      .populate('bookId')
      .populate('userId', 'name profilePicture');
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recensione non trovata' 
      });
    }
    
    // Controlla se la recensione è pubblica o appartiene all'utente corrente
    if (!review.isPublic && (!req.user || review.userId._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ 
        success: false, 
        error: 'Accesso non autorizzato a questa recensione' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Errore nel recupero della recensione:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero della recensione' 
    });
  }
};

/**
 * Crea una nuova recensione
 */
const createReview = async (req, res) => {
  try {
    // Estrai i dati dalla richiesta
    const { bookId, rating, text, tags, isPublic } = req.body;
    
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
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valutazione richiesta (1-5)' 
      });
    }
    
    // Verifica che il libro esista
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ 
        success: false, 
        error: 'Libro non trovato' 
      });
    }
    
    // Verifica se l'utente ha già recensito questo libro
    const existingReview = await Review.findOne({
      userId,
      bookId
    });
    
    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        error: 'Hai già recensito questo libro',
        data: existingReview
      });
    }
    
    // Crea la nuova recensione
    const review = new Review({
      userId,
      bookId,
      rating,
      text: text || '',
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true
    });
    
    const savedReview = await review.save();
    
    // Aggiorna le statistiche del libro
    await updateBookStatistics(bookId);
    
    // Popola i dettagli dell'utente e del libro per la risposta
    const populatedReview = await Review.findById(savedReview._id)
      .populate('bookId', 'title author coverImage')
      
    
    res.status(201).json({
      success: true,
      message: 'Recensione creata con successo',
      data: populatedReview
    });
  } catch (error) {
    console.error('Errore nella creazione della recensione:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nella creazione della recensione',
      details: error.message
    });
  }
};

/**
 * Aggiorna una recensione esistente
 */
const updateReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID recensione non valido' 
      });
    }
    
    // Trova la recensione
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recensione non trovata' 
      });
    }
    
    // Verifica proprietà (in una vera app userebbe req.user._id dal token)
    const requestUserId = req.body.userId || req.user?._id;
    if (!requestUserId || review.userId.toString() !== requestUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Non autorizzato a modificare questa recensione' 
      });
    }
    
    // Estrai i campi da aggiornare
    const { rating, text, tags, isPublic } = req.body;
    
    // Prepara i dati da aggiornare
    const updateData = {};
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valutazione deve essere tra 1 e 5' 
        });
      }
      updateData.rating = rating;
    }
    
    if (text !== undefined) updateData.text = text;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    // Aggiorna la recensione
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .populate('bookId', 'title author coverImage')
    .populate('userId', 'name profilePicture');
    
    // Aggiorna le statistiche del libro
    await updateBookStatistics(review.bookId);
    
    res.status(200).json({
      success: true,
      message: 'Recensione aggiornata con successo',
      data: updatedReview
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento della recensione:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nell\'aggiornamento della recensione' 
    });
  }
};

/**
 * Elimina una recensione
 */
const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID recensione non valido' 
      });
    }
    
    // Trova la recensione
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recensione non trovata' 
      });
    }
    
    // Verifica proprietà (in una vera app userebbe req.user._id dal token)
    const requestUserId = req.query.userId || req.user?._id;
    if (!requestUserId || review.userId.toString() !== requestUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Non autorizzato a eliminare questa recensione' 
      });
    }
    
    // Salva il bookId per aggiornare le statistiche dopo l'eliminazione
    const bookId = review.bookId;
    
    await Review.findByIdAndDelete(reviewId);
    
    // Aggiorna le statistiche del libro
    await updateBookStatistics(bookId);
    
    res.status(200).json({
      success: true,
      message: 'Recensione eliminata con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'eliminazione della recensione:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nell\'eliminazione della recensione' 
    });
  }
};

/**
 * Funzione di utilità per aggiornare le statistiche di un libro
 * basate sulle recensioni
 */
const updateBookStatistics = async (bookId) => {
  try {
    // Trova tutte le recensioni pubbliche per questo libro
    const reviews = await Review.find({ 
      bookId, 
      isPublic: true 
    });
    
    // Calcola valutazione media
    let averageRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
      averageRating = totalRating / reviews.length;
    }
    
    // Conta le occorrenze di ciascun tag
    const tagCounts = {};
    reviews.forEach(review => {
      if (review.tags && review.tags.length > 0) {
        review.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    // Converti in array ordinato per i top tags
    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Aggiorna le statistiche nel modello Book
    await Book.findByIdAndUpdate(bookId, {
      $set: {
        'statistics.averageRating': parseFloat(averageRating.toFixed(1)),
        'statistics.ratingCount': reviews.length,
        'statistics.reviewCount': reviews.filter(r => r.text && r.text.trim().length > 0).length,
        'statistics.topTags': topTags
      }
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento delle statistiche del libro:', error);
    throw error;
  }
};

module.exports = {
  getBookReviews,
  getUserReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview
};