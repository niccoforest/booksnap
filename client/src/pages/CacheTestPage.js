// client/src/pages/CacheTestPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, TextField, CircularProgress, Divider, List, ListItem, ListItemText } from '@mui/material';
import apiService from '../services/api.service';

const CacheTestPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [stats, setStats] = useState(null);
  
  // Carica statistiche all'avvio
  useEffect(() => {
    loadStats();
  }, []);
  
  const loadStats = async () => {
    try {
      const response = await apiService.get('/recognition-cache/statistics');
      if (response.data.success) {
        setStats(response.data.statistics);
      }
    } catch (error) {
      console.error('Errore nel caricamento statistiche:', error);
    }
  };
  
  const handleSearch = async () => {
    if (!ocrText) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiService.post('/recognition-cache/search-with-ocr', {
        ocrText
      });
      
      setResult(response.data);
    } catch (error) {
      console.error('Errore nella ricerca:', error);
      setResult({
        success: false,
        error: error.response?.data?.message || error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrepopulate = async () => {
    try {
      setLoading(true);
      const response = await apiService.post('/recognition-cache/prepopulate');
      alert(`Pre-popolamento avviato: ${response.data.message}`);
    } catch (error) {
      console.error('Errore nel pre-popolamento:', error);
      alert(`Errore: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Test Cache di Riconoscimento</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Cerca Libro con OCR</Typography>
        <Box sx={{ display: 'flex', mb: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Testo OCR"
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Inserisci il testo OCR estratto dalla copertina..."
          />
        </Box>
        <Button 
          variant="contained" 
          onClick={handleSearch}
          disabled={loading || !ocrText}
        >
          {loading ? <CircularProgress size={24} /> : 'Cerca'}
        </Button>
      </Paper>
      
      {result && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Risultato</Typography>
          {result.success ? (
            <Box>
              <Typography><strong>Titolo:</strong> {result.data.title}</Typography>
              <Typography><strong>Autore:</strong> {result.data.author}</Typography>
              <Typography><strong>Metodo:</strong> {result.method}</Typography>
              {result.data.coverImage && (
                <Box sx={{ mt: 2 }}>
                  <img src={result.data.coverImage} alt={result.data.title} style={{ maxHeight: 200 }} />
                </Box>
              )}
              
              {result.alternatives && result.alternatives.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">Alternative:</Typography>
                  <List>
                    {result.alternatives.map((book, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={book.title} secondary={book.author} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          ) : (
            <Typography color="error">{result.message || result.error || 'Errore sconosciuto'}</Typography>
          )}
        </Paper>
      )}
      
      {stats && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Statistiche Cache</Typography>
          <Typography><strong>Totale Entries:</strong> {stats.totalEntries}</Typography>
          
          {stats.bySource && stats.bySource.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography><strong>Per Fonte:</strong></Typography>
              <List dense>
                {stats.bySource.map((source, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={`${source._id}: ${source.count}`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Button
            variant="contained"
            color="secondary"
            onClick={handlePrepopulate}
            disabled={loading}
          >
            Pre-popola Cache
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default CacheTestPage;