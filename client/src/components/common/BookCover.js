// components/common/BookCover.js
import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ImageNotSupported as NoImageIcon } from '@mui/icons-material';

const BookCover = ({
  coverImage,
  title,
  size = 'medium', // 'small', 'medium', 'large'
  onClick,
  showPlaceholder = true,
  rounded = true,
  aspectRatio = '3/4'
}) => {
  const theme = useTheme();
  
  // Dimensioni predefinite
  const sizeValues = {
    small: { width: 60, height: 85 },
    medium: { width: '100%', height: 200 },
    large: { width: '100%', minWidth: 150, maxWidth: 200 }
  };
  
  const currentSize = sizeValues[size];
  const hasImage = coverImage && coverImage !== '';
  
  if (!hasImage && !showPlaceholder) {
    return null;
  }
  
  return (
    <Box
      onClick={onClick}
      sx={{
        ...currentSize,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: rounded ? '8px' : 0,
        overflow: 'hidden'
      }}
    >
      {hasImage ? (
        <Box
          component="img"
          src={coverImage}
          alt={title || 'Copertina libro'}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: size === 'medium' ? 'contain' : 'cover',
            borderRadius: rounded ? '8px' : 0,
            transition: 'transform 0.3s ease',
            '&:hover': onClick ? {
              transform: 'scale(1.05)'
            } : {}
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: rounded ? '8px' : 0
          }}
        >
          <NoImageIcon sx={{ 
            fontSize: size === 'small' ? 24 : 40, 
            color: 'rgba(0, 0, 0, 0.3)'
          }} />
        </Box>
      )}
    </Box>
  );
};

export default BookCover;