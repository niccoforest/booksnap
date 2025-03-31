// client/src/utils/bookStatusUtils.js
import React from 'react';
import { 
  MenuBook as ReadingIcon,
  CheckCircle as CompletedIcon,
  Bookmark as ToReadIcon,
  BookmarkRemove as AbandonedIcon,
  PeopleAlt as LentIcon
} from '@mui/icons-material';

/**
 * Ottiene l'icona corrispondente allo stato di lettura
 * @param {string} status - Stato di lettura ('reading', 'completed', 'abandoned', 'lent', 'to-read')
 * @returns {React.ReactElement} - Icona corrispondente
 */
export const getReadStatusIcon = (status) => {
  switch (status) {
    case 'reading':
      return <ReadingIcon color="primary" />;
    case 'completed':
      return <CompletedIcon color="success" />;
    case 'abandoned':
      return <AbandonedIcon color="error" />;
    case 'lent':
      return <LentIcon color="warning" />;
    case 'to-read':
    default:
      return <ToReadIcon color="disabled" />;
  }
};

/**
 * Ottiene l'etichetta corrispondente allo stato di lettura
 * @param {string} status - Stato di lettura ('reading', 'completed', 'abandoned', 'lent', 'to-read')
 * @returns {string} - Etichetta in italiano
 */
export const getReadStatusLabel = (status) => {
  switch (status) {
    case 'reading':
      return 'In lettura';
    case 'completed':
      return 'Completato';
    case 'abandoned':
      return 'Abbandonato';
    case 'lent':
      return 'Prestato';
    case 'to-read':
    default:
      return 'Da leggere';
  }
};

/**
 * Estrae i dati essenziali del libro dall'oggetto completo
 * @param {Object} bookData - Dati completi del libro
 * @returns {Object} - Dati essenziali del libro
 */
export const extractBookData = (bookData) => {
  if (!bookData) return {
    title: 'Titolo sconosciuto',
    author: 'Autore sconosciuto',
    coverImage: null,
    publishedYear: null,
    publisher: null,
    isbn: null,
    description: null,
    pageCount: null,
    language: null
  };
  
  return {
    title: bookData.title || 'Titolo sconosciuto',
    author: bookData.author || (bookData.authors ? (Array.isArray(bookData.authors) ? bookData.authors.join(', ') : bookData.authors) : 'Autore sconosciuto'),
    coverImage: bookData.coverImage || null,
    publishedYear: bookData.publishedYear || (bookData.publishedDate ? parseInt(bookData.publishedDate.substring(0, 4)) : null),
    publisher: bookData.publisher || null,
    isbn: bookData.isbn || null,
    description: bookData.description || null,
    pageCount: bookData.pageCount || null,
    language: bookData.language || null
  };
};

/**
 * Determina se l'oggetto rappresenta un libro userBook (un libro nella libreria dell'utente)
 * @param {Object} book - Oggetto libro da verificare
 * @returns {boolean} - true se è un userBook
 */
export const isUserBook = (book) => {
  return Boolean(book && (book.bookId || book.userId));
};

/**
 * Estrae l'ID del libro in modo consistente, gestendo sia libri normali che userBook
 * @param {Object} book - Oggetto libro
 * @returns {string|null} - ID del libro
 */
export const getBookId = (book) => {
  if (!book) return null;
  
  // Se è un userBook, usa bookId
  if (isUserBook(book)) {
    return book.bookId?._id || book.bookId;
  }
  
  // Altrimenti usa l'id diretto del libro
  return book._id || book.googleBooksId;
};

/**
 * Estrae l'ID della relazione userBook
 * @param {Object} userBook - Oggetto userBook
 * @returns {string|null} - ID della relazione userBook
 */
export const getUserBookId = (userBook) => {
  if (!userBook) return null;
  
  // Se è già una stringa, restituiscila direttamente
  if (typeof userBook === 'string') return userBook;
  
  // Se è un oggetto con _id, restituisci _id
  if (userBook._id) return userBook._id;
  
  // Prova altre possibili proprietà ID
  if (userBook.id) return userBook.id;
  if (userBook.userBookId) return userBook.userBookId;
  
  // Log di debug
  console.warn('getUserBookId: impossibile trovare un ID valido per:', userBook);
  
  return null;
};