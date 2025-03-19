// client/src/services/barcode.service.js
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

class BarcodeService {
  constructor() {
    const hints = new Map();
    const formats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.ISBN];
    
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    this.reader = new BrowserMultiFormatReader(hints);
    this.isInitialized = false;
  }

  /**
   * Inizializza il lettore di codici a barre
   */
  async init() {
    if (!this.isInitialized) {
      try {
        await this.reader.listVideoInputDevices();
        this.isInitialized = true;
      } catch (error) {
        console.error('Errore inizializzazione scanner barcode:', error);
      }
    }
    return this.isInitialized;
  }

  /**
   * Decodifica un codice a barre da un'immagine
   * @param {string} imageData - Data URL dell'immagine
   * @returns {Promise<string>} - Testo del codice a barre decodificato
   */
  async decodeFromImage(imageData) {
    try {
      await this.init();
      
      // Carica l'immagine
      const img = new Image();
      img.src = imageData;
      
      // Attendi che l'immagine sia caricata
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        // Imposta un timeout in caso l'immagine non si carichi
        setTimeout(reject, 3000);
      });
      
      // Decodifica il barcode
      const result = await this.reader.decodeFromImage(img);
      
      if (result) {
        const text = result.getText();
        // Verifica se è un ISBN valido (10 o 13 cifre)
        if (this.isValidIsbn(text)) {
          return text;
        }
      }
      
      throw new Error('Nessun ISBN valido trovato');
    } catch (error) {
      console.error('Errore decodifica barcode:', error);
      throw new Error('Impossibile riconoscere il codice ISBN. Riprova o inserisci manualmente.');
    }
  }

  /**
   * Verifica che una stringa rappresenti un ISBN valido
   * @param {string} code - Codice da verificare
   * @returns {boolean} - true se è un ISBN valido
   */
  isValidIsbn(code) {
    if (!code) return false;
    
    // Rimuove spazi, trattini e altri caratteri non numerici
    const cleanCode = code.replace(/[^\dX]/gi, '');
    
    // ISBN-10 (10 cifre) o ISBN-13 (13 cifre)
    return /^(\d{10}|\d{13})$/.test(cleanCode);
  }

  /**
   * Rilascia le risorse del lettore
   */
  destroy() {
    if (this.reader) {
      this.reader.reset();
    }
  }
}


const barcodeServiceInstance = new BarcodeService();
export default barcodeServiceInstance;