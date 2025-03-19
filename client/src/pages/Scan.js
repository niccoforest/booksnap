// client/src/pages/Scan.js
import React from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Button,
  Stack,
  useTheme
} from '@mui/material';
import { CameraAlt as CameraIcon, ImageSearch as GalleryIcon } from '@mui/icons-material';

const Scan = () => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        Scansiona un libro
      </Typography>
      
      <Paper 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '60vh',
          mb: 3,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 4
        }}
        elevation={0}
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
            borderColor: theme.palette.primary.light,
            borderRadius: 3,
            p: 2
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2
            }}
          >
            <CameraIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
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
          sx={{ py: 1.5, borderRadius: 3 }}
        >
          Attiva fotocamera
        </Button>
        
        <Button 
          variant="outlined" 
          size="large"
          fullWidth
          startIcon={<GalleryIcon />}
          sx={{ py: 1.5, borderRadius: 3 }}
        >
          Seleziona dalla galleria
        </Button>

        <Button 
          variant="text" 
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