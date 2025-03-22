// client/src/components/book/BookCardUtils.js
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
    author: bookData.author || 'Autore sconosciuto',
    coverImage: bookData.coverImage || null,
    publishedYear: bookData.publishedYear || null,
    publisher: bookData.publisher || null,
    isbn: bookData.isbn || null,
    description: bookData.description || null,
    pageCount: bookData.pageCount || null,
    language: bookData.language || null
  };
};