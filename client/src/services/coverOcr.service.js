// client/src/services/coverOcr.service.js
import ocrService from './ocr.service';

class CoverOcrService {
  /**
   * Ottimizza un'immagine per il riconoscimento OCR di copertine di libri
   * @param {string} imageData - Immagine in formato base64
   * @returns {Promise<string>} - Immagine ottimizzata in formato base64
   */
  async preprocessCoverImage(imageData) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          // Crea un canvas per manipolare l'immagine
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Imposta dimensioni
          const MAX_SIZE = 1200;
          let width = img.width;
          let height = img.height;
          
          // Ridimensiona se troppo grande
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            } else {
              width = Math.round(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Disegna l'immagine
          ctx.drawImage(img, 0, 0, width, height);
          
          // Ottimizzazione specifiche per copertine di libri
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          // Aumenta il contrasto per testi scuri su sfondi chiari (comune nelle copertine)
          for (let i = 0; i < data.length; i += 4) {
            // Calcola la luminosità del pixel
            const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
            
            // Applica un contrasto dinamico in base alla luminosità media
            const threshold = 140;
            const factor = 1.5; // Fattore di contrasto
            
            // Algoritmo di contrasto adattivo
            if (brightness < threshold) {
              // Scurisci i pixel già scuri
              data[i] = Math.max(0, data[i] - (threshold - brightness) / factor);
              data[i + 1] = Math.max(0, data[i + 1] - (threshold - brightness) / factor);
              data[i + 2] = Math.max(0, data[i + 2] - (threshold - brightness) / factor);
            } else {
              // Schiarisci i pixel già chiari
              data[i] = Math.min(255, data[i] + (brightness - threshold) / factor);
              data[i + 1] = Math.min(255, data[i + 1] + (brightness - threshold) / factor);
              data[i + 2] = Math.min(255, data[i + 2] + (brightness - threshold) / factor);
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Restituisci l'immagine elaborata
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        
        img.onerror = () => {
          // In caso di errore, usa l'immagine originale
          resolve(imageData);
        };
        
        img.src = imageData;
      } catch (error) {
        console.error('Errore nel pre-processing dell\'immagine:', error);
        resolve(imageData); // Fallback all'immagine originale
      }
    });
  }
  
  /**
   * Riconosce testo da una copertina di libro con impostazioni ottimizzate
   * @param {string} imageData - Immagine in formato base64
   * @returns {Promise<string>} - Testo riconosciuto
   */
  async recognizeCoverText(imageData) {
    try {
      // 1. Pre-elabora l'immagine per migliorare il riconoscimento
      const processedImage = await this.preprocessCoverImage(imageData);
      
      // 2. Inizializza il worker OCR con impostazioni specifiche per copertine
      await ocrService.init();
      
      // 3. Imposta parametri ottimizzati per testo di copertine
      if (ocrService.worker) {
        await ocrService.worker.setParameters({
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,\'-:;!?"()[] ',
          tessedit_ocr_engine_mode: 3, // Modalità completa
          preserve_interword_spaces: 1,
        });
      }
      
      // 4. Esegui il riconoscimento
      const result = await ocrService.worker.recognize(processedImage);
      
      return result.data.text;
    } catch (error) {
      console.error('Errore nel riconoscimento OCR della copertina:', error);
      throw error;
    }
  }
}

const coverOcrService = new CoverOcrService();
export default coverOcrService;