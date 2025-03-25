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
    try {
      this.scanStats.totalScans++;
      
      // Inizializza il risultato
      const scanResult = {
        success: false,
        mode: preferredMode,
        detectedMode: null,
        book: null,
        books: null,
        method: null,
        confidence: 0,
        message: 'Scansione in corso...',
        image: imageData
      };
      
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: 'Analisi dell\'immagine in corso...',
          progress: 10
        });
      }

      // Prima di tutto, prova con la cache
      if (preferredMode === 'auto' || preferredMode === 'cover') {
        try {
          if (progressCallback) {
            progressCallback({
              status: 'processing',
              message: 'Controllo della cache...',
              progress: 30
            });
          }
    
    // Estrai il testo per cercare nella cache
    const extractedText = await simpleOcrService.recognizeText(imageData, language);
    console.log("SmartScanner: testo estratto per cache:", extractedText);
    console.log("SmartScanner: stato cache enabled =", recognitionCacheService.enabled);
    if (!recognitionCacheService.enabled) {
      console.log("SmartScanner: abilitazione cache");
      recognitionCacheService.setEnabled(true);
    }
    const bookFromCache = recognitionCacheService.findByOcrText(extractedText);


    if (bookFromCache) {
      console.log('Libro trovato nella cache!', bookFromCache.title);
      scanResult.success = true;
      scanResult.book = bookFromCache;
      scanResult.method = 'cache';
      scanResult.message = 'Libro riconosciuto dalla cache';
      
      // Salva le alternative se disponibili
       // Salva le alternative se disponibili
       if (recognitionCacheService.alternativeMatches && 
        recognitionCacheService.alternativeMatches.length > 0) {
      scanResult.alternativeBooks = recognitionCacheService.alternativeMatches;
    }
      
      // Aggiorna il contatore di metodi
      const method = 'cache';
      this.scanStats.recognitionMethods[method] = (this.scanStats.recognitionMethods[method] || 0) + 1;
      
      // Aggiorna statistiche
      this.scanStats.successfulScans++
      
      if (progressCallback) {
        progressCallback({
          status: 'success',
          message: 'Libro riconosciuto dalla cache!',
          progress: 100,
          book: bookFromCache
        });
      }
      
      return scanResult;
    } else {
      console.log("SmartScanner: nessuna corrispondenza trovata in cache");
    }
  } catch (error) {
    console.error('Errore durante l\'uso della cache:', error);
  }
}
      // Se la modalità è 'auto', determina automaticamente la modalità di scansione
      if (preferredMode === 'auto') {
        await this._determineMode(imageData, scanResult, progressCallback);
      } else {
        scanResult.detectedMode = preferredMode;
      }
      
      // Aggiorna il progresso
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          message: `Riconoscimento in modalità ${this._getModeName(scanResult.detectedMode)}...`,
          progress: 40
        });
      }
      
      // Esegui la scansione in base alla modalità rilevata
      switch (scanResult.detectedMode) {
        case 'isbn':
          await this._processIsbn(scanResult, progressCallback);
          break;
          
        case 'cover':
          await this._processCover(imageData, scanResult, language, progressCallback);
          break;
          
        case 'multi':
          await this._processMulti(imageData, scanResult, language, progressCallback);
          break;
          
        default:
          // Fallback a cover
          scanResult.detectedMode = 'cover';
          await this._processCover(imageData, scanResult, language, progressCallback);
      }
      
      // Aggiorna le statistiche
      if (scanResult.success) {
        this.scanStats.successfulScans++;
        
        // Aggiorna il contatore del metodo di riconoscimento
        const method = scanResult.method || 'unknown';
        this.scanStats.recognitionMethods[method] = (this.scanStats.recognitionMethods[method] || 0) + 1;
      } else {
        this.scanStats.failedScans++;
      }
      
      // Salva l'ultimo scan
      this.lastScan = scanResult;
      
      return scanResult;
    } catch (error) {
      console.error('Errore durante la scansione intelligente:', error);
      
      this.scanStats.failedScans++;
      
      return {
        success: false,
        message: 'Errore durante la scansione: ' + error.message,
        error: error.message
      };
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