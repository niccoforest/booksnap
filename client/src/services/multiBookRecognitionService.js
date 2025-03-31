// client/src/services/multiBookRecognitionService.js
import geminiVisionService from './geminiVisionService';
import googleBooksService from './googleBooks.service';
import recognitionCacheService from './recognitionCache.service';

class MultiBookRecognitionService {
  constructor() {
    this.lastSegmentedImages = [];
    this.lastResults = null;
  }

  /**
   * Riconosce multipli libri da un'immagine
   * @param {string} imageData - Immagine in formato base64
   * @param {string} language - Lingua dei libri (default: 'ita')
   * @returns {Promise<Object>} - Array di libri riconosciuti con metadati
   */
  async recognizeMultipleBooks(imageData, language = 'ita') {
    try {
      console.log(`Avvio riconoscimento multipli libri (lingua: ${language})...`);
      
      // Reset stato
      this.lastSegmentedImages = [];
      
      // Verifica che Gemini sia abilitato
      const isGeminiEnabled = geminiVisionService.isEnabled();
      
      if (!isGeminiEnabled) {
        // Se non è abilitato, prova a ottenere la chiave API dalle variabili d'ambiente
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        if (apiKey) {
          geminiVisionService.setApiKey(apiKey);
        } else {
          return {
            success: false,
            error: 'Gemini Vision API non configurata',
            books: []
          };
        }
      }
      
      // Riconoscimento con Gemini Vision in modalità multi-libro
      const geminiResult = await geminiVisionService.recognizeMultipleBooksFromShelf(imageData, language);
      
      if (!geminiResult.success) {
        return {
          success: false,
          error: geminiResult.error,
          books: []
        };
      }
      
      // Enrich dei risultati con dati Google Books
      const enrichedBooks = await this._enrichBooksWithGoogleData(geminiResult.books);
      
      // Salviamo i risultati nella cache se opportuno
      await this._cacheRecognitionResults(enrichedBooks);
      
      // Prepara risultato finale
      const result = {
        success: true,
        books: enrichedBooks,
        count: enrichedBooks.length,
        message: `Identificati ${enrichedBooks.length} libri`
      };
      
      this.lastResults = result;
      return result;
      
    } catch (error) {
      console.error('Errore nel riconoscimento multipli libri:', error);
      
      return {
        success: false,
        error: error.message,
        books: []
      };
    }
  }
  
  /**
   * Arricchisce i dati dei libri con informazioni da Google Books
   * @private
   * @param {Array} booksData - Array di dati libro base
   * @returns {Promise<Array>} - Array di libri arricchiti
   */
  async _enrichBooksWithGoogleData(booksData) {
    if (!booksData || !booksData.length) return [];
    
    const enrichedBooks = [];
    
    // Impostiamo un limite ai libri da processare per evitare troppe chiamate API
    const booksToProcess = booksData.slice(0, 10);
    
    for (const bookData of booksToProcess) {
      try {
        if (!bookData.title || !bookData.author) {
          console.log('Libro senza titolo o autore, skip:', bookData);
          continue;
        }
        
        // Cerca su Google Books
        const query = `intitle:${bookData.title} inauthor:${bookData.author}`;
        const searchResults = await googleBooksService.searchBooks(query, 2);
        
        if (searchResults && searchResults.length > 0) {
          // Libro trovato, aggiungi tutti i metadati
          const enrichedBook = {
            ...searchResults[0],
            recognition: {
              confidence: bookData.confidence || 0.5,
              source: 'gemini_multi',
              originalTitle: bookData.title,
              originalAuthor: bookData.author
            }
          };
          
          enrichedBooks.push(enrichedBook);
        } else {
          // Nessun risultato da Google Books, usa i dati basici
          enrichedBooks.push({
            title: bookData.title,
            author: bookData.author,
            recognition: {
              confidence: bookData.confidence || 0.3,
              source: 'gemini_multi_raw',
              noGoogleMatch: true
            }
          });
        }
      } catch (error) {
        console.error(`Errore nell'arricchimento del libro "${bookData.title}":`, error);
        // Aggiungi comunque i dati basici
        enrichedBooks.push({
          title: bookData.title,
          author: bookData.author,
          recognition: {
            confidence: bookData.confidence || 0.3,
            source: 'gemini_multi_raw',
            error: error.message
          }
        });
      }
    }
    
    return enrichedBooks;
  }
  
  /**
   * Salva i risultati del riconoscimento nella cache
   * @private
   * @param {Array} enrichedBooks - Array di libri riconosciuti
   */
  async _cacheRecognitionResults(enrichedBooks) {
    if (!enrichedBooks || enrichedBooks.length === 0) return;
    
    // Salviamo nella cache solo i libri con matching Google Books
    const booksToCache = enrichedBooks.filter(book => 
      book.googleBooksId && 
      book.recognition && 
      book.recognition.confidence > 0.5);
    
    for (const book of booksToCache) {
      try {
        // Creiamo un testo OCR simulato da titolo e autore per la cache
        const simulatedOcr = `${book.title}\n${book.author}`;
        
        await recognitionCacheService.addToCache(
          simulatedOcr,
          book,
          'gemini_multi',
          book.recognition.confidence
        );
      } catch (error) {
        console.error(`Errore nel salvataggio in cache del libro "${book.title}":`, error);
      }
    }
  }
  
  /**
   * Ottiene le immagini segmentate dall'ultimo riconoscimento
   * @returns {Array} - Array di immagini in base64
   */
  getLastSegmentedImages() {
    return this.lastSegmentedImages;
  }
  
  /**
   * Ottiene i risultati dell'ultimo riconoscimento
   * @returns {Object|null} - Risultati ultimo riconoscimento
   */
  getLastResults() {
    return this.lastResults;
  }
}

const multiBookRecognitionService = new MultiBookRecognitionService();
export default multiBookRecognitionService;