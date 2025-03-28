// client/src/services/simpleOcr.service.js - Versione per Tesseract.js 6.0.0
import { createWorker } from 'tesseract.js';

class SimpleOcrService {
  constructor() {
    this.worker = null;
    this.isInitializing = false;
    this.isReady = false;
    this.languageLoaded = null;
    this.progressCallbacks = [];  // Aggiunto per registrare callback esterni
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
        // Opzioni avanzate per Tesseract v6 - RIMUOVIAMO LA FUNZIONE LOGGER
        const initOptions = {
          langPath: 'https://raw.githubusercontent.com/naptha/tessdata/4.0.0'
          // Rimuoviamo 'logger' che causa l'errore di clonazione
        };
        
        this.worker = await createWorker(language, initOptions);
        
        // Configurazione avanzata del motore Tesseract
        await this.worker.setParameters({
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,\'-:;!?"()[]& àèéìòùÀÈÉÌÒÙ',
          tessedit_pageseg_mode: '6', // Prova PSM_SINGLE_BLOCK
          tessedit_ocr_engine_mode: '1', // LSTM engine
        });
        
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
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,\'-:;!?"()[]& àèéìòùÀÈÉÌÒÙ',
            tessedit_pageseg_mode: '6', // PSM_SINGLE_BLOCK
            tessedit_ocr_engine_mode: '1', // LSTM engine
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

  addProgressCallback(callback) {
    if (typeof callback === 'function') {
      this.progressCallbacks.push(callback);
    }
  }
  
  // Metodo per rimuovere callback di progresso
  removeProgressCallback(callback) {
    this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
  }
  
  // Metodo per notificare il progresso
  _notifyProgress(progress, message) {
    this.progressCallbacks.forEach(callback => {
      try {
        callback({ progress, message });
      } catch (e) {
        console.error('Errore in callback progresso:', e);
      }
    });
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
      
      // Notifica inizio
      this._notifyProgress(0, 'Preparazione OCR...');
      
      // Pre-elaborazione immagine migliorata
      this._notifyProgress(10, 'Pre-elaborazione immagine...');
      const processedImage = await this._preprocessImage(imageData);
      
      // Inizializza il worker con la lingua corretta
      this._notifyProgress(30, 'Inizializzazione OCR...');
      const worker = await this._initializeWorker(language);
      
      // Esegui il riconoscimento
      this._notifyProgress(40, 'Avvio riconoscimento OCR...');
      console.log('Avvio riconoscimento OCR...');
      let result;
      try {
        // Versione per Tesseract.js 6.0.0
        result = await worker.recognize(processedImage);
        this._notifyProgress(90, 'Completamento OCR...');
      } catch (error) {
        console.error('Errore nel formato di riconoscimento v6.0.0:', error);
        throw error;
      }
      
      console.log('Riconoscimento OCR completato');
      this._notifyProgress(100, 'OCR completato!');
      
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
    
    // Log del testo originale per debug
    console.log("Testo originale OCR:", text);
    
    // Normalizza i newline e gli spazi
    let cleanedText = text
      .replace(/[\t\v\f\r\n]+/g, '\n')  // Normalizza i newline
      .replace(/\s+/g, ' ')            // Comprimi spazi multipli all'interno delle righe
      .trim();
    
    // Dividi in linee
    const lines = cleanedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Logga le linee prima del filtraggio
    console.log("Linee prima del filtraggio:", lines);
    
    // Filtraggio meno aggressivo per le linee
    const filteredLines = lines.filter(line => {
      // Rimuovi linee troppo corte
      if (line.length < 2) return false;
      
      // Conta caratteri alfanumerici (inclusi accenti italiani)
      const alphanumericChars = line.replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ]/g, '').length;
      
      // Richiedi almeno 2 caratteri alfanumerici per considerare valida la linea
      const minAlphanumeric = 2;
      
      return alphanumericChars >= minAlphanumeric;
    });
    
    // Logga le linee dopo il filtraggio
    console.log("Linee dopo il filtraggio:", filteredLines);
    
    // Rimuovi caratteri problematici SOLO dopo il filtraggio
    const finalLines = filteredLines.map(line => 
      line.replace(/[|\\^~]/g, '')  // Rimuovi alcuni caratteri problematici che spesso sono errori OCR
    );
    
    return finalLines.join('\n');
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
          
          // Ridimensiona per ottimizzare OCR - bilancia qualità e performance
          const MAX_SIZE = 1800; // Leggermente aumentato per qualità
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
          
          // Analisi dell'immagine per determinare il miglior approccio di pre-processing
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          // Calcolo istogramma luminosità
          const histogram = new Array(256).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            const brightness = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
            histogram[brightness]++;
          }
          
          // Analisi dell'istogramma
          const totalPixels = width * height;
          let darkPixels = 0;
          let lightPixels = 0;
          
          // Conta pixel scuri (< 64) e chiari (> 192)
          for (let i = 0; i < 64; i++) darkPixels += histogram[i];
          for (let i = 192; i < 256; i++) lightPixels += histogram[i];
          
          const darkRatio = darkPixels / totalPixels;
          const lightRatio = lightPixels / totalPixels;
          
          // Determina strategia di pre-processing basata su analisi immagine
          let strategy = 'normal';
          if (darkRatio > 0.6) strategy = 'darken'; // Immagine molto scura
          else if (lightRatio > 0.6) strategy = 'lighten'; // Immagine molto chiara
          else if (Math.abs(darkRatio - lightRatio) < 0.1) strategy = 'highContrast'; // Contrasto bilanciato
          
          console.log(`Strategia pre-processing: ${strategy} (scuri: ${(darkRatio*100).toFixed(1)}%, chiari: ${(lightRatio*100).toFixed(1)}%)`);
          
          // Applica strategia di pre-processing
          switch (strategy) {
            case 'darken':
              this._applyDarkeningFilter(data);
              break;
            case 'lighten':
              this._applyLighteningFilter(data);
              break;
            case 'highContrast':
              this._applyHighContrastFilter(data);
              break;
            default:
              this._applyNormalFilter(data);
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Ritorna l'immagine pre-elaborata
          resolve(canvas.toDataURL('image/jpeg', 0.92));
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
  _applyDarkeningFilter(data) {
    // Aumenta luminosità e contrasto per immagini scure
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.4);     // R
      data[i+1] = Math.min(255, data[i+1] * 1.4); // G
      data[i+2] = Math.min(255, data[i+2] * 1.4); // B
    }
  }
  
  _applyLighteningFilter(data) {
    // Aumenta contrasto per immagini chiare
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * 0.9;     // R
      data[i+1] = data[i+1] * 0.9; // G
      data[i+2] = data[i+2] * 0.9; // B
    }
  }
  
  _applyHighContrastFilter(data) {
    // Ottimizza il contrasto per immagini bilanciate
    for (let i = 0; i < data.length; i += 4) {
      // Converti in scala di grigi con pesi ottimizzati per testo
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      
      // Applica contrasto a S-curve per enfatizzare testo
      const contrast = 1.5; // Fattore di contrasto
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const newValue = factor * (gray - 128) + 128;
      
      data[i] = newValue;     // R
      data[i+1] = newValue;   // G
      data[i+2] = newValue;   // B
    }
  }
  
  _applyNormalFilter(data) {
    // Filtro bilanciato per casi generici
    for (let i = 0; i < data.length; i += 4) {
      // Leggero incremento di contrasto
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      const delta = avg - 128;
      const adjusted = 128 + delta * 1.2;
      
      data[i] = adjusted;     // R
      data[i+1] = adjusted;   // G
      data[i+2] = adjusted;   // B
    }
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
    if (!text) return { title: null, author: null, confidence: 0 };
    
    // Dividi in linee e pulisci
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 3);
    
    // Candidati per titolo e autore con punteggi di confidenza
    const candidates = {
      titles: [],
      authors: []
    };
    
    // Analisi strutturale del testo
    this._analyzeStructuralPatterns(lines, candidates);
    
    // Analisi contestuale (cerca pattern tipici di libri)
    this._analyzeContextualPatterns(text, candidates);
    
    // Analisi specifica per libri italiani
    this._analyzeItalianBookPatterns(text, candidates);
    
    // Seleziona i candidati migliori
    candidates.titles.sort((a, b) => b.score - a.score);
    candidates.authors.sort((a, b) => b.score - a.score);
    
    // Stampa candidati per debug
    if (candidates.titles.length > 0) {
      console.log('Candidati titolo:', candidates.titles.slice(0, 3));
    }
    if (candidates.authors.length > 0) {
      console.log('Candidati autore:', candidates.authors.slice(0, 3));
    }
    
    // Calcola confidenza complessiva
    const titleConfidence = candidates.titles.length > 0 ? candidates.titles[0].score : 0;
    const authorConfidence = candidates.authors.length > 0 ? candidates.authors[0].score : 0;
    const overallConfidence = (titleConfidence + authorConfidence) / 2;
    
    // Crea risultato
    return {
      title: candidates.titles.length > 0 ? candidates.titles[0].text : null,
      author: candidates.authors.length > 0 ? candidates.authors[0].text : null,
      confidence: overallConfidence,
      allCandidates: {
        titles: candidates.titles.slice(0, 3),
        authors: candidates.authors.slice(0, 3)
      }
    };
  }
  
  // Metodi di supporto avanzati
  _analyzeStructuralPatterns(lines, candidates) {
    // Analizza la struttura del testo OCR
    
    // Le prime righe spesso contengono il titolo
    if (lines.length > 0) {
      // Titolo potenziale nelle prime linee
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];
        
        // Punteggio base per posizione
        const positionScore = 1 - (i * 0.2); // 1.0, 0.8, 0.6
        
        // Linee in MAIUSCOLO hanno probabilità maggiore di essere titoli
        if (line === line.toUpperCase() && line.length > 5) {
          candidates.titles.push({
            text: this._normalizeTitleCase(line),
            score: 0.8 + positionScore,
            source: 'uppercase_first_lines'
          });
        }
        
        // Linee lunghe hanno buona probabilità di essere titoli
        if (line.length > 15 && line.length < 50) {
          candidates.titles.push({
            text: this._normalizeTitleCase(line),
            score: 0.6 + positionScore,
            source: 'long_first_lines'
          });
        }
      }
    }
    
    // Cerca pattern di autore (Nome Cognome) nelle prime linee
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // Pattern comune per autori: "Nome Cognome"
      if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(line)) {
        candidates.authors.push({
          text: line,
          score: 0.9 - (i * 0.1),
          source: 'name_pattern'
        });
      }
      
      // Pattern per autori con middle initial: "Nome M. Cognome"
      if (/^[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+$/.test(line)) {
        candidates.authors.push({
          text: line,
          score: 0.95 - (i * 0.1),
          source: 'name_with_middle'
        });
      }
      
      // Pattern COGNOME, Nome
      if (/^[A-Z][A-Z]+ [A-Z][a-z]+$/.test(line) || /^[A-Z][A-Z]+, [A-Z][a-z]+$/.test(line)) {
        candidates.authors.push({
          text: line,
          score: 0.85 - (i * 0.1),
          source: 'surname_first'
        });
      }
    }
  }
  
  _analyzeContextualPatterns(text, candidates) {
    // Cerca pattern come "di [Autore]", "by [Autore]"
    const byAuthorMatches = text.match(/(?:di|by|scritto da)\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi);
    if (byAuthorMatches) {
      byAuthorMatches.forEach(match => {
        const author = match.replace(/(?:di|by|scritto da)\s+/i, '').trim();
        candidates.authors.push({
          text: author,
          score: 0.85,
          source: 'by_author_pattern'
        });
      });
    }
    
    // Cerca titoli tra virgolette
    const quotedMatches = text.match(/"([^"]{5,50})"/g);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        const title = match.replace(/"/g, '').trim();
        candidates.titles.push({
          text: this._normalizeTitleCase(title),
          score: 0.75,
          source: 'quoted_title'
        });
      });
    }
    
    // Cerca pattern editoriali (Editore, Anno)
    const publisherMatches = text.match(/(?:editore|publisher):\s+([A-Za-z\s&]+)/i);
    if (publisherMatches) {
      // Usa informazioni editore per migliorare altri risultati
      // Spesso il titolo appare prima del publisher
      const publisherPos = text.indexOf(publisherMatches[0]);
      if (publisherPos > 20) {
        const beforePublisher = text.substring(0, publisherPos).trim();
        const lines = beforePublisher.split('\n');
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1].trim();
          if (lastLine.length > 5 && lastLine.length < 80) {
            candidates.titles.push({
              text: this._normalizeTitleCase(lastLine),
              score: 0.7,
              source: 'before_publisher'
            });
          }
        }
      }
    }
  }
  
  _analyzeItalianBookPatterns(text, candidates) {
    // Pattern specifici per libri italiani
    
    // Titoli comuni in italiano (spesso iniziano con articoli)
    const italianTitlePattern = /\b(IL|LA|I|GLI|LE|UN|UNA|LO)\s+([A-Z][a-z][A-Za-z\s]+)/i;
    const italianMatches = text.match(italianTitlePattern);
    
    if (italianMatches) {
      italianMatches.forEach(match => {
        candidates.titles.push({
          text: this._normalizeTitleCase(match),
          score: 0.8,
          source: 'italian_article_pattern'
        });
      });
    }
    
    // Cerca specifici pattern editoriali italiani
    const italianPublishers = [
      'Mondadori', 'Einaudi', 'Feltrinelli', 'Rizzoli', 'Adelphi', 
      'Garzanti', 'Bompiani', 'Laterza', 'Sellerio', 'Longanesi'
    ];
    
    for (const publisher of italianPublishers) {
      if (text.includes(publisher)) {
        const publisherIndex = text.indexOf(publisher);
        // Cerca titolo nella parte precedente
        const beforePublisher = text.substring(0, publisherIndex).trim();
        const lines = beforePublisher.split('\n');
        
        // Prende le ultime 2 linee prima dell'editore
        const relevantLines = lines.slice(-2);
        
        relevantLines.forEach((line, idx) => {
          if (line.length > 5) {
            candidates.titles.push({
              text: this._normalizeTitleCase(line),
              score: 0.75 - (idx * 0.1),
              source: `before_italian_publisher_${publisher}`
            });
          }
        });
        
        break;
      }
    }
  }
  
  _normalizeTitleCase(text) {
    // Normalizza maiuscole/minuscole per titoli
    if (!text) return '';
    
    // Se tutto maiuscolo, converti in Title Case
    if (text === text.toUpperCase()) {
      return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return text;
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