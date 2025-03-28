// server/src/services/googleBooks.service.js
const axios = require('axios');

const API_BASE_URL = 'https://www.googleapis.com/books/v1';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

/**
 * Servizio per interagire con Google Books API dal backend
 */
class GoogleBooksService {
  /**
   * Cerca libri per query (titolo, autore, ISBN, ecc.)
   * @param {string} query - Termine di ricerca
   * @param {number} maxResults - Numero massimo di risultati
   * @returns {Promise<Array>} - Array di libri trovati
   */
  async searchBooks(query, maxResults = 10) {
    if (!query || query.trim() === '') {
      return [];
    }

    try {
      // Costruzione URL con parametri di ricerca
      const url = new URL(`${API_BASE_URL}/volumes`);
      url.searchParams.append('q', query);
      url.searchParams.append('maxResults', maxResults);
      if (API_KEY) url.searchParams.append('key', API_KEY);

      const response = await axios.get(url.toString());
      
      // Se non ci sono risultati, restituisci array vuoto
      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      // Mappa i risultati al nostro formato
      return response.data.items.map(item => this.mapBookData(item));
    } catch (error) {
      console.error('Errore durante la ricerca dei libri:', error);
      throw error;
    }
  }

  /**
   * Cerca un libro specifico tramite ISBN
   * @param {string} isbn - Codice ISBN (10 o 13 cifre)
   * @returns {Promise<Object|null>} - Dati del libro o null se non trovato
   */
  async getBookByIsbn(isbn) {
    if (!isbn) {
      return null;
    }

    try {
      // Pulisci l'ISBN da trattini e spazi
      const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
      
      // Cerca per ISBN specifico
      const query = `isbn:${cleanIsbn}`;
      const books = await this.searchBooks(query, 1);
      
      // Restituisci il primo risultato o null
      return books.length > 0 ? books[0] : null;
    } catch (error) {
      console.error('Errore durante la ricerca del libro per ISBN:', error);
      throw error;
    }
  }

  /**
   * Ottiene i dettagli completi di un libro tramite il suo ID Google Books
   * @param {string} googleBooksId - ID del libro in Google Books
   * @returns {Promise<Object|null>} - Dati dettagliati del libro
   */
  async getBookDetails(googleBooksId) {
    if (!googleBooksId) {
      return null;
    }

    try {
      const url = `${API_BASE_URL}/volumes/${googleBooksId}`;
      const params = API_KEY ? `?key=${API_KEY}` : '';
      
      const response = await axios.get(`${url}${params}`);
      return this.mapBookData(response.data);
    } catch (error) {
      console.error('Errore durante il recupero dei dettagli del libro:', error);
      throw error;
    }
  }

  /**
   * Mappa i dati di Google Books al formato utilizzato dall'app
   * @param {Object} bookData - Dati grezzi da Google Books API
   * @returns {Object} - Dati libro nel formato dell'app
   */
  mapBookData(bookData) {
    const { id, volumeInfo } = bookData;
    
    if (!volumeInfo) {
      return null;
    }

    const {
      title,
      authors,
      publisher,
      publishedDate,
      description,
      industryIdentifiers,
      pageCount,
      categories,
      language,
      imageLinks,
    } = volumeInfo;

    // Estrai ISBN (se disponibile)
    let isbn10 = '';
    let isbn13 = '';
    if (industryIdentifiers && Array.isArray(industryIdentifiers)) {
      const isbn10Obj = industryIdentifiers.find(id => id.type === 'ISBN_10');
      const isbn13Obj = industryIdentifiers.find(id => id.type === 'ISBN_13');
      
      isbn10 = isbn10Obj ? isbn10Obj.identifier : '';
      isbn13 = isbn13Obj ? isbn13Obj.identifier : '';
    }

    // Formato anno di pubblicazione
    const publishedYear = publishedDate 
      ? parseInt(publishedDate.substring(0, 4), 10) 
      : null;

    return {
      googleBooksId: id,
      title: title || 'Titolo sconosciuto',
      author: authors ? authors.join(', ') : 'Autore sconosciuto',
      publisher: publisher || '',
      publishedYear,
      description: description || '',
      isbn: isbn13 || isbn10 || '',
      isbn10,
      isbn13,
      pageCount: pageCount || 0,
      language: language || '',
      genres: categories || [],
      coverImage: imageLinks?.thumbnail || imageLinks?.smallThumbnail || '',
      largeImage: imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail || '',
    };
  }
  
  /**
   * Ottiene libri popolari per categoria
   * @param {string} category - Categoria di libri
   * @param {number} maxResults - Numero massimo di risultati
   * @returns {Promise<Array>} - Array di libri trovati
   */
  async getPopularBooks(category = 'fiction', maxResults = 40) {
    try {
      // Costruisci query appropriata
      let query = `subject:${category}`;
      
      // Aggiungi filtro per classici se appropriato
      if (category === 'fiction' || category === 'literature') {
        query += '+subject:classics';
      }
      
      // Ordina per rilevanza
      const urlStr = `${API_BASE_URL}/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&orderBy=relevance`;
      const finalUrl = API_KEY ? `${urlStr}&key=${API_KEY}` : urlStr;
      
      const response = await axios.get(finalUrl);
      
      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }
      
      return response.data.items.map(item => this.mapBookData(item));
    } catch (error) {
      console.error('Errore durante il recupero dei libri popolari:', error);
      throw error;
    }
  }
}

module.exports = new GoogleBooksService();