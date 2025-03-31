// client/src/pages/RecognitionTest.js
import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Stack,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  BugReport as DebugIcon
} from '@mui/icons-material';
import BookCard from '../components/book/BookCard';
import ScannerOverlay from '../components/scan/ScannerOverlay';
import { processImageForTest, getRecognitionDebugInfo } from '../services/bookScannerIntegration';
import geminiVisionService from '../services/geminiVisionService';
import recognitionCacheService from '../services/recognitionCache.service';


const RecognitionTest = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState('cover');
  const [language, setLanguage] = useState('ita');
  const [loading, setLoading] = useState(false);
  const [testImage, setTestImage] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);

  
  const fileInputRef = useRef(null);

  // Inizializza con la chiave API dalle variabili d'ambiente
  React.useEffect(() => {
    // Chiave API Gemini hardcoded come soluzione temporanea
    const hardcodedApiKey = 'AIzaSyDQfqO8AdXNeUOYe9NYIalus6HUcA_ftyM'; // Sostituisci con la tua chiave API
    
    // Tenta di leggere dalla variabile d'ambiente, altrimenti usa quella hardcoded
    const envApiKey = process.env.REACT_APP_GEMINI_API_KEY;
    
    // Usa la chiave hardcoded se quella dell'ambiente non è disponibile
    const apiKeyToUse = envApiKey || hardcodedApiKey;
    
    if (apiKeyToUse) {
      setApiKey(apiKeyToUse);
      geminiVisionService.setApiKey(apiKeyToUse);
      console.log('Gemini API configurato con chiave', apiKeyToUse === hardcodedApiKey ? 'hardcoded' : 'da ambiente');
      getCacheStats();
    } else {
      console.warn('Nessuna chiave API disponibile per Gemini');
    }
  }, []);


  // Apre il selettore di file
  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  // Gestisce la selezione di un file
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setTestImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Gestisce l'apertura della fotocamera
  const handleOpenCamera = () => {
    setScannerOpen(true);
  };

  // Gestisce la chiusura della fotocamera
  const handleCloseCamera = () => {
    setScannerOpen(false);
  };

  // Gestisce la cattura dell'immagine dalla fotocamera
  const handleCaptureImage = (captureData) => {
    setScannerOpen(false);
    
    if (captureData.image) {
      setTestImage(captureData.image);
    }
    
    if (captureData.book) {
      setResults({
        success: true,
        data: captureData.book,
        alternatives: captureData.alternatives,
        method: captureData.method
      });
    } else if (captureData.books) {
      setResults({
        success: true,
        books: captureData.books,
        count: captureData.books.length
      });
    }
  };

  // Gestisce il test di riconoscimento
  const handleTestRecognition = async () => {
    if (!testImage) {
      setError('Nessuna immagine selezionata');
      return;
    }
    
    if (!apiKey) {
      setError('API key non impostata');
      geminiVisionService.setApiKey('');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setResults(null);
      
      // Aggiorna la chiave API
      geminiVisionService.setApiKey(apiKey);
      
      // Esegui il test
      const result = await processImageForTest(testImage, mode, language);
      
      console.log('Risultato test:', result);
      setResults(result);
      setTimeout(() => {
        getCacheStats();
      }, 500);
    } catch (err) {
      console.error('Errore nel test:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gestisce il toggle delle impostazioni
  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Ottiene info di debug
  const handleDebugInfo = () => {
    const debugInfo = getRecognitionDebugInfo();
    console.log('Debug info:', debugInfo);
    alert('Informazioni di debug registrate nella console');
  };


  const getCacheStats = async () => {
    try {
      const localStats = recognitionCacheService.getStats();
      const remoteStats = await recognitionCacheService.getRemoteStats();
      
      setCacheStats({
        local: localStats,
        remote: remoteStats
      });
    } catch (error) {
      console.error('Errore nel recupero statistiche cache:', error);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Test Riconoscimento LLM
          </Typography>
          
          <IconButton onClick={handleToggleSettings}>
            <SettingsIcon />
          </IconButton>
        </Box>
        
        {/* Settings panel */}
        {showSettings && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Impostazioni
            </Typography>
            
            <TextField
      label="API Key Gemini"
      variant="outlined"
      fullWidth
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
      type="password"
      size="small"
      margin="normal"
      placeholder="Usando chiave API configurata nell'ambiente"
      helperText={apiKey ? "Chiave API configurata" : "Usando la chiave API predefinita se disponibile"}
    />
            
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Modalità</InputLabel>
                <Select
                  value={mode}
                  label="Modalità"
                  onChange={(e) => setMode(e.target.value)}
                >
                  <MenuItem value="cover">Copertina</MenuItem>
                  <MenuItem value="multi">Scaffale</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Lingua</InputLabel>
                <Select
                  value={language}
                  label="Lingua"
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <MenuItem value="ita">Italiano</MenuItem>
                  <MenuItem value="eng">Inglese</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<DebugIcon />}
                onClick={handleDebugInfo}
              >
                Debug Info
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Selezione immagine */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<CameraIcon />}
            onClick={handleOpenCamera}
            fullWidth
          >
            Fotocamera
          </Button>
          
          <Button
            variant="outlined"
            onClick={handleFileSelect}
            fullWidth
          >
            Seleziona immagine
          </Button>
          
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Stack>
        
        {/* Visualizzazione immagine test */}
        {testImage && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <img 
              src={testImage} 
              alt="Test" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }} 
            />
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleTestRecognition}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} /> : <RefreshIcon />}
              >
                {loading ? 'Analisi in corso...' : 'Analizza immagine'}
              </Button>
            </Box>
          </Box>
        )}
        
        {/* Errore */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Risultati */}
        {results && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 3 }}>
              <Typography variant="subtitle1">Risultati</Typography>
            </Divider>
            
            {results.success ? (
              <>
                {/* Libro singolo */}
                {results.data && (
                  <BookCard
                    book={results.data}
                    variant="detail"
                    showExpandableDescription={true}
                  />
                )}
                
                {/* Scaffale */}
                {results.books && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Libri riconosciuti: {results.count}
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {results.books.map((book, index) => (
                        <Grid item xs={12} sm={6} key={book.googleBooksId || index}>
                          <BookCard
                            book={book}
                            variant="grid"
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                
                {/* Metodo e confidenza */}
                {results.method && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                      <Typography variant="subtitle2">
                        Metodo: {results.method.replace(/_/g, ' ')}
                      </Typography>
                      {results.confidence && (
                        <Typography variant="body2">
                          Confidenza: {Math.round(results.confidence * 100)}%
                        </Typography>
                      )}
                    </Alert>
                  </Box>
                )}
                
                {/* Alternative */}
                {results.alternatives && results.alternatives.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Alternative:
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {results.alternatives.map((book, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <BookCard
                            book={book}
                            variant="grid"
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="warning">
                {results.error || 'Nessun libro riconosciuto'}
              </Alert>
            )}
          </Box>
        )}


{/* Dopo il riquadro dei risultati... */}
{cacheStats && (
  <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
    <Typography variant="h6" gutterBottom>
      Statistiche Cache
    </Typography>
    
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Cache Locale
            </Typography>
            <Typography variant="body2">
              Totale entries: {cacheStats.local.totalEntries}
            </Typography>
            <Typography variant="body2">
              Hit rate: {Math.round(cacheStats.local.hitRate * 100)}%
            </Typography>
            <Typography variant="body2">
              Hits: {cacheStats.local.hits}
            </Typography>
            <Typography variant="body2">
              Misses: {cacheStats.local.misses}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Cache Remota
            </Typography>
            {cacheStats.remote ? (
              <>
                <Typography variant="body2">
                  Totale entries: {cacheStats.remote.totalEntries || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  By source: {cacheStats.remote.bySource ? 
                    cacheStats.remote.bySource.map(s => `${s._id}: ${s.count}`).join(', ') : 
                    'N/A'}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Statistiche remote non disponibili
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
    
    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
      <Button 
        variant="outlined" 
        size="small"
        onClick={getCacheStats}
        startIcon={<RefreshIcon />}
      >
        Aggiorna statistiche
      </Button>
      
      <Button 
        variant="outlined" 
        size="small"
        color="warning"
        onClick={() => {
          recognitionCacheService.clearLocalCache();
          getCacheStats();
        }}
        sx={{ ml: 2 }}
      >
        Pulisci cache locale
      </Button>
    </Box>
  </Paper>
)}

      </Paper>
      
      {/* Info panel */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InfoIcon color="info" sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            Come utilizzare il test
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          Questo strumento permette di testare il riconoscimento LLM per le copertine e gli scaffali di libri.
          Puoi caricare un'immagine o scattarne una con la fotocamera, quindi fare clic su "Analizza immagine".
        </Typography>
        
        <Typography variant="body2">
          Per utilizzare il servizio, è necessaria una chiave API Gemini. Configurala nelle impostazioni.
        </Typography>
      </Paper>
      
      {/* Scanner overlay */}
      <ScannerOverlay
        open={scannerOpen}
        onClose={handleCloseCamera}
        onCapture={handleCaptureImage}
      />
    </Box>
  );
};

export default RecognitionTest;