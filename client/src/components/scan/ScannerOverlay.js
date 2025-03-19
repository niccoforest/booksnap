// client/src/components/scan/ScannerOverlay.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Button, 
  Slide,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import { 
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlashlightOn as FlashIcon,
  FlashlightOff as FlashOffIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';

const ScannerOverlay = ({ open, onClose, onCapture }) => {
  const theme = useTheme();
  const webcamRef = useRef(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Configurazione webcam
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment", // Usa la fotocamera posteriore se disponibile
  };

  // Effetto per gestire lo scroll del body quando l'overlay è aperto
  useEffect(() => {
    if (open) {
      // Disabilita lo scroll del body quando l'overlay è aperto
      document.body.style.overflow = 'hidden';
    } else {
      // Ripristina lo scroll quando l'overlay è chiuso
      document.body.style.overflow = 'auto';
      // Reset dello stato della camera quando chiudiamo
      setIsCameraReady(false);
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

  // Gestisce lo scatto della foto
  const handleTakePhoto = () => {
    if (webcamRef.current && isCameraReady) {
      setIsCapturing(true);
      
      // Cattura l'immagine dalla webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
      // Simula un leggero ritardo per dare feedback visivo
      setTimeout(() => {
        setIsCapturing(false);
        
        if (onCapture) {
          onCapture({
            type: 'camera',
            image: imageSrc
          });
        }
      }, 300);
    }
  };
  
  // Gestisce errori di accesso alla fotocamera
  const handleCameraError = (error) => {
    console.error('Errore accesso fotocamera:', error);
    alert('Non è stato possibile accedere alla fotocamera. Verifica di aver concesso i permessi necessari.');
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
            {flashActive ? <FlashIcon /> : <FlashOffIcon />}
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
            overflow: 'hidden'
          }}
        >
          {/* Stato di caricamento della fotocamera */}
          {!isCameraReady && (
            <Box sx={{ 
              position: 'absolute', 
              zIndex: 10, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center', 
              width: '100%', 
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.7)'
            }}>
              <CircularProgress color="primary" size={60} />
              <Typography variant="body1" color="white" sx={{ mt: 2 }}>
                Attivazione fotocamera...
              </Typography>
            </Box>
          )}
          
          {/* Webcam component */}
          <Webcam
            audio={false}
            ref={webcamRef}
            videoConstraints={videoConstraints}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.92}
            forceScreenshotSourceSize
            onUserMedia={() => setIsCameraReady(true)}
            onUserMediaError={handleCameraError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: isCameraReady ? 'block' : 'none'
            }}
          />
          
          {/* Riquadro guida scansione */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '75%',
              height: '40%',
              border: '2px solid rgba(255,255,255,0.8)',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none', // Per non interferire con gli eventi della fotocamera
            }}
          >
            {!isCameraReady && (
              <Box sx={{ textAlign: 'center', padding: 2 }}>
                <CameraIcon sx={{ fontSize: 48, mb: 2, opacity: 0.7 }} />
                <Typography variant="body1" color="white">
                  Inquadra la copertina, la costa o il codice ISBN
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Overlay di feedback durante lo scatto */}
          {isCapturing && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          )}
        </Box>

        {/* Footer con pulsante - Semplificato, solo un pulsante */}
        <Box
          sx={{
            padding: 2,
            backgroundColor: '#111',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<CameraIcon />}
            onClick={handleTakePhoto}
            disabled={!isCameraReady || isCapturing}
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
        </Box>
      </Box>
    </Slide>
  );
};

export default ScannerOverlay;