// client/src/pages/AddBook.js
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  Divider, 
  useTheme
} from '@mui/material';
import { 
  QrCodeScanner as ScannerIcon,
  Create as CreateIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ScannerOverlay from '../components/scan/ScannerOverlay';

const AddBook = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Funzione per aprire lo scanner
  const handleOpenScanner = () => {
    setScannerOpen(true);
  };
  
  // Funzione per chiudere lo scanner
  const handleCloseScanner = () => {
    setScannerOpen(false);
  };
  
  // Funzione per passare alla modalità manuale
  const handleManualMode = () => {
    setIsManualMode(true);
  };
  
  // Funzione per gestire la cattura dall'overlay scanner
  const handleCapture = (captureData) => {
    console.log('Dati catturati:', captureData);
    setScannerOpen(false);
    // Per ora, simuliamo un fallimento nella scansione per testare il flusso
    setTimeout(() => {
      alert('Non siamo riusciti a identificare il libro. Prova ad inserirlo manualmente.');
      setIsManualMode(true);
    }, 1000);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header semplificato, senza freccia indietro */}
      <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
        {isManualMode ? 'Inserisci libro manualmente' : 'Aggiungi libro'}
      </Typography>
      
      {/* Contenuto principale */}
      {!isManualMode ? (
        // Modalità selezione (scansiona o inserisci manualmente)
        <Stack spacing={3} sx={{ mt: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderColor: theme.palette.primary.light,
              }
            }}
            onClick={handleOpenScanner}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  mr: 2,
                  bgcolor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText,
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ScannerIcon fontSize="large" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Scansiona libro
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Usa la fotocamera per scansionare la copertina, 
                  la costa o il codice ISBN del libro
                </Typography>
              </Box>
            </Box>
          </Paper>
          
          <Divider sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary">
              oppure
            </Typography>
          </Divider>
          
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderColor: theme.palette.primary.light,
              }
            }}
            onClick={handleManualMode}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  mr: 2,
                  bgcolor: 'rgba(0,0,0,0.04)',
                  color: theme.palette.text.primary,
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreateIcon fontSize="large" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Inserisci manualmente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cerca il libro per titolo, autore o ISBN e aggiungilo 
                  alla tua libreria
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Stack>
      ) : (
        // Modalità inserimento manuale (Implementeremo questa in seguito)
        <Box sx={{ mt: 3 }}>
          <Typography variant="body1" gutterBottom>
            Qui implementeremo il form di ricerca e inserimento manuale.
          </Typography>
        </Box>
      )}
      
      {/* Scanner overlay semplificato (solo con il pulsante "Scatta foto") */}
      <ScannerOverlay 
        open={scannerOpen}
        onClose={handleCloseScanner}
        onCapture={handleCapture}
      />
    </Box>
  );
};

export default AddBook;