import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  IconButton, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  alpha
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  ImageNotSupported as NoImageIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const EditBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
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
  
  useEffect(() => {
    fetchBookDetails();
  }, [id]);
  
  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Recupera i dettagli del libro dall'API
      const response = await bookService.getUserBookById(id, TEMP_USER_ID);
      
      console.log('Dettagli libro recuperati:', response);
      
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
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Se il rating è 0, lo impostiamo a null
      const updatedData = {
        ...formData,
        rating: formData.rating === 0 ? null : formData.rating
      };
      
      // Chiama l'API per aggiornare il libro
      const response = await bookService.updateUserBook(id, updatedData, TEMP_USER_ID);
      
      console.log('Libro aggiornato:', response);
      
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
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 3,
            border: `1px solid ${theme.palette.error.light}`,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.light, 0.1),
            textAlign: 'center'
          }}
        >
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => navigate('/library')}
            sx={{ mt: 2 }}
          >
            Torna alla libreria
          </Button>
        </Paper>
      ) : book ? (
        <Box component="form" onSubmit={handleSubmit}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              mb: 3
            }}
          >
            <Grid container spacing={3}>
              {/* Copertina e titolo */}
              <Grid item xs={12} sm={4} md={3} sx={{ textAlign: 'center' }}>
                {book.bookId?.coverImage ? (
                  <CardMedia
                    component="img"
                    image={book.bookId.coverImage}
                    alt={book.bookId.title}
                    sx={{ 
                      maxWidth: '100%',
                      maxHeight: 250,
                      objectFit: 'contain',
                      borderRadius: 1,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      mb: 2
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 250,
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      mb: 2
                    }}
                  >
                    <NoImageIcon sx={{ fontSize: 60, color: 'rgba(0, 0, 0, 0.3)' }} />
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} sm={8} md={9}>
                {/* Titolo e autore (non modificabili) */}
                <Typography variant="h5" component="h2" gutterBottom>
                  {book.bookId?.title || 'Titolo sconosciuto'}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {book.bookId?.author || 'Autore sconosciuto'}
                </Typography>
                
                {/* Dettagli libro non modificabili */}
                <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
                  {book.bookId?.publisher && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Editore:</strong> {book.bookId.publisher}
                      </Typography>
                    </Grid>
                  )}
                  {book.bookId?.publishedYear && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Anno:</strong> {book.bookId.publishedYear}
                      </Typography>
                    </Grid>
                  )}
                  {book.bookId?.pageCount > 0 && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Pagine:</strong> {book.bookId.pageCount}
                      </Typography>
                    </Grid>
                  )}
                  {book.bookId?.isbn && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>ISBN:</strong> {book.bookId.isbn}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              
              {/* Campi modificabili */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Personalizzazione
                </Typography>
              </Grid>
              
              {/* Stato di lettura */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="read-status-label">Stato lettura</InputLabel>
                  <Select
                    labelId="read-status-label"
                    value={formData.readStatus}
                    onChange={(e) => handleInputChange('readStatus', e.target.value)}
                    label="Stato lettura"
                  >
                    <MenuItem value="to-read">Da leggere</MenuItem>
                    <MenuItem value="reading">In lettura</MenuItem>
                    <MenuItem value="completed">Completato</MenuItem>
                    <MenuItem value="abandoned">Abbandonato</MenuItem>
                    <MenuItem value="lent">Prestato</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Valutazione */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    La tua valutazione
                  </Typography>
                  <Rating
                    name="rating"
                    value={formData.rating || 0}
                    onChange={(event, newValue) => handleInputChange('rating', newValue)}
                    precision={0.5}
                    size="large"
                  />
                </Box>
              </Grid>
              
              {/* Note personali */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Note personali"
                  placeholder="Aggiungi le tue note personali sul libro..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  variant="outlined"
                />
              </Grid>
            </Grid>
            
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
                type="submit"
                disabled={saving}
              >
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </Button>
            </Box>
          </Paper>
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditBook;