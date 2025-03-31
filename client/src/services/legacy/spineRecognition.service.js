// client/src/services/spineRecognition.service.js
import simpleOcrService from './simpleOcr.service';
import googleBooksService from './googleBooks.service';
import textAnalysisService from './textAnalysis.service';

class SpineRecognitionService {
  constructor() {
    this.lastProcessedImage = null;
    this.lastRecognizedText = null;
    this.lastResult = null;
  }

  /**
   * Riconosce una costa di libro dall'immagine
   * @param {string} imageData - Immagine in formato base64
   * @param {string} language - Lingua per OCR
   * @returns {Promise<Object>} - Dati del libro riconosciuto
   */
  async recognizeBookSpine(imageData, language = 'ita') {
    try {
      console.log(`Inizio riconoscimento costa libro (lingua: ${language})...`);
      this.lastProcessedImage = imageData;
      
      // 1. Prepara l'immagine per OCR costa
      const processedImage = await this._preprocessSpineImage(imageData);
      
      // 2. Esegui OCR ottimizzato per testo verticale
      const recognizedText = await this._recognizeSpineText(processedImage, language);
      this.lastRecognizedText = recognizedText;
      
      if (!recognizedText || recognizedText.trim().length < 3) {
        console.log('Nessun testo riconosciuto nella costa');
        return null;
      }
      
      console.log('Testo riconosciuto dalla costa:', recognizedText);
      
      // 3. Estrai informazioni strutturate
      const extractedInfo = this._extractSpineInfo(recognizedText);
      
      if (!extractedInfo.title) {
        console.log('Impossibile estrarre titolo dalla costa');
        return null;
      }
      
      // 4. Cerca il libro tramite titolo e autore
      console.log(`Ricerca libro con titolo: "${extractedInfo.title}" e autore: "${extractedInfo.author || 'non specificato'}"`);
      
      // Costruisci la query di ricerca
      let searchQuery = extractedInfo.title;
      if (extractedInfo.author) {
        searchQuery += ` ${extractedInfo.author}`;
      }
      
      // Cerca il libro
      const searchResults = await googleBooksService.searchBooks(searchQuery, 5);
      
      if (!searchResults || searchResults.length === 0) {
        console.log('Nessun libro trovato con i dati estratti');
        return null;
      }
      
      // 5. Trova il miglior match
      const bestMatch = this._findBestMatch(searchResults, extractedInfo);
      
      if (bestMatch) {
        console.log('Libro riconosciuto dalla costa:', bestMatch.title);
        this.lastResult = bestMatch;
        return bestMatch;
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel riconoscimento della costa:', error);
      return null;
    }
  }
  
  /**
   * Pre-elabora l'immagine per ottimizzare il riconoscimento della costa
   * @private
   */
  async _preprocessSpineImage(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        // Crea un canvas per manipolare l'immagine
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Imposta le dimensioni
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Disegna l'immagine originale
        ctx.drawImage(img, 0, 0);
        
        // Ottieni i dati dell'immagine
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Migliora il contrasto per il testo verticale
        for (let i = 0; i < data.length; i += 4) {
          // Converti in scala di grigi
          const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
          
          // Aumenta il contrasto
          const contrast = 1.5; // Fattore di contrasto
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          const newValue = factor * (brightness - 128) + 128;
          
          // Applica il nuovo valore a tutti i canali
          data[i] = newValue;     // R
          data[i + 1] = newValue; // G
          data[i + 2] = newValue; // B
        }
        
        // Scrivi i dati elaborati sul canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Restituisci l'immagine elaborata
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      
      img.onerror = () => {
        console.warn('Errore durante l\'elaborazione dell\'immagine della costa');
        resolve(imageData); // Ritorna l'immagine originale in caso di errore
      };
      
      img.src = imageData;
    });
  }
  
  /**
   * Riconosce il testo da una costa di libro
   * @private
   */
  async _recognizeSpineText(imageData, language) {
    try {
      // Usa il servizio OCR con impostazioni ottimizzate per testo verticale
      return await simpleOcrService.recognizeText(imageData, language);
    } catch (error) {
      console.error('Errore nel riconoscimento OCR della costa:', error);
      return '';
    }
  }
  
  /**
   * Estrae informazioni strutturate dal testo della costa
   * @private
   */
  _extractSpineInfo(text) {
    // Il testo di una costa è tipicamente verticale e può contenere
    // titolo, autore ed editore in sequenza verticale
    
    // Dividi in linee e filtra quelle vuote
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return { title: null, author: null, publisher: null };
    }
    
    // Semplificazione: consideriamo la linea più lunga come titolo
    // e quella successiva come autore (se presente)
    const sortedLines = [...lines].sort((a, b) => b.length - a.length);
    
    const title = sortedLines[0];
    let author = null;
    let publisher = null;
    
    // Trova l'indice della linea del titolo
    const titleIndex = lines.findIndex(line => line === title);
    
    // L'autore è probabilmente la linea successiva al titolo
    if (titleIndex >= 0 && titleIndex < lines.length - 1) {
      author = lines[titleIndex + 1];
      
      // Se c'è un'altra linea dopo l'autore, potrebbe essere l'editore
      if (titleIndex < lines.length - 2) {
        publisher = lines[titleIndex + 2];
      }
    }
    
    // In alternativa, utilizza un'analisi più sofisticata tramite il servizio di analisi testo
    const analyzedInfo = textAnalysisService.analyzeBookCoverText(text);
    
    // Usa i risultati dell'analisi se hanno più senso
    if (analyzedInfo.title && (!title || analyzedInfo.title.length > 3)) {
      return analyzedInfo;
    }
    
    return { title, author, publisher };
  }
  
  /**
   * Trova il miglior match tra i risultati di ricerca
   * @private
   */
  _findBestMatch(searchResults, extractedInfo) {
    if (!searchResults || searchResults.length === 0) return null;
    
    // Costruisci un sistema di punteggio per ogni risultato
    const scoredResults = searchResults.map(book => {
      let score = 0;
      
      // Confronta titoli
      if (book.title && extractedInfo.title) {
        const titleSimilarity = this._calculateSimilarity(
          book.title.toLowerCase(), 
          extractedInfo.title.toLowerCase()
        );
        score += titleSimilarity * 3; // Il titolo ha peso maggiore
      }
      
      // Confronta autori
      if (book.author && extractedInfo.author) {
        const authorSimilarity = this._calculateSimilarity(
          book.author.toLowerCase(), 
          extractedInfo.author.toLowerCase()
        );
        score += authorSimilarity * 2;
      }
      
      // Confronta editori
      if (book.publisher && extractedInfo.publisher) {
        const publisherSimilarity = this._calculateSimilarity(
          book.publisher.toLowerCase(), 
          extractedInfo.publisher.toLowerCase()
        );
        score += publisherSimilarity;
      }
      
      return { book, score };
    });
    
    // Ordina per punteggio decrescente
    scoredResults.sort((a, b) => b.score - a.score);
    
    // Il libro deve avere un punteggio minimo per essere considerato un match
    if (scoredResults.length > 0 && scoredResults[0].score > 1.5) {
      return scoredResults[0].book;
    }
    
    return null;
  }
  
  /**
   * Calcola la similarità tra due stringhe (0-1)
   * @private
   */
  _calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Implementazione di similarità semplificata
    
    // Se una stringa contiene l'altra, c'è alta similarità
    if (str1.includes(str2)) return 0.9;
    if (str2.includes(str1)) return 0.9;
    
    // Dividi in parole e conta le parole in comune
    const words1 = str1.split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Conta quante parole di str1 sono in str2
    let matches = 0;
    for (const word of words1) {
      if (words2.some(w => w.includes(word) || word.includes(w))) {
        matches++;
      }
    }
    
    // Calcola similarità in base alle parole in comune
    return matches / Math.max(words1.length, words2.length);
  }
  
  /**
   * Ottiene le informazioni dell'ultimo riconoscimento
   */
  getRecognitionStatus() {
    return {
      lastRecognizedText: this.lastRecognizedText,
      lastResult: this.lastResult
    };
  }
}

const spineRecognitionService = new SpineRecognitionService();
export default spineRecognitionService;