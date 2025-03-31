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
      // Inizializza lo stato di riconoscimento
      this.lastStatus = {
        startTime: Date.now(),
        state: 'started',
        steps: ['Inizializzazione del riconoscimento']
      };
      
      this.lastImage = imageData;
      
      // Step 1: Verifica se Gemini è abilitato
      const isGeminiEnabled = geminiVisionService.isEnabled();
      
      if (!isGeminiEnabled) {
        // Se non è abilitato, prova a ottenere la chiave API dalle variabili d'ambiente
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        if (apiKey) {
          geminiVisionService.setApiKey(apiKey);
        } else {
          this._updateStatus('error', 'Gemini Vision API non configurata');
          return {
            success: false,
            error: 'Gemini Vision API non configurata'
          };
        }
      }
      
      // Step 2: Riconoscimento con Gemini Vision
      this._updateStatus('processing', 'Analisi dell\'immagine con AI');
      const geminiResult = await geminiVisionService.recognizeBookFromCover(imageData, language);
      
      if (!geminiResult.success) {
        this._updateStatus('error', `Errore nel riconoscimento: ${geminiResult.error}`);
        return geminiResult;
      }
      
      const { title, author, publisher, confidence } = geminiResult;
      
      // Step 3: Ricerca nelle cache o in Google Books
      this._updateStatus('searching', 'Ricerca del libro nel database');
      
      // Ordiniamo le strategie di ricerca in base alla probabilità di successo
      const searchStrategies = [
        // Strategia 1: Cerca titolo + autore precisi
        async () => {
          if (title && author) {
            const query = `intitle:${title} inauthor:${author}`;
            const results = await googleBooksService.searchBooks(query, 3);
            if (results && results.length > 0) {
              return {
                success: true,
                data: results[0],
                alternatives: results.slice(1),
                method: 'gemini_title_author',
                confidence: confidence
              };
            }
          }
          return null;
        },
        
        // Strategia 2: Ricerca più ampia con titolo e autore
        async () => {
          if (title && author) {
            const query = `${title} ${author}`;
            const results = await googleBooksService.searchBooks(query, 3);
            if (results && results.length > 0) {
              return {
                success: true,
                data: results[0],
                alternatives: results.slice(1),
                method: 'gemini_search',
                confidence: confidence * 0.9 // Confidenza leggermente ridotta
              };
            }
          }
          return null;
        },
        
        // Strategia 3: Solo titolo, se sufficientemente distintivo
        async () => {
          if (title && title.length > 6) {
            const query = `intitle:${title}`;
            const results = await googleBooksService.searchBooks(query, 3);
            if (results && results.length > 0) {
              return {
                success: true,
                data: results[0],
                alternatives: results.slice(1),
                method: 'gemini_title_only',
                confidence: confidence * 0.7 // Confidenza più ridotta
              };
            }
          }
          return null;
        }
      ];
      
      // Tentiamo ogni strategia in ordine
      for (const strategy of searchStrategies) {
        try {
          const result = await strategy();
          if (result) {
            // Abbiamo trovato un risultato, aggiorniamo lo stato
            this._updateStatus('completed', 'Libro identificato con successo');
            
            // Salviamo nella cache se la confidenza è alta
            if (result.confidence > 0.5 && result.data) {
              // Creiamo un testo OCR simulato da titolo e autore per la cache
              const simulatedOcr = `${title}\n${author}\n${publisher || ''}`;
              await recognitionCacheService.addToCache(
                simulatedOcr, 
                result.data, 
                'gemini', 
                result.confidence
              );
            }
            
            this.lastResult = result;
            return result;
          }
        } catch (strategyError) {
          console.error('Errore in strategia di ricerca:', strategyError);
          // Continua con la strategia successiva
        }
      }
      
      // Se arriviamo qui, non abbiamo trovato risultati con nessuna strategia
      this._updateStatus('not_found', 'Nessun libro trovato per i dati riconosciuti');
      
      return {
        success: false,
        error: 'Nessun libro trovato per i dati riconosciuti',
        recognizedData: {
          title,
          author,
          publisher,
          confidence
        }
      };
      
    } catch (error) {
      console.error('Errore nel servizio di riconoscimento copertina:', error);
      this._updateStatus('error', `Errore generico: ${error.message}`);
      
      return {
        success: false,
        error: error.message
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