// client/src/components/common/BookCover.js
import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ImageNotSupported as NoImageIcon } from '@mui/icons-material';

/**
 * Componente per la visualizzazione della copertina di un libro
 * Supporta diversi formati e gestisce il caso in cui l'immagine non sia disponibile
 */
const BookCover = ({ 
  coverImage, 
  title = 'Copertina libro',
  size = 'medium', // small, medium, large
  rounded = true,
  sx = {}
}) => {
  const theme = useTheme();
  
  // Definisci dimensioni in base al size
  const dimensions = {
    small: { width: 60, height: 90 },
    medium: { width: 120, height: 180 },
    large: { width: 200, height: 300 },
  }[size] || { width: 120, height: 180 };
  
  // Gestione errore caricamento immagine
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: rounded ? '8px' : 0,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: theme.palette.grey[100],
        ...sx
      }}
    >
      {/* Immagine copertina */}
      {coverImage ? (
        <img
          src={coverImage}
          alt={title}
          onError={handleImageError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      ) : null}
      
      {/* Fallback quando l'immagine non è disponibile */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: coverImage ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.grey[200],
          color: theme.palette.text.secondary
        }}
      >
        <NoImageIcon fontSize={size === 'small' ? 'medium' : 'large'} />
      </Box>
    </Box>
  );
};

export default BookCover;