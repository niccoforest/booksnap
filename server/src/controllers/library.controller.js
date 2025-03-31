// server/src/controllers/library.controller.js
const Library = require('../models/library.model');
const mongoose = require('mongoose');

/**
 * Ottiene tutte le librerie di un utente
 */
const getUserLibraries = async (req, res) => {
  try {
    // Nota: in una vera app, l'userId verrebbe preso dal token JWT
    // Qui per semplicità lo prendiamo dalla query string
    const userId = req.query.userId || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'ID utente richiesto' });
    }

    // Trova tutte le librerie dell'utente
    const libraries = await Library.find({ userId });
    
    res.status(200).json({
      success: true,
      count: libraries.length,
      data: libraries
    });
  } catch (error) {
    console.error('Errore nel recupero delle librerie:', error);
    res.status(500).json({ success: false, error: 'Errore nel recupero delle librerie' });
  }
};

/**
 * Ottiene una libreria specifica per ID
 */
const getLibraryById = async (req, res) => {
  try {
    const libraryId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ success: false, error: 'ID libreria non valido' });
    }
    
    const library = await Library.findById(libraryId);
    
    if (!library) {
      return res.status(404).json({ success: false, error: 'Libreria non trovata' });
    }
    
    // Controlla se la libreria è pubblica o appartiene all'utente corrente
    // Nota: in una vera app questo controllo userebbe req.user._id dal token
    const requestUserId = req.query.userId || req.user?._id;
    if (!library.isPublic && (!requestUserId || library.userId.toString() !== requestUserId.toString())) {
      return res.status(403).json({ success: false, error: 'Accesso non autorizzato a questa libreria' });
    }
    
    res.status(200).json({
      success: true,
      data: library
    });
  } catch (error) {
    console.error('Errore nel recupero della libreria:', error);
    res.status(500).json({ success: false, error: 'Errore nel recupero della libreria' });
  }
};

/**
 * Crea una nuova libreria
 */
const createLibrary = async (req, res) => {
  try {
    // Estrai i dati dalla richiesta
    const { name, description, isPublic } = req.body;
    
    // Valida i dati di input
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nome libreria richiesto' });
    }
    
    // Nota: in una vera app l'userId verrebbe preso dal token JWT
    const userId = req.body.userId || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'ID utente richiesto' });
    }
    
    // Verifica se è la prima libreria dell'utente (per impostarla come default)
    const existingLibraries = await Library.countDocuments({ userId });
    const isDefault = existingLibraries === 0;
    
    // Crea la nuova libreria
    const library = new Library({
      userId,
      name,
      description,
      isPublic: isPublic || false,
      isDefault,
      shareableLink: isPublic ? `${process.env.FRONTEND_URL || ''}/shared/library/${new mongoose.Types.ObjectId()}` : null
    });
    
    await library.save();
    
    res.status(201).json({
      success: true,
      data: library
    });
  } catch (error) {
    console.error('Errore nella creazione della libreria:', error);
    res.status(500).json({ success: false, error: 'Errore nella creazione della libreria' });
  }
};

/**
 * Aggiorna una libreria esistente
 */
const updateLibrary = async (req, res) => {
  try {
    const libraryId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ success: false, error: 'ID libreria non valido' });
    }
    
    // Trova la libreria
    const library = await Library.findById(libraryId);
    
    if (!library) {
      return res.status(404).json({ success: false, error: 'Libreria non trovata' });
    }
    
    // Verifica proprietà (in una vera app userebbe req.user._id dal token)
    const requestUserId = req.body.userId || req.user?._id;
    if (!requestUserId || library.userId.toString() !== requestUserId.toString()) {
      return res.status(403).json({ success: false, error: 'Non autorizzato a modificare questa libreria' });
    }
    
    // Estrai i campi da aggiornare
    const { name, description, isPublic } = req.body;
    
    // Prepara i dati da aggiornare
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      // Aggiorna il link condivisibile se lo stato pubblico è cambiato
      if (isPublic && !library.isPublic) {
        updateData.shareableLink = `${process.env.FRONTEND_URL || ''}/shared/library/${new mongoose.Types.ObjectId()}`;
      } else if (!isPublic && library.isPublic) {
        updateData.shareableLink = null;
      }
    }
    
    // Non consentiamo di modificare isDefault tramite API pubblica
    
    // Aggiorna la libreria
    const updatedLibrary = await Library.findByIdAndUpdate(
      libraryId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedLibrary
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento della libreria:', error);
    res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento della libreria' });
  }
};

/**
 * Elimina una libreria
 */
const deleteLibrary = async (req, res) => {
  try {
    const libraryId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ success: false, error: 'ID libreria non valido' });
    }
    
    // Trova la libreria
    const library = await Library.findById(libraryId);
    
    if (!library) {
      return res.status(404).json({ success: false, error: 'Libreria non trovata' });
    }
    
    // Verifica proprietà (in una vera app userebbe req.user._id dal token)
    const requestUserId = req.query.userId || req.user?._id;
    if (!requestUserId || library.userId.toString() !== requestUserId.toString()) {
      return res.status(403).json({ success: false, error: 'Non autorizzato a eliminare questa libreria' });
    }
    
    // Non consentiamo di eliminare la libreria predefinita
    if (library.isDefault) {
      return res.status(400).json({ 
        success: false, 
        error: 'Impossibile eliminare la libreria predefinita' 
      });
    }
    
    await Library.findByIdAndDelete(libraryId);
    
    // Nota: in un'implementazione completa, dovresti anche gestire
    // la rimozione delle relazioni UserBook che fanno riferimento a questa libreria
    // o spostarle in un'altra libreria
    
    res.status(200).json({
      success: true,
      message: 'Libreria eliminata con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'eliminazione della libreria:', error);
    res.status(500).json({ success: false, error: 'Errore nell\'eliminazione della libreria' });
  }
};

/**
 * Ottiene una libreria tramite link condivisibile
 */
const getLibraryByShareableLink = async (req, res) => {
  try {
    const shareableLink = req.params.link;
    
    // Costruisci il link completo come memorizzato nel database
    const fullLink = `${process.env.FRONTEND_URL || ''}/shared/library/${shareableLink}`;
    
    const library = await Library.findOne({ 
      shareableLink: fullLink,
      isPublic: true 
    });
    
    if (!library) {
      return res.status(404).json({ success: false, error: 'Libreria non trovata o non pubblica' });
    }
    
    res.status(200).json({
      success: true,
      data: library
    });
    
  } catch (error) {
    console.error('Errore nel recupero della libreria condivisa:', error);
    res.status(500).json({ success: false, error: 'Errore nel recupero della libreria condivisa' });
  }
};

module.exports = {
  getUserLibraries,
  getLibraryById,
  createLibrary,
  updateLibrary,
  deleteLibrary,
  getLibraryByShareableLink
};