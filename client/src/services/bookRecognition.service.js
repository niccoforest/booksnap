// client/src/services/bookRecognition.service.js
import coverRecognitionService from './coverRecognitionService';
import multiBookRecognitionService from './multiBookRecognitionService';

class BookRecognitionService {
  /**
 * Riconosce libri da un'immagine in base alla modalità specificata
 * @param {string} imageData - Immagine in formato base64
 * @param {string} mode - Modalità di riconoscimento ('cover' o 'multi')
 * @param {string} language - Lingua per l'OCR ('eng' o 'ita')
 * @returns {Promise<Object|Array>} - Dati dei libri riconosciuti
 */
async recognizeBooks(imageData, mode = 'cover', language = 'ita') {
    try {
      console.log(`Avvio riconoscimento in modalità: ${mode}, lingua: ${language}`);
      
      // Scegli il servizio appropriato in base alla modalità
      if (mode === 'multi') {
        return await multiBookRecognitionService.recognizeMultipleBooks(imageData, language);
      } else {
        // Modalità predefinita: copertina singola
        return await coverRecognitionService.recognizeBookCover(imageData, language);
      }
    } catch (error) {
      console.error('Errore nel servizio di riconoscimento libri:', error);
      throw error;
    }
  }
  
  /**
   * Ottiene lo stato dell'ultimo riconoscimento (per debug)
   * @param {string} mode - Modalità di riconoscimento ('cover' o 'multi')
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