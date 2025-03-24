// client/src/pages/Scan.js - VERSIONE RIVISTA
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button, 
  Alert, 
  Card, 
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  Snackbar
} from '@mui/material';
import { Add as AddIcon, Camera as CameraIcon } from '@mui/icons-material';

import ScannerOverlay from '../components/scan/ScannerOverlay';
import barcodeService from '../services/barcode.service';
import bookService from '../services/book.service';

const Scan = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Apre lo scanner automaticamente all'apertura della pagina
  useEffect(() => {
    // Inizializza il servizio barcode in anticipo
    barcodeService.init().then(initialized => {
      if (initialized) {
        console.log('Scanner barcode inizializzato con successo');
      } else {
        console.warn('Inizializzazione scanner barcode fallita');
        setDebugInfo('Inizializzazione scanner fallita. Prova a ricaricare la pagina.');
      }
    });
    
    // Apre lo scanner
    setScannerOpen(true);
  }, []);
  
  // Gestisce la pulizia delle risorse quando il componente viene smontato
  useEffect(() => {
    return () => {
      barcodeService.destroy();
    };
  }, []);
  
  // Gestisce la cattura dall'overlay scanner
  const handleCapture = async (captureData) => {
    setIsProcessing(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      let isbn;
      
      // Gestione dei diversi tipi di cattura
      if (captureData.type === 'manual') {
        // Inserimento manuale dell'ISBN
        isbn = captureData.isbn;
        setDebugInfo(`ISBN inserito manualmente: ${isbn}`);
      } else if (captureData.type === 'camera') {
        // Se l'ISBN è già stato riconosciuto dopo la foto
        if (captureData.isbn) {
          isbn = captureData.isbn;
          setDebugInfo(`ISBN riconosciuto dalla foto: ${isbn}`);
        } else {
          setError('Nessun ISBN trovato. Usa l\'input manuale.');
          setIsProcessing(false);
          return;
        }
      }
      
      if (!isbn) {
        throw new Error('Nessun codice ISBN fornito');
      }
      
      // Debug per vedere l'ISBN che viene cercato
      console.log('Ricerca libro con ISBN:', isbn);
      setDebugInfo(`Ricerca libro con ISBN: ${isbn}`);
      
      // Cerca il libro con l'ISBN
      const bookData = await bookService.findBookByIsbn(isbn);
      
      // Chiude lo scanner e imposta il risultato
      setScannerOpen(false);
      setScanResult(bookData);
      setDebugInfo(null);
    } catch (err) {
      console.error('Errore durante la scansione:', err);
      setError(err.message || 'Si è verificato un errore durante la scansione');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Aggiunge il libro alla libreria personale
  const handleAddToLibrary = async () => {
    if (!scanResult) return;
    
    try {
      setIsProcessing(true);
      await bookService.addBookToLibrary(scanResult);
      
      // Usa Snackbar invece di alert per un'esperienza migliore
      setDebugInfo('Libro aggiunto alla libreria con successo!');
      
      // Reset dello stato per una nuova scansione
      setScanResult(null);
      setScannerOpen(true);
    } catch (err) {
      console.error('Errore nell\'aggiunta del libro:', err);
      setError('Impossibile aggiungere il libro alla libreria. Riprova più tardi.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Apre lo scanner per una nuova scansione
  const handleNewScan = () => {
    setScanResult(null);
    setError(null);
    setDebugInfo(null);
    setScannerOpen(true);
  };

  return (
    <Box sx={{ p: 2, height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      {/* Area errori */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {/* Debug Info - solo in ambiente di sviluppo */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          onClose={() => setDebugInfo(null)}
        >
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {debugInfo}
          </Typography>
        </Alert>
      )}
      
      {/* Area risultati scansione */}
      {isProcessing ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          flex: 1 
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Elaborazione in corso...
          </Typography>
        </Box>
      ) : scanResult ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h5" gutterBottom>
            Libro riconosciuto
          </Typography>
          
          <Card sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
            <CardMedia
              component="img"
              sx={{ 
                width: { xs: '100%', sm: 140 },
                height: { xs: 200, sm: 200 },
                objectFit: 'contain',
                bgcolor: '#f5f5f5'
              }}
              image={scanResult.coverImage}
              alt={scanResult.title}
            />
            <CardContent sx={{ flex: '1 0 auto' }}>
              <Typography component="h2" variant="h6">
                {scanResult.title}
              </Typography>
              {scanResult.subtitle && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {scanResult.subtitle}
                </Typography>
              )}
              <Typography variant="body1" color="text.primary">
                {Array.isArray(scanResult.authors) 
                  ? scanResult.authors.join(', ') 
                  : scanResult.authors}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {scanResult.publisher} 
                {scanResult.publishedDate && ` (${scanResult.publishedDate.slice(0, 4)})`}
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>ISBN:</strong> {scanResult.isbn}
              </Typography>
              {scanResult.pageCount > 0 && (
                <Typography variant="body2">
                  <strong>Pagine:</strong> {scanResult.pageCount}
                </Typography>
              )}
              {scanResult.categories && scanResult.categories.length > 0 && (
                <Typography variant="body2">
                  <strong>Categorie:</strong> {scanResult.categories.join(', ')}
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {scanResult.description && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Descrizione
              </Typography>
              <Typography variant="body2" sx={{ 
                maxHeight: '200px', 
                overflow: 'auto' 
              }}>
                {scanResult.description.replace(/<[^>]*>?/gm, '')}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ mt: 'auto', display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<CameraIcon />}
              onClick={handleNewScan}
              fullWidth
            >
              Nuova scansione
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddToLibrary}
              fullWidth
            >
              Aggiungi alla libreria
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          flex: 1 
        }}>
          <Typography variant="body1" color="text.secondary" gutterBottom align="center">
            Scansiona un libro per aggiungerlo alla tua libreria
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<CameraIcon />}
            onClick={() => setScannerOpen(true)}
            sx={{ mt: 2 }}
          >
            Apri scanner
          </Button>
        </Box>
      )}
      
      {/* Scanner overlay */}
      <ScannerOverlay 
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCapture={handleCapture}
      />
      
      {/* Feedback Snackbar */}
      <Snackbar
        open={Boolean(debugInfo) && !error && !isProcessing && !scanResult}
        autoHideDuration={6000}
        onClose={() => setDebugInfo(null)}
        message={debugInfo}
      />
    </Box>
  );
};

export default Scan;