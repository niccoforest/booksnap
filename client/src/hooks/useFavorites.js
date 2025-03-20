// client/src/hooks/useFavorites.js
import { useState, useEffect } from 'react';
import bookService from '../services/book.service';

/**
 * Hook personalizzato per gestire i preferiti
 * @param {string} userId - ID dell'utente
 * @returns {Object} Funzioni e stati per gestire i preferiti
 */
const useFavorites = (userId) => {
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Carica i preferiti all'avvio
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true);
        
        let favoritesResult = { data: [] };
        
        try {
          favoritesResult = await bookService.getFavorites(userId);
        } catch (error) {
          console.error('Errore nel caricamento dei preferiti:', error);
          // Continua con un array vuoto
        }
        
        const favoriteObj = {};
        
        // Usa un array vuoto se data non è disponibile
        const favoritesData = favoritesResult.data || [];
        
        favoritesData.forEach(userBook => {
          favoriteObj[userBook._id] = true;
        });
        
        setFavorites(favoriteObj);
      } catch (error) {
        console.error('Errore nel caricamento dei preferiti:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      loadFavorites();
    }
    
    return () => {
      // Cleanup se necessario
    };
  }, [userId]);
  
  /**
   * Verifica se un libro è nei preferiti
   * @param {string} bookId - ID del libro o della relazione userBook
   * @returns {boolean} true se il libro è nei preferiti
   */
  const isFavorite = (bookId) => {
    return !!favorites[bookId];
  };
  
  /**
   * Aggiunge o rimuove un libro dai preferiti
   * @param {string} bookId - ID del libro o della relazione userBook
   * @returns {Promise} Risultato dell'operazione
   */
  const toggleFavorite = async (bookId) => {
    try {
      // Aggiorna lo stato locale immediatamente per un feedback più rapido
      const newState = !favorites[bookId];
      
      // Aggiorna lo stato locale
      setFavorites(prev => ({
        ...prev,
        [bookId]: newState
      }));
      
      // Aggiorna localStorage
      const localFavorites = localStorage.getItem('booksnap_favorites');
      const localFavoritesObj = localFavorites ? JSON.parse(localFavorites) : {};
      localFavoritesObj[bookId] = newState;
      localStorage.setItem('booksnap_favorites', JSON.stringify(localFavoritesObj));
      
      // Aggiorna sul server
      await bookService.toggleFavorite(bookId, newState);
      
      return { success: true, isFavorite: newState };
    } catch (err) {
      console.error('Errore durante l\'aggiornamento dei preferiti:', err);
      
      // Ripristina lo stato precedente in caso di errore
      setFavorites(prev => ({
        ...prev,
        [bookId]: !favorites[bookId]
      }));
      
      throw err;
    }
  };
  
  /**
   * Sincronizza i preferiti tra localStorage e server
   * @returns {Promise} Risultato dell'operazione
   */
  const syncFavorites = async () => {
    try {
      setLoading(true);
      await bookService.syncFavorites(userId);
      
      // Ricarica i preferiti dal server
      const response = await bookService.getFavorites(userId);
      const serverFavoritesObj = {};
      
      response.data.forEach(userBook => {
        serverFavoritesObj[userBook._id] = true;
      });
      
      // Aggiorna lo stato con i dati dal server
      setFavorites(serverFavoritesObj);
      
      // Aggiorna localStorage
      localStorage.setItem('booksnap_favorites', JSON.stringify(serverFavoritesObj));
      
      return { success: true };
    } catch (err) {
      console.error('Errore durante la sincronizzazione dei preferiti:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    favorites,
    loading,
    error,
    isFavorite,
    toggleFavorite,
    syncFavorites
  };
};

export default useFavorites;