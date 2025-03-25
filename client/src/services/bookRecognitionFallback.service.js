// client/src/services/bookRecognitionFallback.service.js
import googleBooksService from './googleBooks.service';

class BookRecognitionFallbackService {
  /**
   * Cerca un libro basandosi su informazioni parziali (titolo, autore, etc.)
   * Utilizzato come fallback quando OCR e barcode falliscono
   * @param {Object} info - Informazioni parziali del libro
   * @returns {Promise<Object>} - Dati del libro trovato o null
   */
  async findBookByPartialInfo(info) {
    try {
      // Estrai le informazioni disponibili
      const { title, author, isbn } = info;
      
      // Se abbiamo un ISBN, è la nostra priorità
      if (isbn) {
        const bookByIsbn = await googleBooksService.getBookByIsbn(isbn);
        if (bookByIsbn) return bookByIsbn;
      }
      
      // Se abbiamo titolo e autore, proviamo una ricerca combinata
      if (title && author) {
        const query = `intitle:${title} inauthor:${author}`;
        const results = await googleBooksService.searchBooks(query, 5);
        
        if (results && results.length > 0) {
          // Trova il match migliore
          return this._findBestMatch(results, title, author);
        }
      }
      
      // Se abbiamo solo il titolo, proviamo con quello
      if (title) {
        const query = `intitle:${title}`;
        const results = await googleBooksService.searchBooks(query, 5);
        
        if (results && results.length > 0) {
          // Trova il match migliore
          return this._findBestMatch(results, title, author);
        }
      }
      
      // Se abbiamo solo l'autore, proviamo con quello
      if (author) {
        const query = `inauthor:${author}`;
        const results = await googleBooksService.searchBooks(query, 5);
        
        if (results && results.length > 0) {
          // Trova il match migliore
          return this._findBestMatch(results, title, author);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel fallback di riconoscimento:', error);
      return null;
    }
  }
  
  /**
   * Trova il miglior match tra i risultati di ricerca
   * @private
   */
  _findBestMatch(results, title, author) {
    if (!results || results.length === 0) return null;
    
    // Se c'è solo un risultato, restituiscilo direttamente
    if (results.length === 1) return results[0];
    
    // Calcola un punteggio per ogni risultato
    const scoredResults = results.map(book => {
      let score = 0;
      
      // Calcola la similarità del titolo
      if (title && book.title) {
        const titleSimilarity = this._calculateSimilarity(
          title.toLowerCase(),
          book.title.toLowerCase()
        );
        score += titleSimilarity * 3; // Il titolo ha un peso maggiore
      }
      
      // Calcola la similarità dell'autore
      if (author && book.author) {
        const authorSimilarity = this._calculateSimilarity(
          author.toLowerCase(),
          book.author.toLowerCase()
        );
        score += authorSimilarity * 2;
      }
      
      // Bonus per libri con copertina
      if (book.coverImage) {
        score += 0.5;
      }
      
      return { book, score };
    });
    
    // Ordina per punteggio decrescente
    scoredResults.sort((a, b) => b.score - a.score);
    
    // Restituisci il libro con il punteggio più alto
    return scoredResults[0].book;
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
}

const bookRecognitionFallbackService = new BookRecognitionFallbackService();
export default bookRecognitionFallbackService;