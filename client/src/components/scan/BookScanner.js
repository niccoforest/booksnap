// client/src/components/scan/BookScanner.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Box, CircularProgress, Typography } from '@mui/material';

const BookScanner = ({ id, onCaptureImage, isActive }) => {
  const webcamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Configurazione webcam
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment", // Usa la fotocamera posteriore
  };

  // Funzione per catturare l'immagine
  const captureImage = useCallback(() => {
    if (webcamRef.current && isCameraReady) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc && onCaptureImage) {
        onCaptureImage(imageSrc);
      }
      return imageSrc;
    }
    return null;
  }, [webcamRef, isCameraReady, onCaptureImage]);

  // Esponi la funzione di cattura tramite un metodo pubblico
  useEffect(() => {
    if (webcamRef.current) {
      webcamRef.current.getScreenshot = captureImage;
    }
  }, [captureImage]);

  // Gestisce errori di accesso alla fotocamera
  const handleCameraError = (error) => {
    console.error('Errore accesso fotocamera:', error);
    setHasError(true);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Stato di caricamento */}
      {!isCameraReady && !hasError && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 10
        }}>
          <CircularProgress color="primary" size={60} />
          <Typography variant="body1" color="white" sx={{ mt: 2 }}>
            Attivazione fotocamera...
          </Typography>
        </Box>
      )}
      
      {/* Messaggio di errore fotocamera */}
      {hasError && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 10,
          p: 3
        }}>
          <Typography variant="h6" color="error" gutterBottom textAlign="center">
            Impossibile accedere alla fotocamera
          </Typography>
          <Typography variant="body1" color="white" textAlign="center">
            Verifica di aver concesso i permessi necessari o prova ad aggiungere il libro manualmente.
          </Typography>
        </Box>
      )}
      
      {/* Webcam component */}
      <Webcam
        audio={false}
        ref={webcamRef}
        id={id} // ID per poter ottenere un riferimento diretto
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
    </Box>
  );
};

export default BookScanner;