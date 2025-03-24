// client/src/components/scan/ScannerOverlay.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  TextField,
  Button, 
  Slide,
  useTheme,
  alpha,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlashlightOn as FlashIcon,
  FlashlightOff as FlashOffIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import barcodeService from '../../services/barcode.service';
import ocrService from '../../services/ocr.service';
import isbnService from '../../services/isbn.service';

const ScannerOverlay = ({ open, onClose, onCapture }) => {
  const theme = useTheme();
  const webcamRef = useRef(null);
  const scanningInterval = useRef(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [manualIsbn, setManualIsbn] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

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
      setIsScanningActive(false);
    }
    
    // Cleanup quando il componente viene smontato
    return () => {
      document.body.style.overflow = 'auto';
      stopScanningLoop();
    };
  }, [open]);

  // Effetto per avviare la scansione automatica quando la camera è pronta
  useEffect(() => {
    if (isCameraReady && open) {
      startScanningLoop();
    } else {
      stopScanningLoop();
    }

    return () => {
      stopScanningLoop();
    };
  }, [isCameraReady, open]);

  const toggleFlash = () => {
    setFlashActive(!flashActive);
    // In futuro qui implementeremo la logica effettiva del flash
  };

  // Avvia il loop di scansione automatica
  const startScanningLoop = () => {
    if (scanningInterval.current) return;
    
    // Reset dei tentativi di scansione
    setScanAttempts(0);
    setIsScanningActive(true);
    
    scanningInterval.current = setInterval(() => {
      if (webcamRef.current && isCameraReady && !isCapturing) {
        performScan();
      }
    }, 1000); // Scansione ogni 2 secondi
    
    setStatusMessage('Ricerca codice ISBN...');
    setShowStatus(true);
  };

  // Ferma il loop di scansione
  const stopScanningLoop = () => {
    if (scanningInterval.current) {
      clearInterval(scanningInterval.current);
      scanningInterval.current = null;
    }
    setIsScanningActive(false);
    setShowStatus(false);
  };

  // Esegue una singola scansione

  const performScan = async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    setScanAttempts(prev => prev + 1);
    
    // Aggiorna il messaggio di stato
    setStatusMessage('Analisi immagine in corso...');
    setShowStatus(true);
    
    try {
      // Cattura l'immagine dalla webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        setIsCapturing(false);
        return;
      }
      
      console.log(`Tentativo di scansione #${scanAttempts}`);
      
      // Feedback visivo durante l'analisi
      setStatusMessage(`Analisi immagine... Tentativo ${scanAttempts}`);
      
      try {
        console.log('Richiamo decodeFromImage...');
        const isbn = await barcodeService.decodeFromImage(imageSrc);
        
        if (isbn) {
          stopScanningLoop();
          setStatusMessage(`ISBN trovato: ${isbn}`);
          
          // Aggiungi un flash di successo
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(76, 175, 80, 0.3)'; // Verde semitrasparente
          overlay.style.zIndex = '9999';
          overlay.style.transition = 'opacity 0.5s';
          document.body.appendChild(overlay);
          
          // Rimuovi l'overlay dopo 0.8 secondi
          setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
              document.body.removeChild(overlay);
            }, 500);
          }, 800);
          
          console.log(`ISBN riconosciuto: ${isbn}, invio al componente padre`);
          
          // Invia l'immagine e l'ISBN al componente padre
          if (onCapture) {
            onCapture({
              type: 'camera',
              image: imageSrc,
              isbn: isbn
            });
          }
          return;
        
        }
      } catch (error) {
        console.log('Barcode non riconosciuto, continuiamo a scansionare...', error);
      }
      
      // Fornisci suggerimenti basati sul numero di tentativi
      if (scanAttempts % 3 === 0) {
        // Ogni 3 tentativi, cambia il suggerimento
        const tips = [
          'Assicurati che ci sia buona illuminazione',
          'Prova ad allontanare un po\' la fotocamera',
          'Inquadra solo il codice a barre',
          'Tieni fermo il libro',
          'Prova un angolo diverso'
        ];
        
        const tipIndex = Math.floor(scanAttempts / 3) % tips.length;
        setStatusMessage(`Suggerimento: ${tips[tipIndex]}`);
      }
      
    } catch (error) {
      console.error('Errore generale nella scansione:', error);
      setStatusMessage('Errore durante la scansione. Riprova.');
    } finally {
      setIsCapturing(false);
    }
  };
// 
const handleManualSubmit = () => {
  if (!manualIsbn || manualIsbn.trim().length < 5) {
    setStatusMessage('Inserisci un ISBN valido');
    setShowStatus(true);
    return;
  }
  
  const formattedIsbn = isbnService.format(manualIsbn.trim());
  
  if (onCapture) {
    onCapture({
      type: 'manual',
      isbn: formattedIsbn
    });
  }
};
  // Gestisce lo scatto manuale della foto
  const handleTakePhoto = () => {
    if (webcamRef.current && isCameraReady) {
      setIsCapturing(true);
      
      // Cattura l'immagine dalla webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
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
          <Typography variant="h6">Scanner ISBN</Typography>
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
    width: '90%',  // Aumentato da 80% a 90%
    height: '30%', // Aumentato da 20% a 30%
    border: '2px solid rgba(255,255,255,0.8)',
    borderRadius: 2,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)'
  }}
>

{/* Angoli per aiutare il posizionamento */}
<Box sx={{
    position: 'absolute',
    top: -5,
    left: -5,
    width: 20,
    height: 20,
    borderTop: '5px solid rgba(255,255,255,0.9)',
    borderLeft: '5px solid rgba(255,255,255,0.9)',
  }} />
  <Box sx={{
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderTop: '5px solid rgba(255,255,255,0.9)',
    borderRight: '5px solid rgba(255,255,255,0.9)',
  }} />
  <Box sx={{
    position: 'absolute',
    bottom: -5,
    left: -5,
    width: 20,
    height: 20,
    borderBottom: '5px solid rgba(255,255,255,0.9)',
    borderLeft: '5px solid rgba(255,255,255,0.9)',
  }} />
  <Box sx={{
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 20,
    height: 20,
    borderBottom: '5px solid rgba(255,255,255,0.9)',
    borderRight: '5px solid rgba(255,255,255,0.9)',
  }} />

{isCameraReady && (
    <Typography 
      variant="body2" 
      color="white" 
      sx={{ 
        bgcolor: 'rgba(0,0,0,0.7)', 
        px: 2, 
        py: 1, 
        borderRadius: 1,
        textAlign: 'center',
        maxWidth: '90%'
      }}
    >
       {isCapturing 
        ? 'Analisi in corso...' 
        : 'Inquadra il codice a barre del libro'}
    </Typography>
  )}
</Box>

          
         {/* Aggiungi più stili CSS per animazioni */}
<style jsx="true">{`
  @keyframes scanLine {
    0% {
      transform: translate(-50%, calc(-50% - 30px));
    }
    50% {
      transform: translate(-50%, calc(-50% + 30px));
    }
    100% {
      transform: translate(-50%, calc(-50% - 30px));
    }
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4), 0 0 0 4000px rgba(0, 0, 0, 0.6);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(255, 255, 255, 0), 0 0 0 4000px rgba(0, 0, 0, 0.6);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 255, 255, 0), 0 0 0 4000px rgba(0, 0, 0, 0.6);
    }
  }
`}</style>
          
          
        </Box>

        {/* Footer con messaggio di guida */}
        <Box
          sx={{
            padding: 2,
            backgroundColor: '#111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography 
            variant="body2" 
            color="white" 
            sx={{ mb: 1, textAlign: 'center' }}
          >
            La scansione è automatica. Puoi anche scattare manualmente una foto.
          </Typography>
          
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
        
        <Box sx={{ mt: 2, width: '100%' }}>
  <Button
    variant="text"
    color="primary"
    onClick={() => setShowManualInput(!showManualInput)}
    sx={{ width: '100%', color: 'white' }}
  >
    {showManualInput ? 'Nascondi input manuale' : 'Inserisci ISBN manualmente'}
  </Button>
  
  {showManualInput && (
    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Inserisci ISBN"
        value={manualIsbn}
        onChange={(e) => setManualIsbn(e.target.value)}
        size="small"
        autoFocus
        sx={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 1
        }}
      />
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleManualSubmit}
      >
        Cerca
      </Button>
    </Box>
  )}
</Box>
{process.env.NODE_ENV === 'development' && (
  <Box sx={{ 
    position: 'absolute', 
    bottom: 70, 
    right: 10, 
    zIndex: 100,
    opacity: 0.7
  }}>
    <Button
      size="small"
      variant="contained"
      color="secondary"
      onClick={() => {
        const debugInfo = {
          webcamReady: isCameraReady,
          scanAttempts,
          flashActive,
          isCapturing,
          dimensions: webcamRef.current ? {
            videoWidth: webcamRef.current.video.videoWidth,
            videoHeight: webcamRef.current.video.videoHeight
          } : null
        };
        console.log('Debug Scanner:', debugInfo);
        alert(JSON.stringify(debugInfo, null, 2));
      }}
    >
      Debug
    </Button>
  </Box>
)}

        {/* Snackbar per messaggi di stato */}
        <Snackbar 
          open={showStatus} 
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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
      </Box>
    </Slide>
  );
};

export default ScannerOverlay;