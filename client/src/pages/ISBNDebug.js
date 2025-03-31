// client/src/pages/ISBNDebug.js
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Divider
} from '@mui/material';
import bookService from '../services/book.service';

const ISBNDebug = () => {
  const [isbn, setIsbn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  const handleSearch = async () => {
    if (!isbn) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      // Test diretto con l'API Google Books
      const bookData = await bookService.findBookByIsbn(isbn);
      setResult(bookData);
    } catch (err) {
      console.error('Errore nella ricerca:', err);
      setError(err.message || 'Errore durante la ricerca del libro');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Debug Ricerca ISBN
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
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
            onClick={handleSearch}
            disabled={loading || !isbn}
            sx={{ ml: 1 }}
          >
            Cerca
          </Button>
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        
        {result && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Risultato:</Typography>
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle1">{result.title}</Typography>
            <Typography variant="body2">
              Autore: {Array.isArray(result.authors) ? result.authors.join(', ') : result.authors}
            </Typography>
            <Typography variant="body2">ISBN: {result.isbn}</Typography>
            
            {result.coverImage && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <img 
                  src={result.coverImage} 
                  alt={result.title}
                  style={{ maxHeight: 200 }}
                />
              </Box>
            )}
            
            <Box sx={{ mt: 2 }}>
  <pre style={{ 
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 2,
    borderRadius: 1
  }}>
    {JSON.stringify(result, null, 2)}
  </pre>
</Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ISBNDebug;