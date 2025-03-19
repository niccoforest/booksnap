// client/src/pages/Library.js
import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Paper
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Library = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        La mia libreria
      </Typography>
      
      {/* Box tratteggiato con pulsante aggiungi */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 3,
          border: '2px dashed rgba(0, 0, 0, 0.12)',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Non hai ancora aggiunto libri alla tua libreria
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/add-book')}
          sx={{ mt: 2 }}
        >
          Aggiungi libro
        </Button>
      </Paper>
    </Box>
  );
};

export default Library;