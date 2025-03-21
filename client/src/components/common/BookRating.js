// components/common/BookRating.js
import React from 'react';
import { Rating, Box, Typography, alpha, useTheme } from '@mui/material';

const BookRating = ({ 
  value = 0, 
  readOnly = false, 
  showValue = true,
  size = "medium", 
  precision = 0.5,
  onChange,
  label,
  showEmptyLabel = true
}) => {
  const theme = useTheme();
  const numericValue = Number(value) || 0;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {label}
        </Typography>
      )}
      <Rating
        value={numericValue}
        readOnly={readOnly}
        precision={precision}
        size={size}
        onChange={(event, newValue) => {
          if (onChange) onChange(newValue);
        }}
      />
      {showValue && numericValue > 0 ? (
        <Typography variant="body2" sx={{ ml: 1, fontWeight: 'medium' }}>
          {numericValue.toFixed(1)}
        </Typography>
      ) : (showEmptyLabel && !numericValue && !readOnly) ? (
        <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
          Non valutato
        </Typography>
      ) : null}
    </Box>
  );
};

export default BookRating;