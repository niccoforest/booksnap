// client/src/services/coverRecognitionService.js
import geminiVisionService from './geminiVisionService';
import recognitionCacheService from './recognitionCache.service';
import googleBooksService from './googleBooks.service';

class CoverRecognitionService {
  constructor() {
    this.lastStatus = null;
    this.lastImage = null;
    this.lastResult = null;
  }

  /**
   * Riconosce un libro dalla copertina
   * @param {string} imageData - Immagine in formato base64
   * @param {string} language - Lingua del libro (default: 'ita')
   * @returns {Promise<Object>} - Informazioni sul libro riconosciuto
   */
async recognizeBookCover(imageData, language = 'ita') {
  try {
    this._updateStatus('init', 'Inizializzazione riconoscimento');
    
    // Riconoscimento tramite Gemini
    this._updateStatus('gemini', 'Riconoscimento con Gemini Vision API');
    
    const geminiResult = await geminiVisionService.recognizeBookCover(imageData, language);
    console.log('Risultato Gemini:', geminiResult);
    
    if (!geminiResult || !geminiResult.success) {
      this._updateStatus('error', 'Errore nel riconoscimento Gemini');
      return {
        success: false,
        error: geminiResult?.error || 'Errore nel riconoscimento della copertina'
      };
    }
    
    // Verifica che ci siano dati minimi (titolo e/o autore)
    if (!geminiResult.title && !geminiResult.author) {
      this._updateStatus('error', 'Dati insufficienti dal riconoscimento');
      return {
        success: false,
        error: 'Impossibile identificare titolo o autore del libro'
      };
    }
    
    // Cerca il libro su Google Books
    this._updateStatus('searching', 'Ricerca del libro nel database');
    
    let query = '';
    if (geminiResult.title && geminiResult.author) {
      query = `intitle:${geminiResult.title} inauthor:${geminiResult.author}`;
    } else if (geminiResult.title) {
      query = `intitle:${geminiResult.title}`;
    } else {
      query = `inauthor:${geminiResult.author}`;
    }
    
    const searchResults = await googleBooksService.searchBooks(query, 3);
    
    // Se non troviamo risultati, prova una ricerca più generica
    if (!searchResults || searchResults.length === 0) {
      this._updateStatus('fallback', 'Ricerca alternativa');
      
      // Ricerca più permissiva
      const fallbackQuery = (geminiResult.title || '') + ' ' + (geminiResult.author || '');
      const fallbackResults = await googleBooksService.searchBooks(fallbackQuery, 3);
      
      if (!fallbackResults || fallbackResults.length === 0) {
        // Come ultima risorsa, crea un libro "virtuale" dai dati Gemini
        this._updateStatus('completed', 'Nessun risultato trovato nel database, utilizzo dati Gemini');
        
        const syntheticBook = {
          title: geminiResult.title || 'Titolo sconosciuto',
          author: geminiResult.author || 'Autore sconosciuto',
          publisher: geminiResult.publisher || '',
          googleBooksId: `temp_${Date.now()}`,
          coverImage: '', // Non abbiamo una copertina
          confidence: geminiResult.confidence === 'alta' ? 0.9 : geminiResult.confidence === 'media' ? 0.6 : 0.3
        };
        
        return {
          success: true,
          data: syntheticBook,
          alternatives: [],
          method: 'gemini_direct',
          confidence: syntheticBook.confidence
        };
      }
      
      // Usa i risultati del fallback
      this._updateStatus('completed', 'Libro identificato dai risultati alternativi');
      
      // Assicurati che tutti i libri abbiano i campi necessari
      const validatedResults = fallbackResults.map(book => ({
        ...book,
        title: book.title || 'Titolo sconosciuto',
        author: book.author || 'Autore sconosciuto'
      }));
      
      try {
        // Salva nella cache per uso futuro
        if (validatedResults[0]) {
          await recognitionCacheService.addToCache(
            JSON.stringify(geminiResult), 
            validatedResults[0],
            'gemini_fallback',
            0.6
          );
        }
      } catch (cacheError) {
        console.warn('Errore salvando nella cache:', cacheError);
      }
      
      return {
        success: true,
        data: validatedResults[0],
        alternatives: validatedResults.slice(1),
        method: 'gemini_fallback',
        confidence: 0.6
      };
    }
    
    // Libro trovato
    this._updateStatus('completed', 'Libro identificato con successo');
    
    // Verifica ulteriormente i risultati prima di restituirli
    const validatedResults = searchResults.map(book => ({
      ...book,
      title: book.title || 'Titolo sconosciuto',
      author: book.author || 'Autore sconosciuto',
      googleBooksId: book.googleBooksId || `temp_${Date.now()}`
    }));
    
    try {
      // Salva nella cache per uso futuro
      if (validatedResults[0]) {
        await recognitionCacheService.addToCache(
          JSON.stringify(geminiResult), 
          validatedResults[0],
          'gemini_title_author',
          0.9
        );
      }
    } catch (cacheError) {
      console.warn('Errore salvando nella cache:', cacheError);
    }
    
    return {
      success: true,
      data: validatedResults[0],
      alternatives: validatedResults.slice(1),
      method: 'gemini_title_author',
      confidence: 0.9
    };
    
  } catch (error) {
    console.error('Errore nel riconoscimento copertina:', error);
    this._updateStatus('error', 'Errore inaspettato durante il riconoscimento');
    
    return {
      success: false,
      error: 'Errore nel riconoscimento della copertina: ' + error.message
    };
  }
}
  
  /**
   * Aggiorna lo stato del processo di riconoscimento
   * @private
   * @param {string} state - Stato corrente
   * @param {string} message - Messaggio descrittivo
   */
  _updateStatus(state, message) {
    if (!this.lastStatus) {
      this.lastStatus = {
        startTime: Date.now(),
        steps: []
      };
    }
    
    this.lastStatus.state = state;
    this.lastStatus.steps.push(message);
    this.lastStatus.lastUpdate = Date.now();
    
    console.log(`[CoverRecognition] ${state}: ${message}`);
  }
  
  /**
   * Ottiene lo stato attuale del riconoscimento
   * @returns {Object} - Stato del riconoscimento
   */
  getRecognitionStatus() {
    return this.lastStatus;
  }
  
  /**
   * Ottiene l'ultimo risultato di riconoscimento
   * @returns {Object|null} - Ultimo risultato
   */
  getLastResult() {
    return this.lastResult;
  }
  
  /**
   * Ottiene l'ultima immagine analizzata
   * @returns {string|null} - Ultima immagine in base64
   */
  getLastImage() {
    return this.lastImage;
  }
}

const coverRecognitionService = new CoverRecognitionService();
export default coverRecognitionService;