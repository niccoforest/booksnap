// client/src/pages/Book.js - Aggiornamenti vari

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';
import BookCard from '../components/book/BookCard';
import LoadingState from '../components/common/LoadingState';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const Book = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Stato per la descrizione espandibile
  const [expandedDescription, setExpandedDescription] = useState(false);

  // Recupera i preferiti da localStorage
  const [favorite, setFavorite] = useState(() => {
    const savedFavorites = localStorage.getItem('booksnap_favorites');
    const favorites = savedFavorites ? JSON.parse(savedFavorites) : {};
    return favorites[id] || false;
  });
  
  useEffect(() => {
    // Pulisci lo stato prima di caricare
    setBook(null);
    setLoading(true);
    setError('');
    
    // Funzione per caricare i dettagli del libro
    const loadBook = async () => {
      try {
        // Aggiungi un timestamp per evitare cache di rete
        const response = await bookService.getUserBookById(id, TEMP_USER_ID);
        
        if (response && response.data) {
          setBook(response.data);
          
          // Aggiorna anche lo stato dei preferiti
          const savedFavorites = localStorage.getItem('booksnap_favorites');
          const favorites = savedFavorites ? JSON.parse(savedFavorites) : {};
          setFavorite(favorites[id] || false);
        } else {
          setError('Libro non trovato');
        }
      } catch (err) {
        console.error('Errore nel recupero dei dettagli del libro:', err);
        setError('Si è verificato un errore nel caricamento dei dettagli del libro.');
      } finally {
        setLoading(false);
      }
    };
    
    loadBook();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleToggleFavorite = () => {
    // Aggiorna lo stato locale
    const newFavoriteState = !favorite;
    setFavorite(newFavoriteState);
    
    // Aggiorna localStorage
    const savedFavorites = localStorage.getItem('booksnap_favorites');
    const favorites = savedFavorites ? JSON.parse(savedFavorites) : {};
    favorites[id] = newFavoriteState;
    localStorage.setItem('booksnap_favorites', JSON.stringify(favorites));
  };
  
  const handleEdit = () => {
    navigate(`/edit-book/${id}`);
  };
  
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleShareClick = () => {
    // Per ora è solo un placeholder
    alert('Funzionalità di condivisione in sviluppo');
  };
  
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      
      // Rimuovi il libro
      await bookService.removeFromLibrary(id, TEMP_USER_ID);
      
      // Naviga alla libreria
      navigate('/library');
    } catch (err) {
      console.error('Errore nella rimozione del libro:', err);
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };
  
  const toggleDescription = () => {
  setExpandedDescription(!expandedDescription);
  console.log("Toggle descrizione:", !expandedDescription); // Log per debug
};return (
  <Box sx={{ p: 2 }}>
    {/* Header con pulsante indietro */}
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
      <IconButton 
        edge="start" 
        color="inherit" 
        onClick={() => navigate('/library')}
        sx={{ mr: 1 }}
      >
        <ArrowBackIcon />
      </IconButton>
      <Typography variant="h5" component="h1">
        Dettaglio libro
      </Typography>
    </Box>
    
    {/* Contenuto principale */}
    {loading ? (
      <LoadingState message="Caricamento dettagli libro..." />
    ) : error ? (
      <Box sx={{ textAlign: 'center', mt: 4, color: 'error.main' }}>
        <Typography gutterBottom>{error}</Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => navigate('/library')}
          sx={{ mt: 2 }}
        >
          Torna alla libreria
        </Button>
      </Box>
    ) : book ? (
      <>
        <BookCard
          variant="detail"
          userBook={book}
          isFavorite={favorite}
          isInLibrary={true}
          onFavoriteToggle={handleToggleFavorite}
          showFullDescription={false}
          showPersonalization={false}
          showMenuIcon={false}
          showExpandableDescription={true}
          expandedDescription={expandedDescription}
          toggleDescription={toggleDescription}
          showShareButton={true}
          onShareClick={handleShareClick}
          showDeleteButton={true}
          onDeleteClick={handleDeleteClick}
          // Passiamo esplicitamente i dati dal libro
          rating={book.rating || 0}   // Valore di default se undefined
          readStatus={book.readStatus || 'to-read'} // Valore di default se undefined
          notes={book.notes || ''}    // Valore di default se undefined
        />
        
        {/* Pulsante modifica (a piena larghezza) */}
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleEdit}
            sx={{ borderRadius: '8px' }}
          >
            Modifica
          </Button>
        </Box>
      </>
    ) : null}
    
    {/* Dialog di conferma eliminazione */}
    <ConfirmationDialog
      open={deleteDialogOpen}
      title="Conferma eliminazione"
      message="Sei sicuro di voler rimuovere questo libro dalla tua libreria? Questa azione non può essere annullata."
      confirmLabel="Elimina"
      cancelLabel="Annulla"
      loading={deleteLoading}
      onConfirm={handleDeleteConfirm}
      onCancel={() => setDeleteDialogOpen(false)}
      destructive={true}
    />
  </Box>
);
};

export default Book;