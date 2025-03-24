// client/src/components/scan/ScannerOverlay.js - Versione ottimizzata per copertine

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Slide,
  useTheme,
  alpha,
  CircularProgress,
  Snackbar,
  Alert,
  Fab,
  ToggleButtonGroup,
  ToggleButton,
  Fade
} from '@mui/material';
import { 
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlashlightOn as FlashIcon,
  FlashlightOff as FlashOffIcon,
  LibraryBooks as MultiBookIcon,
  MenuBook as CoverIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import barcodeService from '../../services/barcode.service';
import { processBookScan } from '../../services/bookScannerIntegration';



const ScannerOverlay = ({ open, onClose, onCapture }) => {
  const theme = useTheme();
  const webcamRef = useRef(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [recognizedBook, setRecognizedBook] = useState(null);
  const [scanMode, setScanMode] = useState('cover'); // 'cover' o 'multi'

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
      // Inizializza il lettore barcode all'apertura
      barcodeService.init();
    } else {
      // Ripristina lo scroll quando l'overlay è chiuso
      document.body.style.overflow = 'auto';
      // Reset dello stato della camera quando chiudiamo
      setIsCameraReady(false);
      setSuccessMode(false);
      setRecognizedBook(null);
    }
    
    // Cleanup quando il componente viene smontato
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  // Gestione del flash della fotocamera
  const toggleFlash = () => {
    if (!webcamRef.current || !webcamRef.current.video) return;
    
    try {
      // Ottieni i track video
      const track = webcamRef.current.video.srcObject.getVideoTracks()[0];
      
      // Controlla se il supporto per il flash è disponibile
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        // Cambia lo stato del flash
        const newFlashState = !flashActive;
        track.applyConstraints({
          advanced: [{ torch: newFlashState }]
        }).then(() => {
          setFlashActive(newFlashState);
          console.log(`Flash ${newFlashState ? 'attivato' : 'disattivato'}`);
        }).catch(err => {
          console.error('Errore nell\'attivazione del flash:', err);
          setShowStatus(true);
          setStatusMessage('Impossibile attivare il flash');
        });
      } else {
        console.log('Questo dispositivo non supporta il flash');
        setShowStatus(true);
        setStatusMessage('Flash non supportato su questo dispositivo');
      }
    } catch (error) {
      console.error('Errore nell\'accesso al flash:', error);
    }
  };

  // Gestisce lo scatto della foto
  const handleTakePhoto = async () => {
    if (webcamRef.current && isCameraReady) {
      setIsCapturing(true);
      setStatusMessage('Analisi dell\'immagine in corso...');
      setShowStatus(true);
      
      // Cattura l'immagine dalla webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
      try {
        // Utilizza il servizio di integrazione per processare l'immagine
        await processBookScan(
          imageSrc,
          scanMode,
          setStatusMessage,
          setIsCapturing,
          setSuccessMode,
          setRecognizedBook,
          onCapture
        );
      } catch (error) {
        console.error('Errore durante la scansione:', error);
        setStatusMessage('Si è verificato un errore durante la scansione. Riprova.');
        setIsCapturing(false);
      }
    }
  };
  
  // Cambia modalità di scansione
  const _toggleScanMode  = () => {
    setScanMode(prevMode => prevMode === 'cover' ? 'multi' : 'cover');
    setStatusMessage(
      scanMode === 'cover' 
        ? 'Modalità scansione multipla attivata' 
        : 'Modalità scansione singola attivata'
    );
    setShowStatus(true);
  };
  
  // Gestisce errori di accesso alla fotocamera
  const handleCameraError = (error) => {
    console.error('Errore accesso fotocamera:', error);
    setStatusMessage('Errore di accesso alla fotocamera. Verifica i permessi.');
    setShowStatus(true);
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
          <Typography variant="h6">
            {scanMode === 'cover' ? 'Scansiona copertina' : 'Scansiona scaffale'}
          </Typography>
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
          
          {/* Animazione di successo */}
          {successMode && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 20
            }}>
              <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: theme.palette.success.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s infinite',
                mb: 2
              }}>
                <CheckIcon style={{ color: 'white', fontSize: 40 }} />
              </Box>
              <Typography variant="h5" color="white" fontWeight="bold">
                Voilà!
              </Typography>
              {recognizedBook && (
                <Typography variant="body1" color="white" sx={{ mt: 1 }}>
                  {recognizedBook.title}
                </Typography>
              )}
            </Box>
          )}
          
          {/* Riquadro guida scansione - rettangolare verticale per le copertine */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: scanMode === 'cover' ? '70%' : '90%',  // Più stretto per copertina singola
              height: scanMode === 'cover' ? '80%' : '60%', // Più alto per copertina singola
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            {/* Angoli stile Vivino */}
            <Box sx={{
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: 40, 
              height: 40,
              borderTop: '3px solid rgba(255,255,255,0.8)',
              borderLeft: '3px solid rgba(255,255,255,0.8)',
              borderTopLeftRadius: 12
            }} />
            <Box sx={{
              position: 'absolute', 
              top: 0, 
              right: 0, 
              width: 40, 
              height: 40,
              borderTop: '3px solid rgba(255,255,255,0.8)',
              borderRight: '3px solid rgba(255,255,255,0.8)',
              borderTopRightRadius: 12
            }} />
            <Box sx={{
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              width: 40, 
              height: 40,
              borderBottom: '3px solid rgba(255,255,255,0.8)',
              borderLeft: '3px solid rgba(255,255,255,0.8)',
              borderBottomLeftRadius: 12
            }} />
            <Box sx={{
              position: 'absolute', 
              bottom: 0, 
              right: 0, 
              width: 40, 
              height: 40,
              borderBottom: '3px solid rgba(255,255,255,0.8)',
              borderRight: '3px solid rgba(255,255,255,0.8)',
              borderBottomRightRadius: 12
            }} />
            
            {/* Testo di guida */}
            {isCameraReady && !isCapturing && !successMode && (
              <Typography 
                variant="body2" 
                color="white" 
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.5)', 
                  px: 2, 
                  py: 1, 
                  borderRadius: 1,
                  textAlign: 'center',
                  position: 'absolute',
                  bottom: -40
                }}
              >
                {scanMode === 'cover' 
                  ? 'Inquadra la copertina del libro' 
                  : 'Inquadra lo scaffale con i libri'}
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
                backgroundColor: 'rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20
              }}
            >
              <CircularProgress color="primary" size={60} />
            </Box>
          )}
        </Box>

        {/* Footer con pulsanti azione */}
        <Box
  sx={{
    padding: 2,
    backgroundColor: '#111',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }}
>
  {/* Pulsante centrale di scatto */}
  {!successMode && (
    <Box sx={{ 
      width: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      mb: 3, 
      position: 'relative' 
    }}>
      <Fab
        color="primary"
        disabled={!isCameraReady || isCapturing}
        onClick={handleTakePhoto}
        size="large"
        sx={{
          width: 64,
          height: 64,
          boxShadow: theme.shadows[4]
        }}
      >
        <CameraIcon fontSize="large" />
      </Fab>
    </Box>
  )}
  
  {/* Toggle per selezionare la modalità - Stile Vivino */}
  {!successMode && (
    <Fade in={true}>
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={scanMode}
          exclusive
          onChange={(e, newMode) => {
            // Previeni la deseleziona (almeno una modalità deve essere selezionata)
            if (newMode !== null) {
              setScanMode(newMode);
              setStatusMessage(
                newMode === 'cover' 
                  ? 'Modalità scansione singola copertina' 
                  : 'Modalità scansione multipla libri'
              );
              setShowStatus(true);
            }
          }}
          aria-label="Modalità di scansione"
          sx={{
            bgcolor: 'rgba(255,255,255,0.12)',
            borderRadius: 3,
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              color: 'white',
              '&.Mui-selected': {
                bgcolor: theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                }
              },
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
              }
            }
          }}
        >
          <ToggleButton 
            value="cover" 
            aria-label="Scansiona copertina"
            sx={{ px: 2, py: 1, borderRadius: '24px 0 0 24px' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CoverIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Copertina</Typography>
            </Box>
          </ToggleButton>
          <ToggleButton 
            value="multi" 
            aria-label="Scansiona multipli libri"
            sx={{ px: 2, py: 1, borderRadius: '0 24px 24px 0' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MultiBookIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Scaffale</Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Fade>
  )}
  
  {/* Testo informativo */}
  <Typography 
    variant="body2" 
    color="rgba(255,255,255,0.7)"
    align="center"
  >
    {scanMode === 'cover' 
      ? 'La copertina deve essere completamente visibile' 
      : 'Inquadra più libri contemporaneamente'}
  </Typography>
</Box>
        
        {/* Snackbar per messaggi di stato */}
        <Snackbar 
          open={showStatus} 
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          autoHideDuration={3000}
          onClose={() => setShowStatus(false)}
          sx={{ 
            top: '80px',
            '& .MuiPaper-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              borderRadius: 2
            }
          }}
        >
          <Alert 
            severity="info" 
            variant="filled"
            sx={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}
          >
            {statusMessage}
          </Alert>
        </Snackbar>
        
        {/* Stile CSS per animazioni */}
        <style jsx="true">{`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
            }
            70% {
              box-shadow: 0 0 0 15px rgba(76, 175, 80, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
            }
          }
        `}</style>
      </Box>
    </Slide>
  );
};

export default ScannerOverlay;