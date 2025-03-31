// scripts/importKaggleData.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Importa il modello RecognitionCache
let RecognitionCache;

// Funzione per estrarre parole chiave
function extractKeywords(text) {
  if (!text) return [];
  
  // Normalizzazione
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Divisione in parole
  const words = cleanText.split(' ');
  
  // Filtraggio stopwords e parole corte
  const stopwords = ['della', 'dello', 'degli', 'delle', 'nella', 'nello', 
                    'negli', 'nelle', 'sono', 'essere', 'questo', 'questi', 
                    'quella', 'quelle', 'come', 'dove', 'quando', 'perché',
                    'with', 'from', 'that', 'this', 'have', 'they', 'their'];
                    
  const filtered = words.filter(word => 
    word.length > 3 && !stopwords.includes(word)
  );
  
  // Ordina per lunghezza (le parole più lunghe sono spesso più significative)
  return filtered.sort((a, b) => b.length - a.length).slice(0, 15);
}

// Genera testo OCR simulato
function generateSimulatedOcr(book) {
  const parts = [];
  
  // Aggiungi l'autore
  if (book.author) {
    parts.push(book.author);
    parts.push(book.author.toUpperCase());
  }
  
  // Aggiungi il titolo
  if (book.title) {
    parts.push(book.title);
    parts.push(book.title.toUpperCase());
  }
  
  // Combinazioni autore + titolo
  if (book.author && book.title) {
    parts.push(`${book.author} ${book.title}`);
    parts.push(`${book.title} di ${book.author}`);
  }
  
  // Aggiungi l'editore
  if (book.publisher) {
    parts.push(book.publisher);
  }
  
  // Combina tutte le parti con newline
  return parts.join('\n');
}

// Importa dati da Books2.csv
async function importFromBooks2(filePath, limit = 500) {
  console.log(`Importazione da ${filePath}...`);
  
  // Verifica che il file esista
  if (!fs.existsSync(filePath)) {
    console.error(`File non trovato: ${filePath}`);
    throw new Error(`File non trovato: ${filePath}`);
  }
  
  return new Promise((resolve, reject) => {
    const books = [];
    let counter = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Debug per vedere le prime righe
        if (counter < 2) {
          console.log('Riga CSV esempio (Books2):', JSON.stringify(row));
        }
        
        // Limita il numero di libri da importare
        if (counter >= limit) return;
        
        // Costruisci oggetto libro adattando ai campi di Books2.csv
        const book = {
          title: row.title || '',
          author: row.authors || '',
          isbn: row.isbn || '',
          isbn13: row.isbn13 || '',
          publisher: row.publisher || '',
          publishedYear: row.publication_date ? parseInt(row.publication_date.split('/')[2]) : null,
          language: row.language_code || '',
          pageCount: row['  num_pages'] ? parseInt(row['  num_pages']) : 0,
          coverImage: '', // Non disponibile in questo CSV
          genres: [],
          googleBooksId: `books2_${row.bookID || counter}`, // ID fittizio
          rating: row.average_rating ? parseFloat(row.average_rating) : 0
        };
        
        // Verifica campi obbligatori
        if (book.title && book.author) {
          books.push(book);
          counter++;
          
          // Log ogni 100 righe
          if (counter % 100 === 0) {
            console.log(`Processate ${counter} righe da Books2...`);
          }
        }
      })
      .on('end', () => {
        console.log(`Letti ${counter} libri da Books2.csv.`);
        resolve(books);
      })
      .on('error', (err) => {
        console.error('Errore durante la lettura di Books2.csv:', err);
        reject(err);
      });
  });
}

// Importa dati dal file JSON NYT
async function importFromNYT(filePath, limit = 500) {
  console.log(`Importazione da ${filePath}...`);
  
  // Verifica che il file esista
  if (!fs.existsSync(filePath)) {
    console.error(`File non trovato: ${filePath}`);
    throw new Error(`File non trovato: ${filePath}`);
  }
  
  try {
    // Leggi il file JSON
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Dividi il file in righe (ogni riga è un oggetto JSON)
    const jsonLines = fileContent.trim().split('\n');
    console.log(`Trovate ${jsonLines.length} righe nel file JSON.`);
    
    // Parsa ogni riga come JSON
    const books = [];
    let counter = 0;
    
    for (const line of jsonLines) {
      if (counter >= limit) break;
      
      try {
        const row = JSON.parse(line);
        
        // Debug per vedere i primi oggetti
        if (counter < 2) {
          console.log('Riga JSON esempio (NYT):', JSON.stringify(row));
        }
        
        // Costruisci oggetto libro adattando ai campi del JSON NYT
        const book = {
          title: row.title || '',
          author: row.author || '',
          isbn: '', // Non direttamente disponibile
          publisher: row.publisher || '',
          publishedYear: row.published_date ? new Date(parseInt(row.published_date.$date.$numberLong)).getFullYear() : null,
          language: 'eng', // Assumiamo inglese per i bestseller NYT
          pageCount: 0, // Non disponibile
          coverImage: '', // Non disponibile
          description: row.description || '',
          genres: [],
          googleBooksId: `nyt_${counter}`, // ID fittizio
          price: row.price ? (row.price.$numberDouble || row.price.$numberInt) : 0,
          rank: row.rank ? parseInt(row.rank.$numberInt) : 0,
          weeksOnList: row.weeks_on_list ? parseInt(row.weeks_on_list.$numberInt) : 0
        };
        
        // Verifica campi obbligatori
        if (book.title && book.author) {
          books.push(book);
          counter++;
          
          // Log ogni 100 righe
          if (counter % 100 === 0) {
            console.log(`Processate ${counter} righe da NYT...`);
          }
        }
      } catch (err) {
        console.error('Errore nel parsing di una riga JSON:', err);
      }
    }
    
    console.log(`Letti ${counter} libri dal file JSON NYT.`);
    return books;
  } catch (err) {
    console.error('Errore durante la lettura del file JSON NYT:', err);
    throw err;
  }
}

// Aggiunge un libro alla cache di riconoscimento con gestione errori migliorata
async function addBookToCache(book) {
  try {
    // Genera testo OCR simulato
    const simulatedOcr = generateSimulatedOcr(book);
    
    // Normalizza il testo
    const normalizedText = simulatedOcr.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Verifica se esiste già nella cache - con timeout esteso
    const existing = await Promise.race([
      RecognitionCache.findOne({
        'bookData.title': book.title,
        'bookData.author': book.author
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout controllo duplicati')), 5000)
      )
    ]).catch(() => null); // Se c'è timeout, assumiamo che non esista
    
    // Se esiste già o abbiamo avuto un timeout, saltiamo
    if (existing) {
      return false;
    }
    
    // Estrai parole chiave
    const keywords = extractKeywords(simulatedOcr);
    
    // Crea entry nella cache
    const newCacheEntry = new RecognitionCache({
      normalizedText,
      keywords,
      bookData: {
        googleBooksId: book.googleBooksId,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        publishedYear: book.publishedYear,
        isbn: book.isbn,
        isbn10: book.isbn10 || '',
        isbn13: book.isbn13 || '',
        pageCount: book.pageCount || 0,
        language: book.language || '',
        genres: book.genres || [],
        coverImage: book.coverImage || '',
        description: book.description || ''
      },
      source: 'prepopulated',
      confidence: 0.7,
      usageCount: 1
    });
    
    // Salva con timeout esteso
    await Promise.race([
      newCacheEntry.save(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout salvataggio')), 8000)
      )
    ]).catch(err => {
      console.error(`Timeout durante il salvataggio del libro "${book.title}": ${err.message}`);
      return false;
    });
    
    return true;
  } catch (err) {
    console.error(`Errore durante l'aggiunta del libro "${book.title}" alla cache:`, err.message);
    return false;
  }
}

// Elabora un lotto di libri con retry
async function processBatch(books, startIdx, batchSize) {
  const endIdx = Math.min(startIdx + batchSize, books.length);
  console.log(`Elaborazione batch ${startIdx} - ${endIdx}...`);
  
  let successCount = 0;
  
  for (let i = startIdx; i < endIdx; i++) {
    const book = books[i];
    // Tenta fino a 3 volte con backoff esponenziale
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const added = await addBookToCache(book);
        if (added) {
          successCount++;
          
          // Log ogni 10 libri
          if (successCount % 10 === 0) {
            console.log(`Aggiunti ${successCount} libri alla cache nel batch corrente...`);
          }
        }
        break; // Se successo, esci dal ciclo retry
      } catch (err) {
        console.error(`Tentativo ${attempt} fallito per "${book.title}": ${err.message}`);
        if (attempt < 3) {
          // Backoff esponenziale
          const delay = Math.pow(2, attempt) * 500;
          console.log(`Riprovo tra ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
  
  return successCount;
}

// Funzione principale
async function importKaggleData() {
  let connection;
  try {
    console.log('Connessione al database...');
    
    // Opzioni di connessione ottimizzate
    connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000, // Timeout più lungo per la selezione del server
      socketTimeoutMS: 45000,          // Timeout più lungo per le operazioni socket
      connectTimeoutMS: 30000,         // Timeout più lungo per la connessione
      maxPoolSize: 10                  // Limita il numero di connessioni
    });
    
    // Carica il modello dopo la connessione
    RecognitionCache = require('../server/src/models/recognitionCache.model');
    
    console.log('Connessione al database riuscita!');
    
    // Percorsi ai file di dati
    const books2FilePath = path.resolve(__dirname, 'data', 'books2.csv');
    const nytFilePath = path.resolve(__dirname, 'data', 'nyt2.json');
    
    // Array per memorizzare tutti i libri
    let allBooks = [];
    
    // Importa dai diversi file se esistono
    if (fs.existsSync(books2FilePath)) {
      const books2Data = await importFromBooks2(books2FilePath, 100); // Ridotto a 100 per test
      allBooks = allBooks.concat(books2Data);
      console.log(`Aggiunti ${books2Data.length} libri da Books2.csv`);
    } else {
      console.log(`File Books2.csv non trovato in ${books2FilePath}`);
    }
    
    if (fs.existsSync(nytFilePath)) {
      const nytData = await importFromNYT(nytFilePath, 100); // Ridotto a 100 per test
      allBooks = allBooks.concat(nytData);
      console.log(`Aggiunti ${nytData.length} libri da nyt2.json`);
    } else {
      console.log(`File nyt2.json non trovato in ${nytFilePath}`);
    }
    
    console.log(`Importati ${allBooks.length} libri totali.`);
    
    // Processo in batch piccoli con pause tra i batch
    const batchSize = 20;
    let totalAdded = 0;
    
    for (let i = 0; i < allBooks.length; i += batchSize) {
      // Elabora un batch
      const batchAdded = await processBatch(allBooks, i, batchSize);
      totalAdded += batchAdded;
      
      console.log(`Batch completato. Totale libri aggiunti: ${totalAdded}`);
      
      // Pausa tra i batch per dare respiro al database
      if (i + batchSize < allBooks.length) {
        console.log("Pausa di 2 secondi prima del prossimo batch...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Importazione completata. Aggiunti ${totalAdded}/${allBooks.length} libri alla cache.`);
  } catch (err) {
    console.error('Errore durante l\'importazione:', err);
    console.error(err.stack);
  } finally {
    // Chiudi la connessione
    if (connection) {
      console.log('Chiusura connessione al database...');
      await mongoose.connection.close();
    }
  }
}

// Esegui lo script
importKaggleData()
  .then(() => {
    console.log('Script completato con successo.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Errore nello script:', err);
    process.exit(1);
  });