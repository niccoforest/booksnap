// client/src/services/barcode.service.js
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

class BarcodeService {
  constructor() {
    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_13, 
      BarcodeFormat.EAN_8, 
      BarcodeFormat.ISBN, 
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128
    ];
    
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    this.reader = new BrowserMultiFormatReader(hints, 1000);
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      console.log('Inizializzazione scanner barcode...');
      await this.reader.listVideoInputDevices();
      this.isInitialized = true;
      console.log('Scanner barcode inizializzato con successo');
      return true;
    } catch (error) {
      console.error('Errore inizializzazione scanner barcode:', error);
      return false;
    }
  }

  // client/src/services/barcode.service.js

async decodeFromImage(imageData) {
  try {
    await this.init();
    
    // Crea l'immagine una sola volta
    const img = await this._createImageFromData(imageData);
    console.log('Immagine pre-processata, provo decodifica...');
    
    // Array di approcci da provare in sequenza
    const approaches = [
      // Approccio 1: Try standard decoding
      async () => {
        return await this.reader.decodeFromImageElement(img);
      },
      
      // Approccio 2: Try with canvas and larger size
      async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Ingrandisci leggermente l'immagine
        canvas.width = img.width * 1.2;
        canvas.height = img.height * 1.2;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        return await this.reader.decodeFromImageElement(canvas);
      },
      
      // Approccio 3: Try with higher contrast
      async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Aumenta il contrasto
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // Aumenta il contrasto
          data[i] = data[i] < 128 ? 0 : 255;     // R
          data[i+1] = data[i+1] < 128 ? 0 : 255; // G
          data[i+2] = data[i+2] < 128 ? 0 : 255; // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        return await this.reader.decodeFromImageElement(canvas);
      }
    ];
    
    // Prova ogni approccio in sequenza
    for (let i = 0; i < approaches.length; i++) {
      try {
        const result = await approaches[i]();
        if (result) {
          const text = result.getText();
          console.log(`Barcode riconosciuto (approccio ${i+1}):`, text);
          
          if (this.isValidIsbn(text)) {
            return this._cleanIsbn(text);
          }
        }
      } catch (err) {
        console.log(`Approccio ${i+1} fallito`);
      }
    }
    
    throw new Error('Nessun ISBN valido trovato');
  } catch (error) {
    console.error('Errore decodeFromImage:', error);
    throw new Error('Impossibile riconoscere il codice ISBN');
  }
}

  // Helper per creare un'immagine da un URL dati
  async _createImageFromData(imageData) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Errore caricamento immagine'));
      img.src = imageData;
    });
  }
  
  // Verifica se una stringa è un ISBN valido
  isValidIsbn(code) {
    if (!code) return false;
    
    // Pulisci il codice
    const cleanCode = this._cleanIsbn(code);
    
    // Verifica lunghezza
    return /^(\d{10}|\d{13})$/.test(cleanCode);
  }
  
  // Pulisci la stringa ISBN
  _cleanIsbn(code) {
    return code.replace(/[^0-9X]/gi, '');
  }

  destroy() {
    if (this.reader) {
      try {
        this.reader.reset();
      } catch (e) {
        console.error('Errore nel reset del reader:', e);
      }
      this.reader = null;
      this.isInitialized = false;
    }
  }
}

const barcodeServiceInstance = new BarcodeService();
export default barcodeServiceInstance;