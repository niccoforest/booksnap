// client/src/services/multiBookRecognitionService.js
import coverRecognitionService from './coverRecognitionService';
import imageSegmentationService from './imageSegmentation.service';

class MultiBookRecognitionService {
  constructor() {
    this.lastProcessedImage = null;
    this.lastSegmentedImages = [];
    this.lastResults = [];
  }
  
  /**
   * Riconosce multiple copertine di libri da un'immagine
   * @param {string} imageData - Immagine in formato base64
   * @returns {Promise<Array>} - Dati dei libri riconosciuti
   */
  async recognizeMultipleBooks(imageData) {
    try {
      console.log('Inizio riconoscimento multipli libri...');
      this.lastProcessedImage = imageData;
      
      // 1. Segmenta l'immagine per identificare singoli libri
      const segmentedImages = await this._segmentImage(imageData);
      this.lastSegmentedImages = segmentedImages;
      
      console.log(`Segmentazione completata: identificati ${segmentedImages.length} possibili libri`);
      
      if (segmentedImages.length === 0) {
        console.log('Nessun libro identificato nell\'immagine');
        return [];
      }
      
      // 2. Riconosci ogni libro individualmente
      const recognitionPromises = segmentedImages.map(async (segmentedImage, index) => {
        try {
          console.log(`Riconoscimento libro ${index + 1}/${segmentedImages.length}...`);
          
          // Usa il servizio di riconoscimento copertina singola
          const bookData = await coverRecognitionService.recognizeBookCover(segmentedImage);
          
          if (bookData) {
            console.log(`Libro ${index + 1} riconosciuto: ${bookData.title}`);
            return {
              index,
              bookData,
              success: true
            };
          } else {
            console.log(`Libro ${index + 1} non riconosciuto`);
            return {
              index,
              success: false
            };
          }
        } catch (error) {
          console.error(`Errore nel riconoscimento del libro ${index + 1}:`, error);
          return {
            index,
            success: false,
            error: error.message
          };
        }
      });
      
      // Aggiunta di un timeout per evitare che il riconoscimento si blocchi troppo a lungo
      const timeout = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ timedOut: true });
        }, 60000); // 60 secondi di timeout
      });
      
      // 3. Attendi il completamento di tutti i riconoscimenti o il timeout
      const results = await Promise.race([
        Promise.all(recognitionPromises),
        timeout
      ]);
      
      // Se c'è stato un timeout, ritorna i risultati parziali disponibili
      if (results.timedOut) {
        console.warn('Timeout nel riconoscimento multiplo, ritorno risultati parziali');
        // Procedi con i risultati già ottenuti (potrebbero essere incompleti)
      }
      
      // 4. Filtra i risultati di successo
      const successfulResults = Array.isArray(results) 
        ? results
            .filter(result => result.success)
            .map(result => result.bookData)
        : [];
      
      this.lastResults = successfulResults;
      
      console.log(`Riconoscimento completato: ${successfulResults.length}/${segmentedImages.length} libri riconosciuti`);
      
      return successfulResults;
    } catch (error) {
      console.error('Errore nel riconoscimento multipli libri:', error);
      return []; // In caso di errore, ritorna array vuoto invece di lanciare eccezione
    }
  }
  
  /**
   * Segmenta l'immagine per identificare singoli libri
   * @private
   */
  async _segmentImage(imageData) {
    try {
      // Utilizza il servizio di segmentazione avanzato
      return await imageSegmentationService.segmentBookshelfImage(imageData);
    } catch (error) {
      console.error('Errore durante la segmentazione avanzata, uso fallback:', error.message);
      
      // Fallback alla segmentazione semplice se quella avanzata fallisce
      return this._fallbackSegmentation(imageData);
    }
  }



/**
   * Segmentazione di fallback (semplificata)
   * @private
   */
async _fallbackSegmentation(imageData) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const segments = [];
          
          // Dividi l'immagine in 3 parti verticali
          const numSegments = 3; 
          const segmentWidth = Math.floor(img.width / numSegments);
          
          for (let i = 0; i < numSegments; i++) {
            const segmentCanvas = document.createElement('canvas');
            const segmentCtx = segmentCanvas.getContext('2d');
            
            segmentCanvas.width = segmentWidth;
            segmentCanvas.height = img.height;
            
            segmentCtx.drawImage(
              img,
              i * segmentWidth, 0, segmentWidth, img.height,
              0, 0, segmentWidth, img.height
            );
            
            const segmentDataUrl = segmentCanvas.toDataURL('image/jpeg', 0.85);
            segments.push(segmentDataUrl);
          }
          
          console.log(`Segmentazione di fallback: creati ${segments.length} segmenti`);
          resolve(segments);
        };
        
        img.onerror = () => {
          console.error('Errore nel caricamento dell\'immagine per segmentazione');
          resolve([]);
        };
        
        img.src = imageData;
      } catch (error) {
        console.error('Errore nella segmentazione di fallback:', error);
        resolve([]);
      }
    });
  }

  
  /**
   * Ottenere le immagini segmentate dall'ultimo riconoscimento
   */
  getLastSegmentedImages() {
    return this.lastSegmentedImages;
  }
  
  /**
   * Ottenere i risultati dell'ultimo riconoscimento
   */
  getLastResults() {
    return this.lastResults;
  }
}

const multiBookRecognitionService = new MultiBookRecognitionService();
export default multiBookRecognitionService;