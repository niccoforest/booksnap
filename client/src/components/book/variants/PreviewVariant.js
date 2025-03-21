// client/src/components/book/variants/PreviewVariant.js
import React from 'react';
import { 
  Card, 
  CardMedia, 
  CardContent,
  Typography,
  Box,
  useTheme
} from '@mui/material';
import { 
  ImageNotSupported as NoImageIcon
} from '@mui/icons-material';

const PreviewVariant = ({
  bookData,
  userBookId,
  bookId,
  onBookClick
}) => {
  const theme = useTheme();
  
  // Estrai le informazioni dal libro
  const {
    title = 'Titolo sconosciuto',
    author = 'Autore sconosciuto',
    coverImage = null
  } = bookData || {};
  
  // Handler per il click sul libro
  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick(userBookId || bookId);
    }
  };

  return (
    <Card 
      sx={{ 
        borderRadius: 2, 
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
        }
      }}
      elevation={1}
      onClick={handleBookClick}
    >
      {coverImage ? (
        <CardMedia
          component="img"
          height="160"
          image={coverImage}
          alt={title}
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.04)'
          }}
        >
          <NoImageIcon sx={{ fontSize: 40, color: 'rgba(0, 0, 0, 0.3)' }} />
        </Box>
      )}
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5, lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {author}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default PreviewVariant;