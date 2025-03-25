// client/src/services/simpleOcr.service.js - Versione per Tesseract.js 6.0.0
import { createWorker } from 'tesseract.js';

class SimpleOcrService {
  constructor() {
    this.worker = null;
    this.isInitializing = false;
    this.isReady = false;
    this.languageLoaded = null; // Tiene traccia della lingua attualmente caricata
  }

  /**
   * Inizializza il worker Tesseract se non è già stato inizializzato
   * @private
   */
  async _initializeWorker(language = 'eng') {
    if (this.worker && this.isReady && this.languageLoaded === language) {
      return this.worker;
    }
    
    if (this.isInitializing) {
      // Se il worker è già in fase di inizializzazione, aspetta
      let attempts = 0;
      while (this.isInitializing && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (this.isReady && this.languageLoaded === language) return this.worker;
    }
    
    this.isInitializing = true;
    
    try {
      console.log(`Inizializzazione Tesseract worker (lingua: ${language})...`);
      
      // Se esiste già un worker, terminalo
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
      
      // In Tesseract.js 6.0.0 il worker viene inizializzato direttamente con la lingua
      try {
        this.worker = await createWorker(language);
        this.isReady = true;
        this.languageLoaded = language;
        return this.worker;
      } catch (error) {
        console.error(`Errore nell'inizializzazione del worker v6.0.0:`, error);
        
        // Fallback all'approccio precedente
        this.worker = await createWorker();
        await this.worker.loadLanguage(language);
        await this.worker.initialize(language);
        
        // Cerca di impostare parametri se possibile
        try {
          await this.worker.setParameters({
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,\'-:;!?"()[]& ',
          });
        } catch (paramError) {
          console.warn('Impossibile impostare i parametri, proseguo senza:', paramError);
        }
        
        this.isReady = true;
        this.languageLoaded = language;
        return this.worker;
      }
    } catch (error) {
      console.error(`Errore nell'inizializzazione del worker Tesseract:`, error);
      this.isReady = false;
      this.isInitializing = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
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
      
      // Inizializza il worker con la lingua corretta
      const worker = await this._initializeWorker(language);
      
      // Esegui il riconoscimento
      console.log('Avvio riconoscimento OCR...');
      let result;
      try {
        // Versione per Tesseract.js 6.0.0
        result = await worker.recognize(processedImage);
      } catch (error) {
        console.error('Errore nel formato di riconoscimento v6.0.0:', error);
        throw error;
      }
      
      console.log('Riconoscimento OCR completato');
      
      // Estrai il testo - formato v6.0.0
      let extractedText = '';
      
      // Gestisci sia il formato v6.0.0 che i formati precedenti
      if (result) {
        if (typeof result === 'object') {
          if (result.data && result.data.text) {
            // Formato v2.x/v3.x/v4.x/v5.x
            extractedText = result.data.text;
          } else if (result.text) {
            // Formato v6.0.0
            extractedText = result.text;
          } else if (typeof result.getText === 'function') {
            // Altro possibile formato
            extractedText = result.getText();
          } else {
            // Formato sconosciuto, controlla la struttura e stampa per debug
            console.log('Struttura risultato OCR:', result);
            // Tenta di estrarre comunque il testo se possibile
            if (typeof result === 'string') {
              extractedText = result;
            } else {
              extractedText = JSON.stringify(result);
            }
          }
        } else if (typeof result === 'string') {
          // Alcuni formati potrebbero restituire direttamente il testo
          extractedText = result;
        }
      }
      
      // Post-elaborazione per migliorare la qualità
      const cleanedText = this._postprocessText(extractedText);
      console.log('Testo pulito:', cleanedText);
      
      return cleanedText;
    } catch (error) {
      console.error('Errore nel riconoscimento OCR:', error);
      // Fallback alla lingua inglese se non funziona
      if (language !== 'eng') {
        console.log('Tentativo con lingua inglese come fallback...');
        try {
          return await this.recognizeText(imageData, 'eng');
        } catch (fallbackError) {
          console.error('Errore anche nel fallback:', fallbackError);
        }
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
              data[i + j] = Math.min(255, Math.max(0, Math.round(((value - min) / (max - min)) * 255)));
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
   * Il resto delle funzioni rimane invariato
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
  
  analyzeText(text) {
    if (!text) return { title: null, author: null };
    
    // Normalizza il testo per l'analisi
    const cleanedText = text
      .replace(/[^\w\s\.,'"\-:;]/g, ' ')  // Rimuovi caratteri speciali inutili
      .replace(/\s+/g, ' ')               // Normalizza spazi
      .trim();
    
    console.log('Testo normalizzato:', cleanedText);
    
    // Dividi in linee per analisi
    const lines = cleanedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 3);
    
    // Strategie multiple di estrazione
    const strategies = [
      this._extractTitleAuthorByPattern,     // Pattern tipici (IL, LA + MAIUSCOLO)
      this._extractTitleAuthorByPosition,    // Posizione tipica (titolo in mezzo, autore in alto)
      this._extractTitleAuthorByFormatting,  // Formattazione (MAIUSCOLO, lunghezza)
      this._extractTitleAuthorByKeywords     // Parole chiave (Editore, Classici, etc.)
    ];
    
    // Prova diverse strategie e raccogli i risultati con punteggio
    const candidates = [];
    
    for (const strategy of strategies) {
      const result = strategy.call(this, cleanedText, lines);
      if (result && (result.title || result.author)) {
        candidates.push({
          title: result.title,
          author: result.author,
          confidence: result.confidence || 0.5
        });
      }
    }
    
    // Ordina i candidati per confidenza
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    console.log('Candidati trovati:', candidates);
    
    // Se abbiamo almeno un candidato, usa il migliore
    if (candidates.length > 0) {
      return {
        title: candidates[0].title,
        author: candidates[0].author,
        confidence: candidates[0].confidence,
        allCandidates: candidates  // Restituisce tutti i candidati per uso futuro
      };
    }
    
    // Nessun candidato trovato
    return { title: null, author: null, confidence: 0 };
  }
  
  // Pattern di riconoscimento comuni per libri italiani
  _extractTitleAuthorByPattern(text, lines) {
    let title = null;
    let author = null;
    let confidence = 0;
    
    // Pattern per titoli italiani
    const italianTitlePatterns = [
      /\b(IL|LA|I|GLI|LE|UN|UNA)\s+([A-Z][A-Za-z\s]+)/i,
      /\b([A-Z][A-Z\s]{5,})\b/,  // Parole in maiuscolo lunghe almeno 6 caratteri
      /["']([\w\s]{5,})["']/     // Testo tra virgolette
    ];
    
    // Prova i pattern per il titolo
    for (const pattern of italianTitlePatterns) {
      const match = text.match(pattern);
      if (match && match[0].length > 5) {
        title = match[0].trim();
        confidence += 0.3;
        break;
      }
    }
    
    // Pattern per autori
    const authorPatterns = [
      /([A-Z][a-z]+\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]+)/,  // Nome Cognome o Nome I. Cognome
      /(?:di|by|authored by)\s+([A-Za-z\s\.]+)/i      // Preceduto da "di" o "by"
    ];
    
    // Prova i pattern per l'autore
    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        author = match[1].trim();
        confidence += 0.3;
        break;
      }
    }
    
    return { title, author, confidence };
  }
  
  // Estrazione basata sulla posizione tipica degli elementi
  _extractTitleAuthorByPosition(text, lines) {
    if (lines.length < 2) return null;
    
    let title = null;
    let author = null;
    let confidence = 0;
    
    // In molte copertine, l'autore è in alto e il titolo è più verso il centro
    // Assumiamo che il primo terzo delle linee contenga l'autore
    const upperLines = lines.slice(0, Math.max(1, Math.floor(lines.length / 3)));
    const middleLines = lines.slice(Math.floor(lines.length / 3), Math.floor(lines.length * 2 / 3));
    
    // Cerca un possibile autore nelle linee superiori
    for (const line of upperLines) {
      // Cerca pattern nome.cognome
      if (/[A-Z][a-z]+\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]+/.test(line)) {
        author = line;
        confidence += 0.2;
        break;
      }
    }
    
    // Cerca un possibile titolo nelle linee centrali (spesso più lungo e/o in maiuscolo)
    for (const line of middleLines) {
      // Preferisci linee in maiuscolo o più lunghe
      if (line.toUpperCase() === line && line.length > 3) {
        title = line;
        confidence += 0.2;
        break;
      } else if (line.length > 10) {
        title = line;
        confidence += 0.1;
        break;
      }
    }
    
    return { title, author, confidence };
  }
  
  // Estrazione basata su formattazione (maiuscolo, lunghezza, etc.)
  _extractTitleAuthorByFormatting(text, lines) {
    let title = null;
    let author = null;
    let confidence = 0;
    
    // Cerca linee completamente in maiuscolo (spesso sono titoli)
    const uppercaseLines = lines.filter(line => 
      line === line.toUpperCase() && line.length > 4 && /[A-Z]/.test(line)
    );
    
    if (uppercaseLines.length > 0) {
      // Ordina per lunghezza (preferisci linee più lunghe)
      uppercaseLines.sort((a, b) => b.length - a.length);
      title = uppercaseLines[0];
      confidence += 0.25;
    }
    
    // Cerca linee che sembrano nomi (iniziali maiuscole, non completamente maiuscole)
    const nameLines = lines.filter(line => 
      line !== line.toUpperCase() && 
      /^[A-Z]/.test(line) && 
      /\s[A-Z]/.test(line) && 
      line.length > 3
    );
    
    if (nameLines.length > 0) {
      author = nameLines[0];
      confidence += 0.25;
    }
    
    return { title, author, confidence };
  }
  
  // Estrazione basata su parole chiave (editore, collana, etc.)
  _extractTitleAuthorByKeywords(text, lines) {
    let title = null;
    let author = null;
    let confidence = 0;
    
    // Parole chiave per identificare informazioni editoriali
    const publisherKeywords = [
      'edizioni', 'editore', 'editrice', 'publisher', 
      'classici', 'collana', 'collection'
    ];
    
    // Cerca l'indice della linea con informazioni editoriali
    let publisherLineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const lowercaseLine = lines[i].toLowerCase();
      if (publisherKeywords.some(keyword => lowercaseLine.includes(keyword))) {
        publisherLineIndex = i;
        break;
      }
    }
    
    // Se troviamo informazioni editoriali, il titolo è probabilmente prima
    if (publisherLineIndex > 0) {
      // Il titolo è probabilmente 1-2 linee prima dell'editore
      const possibleTitleIndex = Math.max(0, publisherLineIndex - 2);
      title = lines[possibleTitleIndex];
      confidence += 0.2;
      
      // L'autore è probabilmente più in alto
      if (possibleTitleIndex > 0) {
        author = lines[0]; // Prima linea
        confidence += 0.1;
      }
    }
    
    return { title, author, confidence };
  }
  
  getAvailableLanguages() {
    return {
      eng: 'Inglese',
      ita: 'Italiano',
      fra: 'Francese',
      deu: 'Tedesco',
      spa: 'Spagnolo',
      por: 'Portoghese'
    };
  }
  
  async terminate() {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = null;
        this.isReady = false;
        this.languageLoaded = null;
      } catch (error) {
        console.error('Errore nella terminazione del worker:', error);
      }
    }
  }
}

const simpleOcrService = new SimpleOcrService();
export default simpleOcrService;