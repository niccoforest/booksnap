// client/src/pages/EditBook.js - Aggiornamenti

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  CircularProgress
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';
import BookCard from '../components/book/BookCard';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import LoadingState from '../components/common/LoadingState';

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
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  
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
          rating: bookData.rating !== null && bookData.rating !== undefined ? bookData.rating : 0,
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
    console.log('EditBook handleRatingChange:', value);
    const numericValue = value !== null && value !== undefined ? Number(value) : 0;
    setFormData(prev => {
      const updated = { ...prev, rating: numericValue };
      console.log('Nuovo formData dopo rating change:', updated);
      return updated;
    });
  };
  
  const handleStatusChange = (value) => {
    console.log('EditBook handleStatusChange:', value);
    setFormData(prev => {
      const updated = { ...prev, readStatus: value };
      console.log('Nuovo formData dopo status change:', updated);
      return updated;
    });
  };
  
  const handleNotesChange = (value) => {
    console.log('EditBook handleNotesChange:', value);
    setFormData(prev => {
      const updated = { ...prev, notes: value };
      console.log('Nuovo formData dopo notes change:', updated);
      return updated;
    });
  };
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      console.log('Inizio salvataggio con formData:', formData);
      setSaving(true);
      
      // Prepara i dati da inviare
      const updatedData = {
        ...formData,
        // Rating: se 0, invia null, altrimenti il valore numerico
        rating: formData.rating === 0 ? null : Number(formData.rating),
        // Assicurati che lo stato di lettura sia definito
        readStatus: formData.readStatus || 'to-read',
        // Notes: assicurati che sia una stringa, anche se vuota
        notes: formData.notes || ''
      };
      
      console.log('Dati da inviare al server:', updatedData);
      
      // Chiama l'API per aggiornare il libro
      const result = await bookService.updateUserBook(id, updatedData, TEMP_USER_ID);
      console.log('Risposta dal server:', result);
      
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
  
  return (
    <Box sx={{ p: 2 }}>
      {/* Header con pulsante indietro */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          edge="start" 
          color="inherit" 
          onClick={() => navigate('/library')} // Vai sempre alla libreria
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
        <Box component="form" onSubmit={handleSubmit}>
          {/* Utilizziamo BookCard con variante detail e personalizzazione */}
          <BookCard
  variant="detail"
  userBook={{
    ...book,
    rating: formData.rating !== null ? Number(formData.rating) : 0,
    readStatus: formData.readStatus || 'to-read',
    notes: formData.notes || ''
  }}
  isFavorite={favorite}
  isInLibrary={true}
  onFavoriteToggle={handleToggleFavorite}
  showMenuIcon={false}
  showFullDescription={true}
  showPersonalization={true}
  rating={formData.rating !== null ? Number(formData.rating) : 0}
  readStatus={formData.readStatus || 'to-read'}
  notes={formData.notes || ''}
  onRatingChange={handleRatingChange}
  onStatusChange={handleStatusChange}
  onNotesChange={handleNotesChange}
/>
          
          {/* Pulsante salva (a piena larghezza) */}
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
              sx={{ borderRadius: '8px' }}
            >
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default EditBook;