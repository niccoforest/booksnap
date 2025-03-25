// client/src/pages/RecognitionTest.js (versione aggiornata)
import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Divider, 
  Grid,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  LinearProgress,
  Card,
  Switch,
  Chip
} from '@mui/material';
import { 
  Camera as CameraIcon,
  FileUpload as UploadIcon,
  Visibility as ViewIcon,
  AutoFixHigh as AutoIcon,
  Storage as DatabaseIcon,
  Cached as CachedIcon
} from '@mui/icons-material';
import BookCard from '../components/book/BookCard';
import smartScannerService from '../services/smartScanner.service';
import simpleOcrService from '../services/simpleOcr.service';
import recognitionCacheService from '../services/recognitionCache.service';
import decisionEngineService from '../services/decisionEngine.service';
import coverRecognitionService from '../services/coverRecognitionService';

const RecognitionTest = () => {
  const [mode, setMode] = useState('auto'); // 'auto', 'cover', 'spine', 'multi'
  const [language, setLanguage] = useState('ita'); // 'eng', 'ita', ecc.
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
const [recognizedBook, setRecognizedBook] = useState(null);
  
  const fileInputRef = useRef(null);
  
  // Ottieni lingue disponibili
  const availableLanguages = simpleOcrService.getAvailableLanguages();
  
// Aggiungi stato per le alternative
const [alternativeResults, setAlternativeResults] = useState([]);

// Nel gestore di riconoscimento
const handleScanResult = (result) => {
  if (result.success) {
    setRecognizedBook(result.book);
    
    // Se ci sono alternative, salvale
    if (result.book.alternatives) {
      setAlternativeResults(result.book.alternatives);
    }
    
    // Se è a bassa confidenza, mostra un messaggio
    if (result.book.lowConfidence) {
      setStatusMessage("Libro riconosciuto con bassa confidenza. Controlla se è corretto.");
    }
  } else {
    // Se c'è un servizio da interrogare per le alternative
    // Potremmo avere un endpoint specifico
    if (coverRecognitionService.alternativeResults?.length > 0) {
      setAlternativeResults(coverRecognitionService.alternativeResults.slice(0, 3));
      setStatusMessage("Non siamo sicuri al 100%. Potrebbe essere uno di questi:");
    } else {
      setError("Nessun libro riconosciuto");
    }
  }
};


  // Carica un'immagine da file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setError(null);
    setDebug(null);
    setResults(null);
    setProgress(0);
    setProgressMessage('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
    };
    reader.onerror = () => {
      setError('Errore durante la lettura del file');
    };
    reader.readAsDataURL(file);
  };
  
  // Trigger del file input
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };
  
  // Esegui il riconoscimento
  const runRecognition = async () => {
    if (!image) {
      setError('Nessuna immagine selezionata');
      return;
    }
    
    setLoading(true);
    setError(null);
    setDebug(null);
    setResults(null);
    setProgress(10);
    setProgressMessage('Avvio riconoscimento...');
    
    try {
      // Utilizza il nuovo SmartScanner con progress callback
      const scanResult = await smartScannerService.scan(
        image, 
        mode, 
        language,
        (progressUpdate) => {
          if (progressUpdate.progress) {
            setProgress(progressUpdate.progress);
          }
          if (progressUpdate.message) {
            setProgressMessage(progressUpdate.message);
          }
        }
      );
      
      // Debug dell'output del sistema di decisione
      const decisionInfo = decisionEngineService.getLastAnalysis();
      
      // Mostra debug
      setDebug({
        scanResult,
        decisionInfo,
        cacheStats: {
          ...recognitionCacheService.getStats(),
          // Aggiungi queste informazioni
          isEnabled: recognitionCacheService.enabled,
          cacheSize: Object.keys(recognitionCacheService.cache).length,
          // Se hai accesso alle alternative, mostrale
          alternativeMatches: recognitionCacheService.alternativeMatches ? 
            recognitionCacheService.alternativeMatches.length : 0
        },
        scannerStats: smartScannerService.getStats()
      });
      
      // Gestisci i risultati con la nuova funzione
      handleScanResult(scanResult);
      
      // Processa risultati (mantieni questo codice per compatibilità)
      if (scanResult.success) {
        if (scanResult.books && scanResult.books.length > 0) {
          // Multilibro
          setResults(scanResult.books);
        } else if (scanResult.book) {
          // Libro singolo
          setResults([scanResult.book]);
        }
      } else {
        setError(scanResult.message || 'Nessun libro riconosciuto');
      }
    } catch (err) {
      console.error('Errore durante il riconoscimento:', err);
      setError(err.message || 'Errore durante il riconoscimento');
      setDebug({
        error: err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };
  
  // Svuota la cache di riconoscimento
  const clearCache = () => {
    recognitionCacheService.clearCache();
    setDebug({
      ...debug,
      cacheStats: recognitionCacheService.getStats()
    });
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Test Smart Scanner
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">Modalità di riconoscimento</FormLabel>
          <RadioGroup
            row
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <FormControlLabel value="auto" control={<Radio />} label="Auto (Smart)" />
            <FormControlLabel value="cover" control={<Radio />} label="Copertina" />
            <FormControlLabel value="spine" control={<Radio />} label="Costa" />
            <FormControlLabel value="multi" control={<Radio />} label="Scaffale" />
          </RadioGroup>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel id="language-select-label">Lingua OCR</InputLabel>
          <Select
            labelId="language-select-label"
            id="language-select"
            value={language}
            label="Lingua OCR"
            onChange={(e) => setLanguage(e.target.value)}
          >
            {Object.entries(availableLanguages).map(([code, name]) => (
              <MenuItem key={code} value={code}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={triggerFileInput}
          >
            Carica immagine
          </Button>
          <Button
            variant="contained"
            startIcon={<CameraIcon />}
            disabled
          >
            Usa fotocamera
          </Button>

          <Button
  variant="outlined"
  startIcon={<DatabaseIcon />}
  onClick={() => {
    // Assicurati che la cache sia abilitata
    recognitionCacheService.setEnabled(true);
    // Esegui il pre-popolamento
    recognitionCacheService.prePopulateCache();
  }}
  disabled={loading}
>
  Pre-popola cache
</Button>

<FormControlLabel
  control={
    <Switch
      checked={recognitionCacheService.enabled}
      onChange={(e) => recognitionCacheService.setEnabled(e.target.checked)}
      color="primary"
    />
  }
  label="Cache abilitata"
/>

          <Button
            variant="outlined"
            startIcon={<CachedIcon />}
            onClick={clearCache}
          >
            Svuota cache
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
        </Box>
        {statusMessage && !error && (
  <Alert severity="info" sx={{ mt: 2 }}>
    {statusMessage}
  </Alert>
)}
        {alternativeResults.length > 0 && (
  <Box>
    <Typography variant="subtitle1">
      Altri possibili libri:
    </Typography>
    {alternativeResults.map((book, index) => (
      <Card key={index} sx={{ mb: 1, cursor: 'pointer' }} onClick={() => setRecognizedBook(book)}>
        <Box sx={{ display: 'flex', p: 1 }}>
          {book.coverImage && (
            <img 
              src={book.coverImage} 
              alt={book.title} 
              style={{ width: 50, height: 75, objectFit: 'contain' }}
            />
          )}
          <Box sx={{ ml: 2 }}>
            <Typography variant="subtitle2">{book.title}</Typography>
            <Typography variant="body2" color="text.secondary">{book.author}</Typography>
          </Box>
        </Box>
      </Card>
    ))}
  </Box>
)}

        {image && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1" gutterBottom>
              Immagine caricata:
            </Typography>
            <Box
              component="img"
              src={image}
              alt="Immagine caricata"
              sx={{ 
                maxWidth: '100%', 
                maxHeight: '300px',
                borderRadius: 1,
                border: '1px solid #ddd'
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={runRecognition}
              disabled={loading}
              sx={{ mt: 2 }}
              startIcon={loading ? undefined : <AutoIcon />}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                  {progressMessage}
                </>
              ) : (
                'Esegui riconoscimento intelligente'
              )}
            </Button>
            
            {loading && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {progressMessage}
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
      
      {results && results.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Risultati del riconoscimento:
            </Typography>
            {debug?.scanResult?.method && (
              <Chip 
                label={`Metodo: ${debug.scanResult.method}`} 
                color={debug.scanResult.method === 'cache' ? 'success' : 'primary'}
                size="small"
              />
            )}
          </Box>
          
          <Grid container spacing={2}>
            {results.map((book, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <BookCard
                  book={book}
                  variant="grid"
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {debug && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <ViewIcon sx={{ mr: 1 }} />
            Informazioni di debug
          </Typography>
          
          {/* Cache Stats */}
          {debug.cacheStats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Statistiche Cache:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`Entries: ${debug.cacheStats.totalEntries}`} 
                    size="small" 
                    sx={{ m: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`Hit rate: ${(debug.cacheStats.hitRate * 100).toFixed(1)}%`} 
                    size="small" 
                    color="success"
                    sx={{ m: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`Hits: ${debug.cacheStats.hits}`} 
                    size="small" 
                    sx={{ m: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`Misses: ${debug.cacheStats.misses}`} 
                    size="small" 
                    sx={{ m: 0.5 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Decision Engine Info */}
          {debug.decisionInfo && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Decision Engine:
              </Typography>
              <Chip 
                label={`Decisione: ${debug.decisionInfo.decision || 'nessuna'}`} 
                size="small" 
                color="primary"
                sx={{ m: 0.5 }}
              />
              <Chip 
                label={`Confidenza: ${debug.decisionInfo.confidence ? (debug.decisionInfo.confidence * 100).toFixed(1) + '%' : 'N/A'}`} 
                size="small" 
                sx={{ m: 0.5 }}
              />
            </Box>
          )}
          
          {/* Scanner Stats */}
          {debug.scannerStats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Statistiche Scanner:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`Scansioni: ${debug.scannerStats.totalScans}`} 
                    size="small" 
                    sx={{ m: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`Successo: ${debug.scannerStats.successRate}`} 
                    size="small" 
                    color="success"
                    sx={{ m: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`OK: ${debug.scannerStats.successfulScans}`} 
                    size="small" 
                    sx={{ m: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Chip 
                    label={`KO: ${debug.scannerStats.failedScans}`} 
                    size="small" 
                    sx={{ m: 0.5 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Detailed Debug Data */}
          <Box 
            sx={{ 
              bgcolor: '#f5f5f5', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              maxHeight: '300px',
              overflow: 'auto'
            }}
          >
            <pre>{JSON.stringify(debug, null, 2)}</pre>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default RecognitionTest;