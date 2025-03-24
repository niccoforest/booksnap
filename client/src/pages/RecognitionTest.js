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
  InputLabel
} from '@mui/material';
import { 
  Camera as CameraIcon,
  FileUpload as UploadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import BookCard from '../components/book/BookCard';
import coverRecognitionService from '../services/coverRecognitionService';
import multiBookRecognitionService from '../services/multiBookRecognitionService';
import isbnService from '../services/isbn.service';
import simpleOcrService from '../services/simpleOcr.service';

const RecognitionTest = () => {
  const [mode, setMode] = useState('cover'); // 'cover', 'multi', 'spine'
  const [language, setLanguage] = useState('ita'); // 'eng', 'ita', ecc.
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  
  const fileInputRef = useRef(null);
  
  // Ottieni lingue disponibili
  const availableLanguages = simpleOcrService.getAvailableLanguages();
  
  // Carica un'immagine da file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setError(null);
    setDebug(null);
    setResults(null);
    
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
    
    try {
        let recognitionResults;
        
        if (mode === 'cover') {
          // Riconoscimento copertina singola
          recognitionResults = await coverRecognitionService.recognizeBookCover(image, language);
          
          if (recognitionResults) {
            setResults(Array.isArray(recognitionResults) ? recognitionResults : [recognitionResults]);
            
            // Output di debug più dettagliato
            const debugInfo = {
                recognitionMethod: mode === 'cover' ? coverRecognitionService.recognitionStatus : 'multi',
                extractedText: mode === 'cover' ? coverRecognitionService.lastExtractedText : 'N/A',
                detectedLanguage: language,
                searchQueries: [], // Sarà popolato dal servizio
                timestamp: new Date().toLocaleTimeString(),
                rawImageData: image.substring(0, 30) + '...' // Solo per debug
              };
              setDebug(debugInfo);
          } else {
            setError('Nessun libro riconosciuto');
          }
        } 
      else if (mode === 'multi') {
        // Riconoscimento scaffale
        recognitionResults = await multiBookRecognitionService.recognizeMultipleBooks(image);
        
        if (recognitionResults && recognitionResults.length > 0) {
          setResults(recognitionResults);
          setDebug({
            segmentedImages: multiBookRecognitionService.getLastSegmentedImages(),
            recognizedCount: recognitionResults.length
          });
        } else {
          setError('Nessun libro riconosciuto nella scansione multipla');
        }
      }
      else if (mode === 'spine') {
        // Test estrazione ISBN dal testo
        const ocrResult = await coverRecognitionService._recognizeViaOCR(image);
        
        if (ocrResult) {
          setResults([ocrResult]);
          
          // Estrai eventuali ISBN dal testo OCR
          const extractedText = coverRecognitionService.lastExtractedText;
          const isbn = isbnService.extractFromText(extractedText);
          
          setDebug({
            extractedText,
            isbn: isbn || 'Nessun ISBN trovato nel testo'
          });
        } else {
          setError('Nessun testo riconosciuto');
        }
      }
    } catch (err) {
        console.error('Errore durante il riconoscimento:', err);
        const errorMessage = err.message || 'Errore sconosciuto durante il riconoscimento';
        const errorStack = err.stack || '';
        
        setError(errorMessage);
        setDebug({
          error: errorMessage,
          stack: errorStack,
          timestamp: new Date().toLocaleTimeString()});
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Test Riconoscimento Libri
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
            <FormControlLabel value="cover" control={<Radio />} label="Copertina" />
            <FormControlLabel value="multi" control={<Radio />} label="Scaffale" />
            <FormControlLabel value="spine" control={<Radio />} label="Costa/OCR" />
          </RadioGroup>
        </FormControl>
        
{/* Selezione lingua OCR */}
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
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
        </Box>
        
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
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                  Riconoscimento in corso...
                </>
              ) : (
                'Esegui riconoscimento'
              )}
            </Button>
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
          <Typography variant="h6" gutterBottom>
            Risultati del riconoscimento:
          </Typography>
          
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
          
          {debug.segmentedImages && debug.segmentedImages.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Immagini segmentate ({debug.segmentedImages.length}):
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {debug.segmentedImages.map((img, index) => (
                  <Box 
                    key={index}
                    component="img"
                    src={img}
                    alt={`Segmento ${index + 1}`}
                    sx={{ 
                      width: '150px',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid #ddd'
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default RecognitionTest;