// client/src/pages/NotFound.js
import React from 'react';
import { Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        p: 3
      }}
    >
      <Typography variant="h1" component="div" sx={{ fontSize: '5rem', color: 'primary.main', mb: 2 }}>
        404
      </Typography>
      <Typography variant="h5" component="h1" gutterBottom>
        Pagina non trovata
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        La pagina che stai cercando non esiste o è stata spostata.
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => navigate('/')}
      >
        Torna alla Home
      </Button>
    </Box>
  );
};

export default NotFound;