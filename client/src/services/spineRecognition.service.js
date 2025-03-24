// client/src/services/spineRecognition.service.js
import ocrService from './ocr.service';

class SpineRecognitionService {
  /**
   * Riconosce il testo verticale da una costa di libro
   * @param {string} imageData - Immagine della costa in formato base64
   * @returns {Promise<Object>} - Dati estratti (titolo, autore)
   */
  async recognizeSpineText(imageData) {
    try {
      console.log('Riconoscimento testo verticale da costa libro...');
      
      // 1. Prepara l'immagine per l'OCR (rotazione e ottimizzazione)
      const processedImage = await this._preprocessSpineImage(imageData);
      
      // 2. Esegui OCR sul testo ruotato
      await ocrService.init();
      
      // Imposta parametri specifici per testo delle coste
      if (ocrService.worker) {
        await ocrService.worker.setParameters({
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,\'-:;!?"()[] ',
          tessedit_ocr_engine_mode: 3, // Modalità completa
          textord_tabfind_vertical_text: 1, // Supporto per testo verticale
          textord_tabfind_vertical_text_ratio: 0.5,
        });
      }
      
      const result = await ocrService.worker.recognize(processedImage);
      const text = result.data.text;
      
      console.log('Testo riconosciuto dalla costa:', text);
      
      // 3. Analizza il testo per estrarre informazioni
      const { title, author } = this._analyzeSpineText(text);
      
      return { title, author, rawText: text };
    } catch (error) {
      console.error('Errore nel riconoscimento del testo della costa:', error);
      throw error;
    }
  }
  
  /**
   * Pre-elabora l'immagine della costa per migliorare il riconoscimento
   * @private
   */
  async _preprocessSpineImage(imageData) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 1. Prima verifica se l'immagine è più alta che larga (orientamento verticale)
          const isVertical = img.height > img.width;
          
          if (isVertical) {
            // Ruota l'immagine per il riconoscimento orizzontale che è più accurato
            canvas.width = img.height;
            canvas.height = img.width;
            
            // Ruota di 90 gradi in senso orario
            ctx.translate(canvas.width, 0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, 0, 0);
          } else {
            // Se già orizzontale, usa come è
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
          }
          
          // 2. Ottimizzazione per il contrasto
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            // Calcola luminosità
            const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
            
            // Migliora contrasto per il testo
            const contrast = 1.5; // Fattore di contrasto
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            
            data[i] = factor * (data[i] - 128) + 128;     // R
            data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
            data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        
        img.onerror = () => reject(new Error('Errore nel caricamento dell\'immagine'));
        img.src = imageData;
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Analizza il testo riconosciuto dalla costa del libro
   * @private
   */
  _analyzeSpineText(text) {
    if (!text || text.trim().length < 3) {
      return { title: null, author: null };
    }
    
    // Normalizza il testo
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Dividi in linee per l'analisi
    const lines = normalizedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return { title: null, author: null };
    }
    
    // Per le coste, il pattern comune è:
    // 1. Titolo (generalmente in alto o più grande)
    // 2. Autore (sotto il titolo)
    // 3. Editore (spesso più in basso o piccolo)
    
    let title = null;
    let author = null;
    
    // Estrai titolo (prima linea non vuota più lunga di 3 caratteri)
    for (const line of lines) {
      if (line.length > 3) {
        title = line;
        break;
      }
    }
    
    // Cerca l'autore nelle righe successive al titolo
    if (title) {
      const titleIndex = lines.indexOf(title);
      if (titleIndex !== -1 && titleIndex < lines.length - 1) {
        // Cerca la prima riga non vuota dopo il titolo
        for (let i = titleIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.length > 2 && line !== title) {
            author = line;
            break;
          }
        }
      }
    }
    
    return { title, author };
  }
 }
 
 const spineRecognitionService = new SpineRecognitionService();
 export default spineRecognitionService;