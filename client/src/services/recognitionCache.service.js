// client/src/services/recognitionCache.service.js (versione corretta)
import apiService from './api.service';

class RecognitionCacheService {
  constructor() {
    this.enabled = true;
    this.localCache = {}; // Cache temporanea in-memory
    this.hits = 0;
    this.misses = 0;
    this.alternativeMatches = []; // Per tenere traccia dei possibili match alternativi
  }

  /**
   * Cerca un libro nella cache in base al testo OCR
   * @param {string} ocrText - Testo OCR da cercare
   * @returns {Promise<Object|null>} - Dati del libro o null se non trovato
   */
  async findByOcrText(ocrText) {
    if (!this.enabled || !ocrText || ocrText.length < 5) {
      console.log("Cache: ricerca non eseguita - cache disabilitata o testo OCR non valido");
      return null;
    }
  
    try {
      console.log("Cache: ricerca libro per testo OCR...");
      
      // Normalizza il testo OCR
      const normalizedText = this._normalizeText(ocrText);
      
      // 1. Prima controlla nella cache locale
      const localCacheKey = this._generateLocalCacheKey(normalizedText);
      
      if (this.localCache[localCacheKey]) {
        console.log("Cache: hit da cache locale!");
        this.hits++;
        return this.localCache[localCacheKey];
      }
      
      // 2. Se non in cache locale, chiedi al server
      const response = await apiService.post('/recognition-cache/find-by-ocr', {
        ocrText,
        normalizedText
      });
      
      // Verifica che la risposta abbia il formato corretto
      if (response && response.success && response.data) {
        console.log("Cache: hit da server!");
        this.hits++;
        
        // Salva nella cache locale per uso futuro
        this.localCache[localCacheKey] = response.data;
        
        // Salva anche le alternative
        if (response.alternatives) {
          this.alternativeMatches = response.alternatives;
        }
        
        return response.data;
      }
      
      // Se arriviamo qui, non abbiamo trovato nulla
      console.log("Cache: nessun match trovato");
      this.misses++;
      return null;
    } catch (error) {
      console.error('Errore nella ricerca in cache:', error);
      this.misses++;
      return null;
    }
  }

  /**
   * Estrai parole chiave significative dal testo
   * @private
   */
  _extractSignificantKeywords(text) {
    if (!text) return [];
    
    // Converti testo in parole
    const words = text.toLowerCase()
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ') // Mantiene anche le lettere accentate
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    // Rimuovi stopwords
    const stopwords = ['della', 'dello', 'degli', 'delle', 'nella', 'nello', 
                       'negli', 'nelle', 'sono', 'essere', 'questo', 'questi', 
                       'quella', 'quelle', 'come', 'dove', 'quando', 'perché'];
    
    const filteredWords = words.filter(w => !stopwords.includes(w));
    
    // Estrai parole più frequenti e più lunghe
    const wordFrequency = {};
    filteredWords.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    // Calcola un punteggio combinato di frequenza e lunghezza
    const scoredWords = Object.keys(wordFrequency).map(word => ({
      word,
      score: wordFrequency[word] * (word.length / 5) // Normalizzato
    }));
    
    // Ordina per punteggio e prendi le migliori
    return scoredWords
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(w => w.word);
  }

  /**
   * Costruisce frasi significative dal testo
   * @private
   */
  _buildSignificantSubstrings(text) {
    // Estrai frasi significative dal testo OCR
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && line.length < 100);
    
    // Prendi le linee più promettenti (prima, più lunga e centrata)
    const significantLines = [];
    if (lines.length > 0) significantLines.push(lines[0]);
    if (lines.length > 2) significantLines.push(lines[Math.floor(lines.length / 2)]);
    
    // Aggiungi la linea più lunga se non è già inclusa
    const longestLine = lines.reduce((max, line) => 
      line.length > max.length ? line : max, '');
    if (longestLine && !significantLines.includes(longestLine)) 
      significantLines.push(longestLine);
    
    return significantLines;
  }
  
  /**
   * Cerca un libro nella cache in base a parole chiave
   * @param {Array<string>} keywords - Parole chiave da cercare
   * @returns {Promise<Object|null>} - Dati del libro o null se non trovato
   */
  async findByKeywords(keywords) {
    if (!this.enabled || !keywords || keywords.length === 0) {
      return null;
    }
    
    try {
      console.log("Cache: ricerca libro per parole chiave:", keywords);
      
      const response = await apiService.post('/recognition-cache/find-by-keywords', {
        keywords
      });
      
      if (response.data.success) {
        console.log("Cache: hit da server per parole chiave!");
        this.hits++;
        
        // Salva anche le alternative
        if (response.data.alternatives) {
          this.alternativeMatches = response.data.alternatives;
        }
        
        return response.data.data;
      }
      
      console.log("Cache: nessun match trovato per parole chiave");
      this.misses++;
      return null;
    } catch (error) {
      console.error('Errore nella ricerca in cache per parole chiave:', error);
      this.misses++;
      return null;
    }
  }

  /**
   * Aggiungi un'associazione testo OCR -> libro alla cache
   * @param {string} ocrText - Testo OCR
   * @param {Object} bookData - Dati del libro
   * @param {string} source - Fonte dell'associazione
   * @param {number} confidence - Livello di confidenza
   */
   async addToCache(ocrText, bookData, source = 'user', confidence = 0.7) {
    if (!this.enabled || !ocrText || !bookData) {
      console.log("Cache: impossibile aggiungere alla cache - parametri non validi");
      return;
    }
    
    try {
      console.log(`Cache: aggiunta di "${bookData.title}" alla cache locale`);
      
      // Normalizza il testo OCR
      const normalizedText = this._normalizeText(ocrText);
      
      // Aggiungi alla cache locale immediatamente
      const localKey = this._generateLocalCacheKey(normalizedText);
      this.localCache[localKey] = bookData;
      
      // Verifica che bookData abbia un ID valido
      if (!bookData.googleBooksId && !bookData._id) {
        console.warn('Cache: impossibile salvare nella cache remota - manca ID libro');
        return; // Non tentare di salvare sul server
      }
      
      // Tenta di aggiungere alla cache remota, ma non bloccare in caso di errore
      try {
        console.log(`Cache: tentativo di aggiunta di "${bookData.title}" alla cache remota`);
        
        // Crea una copia sicura di bookData con solo i campi essenziali
        const safeBookData = {
          googleBooksId: bookData.googleBooksId || `temp_${Date.now()}`,
          title: bookData.title || 'Titolo sconosciuto',
          author: bookData.author || 'Autore sconosciuto',
          publisher: bookData.publisher || '',
          publishedYear: bookData.publishedYear || null,
          coverImage: bookData.coverImage || '',
          isbn: bookData.isbn || ''
        };
        
        await apiService.post('/recognition-cache/add', {
          ocrText,
          bookData: safeBookData,
          source,
          confidence
        });
        
        console.log(`Cache: libro "${bookData.title}" aggiunto con successo alla cache remota`);
      } catch (serverError) {
        console.warn('Cache: Impossibile aggiungere alla cache remota - continuo con la cache locale', serverError);
        // Continua con la cache locale anche se il server fallisce
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta alla cache:', error);
      // Non propagare l'errore per evitare di interrompere il flusso dell'app
    }
  }
  
  /**
   * Impara dal feedback dell'utente
   * @param {string} ocrText - Testo OCR originale
   * @param {Object} correctBook - Libro corretto
   * @param {Object} incorrectBook - Libro riconosciuto erroneamente
   */
  async learnFromUserFeedback(ocrText, correctBook, incorrectBook = null) {
    if (!ocrText) {
      return false;
    }
    
    try {
      console.log("Cache: elaborazione feedback utente");
      
      // Se abbiamo sia il libro corretto che quello errato
      if (correctBook && incorrectBook) {
        await apiService.post('/recognition-cache/correction', {
          ocrText,
          incorrectBookId: incorrectBook.googleBooksId,
          correctBookId: correctBook.googleBooksId
        });
        console.log("Feedback: correzione registrata");
        return true;
      } 
      // Se abbiamo solo il libro errato
      else if (incorrectBook) {
        await apiService.post('/recognition-cache/false-positive', {
          ocrText,
          bookId: incorrectBook.googleBooksId
        });
        console.log("Feedback: falso positivo registrato");
        return true;
      }
      // Se abbiamo solo il libro corretto
      else if (correctBook) {
        await this.addToCache(ocrText, correctBook, 'corrected', 0.9);
        console.log("Feedback: aggiunto libro corretto alla cache");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Errore nell\'elaborazione feedback:', error);
      return false;
    }
  }
  
  /**
   * Pre-popola la cache
   */
  async prePopulateCache() {
    try {
      console.log("Avvio pre-popolamento cache...");
      
      const response = await apiService.post('/recognition-cache/prepopulate');
      
      if (response && response.data && response.data.success) {
        console.log("Richiesta di pre-popolamento inviata con successo");
        return true;
      }
      
      console.warn("Pre-popolamento avviato, ma risposta non standard:", response?.data);
      return Boolean(response?.data);
    } catch (error) {
      console.error('Errore nel pre-popolamento cache:', error);
      return false;
    }
  }
  
  /**
   * Attiva/disattiva la cache
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    console.log(`Cache ${this.enabled ? 'attivata' : 'disattivata'}`);
  }
  
  /**
   * Ottieni statistiche sulla cache
   */
  async getRemoteStats() {
    try {
      const response = await apiService.get('/recognition-cache/statistics');
      
      if (response.data.success) {
        return response.data.statistics;
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel recupero statistiche cache:', error);
      return null;
    }
  }
  
  /**
   * Ottieni statistiche locali sulla cache
   */
  getStats() {
    return {
      totalEntries: Object.keys(this.localCache).length,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      enabled: this.enabled
    };
  }
  
  /**
   * Normalizza il testo per la ricerca in cache
   * @private
   */
  _normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Genera una chiave per la cache locale
   * @private
   */
  _generateLocalCacheKey(normalizedText) {
    // Prendi i primi 50 caratteri del testo normalizzato come chiave
    const baseKey = normalizedText.substring(0, 50);
    
    // Semplice hash per rendere la chiave più compatta
    let hash = 0;
    for (let i = 0; i < baseKey.length; i++) {
      hash = ((hash << 5) - hash) + baseKey.charCodeAt(i);
      hash |= 0; // Converti a integer a 32 bit
    }
    
    return `${Math.abs(hash).toString(16)}_${baseKey.length}`;
  }

  /**
   * Estrai parole chiave da un testo
   * @private
   */
  _extractKeywords(text) {
    if (!text) return [];
    
    // Preprocessing: normalizza ulteriormente il testo
    const cleanedText = text
      .replace(/[^\w\s]/g, ' ')  // Rimuovi caratteri speciali
      .toLowerCase()
      .replace(/\s+/g, ' ')     // Normalizza spazi
      .trim();
    
    // Dividi in parole
    const words = cleanedText.split(' ');
    
    // Lista di stopwords italiane
    const stopwords = ['della', 'dello', 'degli', 'delle', 'nella', 'nello', 
                      'negli', 'nelle', 'sono', 'essere', 'questo', 'questi', 
                      'quella', 'quelle', 'come', 'dove', 'quando', 'perché',
                      'più', 'meno', 'poco', 'molto', 'troppo', 'con', 'senza'];
    
    // Filtra le parole: mantieni solo quelle più lunghe di 3 caratteri e non nella lista stopwords
    const filteredWords = words
      .filter(word => word.length > 3 && !stopwords.includes(word))
      .sort((a, b) => b.length - a.length) // Ordina per lunghezza decrescente
      .slice(0, 10);  // Prendi le 10 parole più lunghe
    
    return filteredWords;
  }

  /**
   * Cerca un libro utilizzando OCR e Google Books
   * @param {string} ocrText - Testo OCR da cercare
   * @returns {Promise<Object>} - Risultato della ricerca
   */
  async searchWithOcr(ocrText) {
    if (!ocrText || ocrText.length < 5) {
      console.log("Ricerca OCR: testo OCR non valido");
      return { success: false, message: "Testo OCR non valido" };
    }
    
    try {
      console.log("Ricerca OCR: avvio ricerca distribuita...");
      
      const response = await apiService.post('/recognition-cache/search-with-ocr', {
        ocrText
      });
      
      // Salva alternative se presenti
      if (response.data.alternatives) {
        this.alternativeMatches = response.data.alternatives;
      }
      
      return response.data;
    } catch (error) {
      console.error('Errore nella ricerca OCR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Svuota la cache locale
   */
  clearLocalCache() {
    this.localCache = {};
    console.log('Cache locale svuotata');
  }
}

const recognitionCacheService = new RecognitionCacheService();
export default recognitionCacheService;