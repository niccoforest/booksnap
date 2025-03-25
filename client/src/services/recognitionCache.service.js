// client/src/services/recognitionCache.service.js
class RecognitionCacheService {
  constructor() {
    this.cache = {};
    this.hits = 0;
    this.misses = 0;
    this.enabled = true;
    
    // Carica la cache salvata in localStorage
    this._loadFromStorage();
  }
  
  /**
   * Cerca un libro nella cache in base al testo OCR
   * @param {string} ocrText - Testo OCR da cercare
   * @returns {Object|null} - Dati del libro se trovato in cache, altrimenti null
   */
  findByOcrText(ocrText) {
    if (!this.enabled || !ocrText || ocrText.length < 5) {
      return null;
    }
    
    try {
      // Normalizza il testo per la ricerca
      const normalizedQuery = this._normalizeText(ocrText);
      
      // Estrai parole chiave
      const queryKeywords = this._extractKeywords(normalizedQuery);
      
      if (queryKeywords.length === 0) {
        return null;
      }
      
      // Cerca negli entry di cache
      let bestMatch = null;
      let bestScore = 0;
      
      for (const cacheKey in this.cache) {
        const entry = this.cache[cacheKey];
        
        // Salta entry scadute (più vecchie di 30 giorni)
        if (entry.timestamp && Date.now() - entry.timestamp > 30 * 24 * 60 * 60 * 1000) {
          delete this.cache[cacheKey];
          continue;
        }
        
        // Calcola similarità
        const similarity = this._calculateTextSimilarity(normalizedQuery, entry.normalizedText);
        
        // Se la similarità è abbastanza alta, abbiamo un match
        if (similarity > 0.7 && similarity > bestScore) {
          bestMatch = entry;
          bestScore = similarity;
        }
      }
      
      if (bestMatch) {
        // Incrementa contatore di hit
        this.hits++;
        
        // Aggiorna timestamp e contatore utilizzo
        bestMatch.usageCount = (bestMatch.usageCount || 0) + 1;
        bestMatch.timestamp = Date.now();
        this._saveToStorage();
        
        console.log(`Cache hit! Similarità: ${bestScore.toFixed(2)}, Libro: "${bestMatch.bookData.title}"`);
        
        return bestMatch.bookData;
      }
      
      // Incrementa contatore di miss
      this.misses++;
      return null;
    } catch (error) {
      console.error('Errore nella ricerca in cache:', error);
      return null;
    }
  }
  
  /**
   * Aggiunge un'associazione testo OCR -> libro alla cache
   * @param {string} ocrText - Testo OCR
   * @param {Object} bookData - Dati del libro
   */
  addToCache(ocrText, bookData) {
    if (!this.enabled || !ocrText || !bookData || ocrText.length < 5) {
      return;
    }
    
    try {
      // Normalizza il testo
      const normalizedText = this._normalizeText(ocrText);
      
      // Estrai parole chiave
      const keywords = this._extractKeywords(normalizedText);
      
      if (keywords.length === 0) {
        return;
      }
      
      // Genera chiave univoca
      const cacheKey = `${bookData.googleBooksId || bookData.title}_${Date.now()}`;
      
      // Crea entry di cache
      this.cache[cacheKey] = {
        normalizedText,
        keywords,
        bookData,
        timestamp: Date.now(),
        usageCount: 1
      };
      
      console.log(`Aggiunto alla cache: "${bookData.title}"`);
      
      // Controlla se la cache ha raggiunto il limite massimo
      this._pruneCache();
      
      // Salva la cache aggiornata
      this._saveToStorage();
    } catch (error) {
      console.error('Errore nell\'aggiunta alla cache:', error);
    }
  }
  
  /**
   * Normalizza il testo per la ricerca in cache
   * @private
   */
  _normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Rimuovi caratteri speciali
      .replace(/\s+/g, ' ')     // Normalizza spazi
      .trim();
  }
  
  /**
   * Estrae parole chiave da un testo
   * @private
   */
  _extractKeywords(text) {
    if (!text) return [];
    
    // Dividi in parole
    const words = text.split(' ');
    
    // Filtra stopwords e parole corte
    const stopwords = ['della', 'dello', 'degli', 'delle', 'nella', 'nello', 
                       'negli', 'nelle', 'sono', 'essere', 'questo', 'questi', 
                       'quella', 'quelle', 'come', 'dove', 'quando', 'perché'];
                       
    return words
      .filter(word => word.length > 3 && !stopwords.includes(word))
      // Limita il numero di keywords per non appesantire la cache
      .slice(0, 20);
  }
  
  /**
   * Calcola la similarità tra due testi
   * @private
   */
  _calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    // Dividi in parole
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    
    // Conta le parole in comune
    let matchCount = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        matchCount++;
      }
    }
    
    // Calcola Jaccard similarity
    const union = new Set([...words1, ...words2]).size;
    return matchCount / union;
  }
  
  /**
   * Rimuove le entry meno utilizzate se la cache supera la dimensione massima
   * @private
   */
  _pruneCache() {
    const entries = Object.entries(this.cache);
    
    if (entries.length <= 300) { // Massimo 300 elementi in cache
      return;
    }
    
    // Ordina per usageCount e timestamp (crescente)
    entries.sort(([, a], [, b]) => {
      // Prima per conteggio uso
      if (a.usageCount !== b.usageCount) {
        return a.usageCount - b.usageCount;
      }
      // Poi per timestamp (più vecchi prima)
      return a.timestamp - b.timestamp;
    });
    
    // Rimuovi il 20% delle entry meno utilizzate
    const removeCount = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      if (entries[i]) {
        delete this.cache[entries[i][0]];
      }
    }
    
    console.log(`Cache pruning: rimosse ${removeCount} entry`);
  }
  
  /**
  * Salva la cache in localStorage
  * @private
  */
 _saveToStorage() {
  try {
    localStorage.setItem('booksnap_recognition_cache', JSON.stringify(this.cache));
  } catch (error) {
    console.warn('Impossibile salvare la cache in localStorage:', error);
  }
}

/**
 * Carica la cache da localStorage
 * @private
 */
_loadFromStorage() {
  try {
    const savedCache = localStorage.getItem('booksnap_recognition_cache');
    if (savedCache) {
      this.cache = JSON.parse(savedCache);
      console.log(`Cache caricata: ${Object.keys(this.cache).length} entry`);
    }
  } catch (error) {
    console.warn('Impossibile caricare la cache da localStorage:', error);
    this.cache = {};
  }
}

/**
 * Svuota la cache
 */
clearCache() {
  this.cache = {};
  this._saveToStorage();
  console.log('Cache svuotata');
}

/**
 * Attiva/disattiva la cache
 * @param {boolean} enabled - Stato di attivazione
 */
setEnabled(enabled) {
  this.enabled = Boolean(enabled);
  console.log(`Cache ${this.enabled ? 'attivata' : 'disattivata'}`);
}

/**
 * Ottiene statistiche sulla cache
 */
getStats() {
  return {
    totalEntries: Object.keys(this.cache).length,
    hits: this.hits,
    misses: this.misses,
    hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
    enabled: this.enabled
  };
}
}

const recognitionCacheService = new RecognitionCacheService();
export default recognitionCacheService;