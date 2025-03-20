// client/src/pages/Book.js

import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography, 
  Button, 
  IconButton, 
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';
import BookCard from '../components/book/BookCard';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const Book = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Stato per il dialog di conferma eliminazione
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Recupera i preferiti da localStorage
  const [favorite, setFavorite] = useState(() => {
    const savedFavorites = localStorage.getItem('booksnap_favorites');
    const favorites = savedFavorites ? JSON.parse(savedFavorites) : {};
    return favorites[id] || false;
  });
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  useEffect(() => {
    fetchBookDetails();
  }, [id]);
  
  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Recupera i dettagli del libro dall'API
      const response = await bookService.getUserBookById(id, TEMP_USER_ID);
      
      if (response && response.data) {
        setBook(response.data);
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
  
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      
      // Chiudi il dialog
      setDeleteDialogOpen(false);
      
      // Rimuovi il libro
      await bookService.removeFromLibrary(id, TEMP_USER_ID);
      
      // Mostra notifica di successo
      setSnackbar({
        open: true,
        message: 'Libro rimosso dalla libreria con successo!',
        severity: 'success'
      });
      
      // Naviga alla libreria dopo 1 secondo
      setTimeout(() => {
        navigate('/library');
      }, 1000);
    } catch (err) {
      console.error('Errore nella rimozione del libro:', err);
      
      setError('Si è verificato un errore nella rimozione del libro.');
      setLoading(false);
    }
  };
  
  const handleMenuOpen = (e) => {
    // Implementa menu contestuale (o usa un menu Material UI)
    const options = [
      { label: 'Modifica', action: handleEdit },
      { label: 'Rimuovi', action: handleOpenDeleteDialog }
    ];
    
    // Per semplicità, mostriamo direttamente le opzioni
    console.log('Menu options:', options);
    
    // Qui puoi implementare un menu contestuale o una modale
    // Per ora, non facciamo nulla
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  return (
    <Box sx={{ p: 2 }}>
      {/* Header con pulsante indietro */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          edge="start" 
          color="inherit" 
          onClick={() => navigate(-1)}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Dettagli libro
        </Typography>
      </Box>
      
      {/* Contenuto principale */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
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
          {/* Utilizziamo BookCard con variante detail */}
          <BookCard
            variant="detail"
            userBook={book}
            isFavorite={favorite}
            isInLibrary={true}
            onFavoriteToggle={handleToggleFavorite}
            onMenuOpen={handleMenuOpen}
            showPersonalization={false}
          />
          
          {/* Pulsanti azione */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/library')}
            >
              Torna alla libreria
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Modifica
            </Button>
          </Box>
        </>
      ) : null}
      
      {/* Dialog di conferma eliminazione */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler rimuovere questo libro dalla tua libreria? Questa azione non può essere annullata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Annulla
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar per notifiche */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Book;