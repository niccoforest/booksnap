// client/src/services/simpleOcr.service.js

import Tesseract from 'tesseract.js';

class SimpleOcrService {
  constructor() {
    this.workerCache = null;
  }

  /**
   * Riconosce testo da un'immagine usando un approccio migliorato
   * @param {string} imageData - Immagine in formato base64
   * @param {string} language - Lingua per il riconoscimento (default: 'eng')
   * @returns {Promise<string>} - Testo riconosciuto
   */
  async recognizeText(imageData, language = 'eng') {
    try {
      console.log(`Riconoscimento testo con OCR (lingua: ${language})...`);
      
      // Pre-elaborazione immagine migliorata
      const processedImage = await this._preprocessImage(imageData);
      
      // Usa l'API di alto livello di Tesseract
      const result = await Tesseract.recognize(
        processedImage,
        language,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`Riconoscimento: ${Math.floor(m.progress * 100)}%`);
            }
          },
          // Imposta il percorso corretto per il worker e i modelli linguistici
          workerPath: 'https://unpkg.com/tesseract.js@v2.1.0/dist/worker.min.js',
          langPath: 'https://tessdata.projectnaptha.com/4.0.0_best/eng.traineddata.gz',
          corePath: 'https://unpkg.com/tesseract.js-core@v2.2.0/tesseract-core.wasm.js',
          // Ottimizzazioni per copertine di libri
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,\'-:;!?"()[]& ',
        }
      );
      
      console.log('Riconoscimento OCR completato');
      
      // Post-elaborazione per migliorare la qualità
      const cleanedText = this._postprocessText(result.data.text);
      console.log('Testo pulito:', cleanedText);
      
      return cleanedText;
    } catch (error) {
      console.error('Errore nel riconoscimento OCR:', error);
      // Fallback a lingua inglese se quella italiana fallisce
      if (language !== 'eng') {
        console.log('Tentativo con lingua inglese come fallback...');
        return this.recognizeText(imageData, 'eng');
      }
      throw new Error('Errore nel riconoscimento OCR: ' + error.message);
    }
  }
  
  /**
   * Post-elabora il testo per migliorare la qualità
   * @private
   */
  _postprocessText(text) {
    if (!text) return '';
    
    // Rimuovi caratteri problematici
    let cleanedText = text
      .replace(/[\t\v\f\r\n]+/g, '\n')  // Normalizza i newline
      .replace(/[|\\/{}<>^~`]/g, ' ')   // Rimuovi caratteri speciali problematici
      .replace(/\s+/g, ' ')            // Comprimi spazi multipli
      .trim();
    
    // Dividi in linee
    const lines = cleanedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Rimuovi righe che sembrano rumore
    const filteredLines = lines.filter(line => {
      // Rimuovi linee troppo corte o con troppi caratteri speciali
      if (line.length < 2) return false;
      
      // Conta caratteri speciali e normali
      const specialChars = line.replace(/[a-zA-Z0-9\s]/g, '').length;
      const normalChars = line.length - specialChars;
      
      // Filtro basato sul rapporto tra caratteri speciali e normali
      return normalChars > specialChars;
    });
    
    return filteredLines.join('\n');
  }
  
  /**
   * Pre-elabora l'immagine per migliorare il riconoscimento OCR
   * @private
   */
  async _preprocessImage(imageData) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          // Crea un canvas per manipolare l'immagine
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Ridimensiona per ottimizzare OCR
          const MAX_SIZE = 1600;
          let width = img.width;
          let height = img.height;
          
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
          
          // Miglioramento avanzato del contrasto
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          // Calcola l'istogramma
          const histogram = new Array(256).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            histogram[brightness]++;
          }
          
          // Calcola i valori minimo e massimo significativi
          let min = 0;
          let max = 255;
          const pixelCount = width * height;
          const cutoffLow = pixelCount * 0.01;  // 1% dei pixel
          const cutoffHigh = pixelCount * 0.99; // 99% dei pixel
          
          let count = 0;
          for (let i = 0; i < 256; i++) {
            count += histogram[i];
            if (count > cutoffLow) {
              min = i;
              break;
            }
          }
          
          count = 0;
          for (let i = 255; i >= 0; i--) {
            count += histogram[i];
            if (count > cutoffLow) {
              max = i;
              break;
            }
          }
          
          // Applica il miglioramento del contrasto
          for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) {
              const value = data[i + j];
              // Normalizza i valori
              data[i + j] = Math.round(((value - min) / (max - min)) * 255);
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Ritorna l'immagine pre-elaborata
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        
        img.onerror = () => {
          console.warn('Errore nel caricamento dell\'immagine per pre-elaborazione');
          resolve(imageData);
        };
        
        img.src = imageData;
      } catch (error) {
        console.warn('Errore nella pre-elaborazione:', error);
        resolve(imageData);
      }
    });
  }
  
  /**
   * Estrae possibili ISBN dal testo riconosciuto
   * @param {string} text - Testo riconosciuto
   * @returns {string|null} - ISBN estratto o null
   */
  extractIsbn(text) {
    if (!text) return null;
    
    // Pulisci il testo
    const cleanText = text.replace(/\s+/g, '');
    
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
   * Analisi migliorata del testo per estrarre titolo e autore
   */
 analyzeText(text) {
  if (!text) return { title: null, author: null };
  
  // Normalizza il testo
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return { title: null, author: null };
  }
  
  console.log('Analisi linee di testo:', lines);
  
  // Pattern matching migliorato
  let title = null;
  let author = null;
  
  // Punteggio per ogni riga come titolo
  const titleScores = lines.map((line, index) => {
    let score = 0;
    
    // Preferisci linee più lunghe (ma non troppo)
    score += Math.min(line.length, 30) / 10;
    
    // Preferisci linee in maiuscolo (titoli spesso sono in maiuscolo)
    if (line === line.toUpperCase() && line.length > 2) {
      score += 3;
    }
    
    // Favorisci righe centrali della copertina
    const positionScore = 5 - Math.abs(index - Math.floor(lines.length / 2));
    score += positionScore;
    
    // Penalizza righe che sembrano essere autori
    if (line.toLowerCase().startsWith('by') || line.toLowerCase().startsWith('di')) {
      score -= 5;
    }
    
    return { line, score, index };
  });
  
  // Ordina per punteggio
  titleScores.sort((a, b) => b.score - a.score);
  console.log('Punteggi titolo:', titleScores);
  
  // Seleziona il migliore candidato per il titolo
  if (titleScores.length > 0) {
    title = titleScores[0].line;
    
    // Trova l'autore nelle righe circostanti o in linee che contengono pattern tipici
    for (const line of lines) {
      if (line === title) continue;
      
      // Pattern tipici per autori
      if (/^by\s|^di\s/i.test(line)) {
        author = line.replace(/^by\s|^di\s/i, '').trim();
        break;
      }
      
      // Nomi di autori spesso contengono iniziali o hanno formato "Nome Cognome"
      if (/^[A-Z][a-z]+\s[A-Z]\.?\s?[A-Z][a-z]+$|^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(line)) {
        author = line;
        break;
      }
    }
    
    // Se non abbiamo trovato un autore, prova a cercarlo nella linea prima o dopo il titolo
    if (!author) {
      const titleIndex = titleScores[0].index;
      if (titleIndex > 0) {
        author = lines[titleIndex - 1];
      } else if (titleIndex < lines.length - 1) {
        author = lines[titleIndex + 1];
      }
    }
  }
  
  console.log('Titolo estratto:', title);
  console.log('Autore estratto:', author);
  
  return { title, author };
}
  
  /**
   * Ottiene la lista delle lingue disponibili per il riconoscimento
   * @returns {Object} - Lingue disponibili
   */
  getAvailableLanguages() {
    return {
      eng: 'Inglese',
      ita: 'Italiano',
      fra: 'Francese',
      deu: 'Tedesco',
      spa: 'Spagnolo',
      por: 'Portoghese',
      rus: 'Russo',
      jpn: 'Giapponese',
      chi_sim: 'Cinese Semplificato',
      chi_tra: 'Cinese Tradizionale'
    };
  }
}

const simpleOcrService = new SimpleOcrService();
export default simpleOcrService;