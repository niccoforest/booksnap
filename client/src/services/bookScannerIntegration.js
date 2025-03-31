// client/src/services/bookScannerIntegration.js
import bookRecognitionService from './bookRecognition.service';
import googleBooksService from './googleBooks.service';
import geminiVisionService from './geminiVisionService';

/**
 * Processa l'immagine scansionata e riconosce i libri
 * @param {string} imageSrc - Immagine in formato base64
 * @param {string} mode - Modalità di scansione ('auto', 'cover', 'multi')
 * @param {Function} setStatusMessage - Funzione per aggiornare il messaggio di stato
 * @param {Function} setIsCapturing - Funzione per aggiornare lo stato di cattura
 * @param {Function} setSuccessMode - Funzione per impostare la modalità successo
 * @param {Function} setRecognizedBook - Funzione per impostare il libro riconosciuto
 * @param {Function} onCapture - Callback di cattura
 */
export const processBookScan = async (
  imageSrc,
  mode,
  setStatusMessage,
  setIsCapturing,
  setSuccessMode,
  setRecognizedBook,
  onCapture
) => {
  try {
    // Determina la modalità effettiva di riconoscimento
    const recognitionMode = mode === 'auto' ? 'cover' : mode;
    
    // 1. Aggiorna stato UI
    setStatusMessage(`Riconoscimento ${recognitionMode === 'multi' ? 'scaffale' : 'copertina'} in corso...`);
    
    // 2. Riconoscimento tramite servizio appropriato
    const recognitionResult = await bookRecognitionService.recognizeBooks(
      imageSrc, 
      recognitionMode
    );
    
    console.log('Risultato riconoscimento:', recognitionResult);
    
    // 3. Gestione risultato in base alla modalità
    if (recognitionMode === 'multi') {
      // Modalità multi-libro (scaffale)
      if (recognitionResult.success && recognitionResult.books && recognitionResult.books.length > 0) {
        setStatusMessage(`Riconosciuti ${recognitionResult.books.length} libri!`);
        setSuccessMode(true);
        
        // Passiamo tutti i libri riconosciuti al callback
        if (onCapture) {
          onCapture({
            mode: 'multi',
            books: recognitionResult.books,
            count: recognitionResult.books.length,
            image: imageSrc
          });
        }
      } else {
        // Nessun libro riconosciuto o errore
        const errorMsg = recognitionResult.error || 'Nessun libro riconosciuto nello scaffale';
        setStatusMessage(errorMsg);
        
        // Passa l'errore al callback
        if (onCapture) {
          onCapture({
            mode: 'multi',
            error: errorMsg,
            image: imageSrc
          });
        }
      }
    } else {
      // Modalità copertina singola
      if (recognitionResult.success && recognitionResult.data) {
        // Libro riconosciuto con successo
        setStatusMessage('Libro riconosciuto con successo!');
        setSuccessMode(true);
        setRecognizedBook(recognitionResult.data);
        
        // Passa il libro riconosciuto al callback
        if (onCapture) {
          onCapture({
            mode: 'cover',
            book: recognitionResult.data,
            alternatives: recognitionResult.alternatives || [],
            confidence: recognitionResult.confidence,
            method: recognitionResult.method,
            image: imageSrc
          });
        }
      } else {
        // Nessun libro riconosciuto o errore
        const errorMsg = recognitionResult.error || 'Impossibile riconoscere questo libro';
        setStatusMessage(errorMsg);
        
        // Se abbiamo dati parziali riconosciuti, possiamo comunque inviarli
        if (recognitionResult.recognizedData) {
          if (onCapture) {
            onCapture({
              mode: 'cover',
              error: errorMsg,
              partialData: recognitionResult.recognizedData,
              image: imageSrc
            });
          }
        } else {
          // Nessun dato parziale
          if (onCapture) {
            onCapture({
              mode: 'cover',
              error: errorMsg,
              image: imageSrc
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Errore durante la scansione:', error);
    setStatusMessage('Si è verificato un errore durante la scansione. Riprova.');
    
    // Passa l'errore al callback
    if (onCapture) {
      onCapture({
        error: error.message,
        image: imageSrc
      });
    }
  } finally {
    // Termina lo stato di cattura
    setIsCapturing(false);
  }
};

/**
 * Processa un'immagine in modalità debug per test
 * @param {string} imageSrc - Immagine in formato base64
 * @param {string} mode - Modalità di scansione
 * @returns {Promise<Object>} - Risultato del riconoscimento
 */
export const processImageForTest = async (imageSrc, mode = 'cover') => {
  try {
    console.log(`Test riconoscimento in modalità ${mode}...`);
    const result = await bookRecognitionService.recognizeBooks(imageSrc, mode);
    return result;
  } catch (error) {
    console.error('Errore nel test di riconoscimento:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Ottiene dati diagnostici per debug
 */
export const getRecognitionDebugInfo = () => {
  return {
    lastRecognitionInfo: bookRecognitionService.getLastRecognitionInfo(),
    geminiEnabled: geminiVisionService.isEnabled(),
    geminiLastResult: geminiVisionService.getLastResult()
  };
};