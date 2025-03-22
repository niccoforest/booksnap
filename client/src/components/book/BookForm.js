// client/src/components/book/BookForm.js
import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Grid, 
  Button,
  Paper,
  Typography,
  CircularProgress,
  Divider,
  useTheme
} from '@mui/material';
import BookCover from '../common/BookCover';
import BookRating from '../common/BookRating';
import ReadStatus from '../common/ReadStatus';

const BookForm = ({
  initialData = {
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publishedYear: '',
    pageCount: '',
    description: '',
    coverImage: ''
  },
  userBookData = {
    rating: 0,
    readStatus: 'to-read',
    notes: ''
  },
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Salva',
  showPersonalization = true
}) => {
  const theme = useTheme();
  
  // Stato del form
  const [bookData, setBookData] = useState(initialData);
  const [personalData, setPersonalData] = useState(userBookData);
  const [errors, setErrors] = useState({});

  // Gestione modifiche ai campi del libro
  const handleBookChange = (field, value) => {
    setBookData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Rimuovi l'errore quando il campo viene modificato
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Gestione modifiche ai dati personali
  const handlePersonalDataChange = (field, value) => {
    setPersonalData(prev => ({
      ...prev,
      [field]: field === 'rating' ? (value === null ? 0 : Number(value)) : value
    }));
  };

  // Validazione form
  const validateForm = () => {
    const newErrors = {};
    
    if (!bookData.title || !bookData.title.trim()) {
      newErrors.title = 'Il titolo è obbligatorio';
    }
    
    if (!bookData.author || !bookData.author.trim()) {
      newErrors.author = 'L\'autore è obbligatorio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestione submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Assicurati che i dati del libro siano nel formato corretto
      const formattedBookData = {
        ...bookData,
        title: bookData.title.trim(),
        author: bookData.author.trim()  // Assicurati che ci sia sempre un autore
      };
      
      onSubmit({
        bookData: formattedBookData,
        personalData
      });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.divider}`,
          mb: 3
        }}
      >
        <Typography variant="h6" gutterBottom>
          Informazioni libro
        </Typography>
        
        <Grid container spacing={3}>
          {/* Prima parte: Campi obbligatori e copertina */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Titolo"
                  value={bookData.title || ''}
                  onChange={(e) => handleBookChange('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Autore"
                  value={bookData.author || ''}
                  onChange={(e) => handleBookChange('author', e.target.value)}
                  error={!!errors.author}
                  helperText={errors.author}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ISBN"
                  value={bookData.isbn || ''}
                  onChange={(e) => handleBookChange('isbn', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Editore"
                  value={bookData.publisher || ''}
                  onChange={(e) => handleBookChange('publisher', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Anno di pubblicazione"
                  value={bookData.publishedYear || ''}
                  onChange={(e) => handleBookChange('publishedYear', e.target.value)}
                  variant="outlined"
                  type="number"
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Numero di pagine"
                  value={bookData.pageCount || ''}
                  onChange={(e) => handleBookChange('pageCount', e.target.value)}
                  variant="outlined"
                  type="number"
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          
          {/* Copertina a destra */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 200, mx: 'auto' }}>
              <BookCover
                coverImage={bookData.coverImage}
                title={bookData.title || 'Anteprima'}
                size="large"
                showPlaceholder={true}
              />
            </Box>
            <TextField
              fullWidth
              margin="normal"
              label="URL Copertina (opzionale)"
              value={bookData.coverImage || ''}
              onChange={(e) => handleBookChange('coverImage', e.target.value)}
              variant="outlined"
              size="small"
              sx={{ mt: 2 }}
              InputProps={{
                sx: { borderRadius: '8px' }
              }}
            />
          </Grid>
          
          {/* Descrizione */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descrizione"
              value={bookData.description || ''}
              onChange={(e) => handleBookChange('description', e.target.value)}
              variant="outlined"
              multiline
              rows={4}
              InputProps={{
                sx: { borderRadius: '8px' }
              }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Sezione personalizzazione (opzionale) */}
      {showPersonalization && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '12px',
            border: `1px solid ${theme.palette.divider}`,
            mb: 3
          }}
        >
          <Typography variant="h6" gutterBottom>
            Informazioni personali
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Stato lettura
              </Typography>
              <ReadStatus 
                status={personalData.readStatus} 
                variant="select" 
                onChange={(value) => handlePersonalDataChange('readStatus', value)} 
                disabled={false}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                La tua valutazione
              </Typography>
              <BookRating 
  value={personalData.rating} 
  readOnly={false} 
  onChange={(value) => handlePersonalDataChange('rating', value)} 
  showEmptyLabel={true}
  size="medium"
  precision={0.5}
/>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Note personali
              </Typography>
              <TextField
  fullWidth
  multiline
  rows={4}
  placeholder="Aggiungi le tue note personali sul libro..."
  value={personalData.notes || ''}
  onChange={(e) => handlePersonalDataChange('notes', e.target.value)}
  variant="outlined"
  disabled={false}
  InputProps={{
    sx: { borderRadius: '8px' }
  }}/>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Pulsanti azione */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button 
          variant="outlined" 
          onClick={onCancel}
          disabled={loading}
          sx={{ 
            borderRadius: '8px',
            px: 3
          }}
        >
          Annulla
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          type="submit"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ 
            borderRadius: '8px',
            px: 3
          }}
        >
          {loading ? 'Salvataggio...' : submitLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default BookForm;