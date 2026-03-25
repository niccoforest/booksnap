const axios = require('axios');

/**
 * Cerca informazioni dettagliate su un libro usando Google Books API
 *
 * @param {String} title - Titolo del libro
 * @param {String} author - Autore del libro (opzionale)
 * @returns {Object} - Dettagli del libro o null se non trovato
 */
const searchBookMetadata = async (title, author) => {
  try {
    let query = `intitle:${title}`;
    if (author) {
      query += `+inauthor:${author}`;
    }

    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${keyParam}&maxResults=1`;

    const response = await axios.get(url);

    if (response.data.items && response.data.items.length > 0) {
      const bookData = response.data.items[0].volumeInfo;

      // Estrai le informazioni necessarie
      return {
        title: bookData.title || title,
        authors: bookData.authors || [author].filter(Boolean),
        isbn: extractISBN(bookData.industryIdentifiers),
        coverUrl: bookData.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        description: bookData.description || '',
        publishedDate: bookData.publishedDate || '',
        pageCount: bookData.pageCount || 0,
        categories: bookData.categories || [],
      };
    }

    return null;
  } catch (error) {
    console.error(`Errore nella ricerca Google Books per "${title}":`, error.message);
    return null;
  }
};

/**
 * Estrae l'ISBN-13 dagli identificatori di Google Books
 */
const extractISBN = (identifiers) => {
  if (!identifiers || !Array.isArray(identifiers)) return null;

  const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;

  const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
  if (isbn10) return isbn10.identifier;

  return null;
};

module.exports = {
  searchBookMetadata
};
