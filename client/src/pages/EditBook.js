// client/src/pages/EditBook.js
// Mantenendo la struttura che già hai ma utilizzando BookCard

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
  Save as SaveIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';
import BookCard from '../components/book/BookCard';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const EditBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Stato dialog di conferma eliminazione
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Stato form
  const [formData, setFormData] = useState({
    readStatus: 'to-read',
    rating: null,
    notes: ''
  });
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Recupera i preferiti da localStorage
  const [favorite, setFavorite] = useState(() => {
    const savedFavorites = localStorage.getItem('booksnap_favorites');
    const favorites = savedFavorites ? JSON.parse(savedFavorites) : {};
    return favorites[id] || false;
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
        const bookData = response.data;
        setBook(bookData);
        
        // Inizializza il form con i dati esistenti
        setFormData({
          readStatus: bookData.readStatus || 'to-read',
          rating: bookData.rating || null,
          notes: bookData.notes || '',
        });
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
  
  const handleRatingChange = (value) => {
    setFormData(prev => ({
      ...prev,
      rating: value
    }));
  };
  
  const handleStatusChange = (value) => {
    setFormData(prev => ({
      ...prev,
      readStatus: value
    }));
  };
  
  const handleNotesChange = (value) => {
    setFormData(prev => ({
      ...prev,
      notes: value
    }));
    
    // Per debug
    console.log("Note aggiornate:", value);
  };
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      setSaving(true);
      
      // Se il rating è 0, lo impostiamo a null
      const updatedData = {
        ...formData,
        rating: formData.rating === 0 ? null : formData.rating
      };
      
      // Chiama l'API per aggiornare il libro
      const response = await bookService.updateUserBook(id, updatedData, TEMP_USER_ID);
      
      // Mostra notifica di successo
      setSnackbar({
        open: true,
        message: 'Libro aggiornato con successo!',
        severity: 'success'
      });
      
      // Naviga alla pagina di dettaglio dopo 1 secondo
      setTimeout(() => {
        navigate(`/book/${id}`);
      }, 1000);
    } catch (err) {
      console.error('Errore nell\'aggiornamento del libro:', err);
      
      // Mostra notifica di errore
      setSnackbar({
        open: true,
        message: 'Errore nell\'aggiornamento del libro',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleConfirmDelete = async () => {
    try {
      setSaving(true);
      
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
      
      // Mostra notifica di errore
      setSnackbar({
        open: true,
        message: 'Errore nella rimozione del libro',
        severity: 'error'
      });
      
      setSaving(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
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
          Modifica libro
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
        <Box component="form" onSubmit={handleSubmit}>
          {/* Utilizziamo BookCard con variante detail e personalizzazione */}
          <BookCard
             variant="detail"
             userBook={{
               ...book,
               rating: formData.rating,
               readStatus: formData.readStatus,
               notes: formData.notes
             }}
             isFavorite={favorite}
             isInLibrary={true}
             onFavoriteToggle={handleToggleFavorite}
             showMenuIcon={false} // Nascondi icona menu
             showFullDescription={true} // Mostra intera descrizione
             showPersonalization={true}
             onRatingChange={handleRatingChange}
             onStatusChange={handleStatusChange}
             onNotesChange={handleNotesChange}
             notes={formData.notes} // Assicurati di passare le note correnti
          />
          
          {/* Pulsanti azione */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleOpenDeleteDialog}
            >
              Rimuovi dalla libreria
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </Box>
        </Box>
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
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Elimina'}
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

export default EditBook;