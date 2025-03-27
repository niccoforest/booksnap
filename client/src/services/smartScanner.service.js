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
    this.failedAttempts = {}; // Traccia tentativi falliti per immagine
  }
  
  
  /**
   * Scansiona un'immagine e identifica i libri in modo intelligente
   * @param {string} imageData - Immagine in formato base64
   * @param {string} preferredMode - Modalità preferita dall'utente ('auto', 'cover', 'spine', 'multi')
   * @param {string} language - Lingua per OCR
   * @param {function} progressCallback - Callback per aggiornamenti di stato
   * @returns {Promise<Object>} - Risultato della scansione
   */
  async scan(imageData, preferredMode = 'auto', language = 'ita', progressCallback = null) {
    // Genera un hash semplificato dell'immagine per tenerne traccia
    const imageHash = this._generateSimpleHash(imageData);
    
    // Incrementa il contatore di tentativi falliti per questa immagine
    if (!this.failedAttempts[imageHash]) {
      this.failedAttempts[imageHash] = 0;
    }
    
    try {
      // Aggiorna le statistiche
      this.scanStats.totalScans++;
      
      // Inizializza l'oggetto risultato
      const scanResult = {
        success: false,
        image: imageData,
        detectedMode: preferredMode,
        confidence: 0,
        message: '',
        method: ''
      };
      
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: 'Inizializzazione scansione...',
          progress: 10
        });
      }
      
      // Se la modalità è 'auto', determina la modalità ottimale
      if (preferredMode === 'auto') {
        await this._determineMode(imageData, scanResult, progressCallback);
      } else {
        scanResult.detectedMode = preferredMode;
        scanResult.confidence = 1.0; // Modalità scelta dall'utente
      }
      
      console.log(`SmartScanner: modalità ${scanResult.detectedMode} (${this._getModeName(scanResult.detectedMode)})`);
      
      // Processa l'immagine in base alla modalità rilevata
      switch (scanResult.detectedMode) {
        case 'isbn':
          await this._processIsbn(scanResult, progressCallback);
          break;
        case 'cover':
          await this._processCover(imageData, scanResult, language, progressCallback);
          break;
        case 'spine':
          // Per ora trattiamo le coste come copertine
          await this._processCover(imageData, scanResult, language, progressCallback);
          break;
        case 'multi':
          await this._processMulti(imageData, scanResult, language, progressCallback);
          break;
        default:
          // Fallback alla modalità copertina
          await this._processCover(imageData, scanResult, language, progressCallback);
      }
      
      // Se raggiungiamo 3 tentativi falliti, attiva il fallback a Google Vision
      if (!scanResult.success && this.failedAttempts[imageHash] >= 2) { // 2 + 1 = 3 tentativi totali
        console.log(`Attivazione fallback Google Vision dopo ${this.failedAttempts[imageHash] + 1} tentativi`);
        
        if (progressCallback) {
          progressCallback({
            status: 'processing',
            message: 'Attivazione riconoscimento avanzato (Google Vision)...',
            progress: 50
          });
        }
        
        try {
          // Chiama il servizio di fallback
          const visionResult = await this._processWithGoogleVision(imageData, progressCallback);
          
          if (visionResult.success) {
            // Se il fallback ha successo, resetta i tentativi falliti
            delete this.failedAttempts[imageHash];
            
            // Aggiorna le statistiche
            this.scanStats.successfulScans++;
            this.scanStats.recognitionMethods['vision'] = (this.scanStats.recognitionMethods['vision'] || 0) + 1;
            
            // Salva l'ultimo scan e ritorna il risultato
            this.lastScan = visionResult;
            return visionResult;
          }
        } catch (visionError) {
          console.error('Errore nel fallback Google Vision:', visionError);
        }
      }
      
      // Aggiorna le statistiche in base al risultato
      if (scanResult.success) {
        this.scanStats.successfulScans++;
        this.scanStats.recognitionMethods[scanResult.method] = 
          (this.scanStats.recognitionMethods[scanResult.method] || 0) + 1;
        
        // Salva l'ultimo scan
        this.lastScan = scanResult;
        return scanResult;
      } else {
        // Incrementa il contatore di tentativi falliti
        this.failedAttempts[imageHash]++;
        console.log(`Tentativo fallito ${this.failedAttempts[imageHash]} per immagine ${imageHash}`);
        
        // Se dopo molti tentativi ancora fallisce, pulisci per evitare overflow
        if (this.failedAttempts[imageHash] > 5) {
          delete this.failedAttempts[imageHash];
        }
        
        // Aggiorna statistiche e ritorna il risultato fallito
        this.scanStats.failedScans++;
        return {
          success: false,
          message: scanResult.message || 'Libro non riconosciuto. Prova con un\'inquadratura migliore o un\'altra modalità.',
          error: 'recognition_failed'
        };
      }
    } catch (error) {
      console.error('Errore durante la scansione:', error);
      return {
        success: false,
        message: `Errore durante la scansione: ${error.message}`,
        error: 'scan_error'
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
  async _processIsbn(scanResult, progressCallback) {
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
   * Processa una scansione copertina
   * @private
   */
  async _processCover(imageData, scanResult, language, progressCallback) {
    try {
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: 'Riconoscimento copertina...',
          progress: 50
        });
      }
      
      // Utilizza direttamente il servizio di riconoscimento copertina
      const book = await coverRecognitionService.recognizeBookCover(imageData, language);
      
      if (book) {
        scanResult.success = true;
        scanResult.book = book;
        scanResult.method = 'cover';
        scanResult.message = 'Libro riconosciuto dalla copertina';
        
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
        scanResult.message = 'Nessun libro riconosciuto dalla copertina';
        
        // Aggiorna il progresso
        if (progressCallback) {
          progressCallback({
            status: 'error',
            message: 'Nessun libro riconosciuto dalla copertina',
            progress: 100
          });
        }
      }
    } catch (error) {
      console.error('Errore nel processamento copertina:', error);
      scanResult.success = false;
      scanResult.message = 'Errore nel processamento copertina: ' + error.message;
      
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'error',
          message: 'Errore nel processamento copertina',
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
