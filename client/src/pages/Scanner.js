import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraIcon from '@mui/icons-material/Camera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Scanner = () => {
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const [imgSrc, setImgSrc] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  // Configurazione base per webcam (ottimizzata per mobile)
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment" // Usa la fotocamera posteriore sui telefoni
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
    setScanResult(null);
    setError(null);
  };

  const confirmScan = async () => {
    if (!imgSrc) return;

    setIsScanning(true);
    setError(null);

    try {
      // Invia l'immagine (Base64) al backend
      const response = await api.post('/books/scan', {
        imageBase64: imgSrc
      });

      setScanResult(response.data);
    } catch (err) {
      console.error("Errore durante la scansione:", err);
      setError("Non sono riuscito ad analizzare l'immagine. Riprova.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Box sx={{
      height: '100vh',
      bgcolor: '#000',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Header / Navbar */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        width: '100%',
        p: 2,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
      }}>
        <IconButton color="inherit" onClick={() => navigate('/')}>
          <ArrowBackIcon sx={{ color: 'white' }} />
        </IconButton>
        <Typography variant="h6" sx={{ color: 'white', ml: 2, textShadow: '1px 1px 2px black' }}>
          Scansiona Libreria
        </Typography>
      </Box>

      {/* Area Viewport fotocamera o anteprima */}
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        {!imgSrc ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <img src={imgSrc} alt="Anteprima libreria" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Overlay Caricamento */}
        {isScanning && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(0,0,0,0.8)', zIndex: 20,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
          }}>
            <CircularProgress color="primary" size={60} />
            <Typography variant="h6" sx={{ color: 'white', mt: 3, textAlign: 'center', px: 2 }}>
              L'IA sta leggendo i dorsi dei libri...
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa', mt: 1, textAlign: 'center', px: 2 }}>
              Potrebbe richiedere qualche secondo in base al numero di libri.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Controlli Inferiori */}
      <Box sx={{
        height: 120,
        bgcolor: '#000',
        display: 'flex',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        pb: 3 // padding per notch/indicatori bottom
      }}>
        {!imgSrc ? (
          <IconButton
            onClick={capture}
            sx={{
              bgcolor: 'white',
              color: 'black',
              width: 70,
              height: 70,
              '&:hover': { bgcolor: '#ddd' }
            }}
          >
            <CameraIcon fontSize="large" />
          </IconButton>
        ) : (
          <>
            <Button variant="outlined" color="inherit" onClick={retake} disabled={isScanning}>
              Riscattare
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={confirmScan}
              disabled={isScanning}
              startIcon={<AutoAwesomeIcon />}
            >
              Analizza Foto
            </Button>
          </>
        )}
      </Box>

      {/* Dialog Risultati */}
      <Dialog
        open={!!scanResult || !!error}
        onClose={retake}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {error ? 'Errore' : (
            <>
              <CheckCircleIcon color="success" />
              Scansione Completata
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Riconosciuti: {scanResult.recognizedCount} | Nuovi Salvati: {scanResult.savedCount}
              </Typography>

              {scanResult.books && scanResult.books.length > 0 ? (
                <List dense>
                  {scanResult.books.map((book, idx) => (
                    <ListItem key={idx} sx={{ borderBottom: '1px solid #333' }}>
                      <ListItemText
                        primary={book.title}
                        secondary={book.authors ? book.authors.join(', ') : 'Autore ignoto'}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nessun libro rilevato in questa foto.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={retake}>Nuova Foto</Button>
          {!error && (
            <Button variant="contained" onClick={() => navigate('/')}>
              Vai alla Libreria
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Scanner;
