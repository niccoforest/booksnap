// client/src/pages/RecognitionTest.js
import React, { useState, useRef, useCallback, useReducer, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Divider, Grid, CircularProgress,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Alert, MenuItem, Select, InputLabel, LinearProgress, Card,
  CardContent, Switch, Chip, Tabs, Tab, Stepper, Step, StepLabel,
  StepContent, Accordion, AccordionSummary, AccordionDetails,
  TextField, Tooltip, IconButton
} from '@mui/material';
import { 
  Camera as CameraIcon, FileUpload as UploadIcon, Visibility as ViewIcon,
  AutoFixHigh as AutoIcon, Storage as DatabaseIcon, Cached as CachedIcon,
  ExpandMore as ExpandMoreIcon, Compare as CompareIcon, BugReport as BugIcon,
  Save as SaveIcon, TextFields as TextFieldsIcon, Timeline as TimelineIcon,
  Info as InfoIcon, Feedback as FeedbackIcon
} from '@mui/icons-material';
import BookCard from '../components/book/BookCard';
import BookFeedbackDialog from '../components/common/BookFeedbackDialog';
import smartScannerService from '../services/smartScanner.service';
import simpleOcrService from '../services/simpleOcr.service';
import recognitionCacheService from '../services/recognitionCache.service';
import decisionEngineService from '../services/decisionEngine.service';
import coverRecognitionService from '../services/coverRecognitionService';
import googleVisionService from '../services/googleVision.service';
import llmTextService from '../services/llmTextService';
import geminiVisionService from '../services/geminiVisionService';
;



// Reducer per gestire lo stato complesso
const initialState = {
  mode: 'auto',
  language: 'ita',
  loading: false,
  image: null,
  results: null,
  error: null,
  debug: null,
  progress: 0,
  progressMessage: '',
  statusMessage: '',
  recognizedBook: null,
  extractedText: '',
  alternativeResults: [],
  processSteps: [],
  comparisons: [],
  activeComparison: null,
  useVision: false,
  llmEnabled: false,
  llmProvider: 'gemini',
  llmApiKey: '',
  llmResults: null,
  visionAvailable: false
};

function recognitionReducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_IMAGE':
      return { ...state, image: action.payload, results: null, error: null, debug: null, progress: 0, progressMessage: '', extractedText: '' };
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_DEBUG':
      return { ...state, debug: action.payload };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'SET_PROGRESS_MESSAGE':
      return { ...state, progressMessage: action.payload };
    case 'SET_STATUS_MESSAGE':
      return { ...state, statusMessage: action.payload };
    case 'SET_RECOGNIZED_BOOK':
      return { ...state, recognizedBook: action.payload };
    case 'SET_LLM_ENABLED':
      return { ...state, llmEnabled: action.payload };
    case 'SET_LLM_PROVIDER':
      return { ...state, llmProvider: action.payload };
    case 'SET_LLM_API_KEY':
      return { ...state, llmApiKey: action.payload };
    case 'SET_LLM_RESULTS':
      return { ...state, llmResults: action.payload };
    case 'SET_EXTRACTED_TEXT':
      return { ...state, extractedText: action.payload };
    case 'SET_USE_VISION':
      return { ...state, useVision: action.payload };
    case 'SET_VISION_AVAILABLE':
      return { ...state, visionAvailable: action.payload };
    case 'SET_GEMINI_VISION_ENABLED':
      return { ...state, geminiVisionEnabled: action.payload };
    case 'SET_GEMINI_VISION_API_KEY':
      return { ...state, geminiVisionApiKey: action.payload };
    case 'SET_ALTERNATIVE_RESULTS':
      return { ...state, alternativeResults: action.payload };
    case 'ADD_PROCESS_STEP':
      return { 
        ...state, 
        processSteps: [...state.processSteps, { 
          id: state.processSteps.length, 
          timestamp: new Date().toISOString(),
          ...action.payload 
        }]
      };
    case 'CLEAR_PROCESS_STEPS':
      return { ...state, processSteps: [] };
    case 'ADD_COMPARISON':
      return { 
        ...state, 
        comparisons: [...state.comparisons, {
          id: state.comparisons.length,
          timestamp: new Date().toISOString(),
          ...action.payload
        }],
        activeComparison: state.comparisons.length
      };
    case 'SET_ACTIVE_COMPARISON':
      return { ...state, activeComparison: action.payload };
    case 'RESET':
      return { 
        ...initialState,
        mode: state.mode,
        language: state.language
      };
    default:
      return state;
  }
}

// Componente TabPanel per gestire il contenuto dei tab
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`recognition-tabpanel-${index}`}
      aria-labelledby={`recognition-tab-${index}`}
      {...other}
      style={{ paddingTop: '16px' }}
    >
      {value === index && (
        <Box>{children}</Box>
      )}
    </div>
  );
}

const RecognitionTest = () => {
  // Stato principale gestito tramite reducer
  const [state, dispatch] = useReducer(recognitionReducer, initialState);
  const { 
    mode, language, loading, image, results, error, debug, 
    progress, progressMessage, statusMessage, recognizedBook, 
    extractedText, alternativeResults, processSteps
  } = state;
  
  // Stato per i tab
  const [activeTab, setActiveTab] = useState('main');
  
  // Stato per il dialog di feedback
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  
  const fileInputRef = useRef(null);
  
  // Ottieni lingue disponibili
  const availableLanguages = simpleOcrService.getAvailableLanguages();

  // Nel gestore di riconoscimento
  const handleScanResult = useCallback((result) => {
    if (result.success) {
      dispatch({ type: 'SET_RECOGNIZED_BOOK', payload: result.book });
      
      // Se ci sono alternative, salvale
      if (result.book.alternatives) {
        dispatch({ type: 'SET_ALTERNATIVE_RESULTS', payload: result.book.alternatives });
      }
      
      // Se è a bassa confidenza, mostra un messaggio
      if (result.book.lowConfidence) {
        dispatch({ 
          type: 'SET_STATUS_MESSAGE', 
          payload: "Libro riconosciuto con bassa confidenza. Controlla se è corretto." 
        });
      }
      
      // Aggiungi step al processo
      dispatch({
        type: 'ADD_PROCESS_STEP',
        payload: {
          name: 'Riconoscimento completato',
          description: `Libro riconosciuto: "${result.book.title}" di ${result.book.author}`,
          status: 'success'
        }
      });
    } else {
      // Se c'è un servizio da interrogare per le alternative
      if (coverRecognitionService.alternativeResults?.length > 0) {
        dispatch({ 
          type: 'SET_ALTERNATIVE_RESULTS', 
          payload: coverRecognitionService.alternativeResults.slice(0, 3) 
        });
        dispatch({ 
          type: 'SET_STATUS_MESSAGE', 
          payload: "Non siamo sicuri al 100%. Potrebbe essere uno di questi:" 
        });
        
        // Aggiungi step al processo
        dispatch({
          type: 'ADD_PROCESS_STEP',
          payload: {
            name: 'Riconoscimento parziale',
            description: 'Trovate possibili corrispondenze alternative',
            status: 'warning'
          }
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: "Nessun libro riconosciuto" });
        
        // Aggiungi step al processo
        dispatch({
          type: 'ADD_PROCESS_STEP',
          payload: {
            name: 'Riconoscimento fallito',
            description: result.message || 'Nessun libro riconosciuto',
            status: 'error'
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    async function checkVisionStatus() {
      try {
        const isConfigured = await googleVisionService.checkConfiguration();
        dispatch({ type: 'SET_VISION_AVAILABLE', payload: isConfigured });
      } catch (err) {
        console.error('Errore nel controllo stato Vision API:', err);
        dispatch({ type: 'SET_VISION_AVAILABLE', payload: false });
      }
    }
    
    checkVisionStatus();
  }, []);

  // Carica un'immagine da file
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_DEBUG', payload: null });
    dispatch({ type: 'SET_RESULTS', payload: null });
    dispatch({ type: 'SET_PROGRESS', payload: 0 });
    dispatch({ type: 'SET_PROGRESS_MESSAGE', payload: '' });
    dispatch({ type: 'CLEAR_PROCESS_STEPS' });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      dispatch({ type: 'SET_IMAGE', payload: e.target.result });
      
      // Aggiungi step al processo
      dispatch({
        type: 'ADD_PROCESS_STEP',
        payload: {
          name: 'Immagine caricata',
          description: `File: ${file.name} (${Math.round(file.size / 1024)} KB)`,
          status: 'info'
        }
      });
    };
    reader.onerror = () => {
      dispatch({ type: 'SET_ERROR', payload: 'Errore durante la lettura del file' });
    };
    reader.readAsDataURL(file);
  }, []);
  
  // Trigger del file input
  const triggerFileInput = useCallback(() => {
    fileInputRef.current.click();
  }, [fileInputRef]);
  
  // Esegui il riconoscimento
  const runRecognition = useCallback(async () => {
    if (!image) {
      dispatch({ type: 'SET_ERROR', payload: 'Nessuna immagine selezionata' });
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_DEBUG', payload: null });
    dispatch({ type: 'SET_RESULTS', payload: null });
    dispatch({ type: 'SET_PROGRESS', payload: 10 });
    dispatch({ type: 'SET_PROGRESS_MESSAGE', payload: 'Avvio riconoscimento...' });
    dispatch({ type: 'SET_EXTRACTED_TEXT', payload: '' });
    dispatch({ type: 'CLEAR_PROCESS_STEPS' });
    
    // Aggiungi step iniziale al processo
    dispatch({
      type: 'ADD_PROCESS_STEP',
      payload: {
        name: 'Avvio riconoscimento',
        description: `Modalità: ${mode}, Lingua: ${language}`,
        status: 'info'
      }
    });
    
    try {
      // Estrai il testo OCR
      dispatch({
        type: 'ADD_PROCESS_STEP',
        payload: {
          name: 'Estrazione testo OCR',
          description: 'Analisi del testo nell\'immagine...',
          status: 'processing'
        }
      });
      
      const ocrResult = await simpleOcrService.recognizeText(image, language);
      
      // Salva il testo OCR estratto nello stato
      dispatch({ type: 'SET_EXTRACTED_TEXT', payload: ocrResult });
      
      // Aggiorna lo step OCR
      dispatch({
        type: 'ADD_PROCESS_STEP',
        payload: {
          name: 'Testo OCR estratto',
          description: `${ocrResult.length} caratteri estratti`,
          status: 'success',
          details: ocrResult
        }
      });
      
      // Utilizza il nuovo SmartScanner con progress callback
      dispatch({
        type: 'ADD_PROCESS_STEP',
        payload: {
          name: 'Avvio SmartScanner',
          description: 'Elaborazione dell\'immagine...',
          status: 'processing'
        }
      });
      
      const scanResult = await smartScannerService.scan(
        image, 
        mode, 
        language,
        (progressUpdate) => {
          // Verifica che progressUpdate abbia la struttura attesa
          console.log("Progress Update:", progressUpdate);
          
          // Gestisci il caso in cui progressUpdate potrebbe non avere tutti i campi attesi
          if (progressUpdate) {
            if (progressUpdate.progress !== undefined) {
              dispatch({ type: 'SET_PROGRESS', payload: progressUpdate.progress });
            }
            if (progressUpdate.message) {
              dispatch({ type: 'SET_PROGRESS_MESSAGE', payload: progressUpdate.message });
              
              // Aggiungi anche come step del processo
              dispatch({
                type: 'ADD_PROCESS_STEP',
                payload: {
                  name: 'Progresso riconoscimento',
                  description: progressUpdate.message,
                  status: 'processing'
                }
              });
            }
            // Se il progressUpdate include il testo OCR, salvalo
            if (progressUpdate.ocrText) {
              dispatch({ type: 'SET_EXTRACTED_TEXT', payload: progressUpdate.ocrText });
            }
          }
        },
        state.useVision 
      );
      
      // Debug dell'output del sistema di decisione
      const decisionInfo = decisionEngineService.getLastAnalysis();
      
      // Aggiungi step per la decisione
      if (decisionInfo && decisionInfo.decision) {
        dispatch({
          type: 'ADD_PROCESS_STEP',
          payload: {
            name: 'Decisione riconoscimento',
            description: `Modalità: ${decisionInfo.decision}, Confidenza: ${(decisionInfo.confidence * 100).toFixed(1)}%`,
            status: 'info'
          }
        });
      }
      
      // Mostra debug
      dispatch({ 
        type: 'SET_DEBUG', 
        payload: {
          scanResult,
          decisionInfo,
          cacheStats: {
            ...recognitionCacheService.getStats(),
            isEnabled: recognitionCacheService.enabled,
            cacheSize: Object.keys(recognitionCacheService.cache || {}).length,
            alternativeMatches: recognitionCacheService.alternativeMatches ? 
              recognitionCacheService.alternativeMatches.length : 0
          },
          scannerStats: smartScannerService.getStats()
        }
      });
      
      // Recupera risultati LLM, se disponibile
      if (state.llmEnabled) {
        const llmResult = llmTextService.getLastResult();
        if (llmResult) {
          dispatch({ type: 'SET_LLM_RESULTS', payload: llmResult });
          
          dispatch({
            type: 'ADD_PROCESS_STEP',
            payload: {
              name: 'Pulizia OCR con LLM',
              description: `Titolo: "${llmResult.title || 'non riconosciuto'}", Autore: "${llmResult.author || 'non riconosciuto'}", Confidenza: ${(llmResult.confidence * 100).toFixed(1)}%`,
              status: llmResult.confidence > 0.7 ? 'success' : llmResult.confidence > 0.4 ? 'warning' : 'error',
              details: llmResult.raw
            }
          });
        }
      }
      
      // Gestisci i risultati con la nuova funzione
      handleScanResult(scanResult);
      
      // Processa risultati
      if (scanResult.success) {
        if (scanResult.books && scanResult.books.length > 0) {
          // Multilibro
          dispatch({ type: 'SET_RESULTS', payload: scanResult.books });
        } else if (scanResult.book) {
          // Libro singolo
          dispatch({ type: 'SET_RESULTS', payload: [scanResult.book] });
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: scanResult.message || 'Nessun libro riconosciuto' });
      }
      
      // Log per debug
      console.log('Risultato scansione:', scanResult);
    } catch (err) {
      console.error('Errore durante il riconoscimento:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Errore durante il riconoscimento' });
      dispatch({ 
        type: 'SET_DEBUG', 
        payload: {
          error: err.message,
          stack: err.stack
        }
      });
      
      // Aggiungi step di errore
      dispatch({
        type: 'ADD_PROCESS_STEP',
        payload: {
          name: 'Errore riconoscimento',
          description: err.message || 'Errore sconosciuto',
          status: 'error'
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_PROGRESS', payload: 100 });
    }
  }, [image, mode, language, handleScanResult, state.useVision, state.llmEnabled]);
  
  // Svuota la cache di riconoscimento
  const clearCache = useCallback(() => {
    recognitionCacheService.clearCache();
    if (debug) {
      dispatch({ 
        type: 'SET_DEBUG', 
        payload: {
          ...debug,
          cacheStats: recognitionCacheService.getStats()
        }
      });
    }
  }, [debug]);
  
  // Salva il test corrente per confronti futuri
  const saveCurrentTest = useCallback(() => {
    if (!image || !results) return;
    
    dispatch({
      type: 'ADD_COMPARISON',
      payload: {
        image,
        mode,
        language,
        results,
        extractedText,
        processSteps: [...processSteps]
      }
    });
    
    // Mostra messaggio
    dispatch({ 
      type: 'SET_STATUS_MESSAGE', 
      payload: 'Test salvato per confronti futuri' 
    });
  }, [image, mode, language, results, extractedText, processSteps]);

  // Gestisce il feedback dell'utente dal dialog
  const handleFeedbackSubmitted = (type, book) => {
    if (type === 'alternative_book' && book) {
      // Aggiorna il libro riconosciuto con quello corretto
      dispatch({ type: 'SET_RECOGNIZED_BOOK', payload: book });
      dispatch({ type: 'SET_RESULTS', payload: [book] });
      dispatch({ 
        type: 'SET_STATUS_MESSAGE', 
        payload: "Grazie! Abbiamo registrato la tua scelta per migliorare i riconoscimenti futuri." 
      });
    } else if (type === 'wrong_book') {
      dispatch({ 
        type: 'SET_STATUS_MESSAGE', 
        payload: "Feedback registrato. Questo libro NON sarà più proposto per questa scansione." 
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Test Smart Scanner
      </Typography>
      
      {/* Tabs di navigazione */}
      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Test Scanner" value="main" icon={<CameraIcon />} iconPosition="start" />
        <Tab label="Processo OCR" value="process" icon={<TimelineIcon />} iconPosition="start" />
        <Tab label="Testo Estratto" value="ocr" icon={<TextFieldsIcon />} iconPosition="start" />
        <Tab label="Debug" value="debug" icon={<BugIcon />} iconPosition="start" />
        <Tab label="Confronto" value="compare" icon={<CompareIcon />} iconPosition="start" />
        <Tab label="OCR + LLM" value="llm" icon={<AutoIcon />} iconPosition="start" />
      </Tabs>
      
      {/* Tab principale */}
      <TabPanel value={activeTab} index="main">
        <Paper sx={{ p: 2, mb: 3 }}>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Modalità di riconoscimento</FormLabel>
            <RadioGroup
              row
              name="mode"
              value={mode}
              onChange={(e) => dispatch({ type: 'SET_MODE', payload: e.target.value })}
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
              onChange={(e) => dispatch({ type: 'SET_LANGUAGE', payload: e.target.value })}
            >
              {Object.entries(availableLanguages).map(([code, name]) => (
                <MenuItem key={code} value={code}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Divider sx={{ my: 2 }} />

          {/* Configurazione Google Vision API */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.useVision}
                  onChange={(e) => dispatch({ type: 'SET_USE_VISION', payload: e.target.checked })}
                  disabled={!state.visionAvailable}
                  color="primary"
                />
              }
              label="Usa Google Vision API"
            />
            {!state.visionAvailable && (
              <Tooltip title="Google Vision API non configurata sul server">
                <IconButton size="small" color="primary">
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
{/* Configurazione Gemini Vision API */}
<Box sx={{ mb: 2 }}>
  <Typography variant="subtitle2" gutterBottom>
    Configurazione Gemini Vision (multimodale)
  </Typography>
  
  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
    <FormControlLabel
      control={
        <Switch
          checked={state.geminiVisionEnabled}
          onChange={(e) => {
            dispatch({ type: 'SET_GEMINI_VISION_ENABLED', payload: e.target.checked });
            geminiVisionService.setEnabled(e.target.checked);
          }}
          color="primary"
        />
      }
      label="Abilita riconoscimento multimodale"
    />
    
    <TextField
      label="API Key Gemini"
      type="password"
      value={state.geminiVisionApiKey}
      onChange={(e) => {
        dispatch({ type: 'SET_GEMINI_VISION_API_KEY', payload: e.target.value });
        geminiVisionService.setApiKey(e.target.value);
      }}
      variant="outlined"
      size="small"
      sx={{ minWidth: 200, flexGrow: 1 }}
      disabled={!state.geminiVisionEnabled}
    />
  </Box>
</Box>
          <Divider sx={{ my: 2 }} />

          {/* Configurazione OCR + LLM */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Configurazione OCR + LLM
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={state.llmEnabled}
                    onChange={(e) => {
                      dispatch({ type: 'SET_LLM_ENABLED', payload: e.target.checked });
                      llmTextService.setEnabled(e.target.checked);
                    }}
                    color="primary"
                  />
                }
                label="Abilita pulizia OCR con LLM"
              />
              
              <FormControl sx={{ minWidth: 150 }} size="small">
                <InputLabel id="llm-provider-label">Provider LLM</InputLabel>
                <Select
                  labelId="llm-provider-label"
                  value={state.llmProvider}
                  label="Provider LLM"
                  onChange={(e) => {
                    dispatch({ type: 'SET_LLM_PROVIDER', payload: e.target.value });
                    llmTextService.setProvider(e.target.value);
                  }}
                  disabled={!state.llmEnabled}
                >
                  <MenuItem value="gemini">Google Gemini</MenuItem>
                  <MenuItem value="openai">OpenAI</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="API Key"
                type="password"
                value={state.llmApiKey}
                onChange={(e) => {
                  dispatch({ type: 'SET_LLM_API_KEY', payload: e.target.value });
                  llmTextService.setApiKey(e.target.value);
                }}
                variant="outlined"
                size="small"
                sx={{ minWidth: 200, flexGrow: 1 }}
                disabled={!state.llmEnabled}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          {/* Pulsanti azione */}
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
                <Card key={index} sx={{ mb: 1, cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_RECOGNIZED_BOOK', payload: book })}>
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

        {/* Risultati del riconoscimento */}
        {results && results.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Risultato riconosciuto:
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
              <Grid item xs={12} sm={6} md={4}>
                <BookCard
                  book={results[0]}
                  variant="grid"
                  actions={
                    <Box mt={1}>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => {
                          // Correggi il riconoscimento indicando che questo libro è sbagliato
                          if (extractedText) {
                            recognitionCacheService.learnFromUserFeedback(
                              extractedText, null, results[0]
                            );
                            dispatch({ 
                              type: 'SET_STATUS_MESSAGE', 
                              payload: "Feedback registrato. Questo libro NON sarà più proposto per questa scansione." 
                            });
                          }
                        }}
                      >
                        Non è questo libro
                      </Button>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
            
            {/* Mostra alternative suggerite */}
            {alternativeResults && alternativeResults.length > 0 && (
              <Box mt={3}>
                <Typography variant="subtitle1">Altri possibili libri:</Typography>
                <Grid container spacing={2} mt={1}>
                  {alternativeResults.map((book, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <BookCard
                        book={book}
                        variant="grid"
                        actions={
                          <Box mt={1}>
                            <Button
                              size="small"
                              color="primary"
                              variant="outlined"
                              onClick={() => {
                                // Apprendi che questo libro è corretto per il testo OCR estratto
                                if (extractedText) {
                                  recognitionCacheService.learnFromUserFeedback(
                                    extractedText, book, results[0]
                                  );
                                  dispatch({ type: 'SET_RECOGNIZED_BOOK', payload: book });
                                  dispatch({ type: 'SET_RESULTS', payload: [book] });
                                  dispatch({ 
                                    type: 'SET_STATUS_MESSAGE', 
                                    payload: "Grazie! Abbiamo registrato la tua scelta per migliorare i riconoscimenti futuri." 
                                  });
                                }
                              }}
                            >
                              È questo il libro!
                            </Button>
                          </Box>
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            
            {/* Pulsante Feedback avanzato */}
            {results[0] && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setFeedbackDialogOpen(true)}
                  startIcon={<FeedbackIcon />}
                >
                  Fornisci feedback sul riconoscimento
                </Button>
              </Box>
            )}
          </Paper>
        )}
        
        {/* Dialog Feedback */}
        <BookFeedbackDialog
          open={feedbackDialogOpen}
          onClose={() => setFeedbackDialogOpen(false)}
          recognizedBook={results && results.length > 0 ? results[0] : null}
          alternativeBooks={alternativeResults}
          ocrText={extractedText}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
        
        {/* Pulsante per salvare il test corrente */}
        {results && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={saveCurrentTest}
              disabled={!image || !results}
            >
              Salva test per confronti futuri
            </Button>
          </Box>
        )}
      </TabPanel>
      
      {/* Tab processo OCR */}
      <TabPanel value={activeTab} index="process">
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Processo di Riconoscimento
          </Typography>
          
          {processSteps.length === 0 ? (
            <Alert severity="info">
              Nessun processo di riconoscimento eseguito. Carica un'immagine e avvia il riconoscimento per visualizzare i dettagli del processo.
            </Alert>
          ) : (
            <Stepper orientation="vertical" sx={{ mt: 2 }}>
              {processSteps.map((step) => (
                <Step key={step.id} active={true} completed={step.status === 'success'}>
                  <StepLabel 
                    error={step.status === 'error'} 
                    optional={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </Typography>
                    }
                  >
                    {step.name}
                  </StepLabel>
                  <StepContent>
                    <Typography>{step.description}</Typography>
                    {step.details && (
                      <Accordion sx={{ mt: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">Dettagli</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box 
                            sx={{ 
                              bgcolor: '#f5f5f5', 
                              p: 1, 
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              maxHeight: '200px',
                              overflow: 'auto'
                            }}
                          >
                            <pre>{step.details}</pre>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          )}
        </Paper>
      </TabPanel>
      
      {/* Tab testo OCR */}
      <TabPanel value={activeTab} index="ocr">
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Testo OCR Estratto
          </Typography>
          
          {!extractedText ? (
            <Alert severity="info">
              Nessun testo OCR estratto. Carica un'immagine e avvia il riconoscimento per visualizzare il testo estratto.
            </Alert>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1">
                  {extractedText.length} caratteri estratti
                </Typography>
                <Chip 
                  label={`Lingua: ${language}`} 
                  size="small" 
                  color="primary"
                />
              </Box>
              
              <TextField
                fullWidth
                multiline
                variant="outlined"
                value={extractedText}
                InputProps={{
                  readOnly: true,
                  style: { fontFamily: 'monospace', fontSize: '0.875rem' }
                }}
                minRows={10}
                maxRows={20}
              />
              
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Analisi del testo
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Possibili titoli:
                    </Typography>
                    {extractedText.split('\n')
                      .filter(line => line.length > 10)
                      .slice(0, 3)
                      .map((line, index) => (
                        <Chip 
                          key={index}
                          label={line.length > 40 ? line.substring(0, 40) + '...' : line} 
                          size="small" 
                          sx={{ m: 0.5 }}
                        />
                      ))}
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Possibili autori:
                    </Typography>
                    {extractedText.split('\n')
                      .filter(line => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line))
                      .slice(0, 3)
                      .map((line, index) => (
                        <Chip 
                          key={index}
                          label={line} 
                          size="small" 
                          sx={{ m: 0.5 }}
                        />
                      ))}
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </Paper>
      </TabPanel>
      
      {/* Tab debug */}
      <TabPanel value={activeTab} index="debug">
        {debug ? (
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
        ) : (
          <Alert severity="info">
            Nessuna informazione di debug disponibile. Esegui un riconoscimento per visualizzare i dati di debug.
          </Alert>
        )}
      </TabPanel>
      
      {/* Tab LLM results */}
      <TabPanel value={activeTab} index="llm">
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Risultati Pulizia OCR con LLM
          </Typography>
          
          {!state.llmEnabled ? (
            <Alert severity="info">
              La pulizia OCR con LLM è disabilitata. Abilitala nella scheda principale per utilizzare questa funzionalità.
            </Alert>
          ) : !state.llmResults ? (
            <Alert severity="info">
              Nessun risultato LLM disponibile. Esegui un riconoscimento per visualizzare i risultati della pulizia OCR con LLM.
            </Alert>
          ) : (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Testo OCR originale
                    </Typography>
                    <Box 
                      sx={{ 
                        bgcolor: '#f5f5f5', 
                        p: 2, 
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}
                    >
                      <pre>{state.extractedText}</pre>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Risultati estrazione LLM
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {state.llmResults.title || 'Nessun titolo estratto'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {state.llmResults.author || 'Nessun autore estratto'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip 
                        label={`Confidenza: ${state.llmResults.confidence ? `${(state.llmResults.confidence * 100).toFixed(0)}%` : 'N/A'}`}
                        size="small"
                        color={state.llmResults.confidence > 0.7 ? 'success' : state.llmResults.confidence > 0.4 ? 'warning' : 'error'}
                      />
                      <Chip 
                        label={`Provider: ${state.llmProvider}`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    
                    {state.llmResults.raw && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                          Risposta completa del modello:
                        </Typography>
                        <Box 
                          sx={{ 
                            bgcolor: '#f5f5f5', 
                            p: 1, 
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            maxHeight: '150px',
                            overflow: 'auto'
                          }}
                        >
                          <pre>{state.llmResults.raw}</pre>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>
              
              {state.recognizedBook && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Libro riconosciuto con questi dati:
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      {state.recognizedBook.coverImage && (
                        <img 
                          src={state.recognizedBook.coverImage} 
                          alt={state.recognizedBook.title}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '200px',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto'
                          }}
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6">
                          {state.recognizedBook.title}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          {state.recognizedBook.author}
                        </Typography>
                        
                        <Box sx={{ mt: 2 }}>
                          <Chip 
                            label={`Metodo: ${state.recognizedBook.recognitionSource || 'standard'}`}
                            size="small"
                            color={state.recognizedBook.recognitionSource === 'ocr_llm' ? 'success' : 'primary'}
                            sx={{ mr: 1 }}
                          />
                          {state.recognizedBook.llmConfidence && (
                            <Chip 
                              label={`Confidenza LLM: ${(state.recognizedBook.llmConfidence * 100).toFixed(0)}%`}
                              size="small"
                              color={state.recognizedBook.llmConfidence > 0.7 ? 'success' : 'warning'}
                            />
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </>
          )}
        </Paper>
      </TabPanel>
      
      {/* Tab confronto */}
      <TabPanel value={activeTab} index="compare">
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Confronto Test
          </Typography>
          
          {state.comparisons.length === 0 ? (
            <Alert severity="info">
              Nessun test salvato per il confronto. Esegui un riconoscimento e salva il test per confrontarlo con altri.
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Test salvati:
              </Typography>
              
              <Grid container spacing={2}>
                {state.comparisons.map((comparison, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: state.activeComparison === index ? '2px solid #1976d2' : 'none'
                      }}
                      onClick={() => dispatch({ type: 'SET_ACTIVE_COMPARISON', payload: index })}
                    >
                      <CardContent>
                        <Typography variant="subtitle2">
                          Test #{index + 1} - {new Date(comparison.timestamp).toLocaleTimeString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Modalità: {comparison.mode}, Lingua: {comparison.language}
                        </Typography>
                        {comparison.results && comparison.results[0] && (
                          <Typography variant="body2" noWrap>
                            {comparison.results[0].title}
                          </Typography>
                        )}
                      </CardContent>
                      {comparison.image && (
                        <Box sx={{ p: 1, textAlign: 'center' }}>
                          <img 
                            src={comparison.image} 
                            alt={`Test ${index + 1}`}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100px',
                              objectFit: 'contain'
                            }}
                          />
                        </Box>
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {state.activeComparison !== null && state.comparisons[state.activeComparison] && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Dettagli Test #{state.activeComparison + 1}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Configurazione
                        </Typography>
                        <Typography variant="body2">
                          <strong>Modalità:</strong> {state.comparisons[state.activeComparison].mode}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Lingua:</strong> {state.comparisons[state.activeComparison].language}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Data:</strong> {new Date(state.comparisons[state.activeComparison].timestamp).toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Risultati
                        </Typography>
                        {state.comparisons[state.activeComparison].results && 
                         state.comparisons[state.activeComparison].results[0] && (
                          <>
                            <Typography variant="body2">
                              <strong>Titolo:</strong> {state.comparisons[state.activeComparison].results[0].title}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Autore:</strong> {state.comparisons[state.activeComparison].results[0].author}
                            </Typography>
                          </>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </>
          )}
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default RecognitionTest;