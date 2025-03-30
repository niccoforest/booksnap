// client/src/services/coverRecognitionService.js - Versione aggiornata
import barcodeService from './barcode.service';
import googleBooksService from './googleBooks.service';
import isbnService from './isbn.service';
import spineRecognitionService from './spineRecognition.service';
import simpleOcrService from './simpleOcr.service';
import googleVisionService from './googleVision.service';
import recognitionCacheService from './recognitionCache.service';

class CoverRecognitionService {
  constructor() {
    this.lastProcessedImage = null;
    this.lastResult = null;
    this.lastExtractedText = null;
    this.recognitionStatus = null;
  }




/**
 * Riconosce un libro da un'immagine della copertina
 * @param {string} imageData - Immagine in formato base64
 * @param {string} language - Lingua per OCR
 * @param {boolean} useVision - Usa Google Vision API, se disponibile
 * @returns {Promise<Object|null>} - Dati del libro o null se non trovato
 */
async recognizeBookCover(imageData, language = 'eng', useVision = false) {
  if (!imageData) {
    throw new Error('Immagine non valida');
  }
  
  console.log(`Inizio riconoscimento libro (lingua: ${language})...`);
  
  try {
    // 1. Prima tentativo con barcode
    console.log("Tentativo riconoscimento tramite barcode...");
    const barcodeResult = await this._recognizeViaBarcode(imageData);
    
    if (barcodeResult) {
      console.log("Libro riconosciuto tramite ISBN:", barcodeResult.title);
      return barcodeResult;
    }
    
    console.log("Riconoscimento tramite barcode fallito: Impossibile riconoscere il codice ISBN");
    
    // 2. Se richiesto e disponibile, prova Google Vision API
    if (useVision && googleVisionService.enabled) {
      const visionResult = await this._recognizeViaGoogleVision(imageData, language);
      if (visionResult) {
        console.log("Libro riconosciuto tramite Google Vision API:", visionResult.title);
        return visionResult;
      }
    }
    
    // 3. Tentativo con OCR standard
    console.log(`Tentativo riconoscimento tramite OCR (lingua: ${language})...`);
    const ocrResult = await this._recognizeViaOcr(imageData, language);
    
    if (ocrResult) {
      console.log("Libro riconosciuto tramite OCR:", ocrResult.title);
      return ocrResult;
    }
    
    // Se arriviamo qui, tutti i tentativi sono falliti
    console.log("Tutti i metodi di riconoscimento hanno fallito");
    return null;
  } catch (error) {
    console.error("Errore durante il riconoscimento della copertina:", error);
    throw error;
  }
}
  
  /**
   * Tenta di riconoscere il libro tramite barcode/ISBN
   * @private
   */
  async _recognizeViaBarcode(imageData) {
    try {
      console.log('Tentativo riconoscimento tramite barcode...');
      
      // Prova a decodificare un barcode dall'immagine
      const code = await barcodeService.decodeFromImage(imageData);
      
      if (!code) {
        console.log('Nessun barcode rilevato nell\'immagine');
        return null;
      }
      
      console.log('ISBN rilevato:', code);
      
      // Verifica che sia un ISBN valido
      if (!isbnService.isValid(code)) {
        console.log('Codice rilevato non è un ISBN valido:', code);
        return null;
      }
      
      // Cerca il libro tramite ISBN
      const bookData = await googleBooksService.getBookByIsbn(code);
      
      if (!bookData) {
        console.log('Nessun libro trovato con l\'ISBN:', code);
        return null;
      }
      
      return bookData;
    } catch (error) {
      console.log('Riconoscimento tramite barcode fallito:', error.message);
      return null; // Continua con altri metodi
    }
  }
  


/**
 * Tenta di riconoscere la copertina utilizzando Google Cloud Vision
 * @param {string} imageData - Immagine in formato base64
 * @param {string} language - Lingua per OCR
 * @returns {Promise<Object|null>} - Dati del libro o null se non trovato
 */
async _recognizeViaGoogleVision(imageData, language) {
  if (!googleVisionService.enabled) {
    console.log("Riconoscimento Google Vision disabilitato");
    return null;
  }
  
  try {
    console.log("Tentativo riconoscimento tramite Google Vision API...");
    
    // Riconosci il testo con Vision API
    const visionText = await googleVisionService.recognizeText(imageData);
    
    if (!visionText || visionText.trim().length < 5) {
      console.log("Google Vision: nessun testo rilevante trovato");
      return null;
    }
    
    console.log("Testo rilevato da Google Vision:", visionText);
    
    // Analizza il testo per estrarre titolo e autore
    const textAnalysis = simpleOcrService.analyzeText(visionText);
    console.log("Analisi testo Google Vision:", textAnalysis);
    
    // Cerca il libro in base al testo riconosciuto da Google Vision
    let book = null;
    
    // 1. Cerca nella cache
    if (recognitionCacheService.enabled) {
      book = await recognitionCacheService.findByOcrText(visionText);
      if (book) {
        console.log("Libro trovato nella cache con Google Vision:", book.title);
        return book;
      }
    }
    
    // 2. Cerca su Google Books con titolo+autore
    if (textAnalysis.title && textAnalysis.author) {
      const searchQuery = `${textAnalysis.title} ${textAnalysis.author}`;
      console.log("Ricerca Google Books con Vision:", searchQuery);
      
      const results = await googleBooksService.searchBooks(searchQuery, 3);
      if (results && results.length > 0) {
        console.log("Libro trovato su Google Books con Vision:", results[0].title);
        
        // Imposta come fonte il riconoscimento Vision
        results[0].recognitionSource = 'google_vision';
        
        // Aggiungi alla cache per futuri riconoscimenti
        if (recognitionCacheService.enabled) {
          recognitionCacheService.addToCache(visionText, results[0], 'google_vision', textAnalysis.confidence);
        }
        
        return results[0];
      }
    }
    
    // 3. Cerca per frasi chiave estratte
    const searchText = this._extractSearchText(visionText);
    if (searchText) {
      console.log("Esecuzione ricerca con query da Vision:", searchText);
      
      const results = await googleBooksService.searchBooks(searchText, 3);
      if (results && results.length > 0) {
        console.log("Libro trovato con ricerca Vision:", results[0].title);
        
        // Imposta come fonte il riconoscimento Vision
        results[0].recognitionSource = 'google_vision_search';
        
        // Aggiungi alla cache per futuri riconoscimenti
        if (recognitionCacheService.enabled) {
          recognitionCacheService.addToCache(visionText, results[0], 'google_vision_search', 0.7);
        }
        
        return results[0];
      }
    }
    
    console.log("Nessun libro trovato con Google Vision API");
    return null;
  } catch (error) {
    console.error("Errore nel riconoscimento con Google Vision:", error);
    return null;
  }
}


  
 /**
 * Riconosce un libro tramite OCR
 * @param {string} imageData - Immagine in formato base64
 * @param {string} language - Lingua per OCR
 * @returns {Promise<Object|null>} - Dati del libro o null se non trovato
 * @private
 */
async _recognizeViaOcr(imageData, language) {
  try {
    console.log(`Tentativo riconoscimento tramite OCR (lingua: ${language})...`);
    
    // Estrai il testo con OCR
    const ocrText = await simpleOcrService.recognizeText(imageData, language);
    
    if (!ocrText || ocrText.trim().length < 5) {
      console.log("OCR: nessun testo rilevante trovato");
      return null;
    }
    
    console.log("Testo rilevato dalla copertina:", ocrText);
    
    // Analizza il testo per estrarre titolo e autore
    const textAnalysis = simpleOcrService.analyzeText(ocrText);
    
    // Cerca il libro in base al testo riconosciuto
    let book = null;
    
    // 1. Cerca nella cache
    if (recognitionCacheService.enabled) {
      book = await recognitionCacheService.findByOcrText(ocrText);
      if (book) {
        console.log("Libro trovato nella cache:", book.title);
        return book;
      }
    }
    
    // 2. Cerca su Google Books con titolo+autore
    if (textAnalysis.title && textAnalysis.author) {
      const searchQuery = `${textAnalysis.title} ${textAnalysis.author}`;
      console.log("Esecuzione ricerca con query:", searchQuery);
      
      const results = await googleBooksService.searchBooks(searchQuery, 3);
      if (results && results.length > 0) {
        console.log("Libro trovato con ricerca titolo+autore:", results[0].title);
        
        // Aggiungi alla cache per futuri riconoscimenti
        if (recognitionCacheService.enabled) {
          recognitionCacheService.addToCache(ocrText, results[0], 'ocr', textAnalysis.confidence);
        }
        
        return results[0];
      }
    }
    
    // 3. Cerca con le parti più rilevanti del testo
    const searchText = this._extractSearchText(ocrText);
    if (searchText) {
      console.log("Esecuzione ricerca con query:", searchText);
      
      const results = await googleBooksService.searchBooks(searchText, 3);
      if (results && results.length > 0) {
        console.log("Libro trovato con ricerca fallback:", results[0].title);
        
        // Aggiungi alla cache per futuri riconoscimenti
        if (recognitionCacheService.enabled) {
          recognitionCacheService.addToCache(ocrText, results[0], 'ocr_fallback', 0.7);
        }
        
        return results[0];
      }
    }
    
    console.log("Nessun libro trovato con il testo OCR");
    return null;
  } catch (error) {
    console.error("Errore nel riconoscimento OCR:", error);
    return null;
  }
}

/**
 * Estrae un testo di ricerca dal testo OCR
 * @param {string} ocrText - Testo OCR completo
 * @returns {string} - Testo di ricerca estratto
 * @private
 */
_extractSearchText(ocrText) {
  if (!ocrText) return '';
  
  // Dividi in righe e filtra quelle vuote
  const lines = ocrText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 3);
  
  if (lines.length === 0) return '';
  
  // Prendi fino a 3 righe più lunghe
  const sortedLines = [...lines].sort((a, b) => b.length - a.length);
  
  return sortedLines.slice(0, 3).join(' ');
}

  _extractKeywords(text) {
    // Rimuovi caratteri speciali e dividi in parole
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Rimuovi parole comuni
    const stopwords = ['della', 'dello', 'degli', 'delle', 'nella', 'nello', 
                      'negli', 'nelle', 'sono', 'essere', 'questo', 'questi', 
                      'quella', 'quelle', 'come', 'dove', 'quando', 'perché'];
    
    const keywords = words.filter(word => !stopwords.includes(word));
    
    // Restituisci le parole uniche
    return [...new Set(keywords)];
  }
  
/**
 * Cerca un libro con una query specifica e applica filtri di rilevanza
 * @private
 */
async _searchBookWithQuery(query) {
    try {
      console.log(`Esecuzione ricerca con query: "${query}"`);
      const searchResults = await googleBooksService.searchBooks(query, 10);
      
      if (!searchResults || searchResults.length === 0) {
        return null;
      }
      
      // Calcola la rilevanza rispetto alla query
      const scoredResults = this._scoreSearchResults(searchResults, query);
      
      console.log('Risultati di ricerca ordinati per rilevanza:');
      scoredResults.forEach(({ book, score }) => {
        console.log(`${score.toFixed(2)} - ${book.title} (${book.author})`);
      });
      
      // Seleziona il risultato più rilevante se il punteggio è sopra la soglia
      if (scoredResults.length > 0 && scoredResults[0].score > 0.4) {
        return scoredResults[0].book;
      }
      
      return null;
    } catch (error) {
      console.error('Errore nella ricerca:', error);
      return null;
    }
  }
  
  /**
 * Assegna un punteggio ai risultati di ricerca in base alla rilevanza
 * @private
 */
_scoreSearchResults(results, query) {
    if (!results || results.length === 0 || !query) {
      return [];
    }
    
    // Normalizza la query
    const normalizedQuery = query.toLowerCase();
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
    
    // Punteggio per ciascun risultato
    const scoredResults = results.map(book => {
      let score = 0;
      
      // Verifica se tutto o parte del titolo appare nella query
      if (book.title) {
        const normalizedTitle = book.title.toLowerCase();
        
        // Bonus se il titolo è contenuto esattamente nella query
        if (normalizedQuery.includes(normalizedTitle)) {
          score += 3;
        }
        
        // Bonus per parole del titolo trovate nella query
        const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
        for (const word of titleWords) {
          if (normalizedQuery.includes(word)) {
            score += 0.5;
          }
        }
        
        // Bonus per parole della query trovate nel titolo
        for (const word of queryWords) {
          if (normalizedTitle.includes(word)) {
            score += 0.3;
          }
        }
      }
      
      // Verifica se l'autore appare nella query
      if (book.author) {
        const normalizedAuthor = book.author.toLowerCase();
        
        // Bonus se l'autore è contenuto esattamente nella query
        if (normalizedQuery.includes(normalizedAuthor)) {
          score += 2;
        }
        
        // Bonus per parole dell'autore trovate nella query
        const authorWords = normalizedAuthor.split(/\s+/).filter(w => w.length > 2);
        for (const word of authorWords) {
          if (normalizedQuery.includes(word)) {
            score += 0.4;
          }
        }
      }
      
      return { book, score };
    });
    
    // Ordina per punteggio decrescente
    return scoredResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Trova il miglior match tra i risultati della ricerca
   * @private
   */
  _findBestMatch(searchResults, title, author, publisher) {
    if (!searchResults || searchResults.length === 0) return null;
    
    // Sistema di punteggio per ogni risultato
    const scoredResults = searchResults.map(book => {
      let score = 0;
      
      // Confronta titoli
      if (book.title) {
        const titleSimilarity = this._calculateSimilarity(book.title.toLowerCase(), title.toLowerCase());
        score += titleSimilarity * 3; // Il titolo ha peso maggiore
      }
      
      // Confronta autori se disponibili
      if (book.author && author) {
        const authorSimilarity = this._calculateSimilarity(book.author.toLowerCase(), author.toLowerCase());
        score += authorSimilarity * 2;
      }
      
      // Confronta editori se disponibili
      if (book.publisher && publisher) {
        const publisherSimilarity = this._calculateSimilarity(book.publisher.toLowerCase(), publisher.toLowerCase());
        score += publisherSimilarity;
      }
      
      return { book, score };
    });
    
    // Ordina per punteggio decrescente
    scoredResults.sort((a, b) => b.score - a.score);
    
    // Log per debug
    console.log('Risultati ordinati per rilevanza:');
    scoredResults.forEach(({ book, score }) => {
      console.log(`${score.toFixed(2)} - ${book.title} (${book.author})`);
    });
    
    // Ritorna il libro con punteggio più alto
    return scoredResults[0]?.book || null;
  }
  

/**
 * Verifica se l'immagine è probabilmente una costa di libro
 * @private 
 */
_isLikelyBookSpine(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Verifica il rapporto altezza/larghezza
        // Le coste tipicamente sono molto più alte che larghe
        const ratio = img.height / img.width;
        
        // Rapporto > 2.5 suggerisce una costa di libro
        resolve(ratio > 2.5);
      };
      
      img.onerror = () => resolve(false);
      img.src = imageData;
    });
  }

  /**
   * Calcola la similarità tra due stringhe (0-1)
   * @private
   */
_calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Implementazione di similarità di Levenshtein semplificata
    // Calcola quanto str1 è contenuto in str2
    
    if (str2.includes(str1)) return 1; // Match perfetto
    if (str1.includes(str2)) return 0.9; // Str2 è contenuto in str1
    
    // Cerca parole in comune
    const words1 = str1.split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0.1;
    
    // Conta quante parole di str1 sono in str2
    let matches = 0;
    for (const word of words1) {
      if (words2.some(w => w.includes(word) || word.includes(w))) {
        matches++;
      }
    }
    
    // Calcola score basato sulla percentuale di parole in comune
    return matches / words1.length;
  }
  
  /**
   * Funzione di debug per ottenere lo stato del riconoscimento
   */
  getRecognitionStatus() {
    return {
      status: this.recognitionStatus,
      lastExtractedText: this.lastExtractedText,
      lastResult: this.lastResult
    };
  }
}

const coverRecognitionService = new CoverRecognitionService();
export default coverRecognitionService;