// client/src/services/smartScanner.service.js
import decisionEngineService from './decisionEngine.service';
import coverRecognitionService from './coverRecognitionService';
import googleBooksService from './googleBooks.service';
import recognitionCacheService from './recognitionCache.service';
import barcodeService from './barcode.service';
import simpleOcrService from './simpleOcr.service';

class SmartScannerService {
  constructor() {
    this.lastScan = null;
    this.scanStats = {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      recognitionMethods: {}
    };
    this.progressCallback = null;
    this.failedAttempts = {}; // Traccia tentativi falliti per immagine
  }
  
   /**
   * Notifica il progresso al callback se definito
   * @param {number} progress - Percentuale di avanzamento (0-100)
   * @param {string} message - Messaggio di stato
   * @private
   */
   _notifyProgress(progress, message) {
    if (typeof this.progressCallback === 'function') {
      this.progressCallback({ progress, message });
    }
  }
/**
 * Esegue una scansione intelligente di un'immagine
 * @param {string} imageData - Immagine in formato base64
 * @param {string} mode - Modalità di scansione ('auto', 'isbn', 'cover', 'spine', 'multi')
 * @param {string} language - Lingua per OCR
 * @param {Function} progressCallback - Callback per aggiornamenti progresso
 * @param {boolean} useVision - Usa Google Vision API, se disponibile
 * @returns {Promise<Object>} - Risultato della scansione
 */
/**
 * Esegue una scansione intelligente di un'immagine
 */
async scan(imageData, mode = 'auto', language = 'eng', progressCallback = null, useVision = false) {
  if (!imageData) {
    return { success: false, message: 'Nessuna immagine fornita' };
  }
  
  this.totalScans++;
  
  try {
    // Inizializza il callback di progresso se fornito
    this.progressCallback = progressCallback || null;
    
    // Notifica progresso iniziale
    this._notifyProgress(10, 'Inizializzazione scansione...');
    
    // Determina la modalità di scansione se in auto
    let effectiveMode = mode;
    if (mode === 'auto') {
      this._notifyProgress(20, 'Analisi contenuto immagine...');
      const decisionResult = await decisionEngineService.analyzeImage(imageData);
      effectiveMode = decisionResult.type;
      
      console.log(`SmartScanner: modalità rilevata "${effectiveMode}" con confidenza ${decisionResult.confidence}`);
    }
    
    // Notifica la modalità (usa la funzione _getModeName invece di _getModeLabel)
    this._notifyProgress(30, `Modalità ${effectiveMode} (${this._getModeName(effectiveMode)})`);
    
    // Esegue il riconoscimento appropriato in base alla modalità
    let result;
    
    switch (effectiveMode) {
      case 'isbn':
        result = await this._processIsbn(imageData, language);
        break;
        
      case 'cover':
        result = await this._processCover(imageData, language, useVision);
        break;
        
      case 'spine':
        result = await this._processSpine(imageData, language, useVision);
        break;
        
      case 'multi':
        result = await this._processMultiBook(imageData, language, useVision);
        break;
        
      default:
        // Fallback a cover
        console.log("Modalità non riconosciuta, fallback a cover");
        result = await this._processCover(imageData, language, useVision);
    }
    
    // Aggiorna statistiche
    if (result.success) {
      this.successfulScans++;
    } else {
      this.failedScans++;
    }
    
    // Aggiunge informazioni sulla modalità rilevata
    result.detectedMode = effectiveMode;
    result.confidence = mode === 'auto' ? decisionEngineService.getLastAnalysis().confidence : 1.0;
    
    // Notifica completamento
    this._notifyProgress(100, result.success ? 'Riconoscimento completato con successo!' : 'Riconoscimento fallito');
    
    return result;
    
  } catch (error) {
    console.error("Errore nella scansione:", error);
    this.failedScans++;
    return {
      success: false,
      message: `Errore durante la scansione: ${error.message}`,
      error: error.message
    };
  } finally {
    // Reset callback
    this.progressCallback = null;
  }
}

// Aggiorna anche il metodo _processCover
async _processCover(imageData, language, useVision = false) {
  this._notifyProgress(40, 'Riconoscimento copertina...');
  
  try {
    // Riconosce la copertina con il servizio dedicato
    const book = await coverRecognitionService.recognizeBookCover(imageData, language, useVision);
    
    if (book) {
      this._notifyProgress(90, 'Libro riconosciuto!');
      return {
        success: true,
        book,
        message: book.recognitionSource === 'google_vision' 
          ? 'Libro riconosciuto dalla copertina con Google Vision API'
          : 'Libro riconosciuto dalla copertina'
      };
    } else {
      this._notifyProgress(90, 'Nessun libro riconosciuto');
      return {
        success: false,
        message: 'Impossibile riconoscere il libro dalla copertina'
      };
    }
  } catch (error) {
    console.error("Errore nel processamento copertina:", error);
    return {
      success: false,
      message: `Errore nel riconoscimento copertina: ${error.message}`
    };
  }
}

// Fai lo stesso aggiornamento per _processSpine
async _processSpine(imageData, language, useVision = false) {
  this._notifyProgress(40, 'Riconoscimento costa...');
  
  try {
    // Per ora, utilizziamo lo stesso servizio delle copertine
    const book = await coverRecognitionService.recognizeBookCover(imageData, language, useVision);
    
    if (book) {
      this._notifyProgress(90, 'Libro riconosciuto!');
      return {
        success: true,
        book,
        message: 'Libro riconosciuto dalla costa'
      };
    } else {
      this._notifyProgress(90, 'Nessun libro riconosciuto');
      return {
        success: false,
        message: 'Impossibile riconoscere il libro dalla costa'
      };
    }
  } catch (error) {
    console.error("Errore nel processamento costa:", error);
    return {
      success: false,
      message: `Errore nel riconoscimento costa: ${error.message}`
    };
  }
}

// E anche per _processMultiBook
async _processMultiBook(imageData, language, useVision = false) {
  this._notifyProgress(40, 'Riconoscimento multi-libro...');
  
  // Per ora, implementazione di base che usa lo stesso servizio delle copertine
  try {
    const book = await coverRecognitionService.recognizeBookCover(imageData, language, useVision);
    
    if (book) {
      this._notifyProgress(90, 'Libro riconosciuto!');
      return {
        success: true,
        book,
        message: 'Libro principale riconosciuto dallo scaffale'
      };
    } else {
      this._notifyProgress(90, 'Nessun libro riconosciuto');
      return {
        success: false,
        message: 'Impossibile riconoscere libri dallo scaffale'
      };
    }
  } catch (error) {
    console.error("Errore nel processamento multi-libro:", error);
    return {
      success: false,
      message: `Errore nel riconoscimento multi-libro: ${error.message}`
    };
  }
}
  
  _generateSimpleHash(imageData) {
    // Estrai un sottoinsieme di dati per creare un "hash" approssimativo
    // Nota: questa non è una funzione di hash crittografica, solo un identificatore per tracciare tentativi simili
    try {
      const sample = imageData.substr(500, 500); // Prendi una porzione dell'immagine
      let hash = 0;
      for (let i = 0; i < sample.length; i++) {
        hash = ((hash << 5) - hash) + sample.charCodeAt(i);
        hash |= 0; // Converti a integer a 32 bit
      }
      return Math.abs(hash).toString(16); // Converti a stringa esadecimale
    } catch (e) {
      // In caso di errore, genera un ID casuale
      return Date.now().toString(16);
    }
  }
  
  // Metodo per il fallback a Google Vision API
  async _processWithGoogleVision(imageData, progressCallback) {
    try {
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: 'Analisi avanzata dell\'immagine in corso...',
          progress: 60
        });
      }
      
      // Estrai la parte base64 dell'immagine (rimuovi il prefisso data:image/jpeg;base64,)
      const base64Image = imageData.split(',')[1];
      
      // Prepara la richiesta per l'API Vision
      const visionRequest = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              },
              {
                type: 'LOGO_DETECTION',
                maxResults: 5
              }
            ]
          }
        ]
      };
      
      // Chiama l'API Vision tramite il backend
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(visionRequest)
      });
      
      if (!response.ok) {
        throw new Error(`Errore API Vision: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: 'Processamento risultati riconoscimento avanzato...',
          progress: 80
        });
      }
      
      // Estrai il testo riconosciuto
      const textAnnotations = data.responses[0]?.textAnnotations;
      if (!textAnnotations || textAnnotations.length === 0) {
        return {
          success: false,
          message: 'Nessun testo riconosciuto dall\'API Vision',
          method: 'vision'
        };
      }
      
      // Il primo elemento contiene il testo completo
      const extractedText = textAnnotations[0].description;
      
      // Cerca libro in base al testo estratto
      // Prima controlla nella cache locale
      const bookFromCache = recognitionCacheService.findByOcrText(extractedText);
      
      if (bookFromCache) {
        return {
          success: true,
          book: bookFromCache,
          method: 'vision+cache',
          message: 'Libro riconosciuto tramite API Vision e cache'
        };
      }
      
      // Se non è in cache, cerca con Google Books
      const searchTerms = this._extractSearchTerms(extractedText);
      const book = await this._searchBookWithTerms(searchTerms);
      
      if (book) {
        // Aggiungi alla cache per uso futuro
        recognitionCacheService.addToCache(extractedText, book);
        
        return {
          success: true,
          book,
          method: 'vision',
          message: 'Libro riconosciuto tramite API Vision'
        };
      }
      
      return {
        success: false,
        message: 'Nessun libro trovato con il testo riconosciuto dall\'API Vision',
        method: 'vision'
      };
    } catch (error) {
      console.error('Errore nell\'elaborazione con Google Vision:', error);
      return {
        success: false,
        message: 'Errore nell\'elaborazione con Google Vision: ' + error.message,
        method: 'vision',
        error: error.message
      };
    }
  }

// Metodo per estrarre termini di ricerca dal testo OCR
_extractSearchTerms(text) {
  // Dividi in righe
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Estrai i termini più rilevanti
  let title = '';
  let author = '';
  
  // Cerca possibili autori (primo terzo dell'estratto)
  const possibleAuthorLines = lines.slice(0, Math.max(1, Math.floor(lines.length / 3)));
  for (const line of possibleAuthorLines) {
    if (/^[A-Z][a-z]+ [A-Z]\.? ?[A-Z][a-z]+$/.test(line)) {
      author = line;
      break;
    }
  }
  
  // Cerca possibili titoli (parte centrale, spesso in maiuscolo o più lungo)
  const possibleTitleLines = lines.slice(Math.floor(lines.length / 3), Math.floor(lines.length * 2/3));
  for (const line of possibleTitleLines) {
    if (line === line.toUpperCase() && line.length > 3) {
      title = line;
      break;
    }
  }
  
  // Se non abbiamo trovato un titolo, prendi la linea più lunga
  if (!title) {
    title = lines.sort((a, b) => b.length - a.length)[0] || '';
  }
  
  return { title, author, fullText: text };
}

// Metodo per cercare un libro con i termini estratti
async _searchBookWithTerms({ title, author, fullText }) {
  try {
    let query = '';
    
    if (title && author) {
      query = `${title} ${author}`;
    } else if (title) {
      query = title;
    } else if (author) {
      query = author;
    } else {
      // Se non abbiamo titolo né autore, prendi le prime parole del testo
      query = fullText.split(' ').slice(0, 6).join(' ');
    }
    
    // Cerca con Google Books API
    const results = await googleBooksService.searchBooks(query, 5);
    
    if (results && results.length > 0) {
      return results[0]; // Ritorna il primo risultato
    }
    
    return null;
  } catch (error) {
    console.error('Errore nella ricerca libro con termini:', error);
    return null;
  }
}

  /**
   * Determina la modalità ottimale per la scansione
   * @private
   */
  async _determineMode(imageData, scanResult, progressCallback) {
    // Aggiorna il progresso
    if (progressCallback) {
      progressCallback({
        status: 'processing',
        message: 'Analisi del contenuto...',
        progress: 20
      });
    }
    
    try {
      // Utilizza il decision engine per determinare la modalità
      const decision = await decisionEngineService.analyzeImage(imageData);
      
      scanResult.detectedMode = decision.type;
      scanResult.confidence = decision.confidence;
      
      console.log(`SmartScanner: modalità rilevata "${decision.type}" con confidenza ${decision.confidence.toFixed(2)}`);
      
      // Se il decision engine ha rilevato un ISBN, estraiamolo
      if (decision.type === 'isbn' && decision.isbnData) {
        scanResult.isbn = decision.isbnData.isbn;
      }
    } catch (error) {
      console.error('Errore nel decision engine:', error);
      // In caso di errore, usa il fallback alla modalità cover
      scanResult.detectedMode = 'cover';
      scanResult.confidence = 0.3;
    }
  }
  
  /**
   * Processa una scansione ISBN
   * @private
   */
  async _processIsbn(scanResult, progressCallback, usVision = false) {
    try {
      if (!scanResult.isbn) {
        // Se non abbiamo un ISBN dal decision engine, prova a trovarlo direttamente
        if (progressCallback) {
          progressCallback({
            status: 'processing',
            message: 'Rilevamento codice ISBN...',
            progress: 50
          });
        }
        
        try {
          scanResult.isbn = await barcodeService.decodeFromImage(scanResult.image);
        } catch (error) {
          console.error('Errore nella decodifica barcode:', error);
        }
      }
      
      if (!scanResult.isbn) {
        scanResult.success = false;
        scanResult.message = 'Nessun ISBN rilevato nell\'immagine';
        return;
      }
      
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: 'ISBN rilevato, recupero informazioni libro...',
          progress: 70
        });
      }
      
      // Recupera i dati del libro tramite ISBN
      const book = await googleBooksService.getBookByIsbn(scanResult.isbn);
      
      if (book) {
        scanResult.success = true;
        scanResult.book = book;
        scanResult.method = 'isbn';
        scanResult.message = 'Libro riconosciuto tramite ISBN';
        
        // Aggiorna il progresso
        if (progressCallback) {
          progressCallback({
            status: 'success',
            message: 'Libro riconosciuto con successo!',
            progress: 100,
            book
          });
        }
      } else {
        scanResult.success = false;
        scanResult.message = 'ISBN rilevato ma nessun libro trovato';
        
        // Aggiorna il progresso
        if (progressCallback) {
          progressCallback({
            status: 'error',
            message: 'ISBN rilevato ma nessun libro trovato',
            progress: 100
          });
        }
      }
    } catch (error) {
      console.error('Errore nel processamento ISBN:', error);
      scanResult.success = false;
      scanResult.message = 'Errore nel processamento ISBN: ' + error.message;
      
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'error',
          message: 'Errore nel processamento ISBN',
          progress: 100
        });
      }
    }
  }
  

  
  /**
   * Processa una scansione multi-libro
   * @private
   */
  async _processMulti(imageData, scanResult, language, progressCallback) {
    try {
      // Per ora implementiamo solo un segnaposto
      // Un'implementazione reale dovrebbe utilizzare multiBookRecognitionService
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: 'Questa funzionalità sarà implementata prossimamente',
          progress: 50
        });
      }
      
      scanResult.success = false;
      scanResult.message = 'La funzionalità multi-libro sarà implementata prossimamente';
      
      if (progressCallback) {
        progressCallback({
          status: 'error',
          message: 'Funzionalità non ancora implementata',
          progress: 100
        });
      }
    } catch (error) {
      console.error('Errore nel processamento multi-libro:', error);
      scanResult.success = false;
      scanResult.message = 'Errore nel processamento multi-libro: ' + error.message;
      
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'error',
          message: 'Errore nel processamento multi-libro',
          progress: 100
        });
      }
    }
  }
  

  
  /**
   * Ottiene il nome user-friendly della modalità di scansione
   * @private
   */
  _getModeName(mode) {
    switch (mode) {
      case 'cover': return 'copertina';
      case 'spine': return 'costa';
      case 'multi': return 'scaffale';
      case 'isbn': return 'ISBN';
      case 'auto': return 'automatica';
      default: return mode;
    }
  }
  
  /**
   * Ottiene le statistiche di scansione
   */
  getStats() {
    return {
      ...this.scanStats,
      successRate: this.scanStats.totalScans > 0 
        ? (this.scanStats.successfulScans / this.scanStats.totalScans * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }
  
  /**
   * Ottiene l'ultimo risultato di scansione
   */
  getLastScan() {
    return this.lastScan;
  }
}

const smartScannerService = new SmartScannerService();
export default smartScannerService;
