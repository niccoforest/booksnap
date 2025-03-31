// client/src/pages/AdminCache.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Storage as DatabaseIcon,
  DeleteSweep as ClearIcon,
  TableChart as TableIcon
} from '@mui/icons-material';
import apiService from '../services/api.service';
import recognitionCacheService from '../services/recognitionCache.service';

const CacheAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [prepopulateLoading, setPrepopulateLoading] = useState(false);

  // Carica statistiche
  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get('/recognition-cache/statistics');
      
      // Gestione più robusta della risposta
      if (response && response.data) {
        // Verifica se la risposta ha la struttura attesa
        if (response.data.success) {
          setStats(response.data.statistics);
        } else if (response.data.statistics) {
          // Se non c'è success ma ci sono statistiche, usale comunque
          setStats(response.data.statistics);
        } else if (response.data.totalEntries !== undefined) {
          // Se la risposta è la statistica stessa (non incapsulata in statistics)
          setStats(response.data);
        } else {
          setError('Formato risposta non valido');
        }
      } else {
        setError('Risposta vuota dal server');
      }
    } catch (err) {
      console.error('Errore nel caricamento delle statistiche:', err);
      setError(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Pre-popola la cache
  const handlePrepopulate = async () => {
    setPrepopulateLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await recognitionCacheService.prePopulateCache();
      
      if (result) {
        setSuccess('Richiesta di pre-popolamento inviata con successo. Il processo verrà eseguito in background.');
        
        // Aggiungi un ritardo prima di ricaricare le statistiche per dare tempo al server di iniziare
        setTimeout(() => {
          loadStats();
        }, 3000);
      } else {
        setError('Il pre-popolamento è stato avviato ma potrebbe non completarsi correttamente. Controlla i log del server.');
      }
    } catch (err) {
      console.error('Errore nel pre-popolamento:', err);
      setError(`Errore: ${err.message}`);
    } finally {
      setPrepopulateLoading(false);
    }
  };

  // Carica statistiche all'avvio
  useEffect(() => {
    loadStats();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Gestione Cache di Riconoscimento
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadStats}
          disabled={loading}
        >
          Aggiorna statistiche
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<DatabaseIcon />}
          onClick={handlePrepopulate}
          disabled={prepopulateLoading}
        >
          {prepopulateLoading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
              Pre-popolamento in corso...
            </>
          ) : (
            'Pre-popola cache'
          )}
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : stats ? (
        <>
          {/* Panoramica delle statistiche */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Totale Entry
                  </Typography>
                  <Typography variant="h3">
                    {stats.totalEntries}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {stats.bySource && stats.bySource.map((source) => (
              <Grid item xs={12} sm={6} md={3} key={source._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {source._id || 'Sconosciuta'}
                    </Typography>
                    <Typography variant="h4">
                      {source.count}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* Entry più utilizzate */}
          {stats.mostUsedEntries && stats.mostUsedEntries.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Entry Più Utilizzate
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Libro</TableCell>
                      <TableCell>Utilizzata</TableCell>
                      <TableCell>Confidenza</TableCell>
                      <TableCell>Parole Chiave</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.mostUsedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.book}</TableCell>
                        <TableCell>{entry.usageCount} volte</TableCell>
                        <TableCell>{Math.round(entry.confidence * 100)}%</TableCell>
                        <TableCell>
                          {entry.keywords && entry.keywords.slice(0, 5).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      ) : (
        <Typography>
          Nessuna statistica disponibile.
        </Typography>
      )}
    </Box>
  );
};

export default CacheAdmin;