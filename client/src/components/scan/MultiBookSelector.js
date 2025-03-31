// client/src/components/scan/MultiBookSelector.js
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  IconButton,
  Stack,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import BookCover from '../common/BookCover';

/**
 * Componente per selezionare libri da un riconoscimento multi-libro
 */
const MultiBookSelector = ({ 
  books = [], 
  onSelectBook,
  onClose,
  loading = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedBooks, setSelectedBooks] = useState([]);

  // Gestisce la navigazione tra i libri
  const handleNext = () => {
    if (currentIndex < books.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Gestisce la selezione di un libro
  const handleSelectBook = (book) => {
    onSelectBook(book);
  };

  // Verifica se un libro è stato selezionato
  const isSelected = (bookId) => {
    return selectedBooks.some(book => book.googleBooksId === bookId);
  };

  // Toggle selezione libro
  const toggleSelectBook = (book) => {
    if (isSelected(book.googleBooksId)) {
      setSelectedBooks(selectedBooks.filter(b => b.googleBooksId !== book.googleBooksId));
    } else {
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  // Renderizza un chip con il livello di confidenza
  const renderConfidenceChip = (confidence) => {
    let color = 'default';
    let label = 'Confidenza media';
    let icon = null;

    if (confidence >= 0.7) {
      color = 'success';
      label = 'Alta confidenza';
      icon = <CheckIcon fontSize="small" />;
    } else if (confidence <= 0.4) {
      color = 'warning';
      label = 'Bassa confidenza';
      icon = <WarningIcon fontSize="small" />;
    }

    return (
      <Chip
        size="small"
        color={color}
        label={label}
        icon={icon}
        sx={{ fontSize: '0.75rem' }}
      />
    );
  };

  // Se non ci sono libri, mostra un messaggio
  if (books.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
        <Box sx={{ mb: 2 }}>
          <ErrorIcon color="warning" sx={{ fontSize: 60 }} />
        </Box>
        <Typography variant="h6" gutterBottom>
          Nessun libro riconosciuto
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Non è stato possibile identificare libri in questa immagine.
        </Typography>
        <Button variant="outlined" onClick={onClose}>
          Chiudi
        </Button>
      </Paper>
    );
  }

  const currentBook = books[currentIndex];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Libri riconosciuti ({books.length})
        </Typography>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Libro corrente */}
        <Box sx={{ position: 'relative', pt: 1, pb: 3 }}>
          <Card sx={{ display: 'flex', position: 'relative' }}>
            {/* Copertina */}
            <Box sx={{ width: 120, minWidth: 120, position: 'relative' }}>
              <BookCover 
                book={currentBook} 
                height={180} 
                showPlaceholder={true}
              />
              
              {/* Badge confidenza */}
              <Box sx={{ position: 'absolute', bottom: 5, left: 5 }}>
                {currentBook.recognition && renderConfidenceChip(currentBook.recognition.confidence)}
              </Box>
            </Box>
            
            {/* Dettagli */}
            <CardContent sx={{ flex: 1, pt: 2 }}>
              <Typography variant="h6" component="div" gutterBottom noWrap>
                {currentBook.title || 'Titolo sconosciuto'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {currentBook.author || 'Autore sconosciuto'}
              </Typography>
              
              {currentBook.publisher && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {currentBook.publisher}
                </Typography>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={loading ? <CircularProgress size={18} /> : <AddIcon />}
                  onClick={() => handleSelectBook(currentBook)}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  {loading ? 'Aggiunta in corso...' : 'Aggiungi alla libreria'}
                </Button>
              </Box>
            </CardContent>
          </Card>
          
          {/* Navigazione libro */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            position: 'absolute', 
            width: '100%', 
            top: '50%', 
            transform: 'translateY(-50%)',
            px: 1,
            pointerEvents: 'none'
          }}>
            <IconButton 
              onClick={handlePrev} 
              disabled={currentIndex === 0 || loading}
              sx={{ 
                bgcolor: 'background.paper',
                boxShadow: 1,
                pointerEvents: 'auto'
              }}
            >
              <PrevIcon />
            </IconButton>
            <IconButton 
              onClick={handleNext} 
              disabled={currentIndex === books.length - 1 || loading}
              sx={{ 
                bgcolor: 'background.paper',
                boxShadow: 1,
                pointerEvents: 'auto'
              }}
            >
              <NextIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Miniature degli altri libri */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Altri libri riconosciuti:
          </Typography>
          <Grid container spacing={1}>
            {books.map((book, index) => (
              <Grid item key={book.googleBooksId || index} xs={3} sm={2} md={2} lg={2}>
                <Box 
                  onClick={() => setCurrentIndex(index)}
                  sx={{ 
                    cursor: 'pointer',
                    opacity: index === currentIndex ? 1 : 0.7,
                    border: index === currentIndex ? '2px solid' : '1px solid',
                    borderColor: index === currentIndex ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    transition: 'all 0.2s',
                    '&:hover': {
                      opacity: 1,
                      borderColor: 'primary.light'
                    }
                  }}
                >
                  <BookCover book={book} height={80} showPlaceholder={true} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        
        {/* Pulsante chiudi */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={onClose}
            disabled={loading}
          >
            Chiudi
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default MultiBookSelector;