import axios from 'axios';
import apiService from './api.service';

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
 * Salva un libro nel database
 * @param {Object} bookData - Dati del libro da salvare
 * @returns {Promise<Object>} - Libro salvato con ID
 */
async saveBook(bookData) {
  try {
    // Assicurati che ci siano almeno titolo e autore
    if (!bookData.title || !bookData.author) {
      throw new Error('Titolo e autore sono campi obbligatori');
    }
    
    // Formatta i dati del libro secondo lo schema del backend
    const book = {
      title: bookData.title,
      author: Array.isArray(bookData.authors) ? bookData.authors.join(', ') : bookData.author,
      isbn: bookData.isbn || '',
      publisher: bookData.publisher || '',
      publishedYear: bookData.publishedYear ? parseInt(bookData.publishedYear) : 
                     (bookData.publishedDate ? parseInt(bookData.publishedDate.substring(0, 4)) : null),
      // Assicuriamoci che pageCount sia un numero valido o 0
      pageCount: bookData.pageCount ? parseInt(bookData.pageCount) : 0,
      description: bookData.description || '',
      language: bookData.language || 'it', // Imposta una lingua predefinita
      genres: bookData.categories || bookData.genres || [],
      coverImage: bookData.coverImage || bookData.largeImage || '',
      googleBooksId: bookData.googleBooksId || ''
    };
    
    // Rimuovi eventuali valori null o undefined
    Object.keys(book).forEach(key => 
      (book[key] === null || book[key] === undefined) && delete book[key]
    );
    
    console.log('Invio libro per salvataggio:', book);
    
    // Salva il libro nel database tramite API
    const response = await apiService.post('/books', book);
    
    if (response.success) {
      console.log('Libro salvato con successo:', response.data);
      return response.data;
    } else {
      throw new Error(response.message || 'Errore nel salvataggio del libro');
    }
  } catch (error) {
    console.error('Errore nel salvataggio del libro:', error);
    
    // Se il libro esiste già, potremmo ricevere una risposta 200
    if (error.response && error.response.status === 200 && error.response.data && error.response.data.success) {
      return error.response.data.data; // Il libro esiste già, restituisci i dati
    }
    
    throw error;
  }
}
  
/**
 * Aggiunge un libro alla libreria personale dell'utente
 * @param {Object} book - Dati del libro (salvato nel DB)
 * @param {Object} userBookData - Dati personalizzati dell'utente (stato lettura, valutazione, note)
 * @param {String} libraryId - ID della libreria (opzionale)
 * @param {String} userId - ID dell'utente (opzionale)
 * @returns {Promise<Object>} - Risposta dal server
 */
async addBookToLibrary(book, userBookData, libraryId = null, userId = null) {
  try {
    // Prima, assicurati che il libro sia salvato nel database
    let savedBook = book;
    
    // Se il libro non ha un ID MongoDB, salvalo prima
    if (!book._id) {
      try {
        savedBook = await this.saveBook(book);
      } catch (error) {
        // Se l'errore contiene un messaggio che indica che il libro esiste già,
        // cerchiamo di recuperare il libro esistente
        if (error.response?.data?.success && error.response?.data?.data) {
          // Il libro esiste già, usiamo quello
          savedBook = error.response.data.data;
        } else {
          // Altrimenti, rilancia l'errore
          throw error;
        }
      }
    }
    
    // Prepara i dati per aggiungere il libro alla libreria dell'utente
    const userBookPayload = {
      bookId: savedBook._id,
      userId,
      readStatus: userBookData.readStatus || 'to-read',
      notes: userBookData.notes || ''
    };
    
    // Se è specificato un ID libreria, lo aggiungiamo
    if (libraryId) {
      userBookPayload.libraryId = libraryId;
    }
    
    // Gestione corretta del rating:
    // - Se è null o undefined o 0, non inviamo il campo
    // - Se è > 0, lo inviamo come specificato
    if (userBookData.rating && userBookData.rating > 0) {
      userBookPayload.rating = userBookData.rating;
    }
    
    // Se ci sono date di inizio/fine lettura, aggiungile
    if (userBookData.startedReading) {
      userBookPayload.startedReading = userBookData.startedReading;
    }
    
    if (userBookData.finishedReading) {
      userBookPayload.finishedReading = userBookData.finishedReading;
    }
    
    console.log('Invio payload per userBook:', userBookPayload);
    
    try {
      // Aggiungi il libro alla libreria dell'utente
      const response = await apiService.post('/user-books', userBookPayload);
      
      console.log('Risposta aggiunta libro:', response);
      
      if (response.success) {
        console.log('Libro aggiunto alla libreria con successo:', response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Errore nell\'aggiunta del libro alla libreria');
      }
    } catch (error) {
      // Se il libro è già nella libreria, il server restituisce un errore 400
      // con un messaggio specifico
      if (error.response?.status === 400 && 
          (error.response?.data?.error?.includes('già nella tua biblioteca') ||
          error.response?.data?.data)) {
        
        // Recupera i dati del libro esistente se disponibili
        if (error.response.data && error.response.data.data) {
          console.log('Libro già presente nella libreria:', error.response.data.data);
          return error.response.data.data;
        }
        
        // Altrimenti, simula un risultato positivo
        return {
          success: true,
          message: 'Libro già presente nella libreria',
          bookId: savedBook._id,
          userId: userId,
          readStatus: userBookData.readStatus || 'to-read'
        };
      }
      
      // Rilancia l'errore per altri tipi di problemi
      throw error;
    }
  } catch (error) {
    console.error('Errore nell\'aggiunta del libro alla libreria:', error);
    // Log più dettagliato dell'errore
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dati risposta:', error.response.data);
    }
    throw error;
  }
}
  
/**
 * Verifica se un libro è nella libreria dell'utente con fallback
 * @param {string} googleBooksId - ID Google Books del libro
 * @param {string} userId - ID dell'utente
 * @returns {Promise<boolean>} - true se il libro è già nella libreria
 */
async checkBookInUserLibraryWithFallback(googleBooksId, userId) {
  try {
    // Prima prova con il nuovo endpoint dedicato
    try {
      const result = await this.checkBookInLibraryDirect(googleBooksId, userId);
      console.log(`Verifica diretta per ${googleBooksId}: ${result}`);
      return result;
    } catch (directError) {
      console.log('Endpoint diretto non disponibile, uso fallback:', directError.message);
      // Se fallisce, prova con il metodo originale
    }

    // Metodo originale con correzioni
    return await this.checkBookInUserLibrary(googleBooksId, userId);
  } catch (error) {
    console.error('Tutti i metodi di verifica falliti:', error);
    return false;
  }
}

/**
 * Gestione locale (cache) delle verifiche dei libri in libreria
 * per ridurre le chiamate API
 */
_libraryCache = {};

/**
 * Cache dei risultati delle verifiche dei libri
 * @param {string} googleBooksId - ID Google Books del libro
 * @param {string} userId - ID dell'utente
 * @param {boolean} isInLibrary - Risultato della verifica
 */
cacheLibraryResult(googleBooksId, userId, isInLibrary) {
  const key = `${googleBooksId}_${userId}`;
  this._libraryCache[key] = {
    result: isInLibrary,
    timestamp: Date.now()
  };
}

/**
 * Verifica se un risultato è nella cache
 * @param {string} googleBooksId - ID Google Books del libro
 * @param {string} userId - ID dell'utente 
 * @returns {boolean|null} - Risultato cached o null
 */
getCachedLibraryResult(googleBooksId, userId) {
  const key = `${googleBooksId}_${userId}`;
  const cached = this._libraryCache[key];
  
  if (!cached) return null;
  
  // Considera valido per 5 minuti
  if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
    delete this._libraryCache[key];
    return null;
  }
  
  return cached.result;
}

/**
 * Verifica se un libro è già nella libreria dell'utente
 * @param {string} googleBooksId - ID Google Books del libro
 * @param {string} userId - ID dell'utente
 * @returns {Promise<boolean>} - true se il libro è già nella libreria
 */
async checkBookInUserLibrary(googleBooksId, userId) {
  try {
    if (!googleBooksId || !userId) {
      console.log(`checkBookInUserLibrary: parametri mancanti, googleBooksId=${googleBooksId}, userId=${userId}`);
      return false;
    }
    
    console.log(`Verifica per libro con googleBooksId=${googleBooksId}`);
    
    // Utilizziamo il nuovo endpoint dedicato
    try {
      // Codifica correttamente i parametri URL
      const encodedGBooksId = encodeURIComponent(googleBooksId);
      const encodedUserId = encodeURIComponent(userId);
      
      // Chiama l'endpoint dedicato
      const url = `/books/check-in-library/${encodedGBooksId}/${encodedUserId}`;
      console.log(`Chiamata all'endpoint dedicato: GET ${url}`);
      
      const response = await apiService.get(url);
      console.log('Risposta endpoint dedicato:', response);
      
      // Verifica la risposta
      if (response.success === true) {
        console.log(`Libro in libreria: ${response.inLibrary}`);
        return response.inLibrary === true;
      }
      
      return false;
    } catch (error) {
      // Correzione errore sintassi: usare apici doppi invece dell'apostrofo
      console.error("Errore nella chiamata all'endpoint dedicato:", error);
      
      // Fallback al metodo precedente se l'endpoint non è disponibile
      console.log('Fallback al metodo precedente');
      return await this._checkBookInUserLibraryOld(googleBooksId, userId);
    }
  } catch (error) {
    console.error('Errore nella verifica del libro nella libreria:', error);
    return false;
  }
}

/**
 * Metodo precedente per verificare se un libro è nella libreria
 * @private
 */
async _checkBookInUserLibraryOld(googleBooksId, userId) {
  try {
    // Codifica correttamente i parametri URL
    const encodedGBooksId = encodeURIComponent(googleBooksId);
    
    // Step 1: Trova il libro nel database
    const bookUrl = `/books?googleBooksId=${encodedGBooksId}`;
    console.log(`Chiamata API fallback: GET ${bookUrl}`);
    
    const bookResponse = await apiService.get(bookUrl);
    
    // Se il libro non esiste nel database, non può essere nella libreria
    if (!bookResponse.success || !bookResponse.data || bookResponse.data.length === 0) {
      console.log('Libro non trovato nel database');
      return false;
    }
    
    // Otteniamo l'ID MongoDB del libro
    const bookId = bookResponse.data[0]._id;
    console.log(`ID libro trovato: ${bookId}`);
    
    // Step 2: Verifica se l'utente ha questo libro
    const encodedBookId = encodeURIComponent(bookId);
    const encodedUserId = encodeURIComponent(userId);
    const userBooksUrl = `/user-books?bookId=${encodedBookId}&userId=${encodedUserId}`;
    console.log(`Chiamata API fallback: GET ${userBooksUrl}`);
    
    const userBooksResponse = await apiService.get(userBooksUrl);
    
    // Controlla la risposta
    let isInLibrary = false;
    
    if (userBooksResponse.success) {
      if (userBooksResponse.data && Array.isArray(userBooksResponse.data) && userBooksResponse.data.length > 0) {
        isInLibrary = true;
      } else if (userBooksResponse.count && userBooksResponse.count > 0) {
        isInLibrary = true;
      }
    }
    
    console.log(`Libro in libreria (fallback): ${isInLibrary}`);
    return isInLibrary;
  } catch (error) {
    console.error('Errore nel metodo fallback:', error);
    return false;
  }
}
  
  /**
   * Recupera i libri dalla libreria dell'utente
   * @param {Object} filters - Filtri opzionali (libraryId, readStatus, etc.)
   * @param {number} page - Numero di pagina
   * @param {number} limit - Numero di risultati per pagina
   * @returns {Promise<Object>} - Lista di libri con metadati di paginazione
   */
  async getUserBooks(filters = {}, page = 1, limit = 10) {
    try {
      // Prepara i parametri di query
      const params = {
        page,
        limit,
        ...filters
      };
      
      // Richiesta per ottenere i libri dell'utente
      const response = await apiService.get('/user-books', { params });
      
      if (response.success) {
        return {
          books: response.data,
          totalBooks: response.total,
          totalPages: response.totalPages,
          currentPage: response.currentPage
        };
      } else {
        throw new Error(response.message || 'Errore nel recupero dei libri');
      }
    } catch (error) {
      console.error('Errore nel recupero dei libri dell\'utente:', error);
      throw error;
    }
  }
  
  /**
   * Aggiorna i dati personalizzati di un libro nella libreria dell'utente
   * @param {string} userBookId - ID della relazione utente-libro
   * @param {Object} updateData - Dati da aggiornare (readStatus, rating, notes, etc.)
   * @returns {Promise<Object>} - Dati aggiornati
   */
  async updateUserBook(userBookId, updateData) {
    try {
      const response = await apiService.put(`/user-books/${userBookId}`, updateData);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Errore nell\'aggiornamento del libro');
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento del libro dell\'utente:', error);
      throw error;
    }
  }
  
  /**
   * Rimuove un libro dalla libreria dell'utente
   * @param {string} userBookId - ID della relazione utente-libro
   * @returns {Promise<Object>} - Esito dell'operazione
   */
  async removeFromLibrary(userBookId) {
    try {
      const response = await apiService.delete(`/user-books/${userBookId}`);
      
      if (response.success) {
        return { success: true, message: 'Libro rimosso dalla libreria con successo' };
      } else {
        throw new Error(response.message || 'Errore nella rimozione del libro');
      }
    } catch (error) {
      console.error('Errore nella rimozione del libro dalla libreria:', error);
      throw error;
    }
  }
}

const bookServiceInstance = new BookService();
export default bookServiceInstance;