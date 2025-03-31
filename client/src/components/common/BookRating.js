// client/src/components/common/BookRating.js
import React from 'react';
import { Box, Rating, Typography } from '@mui/material';

/**
 * Componente per la visualizzazione e modifica della valutazione di un libro
 */
const BookRating = ({ 
  value = 0, 
  readOnly = true, 
  size = 'medium', 
  precision = 0.5,
  showValue = true,
  showEmptyLabel = false,
  onChange,
  sx = {}
}) => {
  // Handler per il cambio di valutazione
  const handleRatingChange = (event, newValue) => {
    console.log('BookRating handleRatingChange:', newValue);
    if (onChange) {
      onChange(newValue);
    }
  };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ...sx }}>
      <Rating
        name="book-rating"
        value={value}
        readOnly={readOnly}
        onChange={handleRatingChange}
        precision={precision}
        size={size}
      />
      
      {showValue && value > 0 && (
        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          color="text.secondary" 
          sx={{ ml: 1 }}
        >
          {value.toFixed(1)}
        </Typography>
      )}
      
      {showEmptyLabel && value === 0 && (
        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          color="text.secondary" 
          sx={{ ml: 1 }}
        >
          Non valutato
        </Typography>
      )}
    </Box>
  );
};

export default BookRating;