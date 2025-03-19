// client/src/components/scan/ScannerOverlay.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Button, 
  Stack,
  Slide,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  ImageSearch as GalleryIcon,
  FlashlightOn as FlashIcon
} from '@mui/icons-material';

const ScannerOverlay = ({ open, onClose }) => {
  const theme = useTheme();
  const [flashActive, setFlashActive] = useState(false);

  // Effetto per gestire lo scroll del body quando l'overlay è aperto
  useEffect(() => {
    if (open) {
      // Disabilita lo scroll del body quando l'overlay è aperto
      document.body.style.overflow = 'hidden';
    } else {
      // Ripristina lo scroll quando l'overlay è chiuso
      document.body.style.overflow = 'auto';
    }
    
    // Cleanup quando il componente viene smontato
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  const toggleFlash = () => {
    setFlashActive(!flashActive);
    // In futuro qui implementeremo la logica effettiva del flash
  };

  const handleTakePhoto = () => {
    console.log('Scatto foto');
    // Implementazione futura
  };
  
  const handleSelectFromGallery = () => {
    console.log('Seleziona dalla galleria');
    // Implementazione futura
  };
  
  const handleManualISBN = () => {
    console.log('Inserimento manuale ISBN');
    // Implementazione futura
  };
  

  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1300,
          backgroundColor: 'black',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 2,
            color: 'white',
          }}
        >
          <IconButton color="inherit" onClick={onClose} edge="start">
            <CloseIcon />
          </IconButton>
          <Typography variant="h6">Scansiona Libro</Typography>
          <IconButton 
            color="inherit" 
            onClick={toggleFlash}
            sx={{ 
              bgcolor: flashActive ? alpha(theme.palette.common.white, 0.2) : 'transparent',
              '&:hover': {
                bgcolor: flashActive ? alpha(theme.palette.common.white, 0.3) : alpha(theme.palette.common.white, 0.1)
              }
            }}
          >
            <FlashIcon />
          </IconButton>
        </Box>

        {/* Area fotocamera */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            backgroundColor: '#111',
          }}
        >
          {/* Qui in futuro andrà il componente fotocamera react-webcam */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '60%',
              border: '2px dashed rgba(255,255,255,0.5)',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CameraIcon sx={{ fontSize: 48, mb: 2, opacity: 0.7 }} />
              <Typography variant="body1">
                Inquadra la copertina, la costa o il codice ISBN
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer con pulsanti */}
        <Box
          sx={{
            padding: 2,
            backgroundColor: '#111',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Stack spacing={2} sx={{ width: '100%' }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<CameraIcon />}
            onClick={handleTakePhoto}
            sx={{ 
              py: 1.5, 
              borderRadius: 2, 
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark
              }
            }}
          >
            Scatta foto
          </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<GalleryIcon />}
              onClick={handleSelectFromGallery}
              sx={{ 
                py: 1.5, 
                borderRadius: 2,
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: theme.palette.primary.light,
                }
              }}
            >
              Seleziona dalla galleria
            </Button>
            <Button
              variant="text"
              size="large"
              fullWidth
              onClick={handleManualISBN}
              sx={{ 
                py: 1.5, 
                color: 'white',
              }}
            >
              Inserisci ISBN manualmente
            </Button>
          </Stack>
        </Box>
      </Box>
    </Slide>
  );
};

export default ScannerOverlay;