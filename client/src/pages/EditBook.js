// Soluzione completa per EditBook.js
// Sostituisci l'intero file client/src/pages/EditBook.js con questo

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  CircularProgress,
  Paper,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';
import BookCover from '../components/common/BookCover';
import { getReadStatusIcon } from '../utils/bookStatusUtils';
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
  
  // Stato form
  const [formData, setFormData] = useState({
    readStatus: 'to-read',
    rating: 0,
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
        
        console.log('Dati libro ricevuti:', bookData);
        
        // Inizializza il form con i dati esistenti
        setFormData({
          readStatus: bookData.readStatus || 'to-read',
          rating: bookData.rating !== null && bookData.rating !== undefined ? bookData.rating : 0,
          notes: bookData.notes || '',
        });
        
        console.log('Form inizializzato con:', {
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
  
  const handleRatingChange = (event, value) => {
    console.log('EditBook handleRatingChange:', value);
    setFormData(prev => ({
      ...prev,
      rating: value === null ? 0 : Number(value)
    }));
  };
  
  const handleStatusChange = (event) => {
    const value = event.target.value;
    console.log('EditBook handleStatusChange:', value);
    setFormData(prev => ({
      ...prev,
      readStatus: value
    }));
  };
  
  const handleNotesChange = (event) => {
    const value = event.target.value;
    console.log('EditBook handleNotesChange:', value);
    setFormData(prev => ({
      ...prev,
      notes: value
    }));
  };
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      console.log('Saving form data:', formData);
      setSaving(true);
      
      // Prepara i dati per l'invio
      const updatedData = {
        ...formData,
        rating: formData.rating === 0 ? null : Number(formData.rating)
      };
      
      // Chiama l'API per aggiornare il libro
      await bookService.updateUserBook(id, updatedData, TEMP_USER_ID);
      
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
          {/* Layout base del libro */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              mb: 3
            }}
          >
            {/* Header con copertina e info base */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                p: 3,
                bgcolor: 'rgba(0, 0, 0, 0.02)'
              }}
            >
              {/* Copertina */}
              <Box sx={{ 
                width: { xs: '50%', sm: '120px' },
                alignSelf: 'center',
                mb: { xs: 2, sm: 0 },
                mr: { xs: 0, sm: 3 }
              }}>
                <BookCover
                  coverImage={book.bookId?.coverImage}
                  title={book.bookId?.title || 'Titolo sconosciuto'}
                />
              </Box>
              
              {/* Info libro */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {book.bookId?.title || 'Titolo sconosciuto'}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {book.bookId?.author || 'Autore sconosciuto'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {book.bookId?.publisher} {book.bookId?.publishedYear ? `(${book.bookId.publishedYear})` : ''}
                </Typography>
              </Box>
            </Box>
            
            <Divider />
            
            {/* Sezione personalizzazione */}
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personalizzazione
              </Typography>
              
              {/* Stato lettura */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Stato lettura
                </Typography>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="read-status-label">Stato lettura</InputLabel>
                  <Select
                    labelId="read-status-label"
                    value={formData.readStatus || 'to-read'}
                    onChange={handleStatusChange}
                    label="Stato lettura"
                  >
                    <MenuItem value="to-read">
                      {getReadStatusIcon('to-read')}
                      <span style={{ marginLeft: 8 }}>Da leggere</span>
                    </MenuItem>
                    <MenuItem value="reading">
                      {getReadStatusIcon('reading')}
                      <span style={{ marginLeft: 8 }}>In lettura</span>
                    </MenuItem>
                    <MenuItem value="completed">
                      {getReadStatusIcon('completed')}
                      <span style={{ marginLeft: 8 }}>Completato</span>
                    </MenuItem>
                    <MenuItem value="abandoned">
                      {getReadStatusIcon('abandoned')}
                      <span style={{ marginLeft: 8 }}>Abbandonato</span>
                    </MenuItem>
                    <MenuItem value="lent">
                      {getReadStatusIcon('lent')}
                      <span style={{ marginLeft: 8 }}>Prestato</span>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Valutazione */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  La tua valutazione
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Rating
                    name="book-rating"
                    value={formData.rating || 0}
                    onChange={handleRatingChange}
                    precision={0.5}
                    size="large"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {formData.rating > 0 ? `${formData.rating}` : 'Non valutato'}
                  </Typography>
                </Box>
              </Box>
              
              {/* Note personali */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Note personali
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.notes || ''}
                  onChange={handleNotesChange}
                  placeholder="Aggiungi le tue note personali sul libro..."
                  variant="outlined"
                />
              </Box>
            </Box>
          </Paper>
          
          {/* Pulsante salva */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
            sx={{ borderRadius: '8px', py: 1.5 }}
          >
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </Button>
        </Box>
      ) : null}
      
      {/* Snackbar per notifiche */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
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