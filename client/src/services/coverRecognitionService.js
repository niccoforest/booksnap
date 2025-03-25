// client/src/services/coverRecognitionService.js - Versione aggiornata
import barcodeService from './barcode.service';
import googleBooksService from './googleBooks.service';
import isbnService from './isbn.service';
import spineRecognitionService from './spineRecognition.service';
import simpleOcrService from './simpleOcr.service';

class CoverRecognitionService {
  constructor() {
    this.lastProcessedImage = null;
    this.lastResult = null;
    this.lastExtractedText = null;
    this.recognitionStatus = null;
  }

 /**
 * Riconosce una copertina di libro da un'immagine
 * @param {string} imageData - Immagine in formato base64
 * @param {string} language - Lingua per l'OCR (default: 'ita')
 * @returns {Promise<Object>} - Dati del libro riconosciuto
 */
async recognizeBookCover(imageData, language = 'ita') {
  try {
    console.log(`Inizio riconoscimento libro (lingua: ${language})...`);
    this.lastProcessedImage = imageData;
    this.recognitionStatus = 'processing';
    
    // 1. Verifica se l'immagine è probabilmente una costa di libro
    const isSpine = await this._isLikelyBookSpine(imageData);
    
    let bookData = null;
    
    // 2. Prima prova con barcode/ISBN che è indipendente dalla lingua
    bookData = await this._recognizeViaBarcode(imageData);
      
    if (bookData) {
      this.recognitionStatus = 'success_barcode';
    } else {
      // 3. Se il barcode fallisce, prova con OCR
      bookData = await this._recognizeViaOCR(imageData, language);
      
      if (bookData) {
        this.recognitionStatus = 'success_ocr';
      } else {
        this.recognitionStatus = 'failed';
      }
    }
    
    // 4. Se tutti i metodi falliscono, ritorna null
    if (!bookData) {
      console.log('Nessun libro riconosciuto');
      return null;
    }
    
    this.lastResult = bookData;
    console.log('Libro riconosciuto:', bookData.title);
    return bookData;
  } catch (error) {
    console.error('Errore nel riconoscimento:', error);
    this.recognitionStatus = 'error';
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
 * Tenta di riconoscere il libro tramite OCR
 * @private
 * @param {string} imageData - Immagine in formato base64
 * @param {string} language - Lingua per l'OCR (default: 'ita')
 */

  async _recognizeViaOCR(imageData, language = 'ita') {
    try {
      console.log(`Tentativo riconoscimento tramite OCR (lingua: ${language})...`);
      
      // 1. Estrai il testo dall'immagine con OCR
      const text = await simpleOcrService.recognizeText(imageData, language);
      
      if (!text || text.trim().length < 3) {
        console.log('Nessun testo rilevato nell\'immagine');
        return null;
      }
      
      // Salva il testo estratto per debug
      this.lastExtractedText = text;
      console.log('Testo rilevato dalla copertina:', text);
      
      // 2. Prima cerca se c'è un ISBN nel testo
      const isbn = simpleOcrService.extractIsbn(text);
      
      if (isbn) {
        console.log('ISBN estratto dal testo:', isbn);
        
        // Cerca libro tramite ISBN
        const bookData = await googleBooksService.getBookByIsbn(isbn);
        if (bookData) {
          return bookData;
        }
      }
      
      // 3. Analizza il testo per estrarre titolo e autore
      const extractedInfo = simpleOcrService.analyzeText(text);
      
      // Se l'analisi ha trovato candidati multipli, li salviamo
      this.candidateBooks = extractedInfo.allCandidates || [];
      
      const { title, author, confidence } = extractedInfo;
      
      // Se il confidence score è basso, proviamo diverse query di ricerca
      const queries = [];
      
      if (title && author && confidence > 0.5) {
        // Query principale: titolo + autore
        queries.push({ query: `${title} ${author}`, weight: 1.0 });
      }
      
      if (title) {
        // Solo titolo
        queries.push({ query: title, weight: 0.8 });
      }
      
      if (author) {
        // Solo autore
        queries.push({ query: author, weight: 0.5 });
      }
      
      // Se non abbiamo query specifiche o il confidence è basso
      if (queries.length === 0 || confidence < 0.3) {
        // Estrai parole chiave dal testo
        const keywords = this._extractKeywords(text);
        if (keywords.length > 0) {
          // Usa le prime 3-5 parole chiave
          const keywordQuery = keywords.slice(0, 5).join(' ');
          queries.push({ query: keywordQuery, weight: 0.4 });
        }
      }
      
      // Se ancora non abbiamo query
      if (queries.length === 0) {
        // Ultima risorsa: cerca con il testo completo
        queries.push({ query: text.replace(/\n/g, ' ').slice(0, 100), weight: 0.2 });
      }
      
      // 4. Esegui tutte le query e raccogli i risultati
      const allResults = [];
      
      for (const queryObj of queries) {
        console.log(`Esecuzione ricerca con query: "${queryObj.query}"`);
        const results = await googleBooksService.searchBooks(queryObj.query, 5);
        
        if (results && results.length > 0) {
          // Calcola score ponderato per ogni risultato
          results.forEach(book => {
            // Cerca se questo libro è già nei risultati
            const existingIndex = allResults.findIndex(r => 
              r.book.googleBooksId === book.googleBooksId
            );
            
            if (existingIndex >= 0) {
              // Aggiorna lo score se è già presente
              allResults[existingIndex].score += queryObj.weight;
            } else {
              // Aggiungi nuovo risultato
              allResults.push({
                book,
                score: queryObj.weight,
                matchedQuery: queryObj.query
              });
            }
          });
        }
      }
      
      // Ordina per score
      allResults.sort((a, b) => b.score - a.score);
      
      // Salva tutti i risultati trovati
      this.alternativeResults = allResults.map(r => r.book);
      
      // 5. Restituisci il risultato con score più alto solo se supera una soglia
      if (allResults.length > 0 && allResults[0].score > 0.5) {
        console.log(`Libro trovato con ricerca "${allResults[0].matchedQuery}":`, allResults[0].book.title);
        return allResults[0].book;
      } else if (allResults.length > 0) {
        // Abbiamo risultati ma con confidence bassa
        // Se fossimo in una UI potremmo mostrare opzioni multiple
        console.log(`Trovati ${allResults.length} possibili match con confidence bassa`);
        
        // Salva comunque il miglior risultato, ma aggiungiamo flag lowConfidence
        const bestMatch = allResults[0].book;
        bestMatch.lowConfidence = true;
        bestMatch.alternatives = allResults.slice(1, 4).map(r => r.book);
        
        return bestMatch;
      }
      
      console.log('Nessun libro trovato con i dati estratti');
      return null;
    } catch (error) {
      console.log('Riconoscimento tramite OCR fallito:', error.message);
      return null;
    }
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