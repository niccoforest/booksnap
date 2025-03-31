// client/src/contexts/LibraryContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import bookService from '../services/book.service';

// ID utente temporaneo (sostituire con auth)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

// Crea il contesto
const LibraryContext = createContext();

export const useLibrary = () => useContext(LibraryContext);

export const LibraryProvider = ({ children }) => {
  // Stato per i libri nella libreria (cache)
  const [booksInLibrary, setBooksInLibrary] = useState({});
  const [loadingStatus, setLoadingStatus] = useState({});
  
  // Cache TTL in millisecondi (10 minuti)
  const CACHE_TTL = 10 * 60 * 1000;
  
  // Funzione per verificare se un libro è in libreria
  const checkBookInLibrary = useCallback(async (bookId) => {
    if (!bookId) return false;
    
    // Verifica se abbiamo già una cache valida
    const cachedStatus = booksInLibrary[bookId];
    const cachedTime = loadingStatus[bookId]?.timestamp || 0;
    
    // Se il dato è in cache ed è recente, usalo
    if (cachedStatus !== undefined && Date.now() - cachedTime < CACHE_TTL) {
      return cachedStatus;
    }
    
    // Altrimenti, aggiorna lo stato di caricamento
    setLoadingStatus(prev => ({
      ...prev,
      [bookId]: { loading: true, timestamp: Date.now() }
    }));
    
    try {
      // Chiama l'API per verificare
      const isInLibrary = await bookService.checkBookInUserLibrary(bookId, TEMP_USER_ID);
      
      // Aggiorna la cache
      setBooksInLibrary(prev => ({
        ...prev,
        [bookId]: isInLibrary
      }));
      
      // Aggiorna lo stato di caricamento
      setLoadingStatus(prev => ({
        ...prev,
        [bookId]: { loading: false, timestamp: Date.now() }
      }));
      
      return isInLibrary;
    } catch (error) {
      console.error('Errore nella verifica del libro:', error);
      
      // In caso di errore, imposta a false e aggiorna timestamp
      setBooksInLibrary(prev => ({
        ...prev,
        [bookId]: false
      }));
      
      setLoadingStatus(prev => ({
        ...prev,
        [bookId]: { loading: false, timestamp: Date.now(), error: true }
      }));
      
      return false;
    }
  }, [booksInLibrary, loadingStatus]);
  
  // Funzione per verificare più libri in batch
  const checkBooksInLibrary = useCallback(async (bookIds) => {
    if (!bookIds || bookIds.length === 0) return {};
    
    // Filtra solo gli ID che non sono già in cache recente
    const idsToCheck = bookIds.filter(id => {
      const cachedTime = loadingStatus[id]?.timestamp || 0;
      return booksInLibrary[id] === undefined || (Date.now() - cachedTime >= CACHE_TTL);
    });
    
    if (idsToCheck.length === 0) {
      // Tutti i libri sono già in cache
      return bookIds.reduce((acc, id) => {
        acc[id] = booksInLibrary[id] || false;
        return acc;
      }, {});
    }
    
    // Aggiorna stato di caricamento per tutti gli ID da verificare
    setLoadingStatus(prev => {
      const updates = {};
      idsToCheck.forEach(id => {
        updates[id] = { loading: true, timestamp: Date.now() };
      });
      return { ...prev, ...updates };
    });
    
    try {
      // In un'applicazione reale, potresti avere un endpoint per verificare più libri in batch
      // Per ora, facciamo richieste sequenziali con un limite di concorrenza
      const results = {};
      const batchSize = 3; // Numero massimo di richieste in parallelo
      
      for (let i = 0; i < idsToCheck.length; i += batchSize) {
        const batch = idsToCheck.slice(i, i + batchSize);
        const batchPromises = batch.map(id => 
          bookService.checkBookInUserLibrary(id, TEMP_USER_ID)
            .then(isInLibrary => ({ id, isInLibrary }))
            .catch(error => {
              console.error(`Errore nella verifica del libro ${id}:`, error);
              return { id, isInLibrary: false, error: true };
            })
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Aggiorna la cache e lo stato di caricamento per questo batch
        const libraryUpdates = {};
        const statusUpdates = {};
        
        batchResults.forEach(({ id, isInLibrary, error }) => {
          results[id] = isInLibrary;
          libraryUpdates[id] = isInLibrary;
          statusUpdates[id] = { 
            loading: false, 
            timestamp: Date.now(),
            error: !!error 
          };
        });
        
        setBooksInLibrary(prev => ({ ...prev, ...libraryUpdates }));
        setLoadingStatus(prev => ({ ...prev, ...statusUpdates }));
      }
      
      // Combina i risultati batch con quelli già in cache
      return bookIds.reduce((acc, id) => {
        acc[id] = results[id] !== undefined ? results[id] : (booksInLibrary[id] || false);
        return acc;
      }, {});
    } catch (error) {
      console.error('Errore nella verifica batch dei libri:', error);
      
      // In caso di errore, imposta tutti a false
      const updates = {};
      const statusUpdates = {};
      
      idsToCheck.forEach(id => {
        updates[id] = false;
        statusUpdates[id] = { loading: false, timestamp: Date.now(), error: true };
      });
      
      setBooksInLibrary(prev => ({ ...prev, ...updates }));
      setLoadingStatus(prev => ({ ...prev, ...statusUpdates }));
      
      return bookIds.reduce((acc, id) => {
        acc[id] = booksInLibrary[id] || false;
        return acc;
      }, {});
    }
  }, [booksInLibrary, loadingStatus]);
  
  // Funzione per aggiornare manualmente lo stato di un libro
  const updateBookStatus = useCallback((bookId, status) => {
    if (!bookId) return;
    
    setBooksInLibrary(prev => ({
      ...prev,
      [bookId]: status
    }));
    
    setLoadingStatus(prev => ({
      ...prev,
      [bookId]: { loading: false, timestamp: Date.now() }
    }));
  }, []);
  
  // Funzione per invalidare la cache
  const invalidateCache = useCallback((bookId = null) => {
    if (bookId) {
      // Invalida un solo libro
      setBooksInLibrary(prev => {
        const newState = { ...prev };
        delete newState[bookId];
        return newState;
      });
      
      setLoadingStatus(prev => {
        const newState = { ...prev };
        delete newState[bookId];
        return newState;
      });
    } else {
      // Invalida tutta la cache
      setBooksInLibrary({});
      setLoadingStatus({});
    }
  }, []);
  
  // Verifica se un libro è in libreria (sync)
  const isBookInLibrary = useCallback((bookId) => {
    return booksInLibrary[bookId] === true;
  }, [booksInLibrary]);
  
  // Verifica se un libro è in caricamento
  const isBookStatusLoading = useCallback((bookId) => {
    return loadingStatus[bookId]?.loading === true;
  }, [loadingStatus]);

  // Esponi il context
  const value = {
    booksInLibrary,
    loadingStatus,
    checkBookInLibrary,
    checkBooksInLibrary,
    updateBookStatus,
    invalidateCache,
    isBookInLibrary,
    isBookStatusLoading
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};

export default LibraryProvider;