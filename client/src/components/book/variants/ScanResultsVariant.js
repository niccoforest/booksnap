// client/src/components/book/variants/ScanResultsVariant.js

import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  IconButton, 
  Chip,
  useTheme,
  alpha,
  Tooltip,
  Paper
} from '@mui/material';
import { 
  Add as AddIcon,
  LibraryAdd as LibraryAddIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import BookCover from '../../common/BookCover';

// Nuova variante specializzata per i risultati della scansione LLM
const ScanResultsVariant = ({
  bookData,
  bookId,
  isInLibrary,
  isLoading,
  confidence = 0, // Confidenza del riconoscimento (0-1)
  onBookClick,
  onAddBook,
  showAddButton = true,
  highlightResult = false // Per evidenziare il risultato principale
}) => {
  const theme = useTheme();
  
  // Estrai le informazioni dal libro
  const {
    title = 'Titolo sconosciuto',
    author = 'Autore sconosciuto',
    coverImage = null,
    publishedYear,
    publisher
  } = bookData || {};
  
  // Determina colore in base alla confidenza
  let confidenceColor = theme.palette.warning.main; // Default: arancione
  let confidenceLabel = "Incerta";
  
  if (confidence >= 0.8) {
    confidenceColor = theme.palette.success.main; // Verde per alta confidenza
    confidenceLabel = "Alta";
  } else if (confidence >= 0.5) {
    confidenceColor = theme.palette.info.main; // Blu per media confidenza
    confidenceLabel = "Media";
  }
  
  // Handler per il click sul libro
  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick(bookId);
    }
  };
  
  // Handler per l'aggiunta del libro
  const handleAddBook = (e) => {
    e.stopPropagation(); // Previene la propagazione al click sul libro
    if (onAddBook) {
      onAddBook(bookData);
    }
  };

  return (
    <Paper
      elevation={highlightResult ? 2 : 0}
      sx={{
        mb: 2,
        borderRadius: '12px',
        border: `1px solid ${highlightResult 
          ? alpha(confidenceColor, 0.5) 
          : theme.palette.divider}`,
        p: 2,
        transition: 'all 0.2s ease',
        backgroundColor: highlightResult 
          ? alpha(confidenceColor, 0.05) 
          : theme.palette.background.paper,
        '&:hover': {
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
          boxShadow: '0 3px 10px rgba(0,0,0,0.08)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* Copertina libro */}
        <Box 
          onClick={handleBookClick}
          sx={{ 
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.03)'
            }
          }}
        >
          <BookCover 
            coverImage={coverImage} 
            title={title} 
            size="medium"
          />
          
          {/* Badge di confidenza */}
          {highlightResult && (
            <Chip 
              label={`${confidenceLabel} (${Math.round(confidence * 100)}%)`}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: alpha(confidenceColor, 0.9),
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.7rem'
              }}
            />
          )}
        </Box>
        
        {/* Info libro */}
        <Box 
          sx={{ 
            flex: 1,
            cursor: 'pointer',
            ml: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%'
          }}
          onClick={handleBookClick}
        >
          <Box>
            <Typography variant="h6" component="div" gutterBottom noWrap>
              {title}
            </Typography>
            <Typography variant="body1" color="text.primary" gutterBottom>
              {author}
            </Typography>
            
            {publishedYear && (
              <Typography variant="body2" color="text.secondary">
                {publishedYear}
                {publisher && ` • ${publisher}`}
              </Typography>
            )}
          </Box>
          
          {/* Pulsante azione */}
          {showAddButton && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              {isInLibrary ? (
                <Button 
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleBookClick}
                  sx={{ 
                    borderRadius: '8px',
                    boxShadow: 'none',
                    backgroundColor: alpha(theme.palette.success.main, 0.9),
                    '&:hover': {
                      backgroundColor: theme.palette.success.main,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  Già in libreria
                </Button>
              ) : (
                <Button 
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddBook}
                  sx={{ 
                    borderRadius: '8px',
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  Aggiungi
                </Button>
              )}
            </Box>
          )}
        </Box>
        
        {/* Info button */}
        <Tooltip title="Visualizza dettagli">
          <IconButton 
            onClick={handleBookClick}
            size="small"
            sx={{ ml: 1 }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default ScanResultsVariant;