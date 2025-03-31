// client/src/services/isbn.service.js
class IsbnService {
    // Verifica se una stringa è un ISBN valido (10 o 13 cifre)
    isValid(isbn) {
      if (!isbn) return false;
      
      // Rimuovi caratteri non numerici (tranne 'X' alla fine per ISBN-10)
      const cleanIsbn = isbn.replace(/[^\dX]/gi, '');
      
      // Controlla lunghezza
      if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
        return false;
      }
      
      // ISBN-10
      if (cleanIsbn.length === 10) {
        // Verifica carattere di controllo per ISBN-10
        let sum = 0;
        for (let i = 0; i < 9; i++) {
          sum += parseInt(cleanIsbn[i]) * (10 - i);
        }
        
        // Gestisci l'ultimo carattere (può essere 'X' che vale 10)
        const last = cleanIsbn[9].toUpperCase();
        sum += (last === 'X') ? 10 : parseInt(last);
        
        return sum % 11 === 0;
      }
      
      // ISBN-13
      if (cleanIsbn.length === 13) {
        // Verifica carattere di controllo per ISBN-13
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += parseInt(cleanIsbn[i]) * (i % 2 === 0 ? 1 : 3);
        }
        
        const check = (10 - (sum % 10)) % 10;
        return check === parseInt(cleanIsbn[12]);
      }
      
      return false;
    }
    
    // Formatta un ISBN per la ricerca
    format(isbn) {
      if (!isbn) return '';
      
      // Rimuovi caratteri non numerici (tranne 'X' alla fine)
      const cleanIsbn = isbn.replace(/[^\dX]/gi, '');
      
      // Verifica se è lungo abbastanza
      if (cleanIsbn.length < 10) {
        return cleanIsbn;
      }
      
      // Se sembra un ISBN-10
      if (cleanIsbn.length === 10) {
        return cleanIsbn;
      }
      
      // Se sembra un ISBN-13
      if (cleanIsbn.length === 13) {
        return cleanIsbn;
      }
      
      // Altrimenti prendi i primi 13 caratteri o i primi 10 se non arriva a 13
      return cleanIsbn.length >= 13 ? cleanIsbn.substring(0, 13) : cleanIsbn.substring(0, 10);
    }
    
    // Estrae possibili ISBN da un testo
    extractFromText(text) {
      if (!text) return null;
      
      // Pulizia testo
      const cleanText = text.replace(/\s+/g, '');
      
      // Cerca pattern che potrebbero essere ISBN
      // ISBN-13: 13 cifre, spesso inizia con 978 o 979
      const isbn13Pattern = /(?:978|979)?\d{10,13}/g;
      // ISBN-10: 10 cifre, può terminare con X
      const isbn10Pattern = /\d{9}[\dX]/g;
      
      let matches = [];
      
      // Cerca ISBN-13
      const matches13 = cleanText.match(isbn13Pattern);
      if (matches13) {
        matches = matches.concat(matches13);
      }
      
      // Cerca ISBN-10
      const matches10 = cleanText.match(isbn10Pattern);
      if (matches10) {
        matches = matches.concat(matches10);
      }
      
      // Filtra per validità
      const validIsbns = matches
        .map(isbn => isbn.replace(/[^\dX]/gi, ''))
        .filter(isbn => this.isValid(isbn));
      
      return validIsbns.length > 0 ? validIsbns[0] : null;
    }
  }
  
  const isbnServiceInstance = new IsbnService();
  export default isbnServiceInstance;