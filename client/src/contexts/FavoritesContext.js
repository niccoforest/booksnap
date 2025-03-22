// client/src/contexts/FavoritesContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import bookService from '../services/book.service';
import { getUserBookId } from '../utils/bookStatusUtils';

// Creiamo il contesto con un valore predefinito
const FavoritesContext = createContext({
  favorites: {},
  isFavorite: () => false,
  toggleFavorite: () => Promise.resolve(),
  loadFavorites: () => Promise.resolve(),
  loading: false,
  error: null
});

/**
 * Provider per il contesto dei preferiti
 * Gestisce lo stato dei libri preferiti e la sincronizzazione con il server
 */
export const FavoritesProvider = ({ children, userId }) => {
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica i preferiti all'avvio
  useEffect(() => {
    if (userId) {
      loadFavorites();
    } else {
      // Se non c'è un userId, reimposta lo stato
      setFavorites({});
      setLoading(false);
      setError(null);
    }
  }, [userId]);

 /**
 * Carica i preferiti dal server
 */
 const loadFavorites = async () => {
  if (!userId) return;

  try {
    setLoading(true);
    setError(null);
    
    console.log('Caricamento preferiti per userId:', userId);

    // Carica i dati dal localStorage come fallback
    try {
      const localFavorites = localStorage.getItem('booksnap_favorites');
      if (localFavorites) {
        const parsed = JSON.parse(localFavorites);
        console.log('Preferiti da localStorage:', Object.keys(parsed).length);
        setFavorites(parsed);
      }
    } catch (e) {
      console.error('Errore nel parsing dei preferiti locali:', e);
    }

    // Carica i preferiti dal server
    try {
      // Otteniamo tutti i libri dell'utente
      const response = await bookService.getUserBooks({ 
        userId: userId,
        limit: 100  // Prendiamo un numero maggiore di libri per assicurarci di avere tutti
      });
      
      console.log('Risposta getUserBooks per preferiti:', response);
      
      if (response && response.success && response.data) {
        // Filtra solo i libri con isFavorite=true
        const favoriteBooks = response.data.filter(book => book.isFavorite === true);
        console.log(`Trovati ${favoriteBooks.length} libri preferiti da ${response.data.length} totali`);
        
        // Costruisci l'oggetto dei preferiti
        const favoritesObj = {};
        favoriteBooks.forEach(book => {
          if (book._id) {
            favoritesObj[book._id] = true;
            console.log(`Aggiunto ai preferiti: ${book._id}`);
          }
        });
        
        console.log('Preferiti finali:', Object.keys(favoritesObj).length);
        
        // Aggiorna lo stato e localStorage
        setFavorites(favoritesObj);
        localStorage.setItem('booksnap_favorites', JSON.stringify(favoritesObj));
      }
    } catch (apiError) {
      console.error('Errore nel caricamento dei preferiti dal server:', apiError);
    }
  } catch (err) {
    console.error('Errore generale nel caricamento dei preferiti:', err);
    setError('Impossibile caricare i preferiti. Riprova più tardi.');
  } finally {
    setLoading(false);
  }
};
  
  /**
   * Verifica se un libro è tra i preferiti
   * @param {string} userBookId - ID della relazione userBook
   * @returns {boolean} True se il libro è tra i preferiti
   */
  const isFavorite = (userBookId) => {
    if (!userBookId) return false;
    const result = Boolean(favorites[userBookId]);
    console.log(`[FavoritesContext] Check isFavorite: userBookId=${userBookId}, result=${result}, favorites keys:`, Object.keys(favorites));
    return result;
  };
  /**
   * Aggiunge o rimuove un libro dai preferiti
   * @param {string} userBookId - ID della relazione userBook
   * @returns {Promise<boolean>} Esito dell'operazione
   */
  const toggleFavorite = async (userBookId) => {
    if (!userBookId) return false;
    
    try {
      // Aggiorna immediatamente lo stato locale (optimistic update)
      const newState = !favorites[userBookId];
      
      // Aggiorna lo stato React
      setFavorites(prev => ({
        ...prev,
        [userBookId]: newState
      }));
      
      // Aggiorna localStorage
      const updatedFavorites = {
        ...favorites,
        [userBookId]: newState
      };
      localStorage.setItem('booksnap_favorites', JSON.stringify(updatedFavorites));
      
      // Aggiorna il server
      await bookService.toggleFavorite(userBookId, newState);
      
      // Dopo una pausa, risincronizza tutto per assicurarti che client e server siano allineati
      setTimeout(() => {
        loadFavorites();
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('Errore nel toggle dei preferiti:', err);
      
      // Rollback in caso di errore
      setFavorites(prev => ({
        ...prev,
        [userBookId]: !favorites[userBookId]
      }));
      
      // Aggiorna localStorage con il rollback
      const rollbackFavorites = {
        ...favorites,
        [userBookId]: !favorites[userBookId]
      };
      localStorage.setItem('booksnap_favorites', JSON.stringify(rollbackFavorites));
      
      setError('Impossibile aggiornare i preferiti. Riprova più tardi.');
      return false;
    }
  };
  
  /**
   * Sincronizza i preferiti locali con il server
   * @returns {Promise<void>}
   */
  const syncFavorites = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Invia i preferiti locali al server
      await bookService.syncFavorites(userId, favorites);
      
      // Ricarica i preferiti dal server per assicurarsi che siano sincronizzati
      await loadFavorites();
    } catch (err) {
      console.error('Errore nella sincronizzazione dei preferiti:', err);
      setError('Impossibile sincronizzare i preferiti. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };
  
  // Espone il contesto
  const value = {
    favorites,
    isFavorite,
    toggleFavorite,
    loadFavorites,
    syncFavorites,
    loading,
    error
  };
  
  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

/**
 * Hook personalizzato per utilizzare il contesto dei preferiti
 */
export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  
  if (context === undefined) {
    throw new Error('useFavorites deve essere usato all\'interno di un FavoritesProvider');
  }
  
  return context;
};

export default FavoritesContext;