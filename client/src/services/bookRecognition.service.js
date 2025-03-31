// client/src/services/bookRecognition.service.js
import coverRecognitionService from './coverRecognitionService';
import multiBookRecognitionService from './multiBookRecognitionService';
import recognitionCacheService from './recognitionCache.service';

class BookRecognitionService {
  /**
   * Riconosce libri da un'immagine in base alla modalità specificata
   * @param {string} imageData - Immagine in formato base64
   * @param {string} mode - Modalità di riconoscimento ('cover', 'multi' o 'auto')
   * @param {string} language - Lingua per l'OCR ('eng' o 'ita')
   * @returns {Promise<Object>} - Dati dei libri riconosciuti
   */
  async recognizeBooks(imageData, mode = 'cover', language = 'ita') {
    try {
      console.log(`Avvio riconoscimento in modalità: ${mode}, lingua: ${language}`);
      
      // Scegli il servizio appropriato in base alla modalità
      let result;
      if (mode === 'multi') {
        result = await multiBookRecognitionService.recognizeMultipleBooks(imageData, language);
      } else {
        // Modalità predefinita: copertina singola
        result = await coverRecognitionService.recognizeBookCover(imageData, language);
      }
      
      // Aggiungi qui il codice per salvare in cache
      if (result && result.success && result.data) {
        // Se il riconoscimento è stato fatto tramite AI, salva nella cache
        // per migliorare i riconoscimenti futuri
        if (result.method === 'gemini_cover' || result.method === 'llm_recognition') {
          try {
            // Estrai le informazioni essenziali dal testo OCR o dall'immagine
            // ed effettua l'apprendimento nella cache
            await recognitionCacheService.addToCache(
              this._generateSimulatedOcrText(result.data), // simulazione del testo OCR
              result.data,
              'gemini', // fonte dell'apprendimento
              result.confidence || 0.7
            );
            
            console.log('Risultato salvato nella cache per futuri riconoscimenti');
          } catch (cacheError) {
            console.warn('Impossibile salvare nella cache:', cacheError);
            // Non blocchiamo il flusso principale in caso di errore cache
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Errore nel servizio di riconoscimento libri:', error);
      return {
        success: false,
        error: error.message || 'Errore durante il riconoscimento'
      };
    }
  }
  
  /**
   * Salva un riconoscimento riuscito nella cache
   * @private
   */
  async _cacheSuccessfulRecognition(imageData, bookData, confidence) {
    try {
      // Verifica che ci sia un servizio di cache e che sia abilitato
      if (!recognitionCacheService || !recognitionCacheService.enabled) {
        return;
      }
      
      // Potremmo implementare qui una logica per estrarre un testo OCR dall'immagine
      // Per ora utilizziamo un testo di 'simulazione' basato sui metadati del libro
      const simulatedOcrText = this._generateSimulatedOcrText(bookData);
      
      // Salva nella cache solo se abbiamo un testo OCR minimamente valido
      if (simulatedOcrText && simulatedOcrText.length > 10) {
        await recognitionCacheService.addToCache(
          simulatedOcrText,
          bookData,
          'gemini_recognition',
          confidence
        );
      }
    } catch (error) {
      console.error('Errore nel salvataggio in cache:', error);
      // Non propaghiamo l'errore per non interrompere il flusso principale
    }
  }
  
  /**
   * Genera un testo OCR simulato dai metadati del libro
   * @private
   */
  _generateSimulatedOcrText(book) {
    const parts = [];
    
    // Aggiungi l'autore
    if (book.author) {
      parts.push(book.author);
    }
    
    // Aggiungi il titolo
    if (book.title) {
      parts.push(book.title);
    }
    
    // Combinazioni autore + titolo
    if (book.author && book.title) {
      parts.push(`${book.title} di ${book.author}`);
    }
    
    // Aggiungi l'editore
    if (book.publisher) {
      parts.push(`Editore: ${book.publisher}`);
    }
    
    // Aggiungi l'ISBN se disponibile
    if (book.isbn) {
      parts.push(`ISBN ${book.isbn}`);
    }
    
    // Combina tutte le parti con newline
    return parts.join('\n');
  }
  
  /**
   * Ottiene lo stato dell'ultimo riconoscimento (per debug)
   */
  getLastRecognitionInfo(mode = 'cover') {
    if (mode === 'multi') {
      return {
        segmentedImages: multiBookRecognitionService.getLastSegmentedImages(),
        results: multiBookRecognitionService.getLastResults()
      };
    } else {
      return coverRecognitionService.getRecognitionStatus();
    }
  }
}

const bookRecognitionService = new BookRecognitionService();
export default bookRecognitionService;