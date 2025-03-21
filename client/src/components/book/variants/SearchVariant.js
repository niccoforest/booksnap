// client/src/components/book/variants/SearchVariant.js
import React from 'react';
import { 
  Card,
  CardContent,
  Box, 
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import { 
  ImageNotSupported as NoImageIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const SearchVariant = ({
  bookData,
  userBookId,
  bookId,
  isInLibrary,
  isLoading,
  onBookClick,
  onAddBook
}) => {
  const theme = useTheme();
  
  // Estrai le informazioni dal libro
  const {
    title = 'Titolo sconosciuto',
    author = 'Autore sconosciuto',
    coverImage = null,
    publishedYear,
    publisher,
    isbn
  } = bookData || {};
  
  // Handler per il click sul libro
  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick(userBookId || bookId);
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
    <Card
      sx={{
        mb: 2,
        borderRadius: '12px',
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* Copertina libro */}
          {coverImage ? (
            <Box
              component="img"
              src={coverImage}
              alt={title}
              sx={{
                width: 60,
                height: 85,
                borderRadius: '8px',
                mr: 2,
                objectFit: 'cover',
                cursor: 'pointer'
              }}
              onClick={handleBookClick}
            />
          ) : (
            <Box
              sx={{
                width: 60,
                height: 85,
                borderRadius: '8px',
                mr: 2,
                bgcolor: 'rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={handleBookClick}
            >
              <NoImageIcon />
            </Box>
          )}
          
          {/* Info libro */}
          <Box 
            sx={{ 
              flex: 1,
              cursor: 'pointer'
            }}
            onClick={handleBookClick}
          >
            <Typography variant="subtitle1" component="div" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.primary" gutterBottom>
              {author}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {publishedYear && (
                <Typography variant="body2" color="text.secondary">
                  {publishedYear}
                </Typography>
              )}
              {isbn && (
                <Typography variant="caption" sx={{ display: 'inline-block' }}>
                  ISBN: {isbn}
                </Typography>
              )}
            </Box>
          </Box>
          
          {/* Pulsante azione */}
          <Box sx={{ ml: 1 }}>
            {isInLibrary ? (
              <Tooltip title="Libro già nella tua libreria">
                <IconButton 
                  color="success"
                  onClick={handleBookClick}
                  size="small"
                  sx={{ 
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.success.main, 0.2),
                    }
                  }}
                >
                  <CheckCircleIcon />
                </IconButton>
              </Tooltip>
            ) : isLoading ? (
              <CircularProgress size={24} color="primary" />
            ) : (
              <IconButton 
                color="primary"
                size="small"
                onClick={handleAddBook}
                sx={{ 
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                <AddIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SearchVariant;