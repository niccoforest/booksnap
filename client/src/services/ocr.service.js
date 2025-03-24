// client/src/services/ocr.service.js - Versione aggiornata
import { createWorker } from 'tesseract.js';

class OcrService {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.isInitializing = false;
  }

  /**
   * Inizializza il worker di Tesseract in modo sicuro
   */
  async init() {
    // Se è già pronto, restituisci subito
    if (this.worker && this.isReady) {
      return true;
    }
    
    // Se è già in fase di inizializzazione, aspetta
    if (this.isInitializing) {
      let attempts = 0;
      while (this.isInitializing && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      return this.isReady;
    }
    
    this.isInitializing = true;
    
    try {
      console.log('Inizializzazione OCR...');
      
      // Terminazione sicura di un eventuale worker esistente
      if (this.worker) {
        try {
          await this.worker.terminate();
        } catch (e) {
          console.log('Errore nella terminazione del worker precedente:', e);
        }
        this.worker = null;
      }
      
      // Creazione di un nuovo worker con opzioni più sicure
      this.worker = await createWorker({
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: m => console.log(m),
        errorHandler: err => console.error('Worker error:', err)
      });
      
      // Caricamento del modello linguistico
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      
      // Configurazione per riconoscimento numeri
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789X-',
      });
      
      this.isReady = true;
      console.log('OCR inizializzato con successo');
      return true;
    } catch (error) {
      console.error('Errore inizializzazione OCR:', error);
      this.isReady = false;
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Riconosce il testo da un'immagine con gestione errori migliorata
   */
  async recognizeText(imageData) {
    try {
      const initialized = await this.init();
      if (!initialized) {
        throw new Error('OCR non inizializzato correttamente');
      }
      
      console.log('Riconoscimento testo da immagine...');
      
      // Tesseract può fallire con immagini troppo grandi, ridimensioniamo
      const processedImage = await this.preprocessImage(imageData);
      
      const result = await this.worker.recognize(processedImage);
      console.log('Testo riconosciuto:', result.data.text);
      
      return result.data.text;
    } catch (error) {
      console.error('Errore nel riconoscimento OCR:', error);
      throw new Error('Errore nel riconoscimento del testo');
    }
  }
  
  /**
   * Preelabora l'immagine per migliorare il riconoscimento
   */
  async preprocessImage(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Crea un canvas per manipolare l'immagine
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Imposta dimensioni massime per evitare problemi di memoria
        const MAX_SIZE = 1000;
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
        
        // Disegna l'immagine ridimensionata
        ctx.drawImage(img, 0, 0, width, height);
        
        // Ottimizza contrasto per OCR
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Aumenta contrasto
        for (let i = 0; i < data.length; i += 4) {
          // Calcola luminosità
          const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
          
          // Applica soglia per migliorare contrasto
          const threshold = 150;
          const adjustment = brightness < threshold ? 0 : 255;
          
          data[i] = adjustment;     // R
          data[i + 1] = adjustment; // G
          data[i + 2] = adjustment; // B
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
    });
  }

  /**
   * Estrae un ISBN da una stringa di testo
   */
  extractIsbnFromText(text) {
    if (!text) return null;
    
    // Pulisce il testo
    const cleanText = text.replace(/\s+/g, '');
    
    console.log('Testo pulito per ricerca ISBN:', cleanText);
    
    // Cerca pattern che potrebbero essere ISBN
    const isbnPattern = /(?:97[89])?(\d{9}[\dXx]|\d{12}[\dXx]?)/gi;
    const matches = cleanText.match(isbnPattern);
    
    if (matches && matches.length > 0) {
      // Restituisci il primo match trovato
      return matches[0].replace(/[^\dXx]/gi, '');
    }
    
    return null;
  }

  /**
   * Riconosce un ISBN direttamente da un'immagine
   */
  async recognizeIsbn(imageData) {
    try {
      const text = await this.recognizeText(imageData);
      const isbn = this.extractIsbnFromText(text);
      
      if (!isbn) {
        throw new Error('Nessun ISBN riconosciuto nell\'immagine');
      }
      
      console.log('ISBN riconosciuto:', isbn);
      return isbn;
    } catch (error) {
      console.error('Errore nel riconoscimento ISBN:', error);
      throw error;
    }
  }

  /**
   * Rilascia le risorse del worker
   */
  async terminate() {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (e) {
        console.error('Errore nella terminazione del worker:', e);
      }
      this.worker = null;
      this.isReady = false;
    }
  }
}

const ocrServiceInstance = new OcrService();
export default ocrServiceInstance;