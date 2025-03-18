// client/src/pages/Scan.js
import React from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Button,
  Stack,
  CircularProgress
} from '@mui/material';
import { CameraAlt as CameraIcon } from '@mui/icons-material';

// Questo è un placeholder per la pagina di scansione
// In futuro, integreremo react-webcam e le funzionalità di scansione
const Scan = () => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Scansiona un libro
      </Typography>
      
      <Paper 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '50vh',
          mb: 3,
          p: 2,
          bgcolor: 'grey.100'
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            p: 2
          }}
        >
          <CameraIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="body1" textAlign="center" gutterBottom>
            Premi il pulsante qui sotto per attivare la fotocamera
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Inquadra la copertina, la costa o il codice ISBN del libro
          </Typography>
        </Box>
      </Paper>
      
      <Stack direction="column" spacing={2}>
        <Button 
          variant="contained" 
          size="large" 
          fullWidth
          startIcon={<CameraIcon />}
          sx={{ py: 1.5 }}
        >
          Attiva fotocamera
        </Button>
        
        <Button 
          variant="outlined" 
          size="large"
          fullWidth
          sx={{ py: 1.5 }}
        >
          Inserisci ISBN manualmente
        </Button>
      </Stack>
    </Box>
  );
};

export default Scan;