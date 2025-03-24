// client/src/pages/ScanTest.js
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField,
  Button,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Alert
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import bookService from '../services/book.service';

// NON importare barcode.service.js qui!

const ScanTest = () => {
  const [isbn, setIsbn] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Funzione semplificata per la ricerca manuale
  const handleSearchManual = async () => {
    if (!isbn) return;
    
    setIsProcessing(true);
    setError(null);
    setScanResult(null);
    
    try {
      console.log(`Ricerca libro con ISBN: ${isbn}`);
      const bookData = await bookService.findBookByIsbn(isbn);
      console.log('Libro trovato:', bookData);
      setScanResult(bookData);
    } catch (err) {
      console.error('Errore durante la ricerca:', err);
      setError(err.message || 'Si è verificato un errore durante la ricerca');
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
      alert('Libro aggiunto alla libreria con successo!');
      // Reset dello stato per una nuova ricerca
      setScanResult(null);
      setIsbn('');
    } catch (err) {
      console.error('Errore nell\'aggiunta del libro:', err);
      setError('Impossibile aggiungere il libro alla libreria. Riprova più tardi.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Resetta lo stato
  const handleNewSearch = () => {
    setScanResult(null);
    setError(null);
    setIsbn('');
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Test Ricerca ISBN
      </Typography>
      
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
      
      {/* Area manuale input */}
      {!scanResult && !isProcessing && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Inserisci ISBN manualmente:
          </Typography>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              label="ISBN"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="Inserisci ISBN"
              variant="outlined"
            />
            <Button
              variant="contained"
              onClick={handleSearchManual}
              disabled={isProcessing || !isbn}
              sx={{ ml: 1 }}
              startIcon={<SearchIcon />}
            >
              Cerca
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Prova con l'ISBN: 9788830137998
          </Typography>
        </Paper>
      )}
      
      {/* Area risultati scansione */}
      {isProcessing ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          my: 3
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Elaborazione in corso...
          </Typography>
        </Box>
      ) : scanResult ? (
        <Box sx={{ my: 2 }}>
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
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<SearchIcon />}
              onClick={handleNewSearch}
              fullWidth
            >
              Nuova ricerca
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
      ) : null}
    </Box>
  );
};

export default ScanTest;