// client/src/services/book.service.js
import axios from 'axios';

class BookService {
  /**
   * Cerca un libro tramite codice ISBN
   * @param {string} isbn - Codice ISBN
   * @returns {Promise<Object>} - Dati del libro
   */
  async findBookByIsbn(isbn) {
    try {
      // Rimuoviamo trattini e spazi dall'ISBN
      const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
      
      // Chiamata all'API Google Books
      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`
      );
      
      // Verifica se ci sono risultati
      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Nessun libro trovato con questo ISBN');
      }
      
      // Estrae i dati dal primo risultato
      const bookData = response.data.items[0];
      const volumeInfo = bookData.volumeInfo;
      
      // Formatta i dati del libro in un oggetto coerente
      return {
        googleBooksId: bookData.id,
        title: volumeInfo.title || 'Titolo sconosciuto',
        subtitle: volumeInfo.subtitle || '',
        authors: volumeInfo.authors || ['Autore sconosciuto'],
        publisher: volumeInfo.publisher || '',
        publishedDate: volumeInfo.publishedDate || '',
        description: volumeInfo.description || '',
        pageCount: volumeInfo.pageCount || 0,
        categories: volumeInfo.categories || [],
        language: volumeInfo.language || '',
        isbn: this.extractIsbn(volumeInfo.industryIdentifiers),
        coverImage: volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover',
        averageRating: volumeInfo.averageRating || 0,
        ratingsCount: volumeInfo.ratingsCount || 0
      };
    } catch (error) {
      console.error('Errore nella ricerca del libro:', error);
      throw error;
    }
  }
  
  /**
   * Cerca libri per query di testo (titolo, autore, etc.)
   * @param {string} query - Testo da cercare
   * @param {number} maxResults - Numero massimo di risultati
   * @returns {Promise<Array>} - Array di libri trovati
   */
  async searchBooks(query, maxResults = 10) {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
      );
      
      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }
      
      // Mappa i risultati in un formato coerente
      return response.data.items.map(item => {
        const volumeInfo = item.volumeInfo;
        
        return {
          googleBooksId: item.id,
          title: volumeInfo.title || 'Titolo sconosciuto',
          subtitle: volumeInfo.subtitle || '',
          authors: volumeInfo.authors || ['Autore sconosciuto'],
          publisher: volumeInfo.publisher || '',
          publishedDate: volumeInfo.publishedDate || '',
          description: volumeInfo.description || '',
          pageCount: volumeInfo.pageCount || 0,
          categories: volumeInfo.categories || [],
          language: volumeInfo.language || '',
          isbn: this.extractIsbn(volumeInfo.industryIdentifiers),
          coverImage: volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover',
          averageRating: volumeInfo.averageRating || 0,
          ratingsCount: volumeInfo.ratingsCount || 0
        };
      });
    } catch (error) {
      console.error('Errore nella ricerca dei libri:', error);
      throw error;
    }
  }
  
  /**
   * Estrae l'ISBN dai dati delle industryIdentifiers
   * @param {Array} identifiers - Array di identificatori
   * @returns {string} - ISBN estratto
   */
  extractIsbn(identifiers) {
    if (!identifiers || identifiers.length === 0) {
      return '';
    }
    
    // Cerca prima ISBN-13
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
    if (isbn13) {
      return isbn13.identifier;
    }
    
    // Se non c'è ISBN-13, cerca ISBN-10
    const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
    if (isbn10) {
      return isbn10.identifier;
    }
    
    // Se non trova nessuno dei due, restituisce il primo identificatore disponibile
    return identifiers[0].identifier;
  }
  
  /**
   * Aggiunge un libro alla libreria personale dell'utente
   * @param {Object} book - Dati del libro
   * @param {String} libraryId - ID della libreria (opzionale)
   * @returns {Promise<Object>} - Risposta dal server
   */
  async addBookToLibrary(book, libraryId = null) {
    try {
      // Qui implementeremo la chiamata all'API backend
      // Questa è una simulazione temporanea
      console.log('Aggiunta libro alla libreria:', book, 'libraryId:', libraryId);
      
      // In questo momento simuliamo il successo
      return {
        success: true,
        message: 'Libro aggiunto alla libreria con successo'
      };
    } catch (error) {
      console.error('Errore nell\'aggiunta del libro alla libreria:', error);
      throw error;
    }
  }
}

const bookServiceInstance = new BookService();
export default bookServiceInstance;