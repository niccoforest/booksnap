// components/common/FavoriteStatus.js
import React, { useState, useEffect } from 'react';
import bookService from '../../services/book.service';

// Contesto per i preferiti
export const FavoritesContext = React.createContext({
  favorites: {},
  isFavorite: () => false,
  toggleFavorite: () => Promise.resolve(),
  loadFavorites: () => Promise.resolve()
});

// Hook per utilizzare il contesto
export const useFavorites = (userId) => {
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Carica i preferiti dal server
  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await bookService.getFavorites(userId);
      
      if (response && response.success && response.data) {
        const favoritesObj = {};
        
        // Converte l'array in un oggetto per un accesso più rapido
        response.data.forEach(item => {
          favoritesObj[item._id] = true;
        });
        
        setFavorites(favoritesObj);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei preferiti:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Verifica se un libro è preferito
  const isFavorite = (bookId) => {
    return Boolean(favorites[bookId]);
  };
  
  // Aggiunge/rimuove un libro dai preferiti
  const toggleFavorite = async (bookId) => {
    try {
      // Aggiorna lo stato locale immediatamente per una UI reattiva
      const newState = !isFavorite(bookId);
      setFavorites(prev => ({
        ...prev,
        [bookId]: newState
      }));
      
      // Aggiorna il server
      await bookService.toggleFavorite(bookId, newState);
      
      return true;
    } catch (error) {
      // Ripristina lo stato precedente in caso di errore
      console.error('Errore nel cambiamento dei preferiti:', error);
      setFavorites(prev => ({
        ...prev,
        [bookId]: !favorites[bookId]
      }));
      return false;
    }
  };
  
  // Carica i preferiti all'avvio
  useEffect(() => {
    if (userId) {
      loadFavorites();
    }
  }, [userId]);
  
  return {
    favorites,
    isFavorite,
    toggleFavorite,
    loadFavorites,
    loading
  };
};

// Provider per i preferiti
export const FavoritesProvider = ({ children, userId }) => {
  const favoritesData = useFavorites(userId);
  
  return (
    <FavoritesContext.Provider value={favoritesData}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesProvider;