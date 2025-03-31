// components/common/LoadingState.js
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingState = ({ 
  message = 'Caricamento in corso...', 
  size = 'medium', // 'small', 'medium', 'large'
  fullPage = false,
  overlay = false,
  transparent = false
}) => {
  const sizeValues = {
    small: 24,
    medium: 40,
    large: 60
  };
  
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <CircularProgress size={sizeValues[size]} />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
  
  if (fullPage) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: transparent ? 'rgba(255,255,255,0.8)' : 'background.paper',
          zIndex: overlay ? 1300 : 'auto'
        }}
      >
        {content}
      </Box>
    );
  }
  
  return content;
};

export default LoadingState;