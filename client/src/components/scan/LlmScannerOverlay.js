import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Slide,
  useTheme,
  alpha,
  CircularProgress,
  Snackbar,
  Fab,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlashlightOn as FlashIcon,
  FlashlightOff as FlashOffIcon,
  LibraryBooks as MultiBookIcon,
  MenuBook as CoverIcon,
  Check as CheckIcon,
  AutoFixHigh as AutoFixHighIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import coverRecognitionService from '../../services/coverRecognitionService';
import multiBookRecognitionService from '../../services/multiBookRecognitionService';
import BookCard from '../book/BookCard';
import BookCover from '../common/BookCover';
import { useLibrary } from '../../contexts/LibraryContext';

// Configurazione Webcam di default
const defaultVideoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment",
};

// Soglia di confidenza per nascondere le alternative
const CONFIDENCE_THRESHOLD_HIDE_ALTERNATIVES = 0.8; // 80%

const LlmScannerOverlay = ({ open, onClose, onCapture, videoConstraints = defaultVideoConstraints }) => {
  const theme = useTheme();
  const webcamRef = useRef(null);

  // Utilizza il hook del contesto
  const { isBookInLibrary, checkBookInLibrary, checkBooksInLibrary } = useLibrary();

  // Stati UI
  const [flashActive, setFlashActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [scanMode, setScanMode] = useState('auto');
  const [selectedBook, setSelectedBook] = useState(null);

  // Stati Dati
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [showResultsView, setShowResultsView] = useState(false);

  // --- EFFETTI ---
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setCapturedImage(null);
      setRecognitionResult(null);
      setIsProcessing(false);
      setShowResultsView(false);
      setSuccessMode(false);
      setIsCameraReady(false);
      setFlashActive(false);
      setStatusMessage('');
      setShowStatus(false);
      setSelectedBook(null);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  // --- FUNZIONI HELPER ---
  const normalizeBookData = useCallback((book) => {
    if (!book) return null;
    const uniqueId = book._id || book.googleBooksId || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return {
      ...book,
      _id: uniqueId,
      googleBooksId: book.googleBooksId || (book._id && !book._id.startsWith('temp_') ? book._id : uniqueId),
      title: book.title || 'Titolo sconosciuto',
      author: book.author || 'Autore sconosciuto',
      coverImage: typeof book.coverImage === 'string' && book.coverImage.startsWith('http') ? book.coverImage : null,
      // Assicura che la confidenza sia un numero, anche se proviene da multi-scan
      confidence: book.confidence !== undefined ? book.confidence : recognitionResult?.confidence // Usa la confidenza generale se non specifica
    };
  }, [recognitionResult?.confidence]); // Dipende da recognitionResult per la confidenza di fallback

  const showSnackbar = (message) => {
    setStatusMessage(message);
    setShowStatus(true);
  };

  // --- GESTORI EVENTI ---
  const toggleFlash = useCallback(async () => {
    if (!webcamRef.current || !webcamRef.current.video || !isCameraReady) return;
    const stream = webcamRef.current.video.srcObject; 
    if (!stream) return;
    const track = stream.getVideoTracks()[0]; 
    if (!track) return;
    try {
      const capabilities = track.getCapabilities();
      if (capabilities.torch) { 
        await track.applyConstraints({ advanced: [{ torch: !flashActive }] }); 
        setFlashActive(!flashActive); 
      }
      else { 
        showSnackbar('Flash non supportato.'); 
      }
    } catch (error) { 
      console.error("Errore flash:", error); 
      showSnackbar('Impossibile controllare il flash.'); 
    }
  }, [flashActive, isCameraReady]);

  const handleUserMedia = useCallback(() => { 
    setIsCameraReady(true); 
  }, []);
  
  const handleCameraError = useCallback((error) => { 
    console.error('Errore camera:', error); 
    showSnackbar('Errore accesso fotocamera.', 'error'); 
    setIsCameraReady(false); 
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!webcamRef.current || !isCameraReady) { 
      showSnackbar('Camera non pronta.'); 
      return; 
    }
    const imageSrc = webcamRef.current.getScreenshot(); 
    if (!imageSrc) { 
      showSnackbar('Impossibile catturare.'); 
      return; 
    }
    setCapturedImage(imageSrc); 
    setIsProcessing(true); 
    showSnackbar('Analisi...'); 
    setRecognitionResult(null); 
    setShowResultsView(false);

    let rawResult;
    try {
      if (scanMode === 'multi') {
        rawResult = await multiBookRecognitionService.recognizeMultipleBooks(imageSrc);
      } else {
        rawResult = await coverRecognitionService.recognizeBookCover(imageSrc);
      }
      console.log(`Risultato raw ${scanMode}:`, rawResult); // DEBUG
    } catch (error) {
      console.error(`Errore riconoscimento ${scanMode}:`, error); 
      showSnackbar(`Errore analisi. Riprova.`, 'error'); 
      setIsProcessing(false); 
      return;
    }

    let normalizedData = null;
    let normalizedAlternatives = [];
    let normalizedBooks = [];
    let success = false;
    let confidence = 0;
    let method = scanMode;

    if (rawResult && rawResult.success) {
      success = true;
      // La confidenza principale viene dal risultato generale (cover) o la calcoliamo per multi
      confidence = rawResult.confidence || 0; // Inizia con la confidenza generale se c'è
      method = rawResult.method || (scanMode === 'multi' ? 'gemini_multi' : 'gemini_cover');

      if (scanMode === 'multi') {
        normalizedBooks = Array.isArray(rawResult.books)
          ? rawResult.books.map(book => normalizeBookData(book)).filter(Boolean) // Normalizza ogni libro in multi
          : [];
        if (normalizedBooks.length === 0) { 
          success = false; 
          showSnackbar('Nessun libro valido trovato.'); 
        }
        else {
          showSnackbar(`Riconosciuti ${normalizedBooks.length} libri.`);
          // Calcola una confidenza media o massima per il risultato multi? Opzionale.
          // confidence = normalizedBooks.reduce((acc, b) => acc + (b.confidence || 0), 0) / normalizedBooks.length; // Media
          confidence = Math.max(...normalizedBooks.map(b => b.confidence || 0)); // Massima
          
          // Verifica quali libri sono già in libreria
          const bookIds = normalizedBooks
            .map(book => book.googleBooksId || book._id)
            .filter(Boolean);
            
          if (bookIds.length > 0) {
            try {
              const libraryStatus = await checkBooksInLibrary(bookIds);
              
              // Aggiorna lo stato dei libri normalizzati con l'informazione
              normalizedBooks = normalizedBooks.map(book => {
                const bookId = book.googleBooksId || book._id;
                return {
                  ...book,
                  isInLibrary: libraryStatus[bookId] === true
                };
              });
            } catch (err) {
              console.error('Errore verifica libri in libreria:', err);
            }
          }
        }
      } else { // cover / auto
        normalizedData = normalizeBookData(rawResult.data); // Normalizza il dato principale
        normalizedAlternatives = Array.isArray(rawResult.alternatives)
          ? rawResult.alternatives.map(normalizeBookData).filter(Boolean) // Normalizza alternative
          : [];
        // La confidenza generale è già in rawResult.confidence per cover/auto
        confidence = rawResult.confidence || 0;

        // Verifica se il libro è già nella libreria
        if (normalizedData) {
          const bookId = normalizedData.googleBooksId || normalizedData._id;
          if (bookId) {
            try {
              const isInLib = await checkBookInLibrary(bookId);
              normalizedData = {
                ...normalizedData,
                isInLibrary: isInLib
              };
            } catch (err) {
              console.error('Errore verifica libro in libreria:', err);
            }
          }
        }
        
        // Verifica anche le alternative
        if (normalizedAlternatives.length > 0) {
          const altIds = normalizedAlternatives
            .map(book => book.googleBooksId || book._id)
            .filter(Boolean);
            
          if (altIds.length > 0) {
            try {
              const altStatus = await checkBooksInLibrary(altIds);
              normalizedAlternatives = normalizedAlternatives.map(book => {
                const altId = book.googleBooksId || book._id;
                return {
                  ...book,
                  isInLibrary: altStatus[altId] === true
                };
              });
            } catch (err) {
              console.error('Errore verifica alternative in libreria:', err);
            }
          }
        }

        if (!normalizedData && normalizedAlternatives.length === 0) { 
          success = false; 
          showSnackbar('Nessun libro riconosciuto.'); 
        }
        else if (normalizedData) { 
          showSnackbar('Libro riconosciuto!'); 
        }
        else { 
          showSnackbar('Libro non chiaro, mostra alternative.'); 
        }
      }
    } else {
      showSnackbar(rawResult?.error || 'Nessun libro riconosciuto.'); 
      success = false;
    }

    setRecognitionResult({
      data: normalizedData,
      alternatives: normalizedAlternatives,
      books: normalizedBooks,
      success: success,
      confidence: confidence, // Usa la confidenza calcolata/ottenuta
      method: method,
    });
    setIsProcessing(false);

    if (success && (normalizedData || normalizedAlternatives.length > 0 || normalizedBooks.length > 0)) {
      setShowResultsView(true);
    } else {
      setShowResultsView(false);
    }
  }, [isCameraReady, scanMode, normalizeBookData, checkBookInLibrary, checkBooksInLibrary]);

  const handleSelectBook = useCallback((selectedBook) => {
    const bookToSend = normalizeBookData(selectedBook); 
    if (!bookToSend) return;
    
    console.log('Libro selezionato:', bookToSend); 
    setSelectedBook(bookToSend);
    setSuccessMode(true);
    
    setTimeout(() => { 
      if (onCapture) { 
        onCapture({ 
          bookData: bookToSend, 
          confidence: bookToSend.confidence || recognitionResult?.confidence || 0, 
          method: recognitionResult?.method || 'selection' 
        }); 
      } 
      if (onClose) onClose(); 
    }, 1200);
  }, [onCapture, onClose, recognitionResult, normalizeBookData]);

  const handleRestartScanning = useCallback(() => {
    setCapturedImage(null); 
    setRecognitionResult(null); 
    setSuccessMode(false); 
    setIsProcessing(false); 
    setShowResultsView(false); 
    setStatusMessage(''); 
    setShowStatus(false);
    setSelectedBook(null);
  }, []);

  const handleScanModeChange = useCallback((event, newMode) => {
    if (newMode !== null) { 
      setScanMode(newMode); 
    }
  }, []);

  // --- RENDERING ---
  const resultData = recognitionResult?.data;
  const alternativeBooks = recognitionResult?.alternatives || [];
  const multiBooks = recognitionResult?.books || [];
  // Determina se mostrare le alternative (solo per cover/auto, se esistono E se la confidenza è bassa)
  const showAlternatives = scanMode !== 'multi' &&
                          alternativeBooks.length > 0 &&
                          (recognitionResult?.confidence ?? 0) < CONFIDENCE_THRESHOLD_HIDE_ALTERNATIVES;

  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit timeout={300}>
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%', 
        zIndex: 1300,
        backgroundColor: 'black',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* ===== Header ===== */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1.5,
          color: 'white',
          bgcolor: 'rgba(0,0,0,0.3)',
          zIndex: 50
        }}>
          <IconButton color="inherit" onClick={onClose} edge="start" aria-label="Chiudi">
            <CloseIcon />
          </IconButton>
          <Typography variant="h6">Scanner</Typography>
          <IconButton 
            color="inherit" 
            onClick={toggleFlash} 
            disabled={!isCameraReady} 
            aria-label="Flash" 
            sx={{ 
              bgcolor: flashActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent', 
              '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.1) } 
            }}
          >
            {flashActive ? <FlashIcon /> : <FlashOffIcon />}
          </IconButton>
        </Box>

        {/* ===== Area Contenuto ===== */}
        <Box sx={{
          flexGrow: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#111',
          overflow: 'hidden'
        }}>
          {/* --- Vista Camera --- */}
          {!showResultsView && !successMode && (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleCameraError}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  visibility: isCameraReady ? 'visible' : 'hidden'
                }}
              />
              
              {/* Overlay guide per la scansione */}
              {isCameraReady && !capturedImage && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {scanMode === 'multi' ? (
                    // Guida per modalità scaffale
                    <Box
                      sx={{
                        width: '80%',
                        height: '70%',
                        border: '2px dashed rgba(255,255,255,0.5)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography 
                        color="white" 
                        variant="body2" 
                        sx={{ 
                          textAlign: 'center',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          px: 2,
                          py: 1,
                          borderRadius: '4px'
                        }}
                      >
                        Inquadra più libri nell'area
                      </Typography>
                    </Box>
                  ) : (
                    // Guida per modalità copertina/auto
                    <Box
                      sx={{
                        width: '65%',
                        height: '80%',
                        maxWidth: 350,
                        maxHeight: 500,
                        border: '2px dashed rgba(255,255,255,0.5)',
                        borderRadius: '8px',
                        aspectRatio: '3/4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography 
                        color="white" 
                        variant="body2" 
                        sx={{ 
                          textAlign: 'center',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          px: 2,
                          py: 1,
                          borderRadius: '4px'
                        }}
                      >
                        Posiziona la copertina qui
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {!isCameraReady && !capturedImage && (
                <Box sx={{
                  position: 'absolute',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0,0,0,0.7)'
                }}>
                  <CircularProgress size={50} />
                  <Typography color="white" sx={{ mt: 2 }}>Attivazione fotocamera...</Typography>
                </Box>
              )}
              {capturedImage && !isProcessing && !showResultsView && (
                <img 
                  src={capturedImage} 
                  alt="Cattura" 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    zIndex: 15, 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain', 
                    backgroundColor: 'rgba(0,0,0,0.5)' 
                  }} 
                />
              )}
            </>
          )}

          {/* --- Overlay Elaborazione --- */}
          {isProcessing && (
            <Box sx={{ 
              position: 'absolute', 
              zIndex: 20, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '100%', 
              height: '100%', 
              backgroundColor: 'rgba(0,0,0,0.8)'
            }}>
              <Box sx={{ position: 'relative' }}>
                <CircularProgress 
                  size={64} 
                  thickness={4}
                  sx={{
                    color: theme.palette.primary.main,
                  }} 
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box 
                    component="img" 
                    src="/logo192.png" 
                    alt="Analyzing" 
                    sx={{ 
                      width: 36, 
                      height: 36,
                      animation: 'pulse 1.5s infinite'
                    }} 
                  />
                </Box>
              </Box>
              <Typography 
                color="white" 
                variant="h6"
                sx={{ 
                  mt: 3,
                  mb: 1,
                  fontWeight: 'medium'
                }}
              >
                {statusMessage || 'Analisi in corso...'}
              </Typography>
              <Typography 
                color="text.secondary" 
                variant="body2"
                align="center"
                sx={{ 
                  maxWidth: '80%',
                  opacity: 0.7
                }}
              >
                {scanMode === 'multi' 
                  ? 'Stiamo analizzando tutti i libri visibili nell\'immagine' 
                  : 'Stiamo analizzando il libro per identificarlo'}
              </Typography>
            </Box>
          )}

          {/* --- Animazione Successo --- */}
          {successMode && (
            <Box 
              sx={{ 
                position: 'absolute', 
                zIndex: 25, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '100%', 
                height: '100%', 
                backgroundColor: 'rgba(0,0,0,0.85)'
              }}
            > 
              <Box 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  backgroundColor: 'success.main', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  animation: 'scale-in 0.5s ease-out, pulse 1.5s infinite 0.5s'
                }}
              > 
                <CheckIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'white',
                    animation: 'spin-in 0.3s ease-out 0.2s both'
                  }} 
                /> 
              </Box> 
              <Typography 
                variant="h5" 
                color="white" 
                sx={{ 
                  mt: 3,
                  fontWeight: 'medium',
                  animation: 'fade-in 0.5s ease-out 0.3s both'
                }}
              >
                {selectedBook?.isInLibrary ? 'Già in libreria!' : 'Libro Selezionato!'}
              </Typography>
              <Typography 
                color="text.secondary" 
                variant="body1" 
                sx={{ 
                  mt: 1,
                  animation: 'fade-in 0.5s ease-out 0.5s both'
                }}
              >
                {selectedBook?.isInLibrary 
                  ? 'Questo libro è già presente nella tua collezione' 
                  : 'Aggiunto alla tua libreria'}
              </Typography>
              
              {/* Miniatura del libro selezionato */}
              {selectedBook && (
                <Box
                  sx={{
                    mt: 3,
                    p: 1,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    maxWidth: '200px',
                    animation: 'fade-in 0.5s ease-out 0.7s both'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    color="white" 
                    align="center" 
                    sx={{ 
                      fontWeight: 'medium',
                      mb: 1, 
                      fontSize: '0.85rem',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {selectedBook.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <BookCover
                      coverImage={selectedBook.coverImage}
                      title={selectedBook.title}
                      size="small"
                      sx={{ width: 60, height: 90 }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* --- Vista Risultati --- */}
          {showResultsView && !isProcessing && !successMode && recognitionResult && (
            <Box sx={{
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              bgcolor: 'rgba(0,0,0,0.92)', 
              zIndex: 30, 
              display: 'flex', 
              flexDirection: 'column',
              p: { xs: 1, sm: 2 }, 
              overflowY: 'auto'
            }}>
              {/* Titolo principale */}
              <Typography 
                variant="h6" 
                color="white" 
                align="center" 
                sx={{ 
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1
                }}
              >
                {scanMode === 'multi' ? (
                  <>
                    <span>
                      {multiBooks.length} {multiBooks.length === 1 ? 'Libro Riconosciuto' : 'Libri Riconosciuti'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Risultato Scansione</span>
                    {recognitionResult.confidence > 0 && (
                      <Chip 
                        label={`${Math.round(recognitionResult.confidence * 100)}%`}
                        size="small"
                        color={
                          recognitionResult.confidence >= 0.8 ? "success" :
                          recognitionResult.confidence >= 0.5 ? "info" : "warning"
                        }
                        sx={{ 
                          height: 22, 
                          fontSize: '0.7rem',
                          fontWeight: 'bold' 
                        }}
                      />
                    )}
                  </>
                )}
              </Typography>

              {/* Risultato Principale (cover/auto) */}
              {scanMode !== 'multi' && resultData && (
                <Box sx={{ mb: showAlternatives ? 3 : 1 }}>
                  <BookCard
                    book={resultData}
                    variant="scan-result"
                    confidence={recognitionResult.confidence}
                    onBookClick={() => handleSelectBook(resultData)}
                    onAddBook={() => {
                      handleSelectBook(resultData);
                    }}
                    isInLibrary={resultData.isInLibrary || false}
                    highlightResult={true}
                  />
                </Box>
              )}

              {/* Risultati Multipli (multi) o Alternative */}
              {(scanMode === 'multi' && multiBooks.length > 0) || showAlternatives ? (
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="overline" 
                    color="rgba(255,255,255,0.7)" 
                    display="block" 
                    align="center" 
                    sx={{ 
                      fontSize: '0.7rem', 
                      mb: 1.5,
                      fontWeight: 'medium'
                    }}
                  >
                    {scanMode === 'multi' ? 'Seleziona un libro dallo scaffale:' : 'Alternative Possibili:'}
                  </Typography>
                  
                  <Box 
                    sx={{ 
                      maxHeight: '60vh',
                      overflowY: 'auto',
                      pr: 1,
                      // Stile scrollbar
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.3)',
                        }
                      }
                    }}
                  >
                    {scanMode === 'multi' 
                      ? multiBooks.map((book, index) => (
                          <BookCard
                            key={book._id || `multi-book-${index}`}
                            book={book}
                            variant="scan-result"
                            confidence={book.confidence || 0}
                            onBookClick={() => handleSelectBook(book)}
                            onAddBook={() => handleSelectBook(book)}
                            isInLibrary={book.isInLibrary || false}
                          />
                        ))
                      : alternativeBooks.map((book, index) => (
                          <BookCard
                            key={book._id || `alt-book-${index}`}
                            book={book}
                            variant="scan-result"
                            confidence={book.confidence || 0}
                            onBookClick={() => handleSelectBook(book)}
                            onAddBook={() => handleSelectBook(book)}
                            isInLibrary={book.isInLibrary || false}
                          />
                        ))
                    }
                    </Box>
                  </Box>
                ) : null}
  
                {/* Messaggio Nessun Risultato Valido */}
                {recognitionResult?.success && !resultData && !showAlternatives && scanMode !== 'multi' && (
                  <Box 
                    sx={{ 
                      my: 4, 
                      p: 3, 
                      borderRadius: '12px', 
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                      textAlign: 'center'
                    }}
                  >
                    <Typography color="warning.light" align="center" variant="body1" gutterBottom>
                      Nessun risultato chiaro
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Prova a migliorare l'inquadratura o le condizioni di illuminazione e riprova.
                    </Typography>
                  </Box>
                )}
                
                {/* Messaggio per multi mode quando non ci sono risultati */}
                {recognitionResult?.success && multiBooks.length === 0 && scanMode === 'multi' && (
                  <Box 
                    sx={{ 
                      my: 4, 
                      p: 3, 
                      borderRadius: '12px', 
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                      textAlign: 'center'
                    }}
                  >
                    <Typography color="warning.light" align="center" variant="body1" gutterBottom>
                      Nessun libro riconosciuto nello scaffale
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Assicurati che i libri siano ben visibili e prova a scattare una nuova foto.
                    </Typography>
                  </Box>
                )}
  
                {/* Pulsanti Azione in fondo */}
                <Box 
                  sx={{ 
                    mt: 'auto', 
                    pt: 2, 
                    display: 'flex', 
                    justifyContent: 'space-around', 
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    gap: 2
                  }}
                >
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    onClick={handleRestartScanning} 
                    startIcon={<CameraIcon />} 
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      flex: 1,
                      borderRadius: '8px'
                    }} 
                  >
                    Nuova Scansione
                  </Button>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    onClick={onClose} 
                    sx={{
                      flex: 1,
                      borderRadius: '8px'
                    }}
                  >
                    Ricerca Manuale
                  </Button>
                </Box>
              </Box>
            )}
          </Box> {/* Fine Area Contenuto */}
  
          {/* ===== Footer (Controlli Principali) ===== */}
          {!showResultsView && !successMode && (
            <Box sx={{ p: { xs: 1, sm: 1.5 }, backgroundColor: '#111', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 50 }}>
              {/* Toggle Modalità */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 1, sm: 1.5 } }}>
                <ToggleButtonGroup 
                  value={scanMode} 
                  exclusive 
                  onChange={handleScanModeChange} 
                  aria-label="Modalità" 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 8, 
                    '& .MuiToggleButtonGroup-grouped': { 
                      border: 0, 
                      color: 'white', 
                      px: { xs: 1, sm: 1.5 }, 
                      '&.Mui-selected': { 
                        bgcolor: theme.palette.primary.main, 
                        '&:hover': { 
                          bgcolor: theme.palette.primary.dark, 
                        } 
                      }, 
                      '&:not(.Mui-selected):hover': { 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                      } 
                    } 
                  }}
                >
                  <ToggleButton value="auto" aria-label="Auto" sx={{ borderRadius: '32px 0 0 32px !important' }}>
                    <AutoFixHighIcon fontSize="small" sx={{ mr: 0.5 }} /> Auto
                  </ToggleButton>
                  <ToggleButton value="cover" aria-label="Copertina">
                    <CoverIcon fontSize="small" sx={{ mr: 0.5 }}/> Copertina
                  </ToggleButton>
                  <ToggleButton value="multi" aria-label="Scaffale" sx={{ borderRadius: '0 32px 32px 0 !important' }}>
                    <MultiBookIcon fontSize="small" sx={{ mr: 0.5 }}/> Scaffale
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              {/* Pulsante Scatto / Azioni */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 64 }}>
                {capturedImage && !isProcessing ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', width: '100%'}}>
                    <Button 
                      variant="outlined" 
                      color="inherit" 
                      onClick={handleRestartScanning} 
                      sx={{ 
                        color: 'white', 
                        borderColor: 'rgba(255,255,255,0.5)' 
                      }} 
                      size="medium"
                    >
                      Riprova
                    </Button>
                    <Button 
                      variant="contained" 
                      color="secondary" 
                      onClick={onClose} 
                      size="medium"
                    >
                      Manuale
                    </Button>
                  </Box>
                ) : (
                  <Fab 
                    color="primary" 
                    disabled={!isCameraReady || isProcessing} 
                    onClick={handleTakePhoto} 
                    aria-label="Scatta" 
                    size="large" 
                    sx={{ width: 64, height: 64 }}
                  >
                    {isProcessing ? <CircularProgress size={28} color="inherit"/> : <CameraIcon fontSize="large" />}
                  </Fab>
                )}
              </Box>
              
              {/* Testo informativo */}
              <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1, height: '1.2em' }}>
                {!capturedImage
                  ? (scanMode === 'auto'
                      ? 'Inquadra libro/scaffale'
                      : scanMode === 'cover'
                        ? 'Inquadra copertina'
                        : 'Inquadra libri')
                  : !isProcessing
                    ? 'Premi Riprova o Manuale.'
                    : ''
                }
              </Typography>
            </Box>
          )} {/* Fine Footer */}
  
          {/* ===== Snackbar ===== */}
          <Snackbar
            open={showStatus && !!statusMessage}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            autoHideDuration={3500}
            onClose={() => setShowStatus(false)}
            message={statusMessage}
            sx={{ bottom: { xs: 90, sm: 20 } }} // Adatta posizione
          />
  
          {/* Stile CSS per animazioni */}
          <style jsx="true">{`
            @keyframes pulse { 
              0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); } 
              70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); } 
              100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); } 
            }
            @keyframes scale-in {
              0% { transform: scale(0); opacity: 0; }
              80% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes spin-in {
              0% { transform: rotate(-180deg); opacity: 0; }
              100% { transform: rotate(0); opacity: 1; }
            }
            @keyframes fade-in {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </Box>
      </Slide>
    );
  };
  
  export default LlmScannerOverlay;