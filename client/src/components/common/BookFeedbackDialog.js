// client/src/components/common/BookFeedbackDialog.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import BookCard from '../book/BookCard';
import recognitionCacheService from '../../services/recognitionCache.service';

const BookFeedbackDialog = ({ open, onClose, recognizedBook, alternativeBooks = [], ocrText, onFeedbackSubmitted }) => {
  const [feedbackType, setFeedbackType] = useState('wrong_book');
  const [correctBook, setCorrectBook] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  // Nuevo estado para datos de libro personalizados
  const [customBookData, setCustomBookData] = useState({
    title: '',
    author: ''
  });

  const handleFeedbackTypeChange = (e) => {
    setFeedbackType(e.target.value);
    // Reset correctBook si no es un libro alternativo
    if (e.target.value !== 'alternative_book') {
      setCorrectBook(null);
    }
  };

  const handleSelectAlternative = (book) => {
    setCorrectBook(book);
    setFeedbackType('alternative_book');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (feedbackType === 'wrong_book') {
        // Señala falso positivo
        await recognitionCacheService.learnFromUserFeedback(
          ocrText, null, recognizedBook
        );
        setSuccess("Grazie! Questo libro non sarà più suggerito per questa scansione.");
      } else if (feedbackType === 'alternative_book' && correctBook) {
        // Registra corrección
        await recognitionCacheService.learnFromUserFeedback(
          ocrText, correctBook, recognizedBook
        );
        setSuccess("Grazie! Abbiamo registrato la tua scelta per migliorare i riconoscimenti futuri.");
      } else if (feedbackType === 'correct_book') {
        // Confirma libro correcto
        await recognitionCacheService.learnFromUserFeedback(
          ocrText, recognizedBook, null
        );
        setSuccess("Grazie! Hai confermato che il riconoscimento è corretto.");
      } else if (feedbackType === 'custom_book' && customBookData.title && customBookData.author) {
        // Crea un libro personalizado
        const customBook = {
          title: customBookData.title,
          author: customBookData.author,
          googleBooksId: `custom_${Date.now()}` // ID temporal
        };
        
        await recognitionCacheService.learnFromUserFeedback(
          ocrText, customBook, recognizedBook
        );
        setSuccess("Grazie! Abbiamo registrato i dati del libro corretto.");
      }
      
      // Chiama la callback di completamento dopo un secondo
      setTimeout(() => {
        onFeedbackSubmitted && onFeedbackSubmitted(
          feedbackType, 
          feedbackType === 'alternative_book' ? correctBook : 
          feedbackType === 'custom_book' ? customBookData : 
          feedbackType === 'correct_book' ? recognizedBook : null
        );
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Errore nell\'invio feedback:', err);
      setError('Si è verificato un errore. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  // Resetta lo stato quando il dialog viene chiuso
  const handleClose = () => {
    setFeedbackType('wrong_book');
    setCorrectBook(null);
    setAdditionalInfo('');
    setError(null);
    setSuccess(null);
    setCustomBookData({ title: '', author: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Aiutaci a migliorare il riconoscimento
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Typography gutterBottom variant="h6">
          Libro riconosciuto:
        </Typography>
        
        <Box mb={3}>
          {recognizedBook && (
            <BookCard
              book={recognizedBook}
              variant="search"
            />
          )}
        </Box>
        
        <Typography gutterBottom variant="subtitle1">
          Questo riconoscimento è...
        </Typography>
        
        <RadioGroup value={feedbackType} onChange={handleFeedbackTypeChange}>
          {/* Opción para confirmar que el libro es correcto */}
          <FormControlLabel
            value="correct_book"
            control={<Radio />}
            label="Corretto - È questo libro"
          />
          
          <FormControlLabel
            value="wrong_book"
            control={<Radio />}
            label="Sbagliato - Non è questo libro"
          />
          
          {alternativeBooks?.length > 0 && (
            <FormControlLabel
              value="alternative_book"
              control={<Radio />}
              label="È uno di questi libri alternativi:"
            />
          )}
          
          {/* Nueva opción para libros personalizados */}
          <FormControlLabel
            value="custom_book"
            control={<Radio />}
            label="È un altro libro (inserisci manualmente)"
          />
        </RadioGroup>
        
        {feedbackType === 'alternative_book' && alternativeBooks?.length > 0 && (
          <Box mt={2} mb={2} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {alternativeBooks.map((book, index) => (
              <Box
                key={index}
                onClick={() => handleSelectAlternative(book)}
                sx={{
                  cursor: 'pointer',
                  border: correctBook && correctBook.googleBooksId === book.googleBooksId 
                    ? '2px solid #1976d2' 
                    : '1px solid #ddd',
                  borderRadius: 1,
                  p: 1,
                  width: 200,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#1976d2',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Typography variant="subtitle2" noWrap>
                  {book.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {book.author || (book.authors ? book.authors.join(', ') : '')}
                </Typography>
                {book.coverImage && (
                  <img 
                    src={book.coverImage} 
                    alt={book.title} 
                    style={{ width: '100%', height: 120, objectFit: 'contain', marginTop: 8 }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
        
        {/* Nuevo formulario para inserción manual de datos */}
        {feedbackType === 'custom_book' && (
          <Box mt={2} mb={2} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Inserisci i dati del libro corretto:
            </Typography>
            <TextField
              fullWidth
              label="Titolo"
              value={customBookData.title}
              onChange={(e) => setCustomBookData({...customBookData, title: e.target.value})}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Autore"
              value={customBookData.author}
              onChange={(e) => setCustomBookData({...customBookData, author: e.target.value})}
              margin="normal"
              required
            />
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          label="Informazioni aggiuntive (opzionale)"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          margin="normal"
        />
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annulla
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={loading || 
                   (feedbackType === 'alternative_book' && !correctBook) ||
                   (feedbackType === 'custom_book' && (!customBookData.title || !customBookData.author))}
        >
          {loading ? <CircularProgress size={24} /> : 'Invia feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookFeedbackDialog;