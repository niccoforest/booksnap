// client/src/components/scan/ScannerOverlay.js - Versione semi-automatica
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Button, 
  Slide,
  useTheme,
  alpha,
  CircularProgress,
  TextField,
  Paper
} from '@mui/material';
import { 
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';

const ScannerOverlay = ({ open, onClose, onCapture }) => {
  const theme = useTheme();
  const webcamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [manualIsbn, setManualIsbn] = useState('');

  // Configurazione webcam
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment", // Usa la fotocamera posteriore se disponibile
  };

  // Gestisce lo scroll del body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setIsCameraReady(false);
      setCapturedImage(null);
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  // Gestisce lo scatto della foto
  const handleTakePhoto = () => {
    if (webcamRef.current && isCameraReady) {
      setIsCapturing(true);
      
      // Cattura l'immagine dalla webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
      setTimeout(() => {
        setIsCapturing(false);
        setCapturedImage(imageSrc);
      }, 300);
    }
  };
  
  // Gestisce la ricerca con ISBN manuale
  const handleManualSearch = () => {
    if (!manualIsbn || manualIsbn.trim() === '') return;
    
    if (onCapture) {
      onCapture({
        type: 'camera', // Uso 'camera' per mantenere la compatibilità
        image: capturedImage,
        isbn: manualIsbn.trim()
      });
    }
  };
  
  // Gestisce la nuova foto (reset)
  const handleNewPhoto = () => {
    setCapturedImage(null);
    setManualIsbn('');
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
          <Box sx={{ width: 40 }} /> {/* Spacer per bilanciare il layout */}
        </Box>

        {/* Area fotocamera o immagine catturata */}
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
          {!capturedImage ? (
            <>
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
                  width: '80%',
                  height: '30%',
                  border: '2px solid rgba(255,255,255,0.8)',
                  borderRadius: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)',
                }}
              >
                {isCameraReady && (
                  <Typography 
                    variant="body2" 
                    color="white" 
                    sx={{ 
                      bgcolor: 'rgba(0,0,0,0.5)', 
                      px: 2, 
                      py: 1, 
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                  >
                    Inquadra il codice ISBN o il codice a barre
                  </Typography>
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
            </>
          ) : (
            // Visualizzazione immagine catturata
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <img 
                src={capturedImage} 
                alt="Captured" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#111'
                }}
              />
              
              {/* Input ISBN manuale */}
              <Paper
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90%',
                  maxWidth: '400px',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.9)'
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  Inserisci l'ISBN visibile nell'immagine:
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="ISBN (13 cifre)"
                    value={manualIsbn}
                    onChange={(e) => setManualIsbn(e.target.value)}
                    size="small"
                    autoFocus
                  />
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleManualSearch}
                    startIcon={<SearchIcon />}
                  >
                    Cerca
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>

        {/* Footer con pulsante */}
        <Box
          sx={{
            padding: 2,
            backgroundColor: '#111',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {!capturedImage ? (
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
          ) : (
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<CameraIcon />}
              onClick={handleNewPhoto}
              sx={{ 
                py: 1.5, 
                borderRadius: 2,
                color: 'white',
                borderColor: 'white'
              }}
            >
              Scatta nuova foto
            </Button>
          )}
        </Box>
      </Box>
    </Slide>
  );
};

export default ScannerOverlay;