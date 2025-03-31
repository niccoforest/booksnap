// scripts/improvedImportKaggleData.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Connessione ottimizzata per MongoDB Atlas
async function connectToDatabase() {
  console.log('Connessione al database...');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: false,  // Importante: disattiva l'autoIndex durante l'importazione
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      maxPoolSize: 5  // Ridotto per minimizzare la contesa delle risorse
    });
    console.log('Connessione al database riuscita!');
    return mongoose.connection;
  } catch (error) {
    console.error('Errore di connessione al database:', error);
    throw error;
  }
}

// Carica il modello dopo la connessione
function loadModel() {
  try {
    return require('../server/src/models/recognitionCache.model');
  } catch (error) {
    console.error('Errore nel caricamento del modello:', error);
    throw error;
  }
}

// Genera testo OCR simulato
function generateSimulatedOcr(book) {
  const parts = [];
  
  if (book.author) {
    parts.push(book.author);
  }
  
  if (book.title) {
    parts.push(book.title);
  }
  
  if (book.author && book.title) {
    parts.push(`${book.title} di ${book.author}`);
  }
  
  return parts.join('\n');
}

// Estrazione parole chiave semplificata
function extractKeywords(text) {
  if (!text) return [];
  
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleanText.split(' ');
  const filtered = words.filter(word => word.length > 3);
  
  return filtered.slice(0, 10); // Limitiamo a 10 per ridurre dimensioni
}

// Importa dati da Books2.csv
async function importFromBooks2(filePath, limit = 50) {
  console.log(`Importazione da ${filePath}...`);
  
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
        if (counter < 2) {
          console.log('Riga CSV esempio (Books2):', JSON.stringify(row));
        }
        
        if (counter >= limit) return;
        
        const book = {
          title: row.title || '',
          author: row.authors || '',
          isbn: row.isbn || '',
          isbn13: row.isbn13 || '',
          publisher: row.publisher || '',
          publishedYear: row.publication_date ? parseInt(row.publication_date.split('/')[2]) : null,
          language: row.language_code || '',
          pageCount: row['  num_pages'] ? parseInt(row['  num_pages']) : 0,
          coverImage: '',
          genres: [],
          googleBooksId: `books2_${row.bookID || counter}`
        };
        
        if (book.title && book.author) {
          books.push(book);
          counter++;
          
          if (counter % 10 === 0) {
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

// Salva un singolo libro con retry
async function saveBook(RecognitionCache, book, attempt = 1) {
  try {
    const simulatedOcr = generateSimulatedOcr(book);
    const normalizedText = simulatedOcr.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const keywords = extractKeywords(simulatedOcr);
    
    // Semplifichiamo e riduciamo dimensioni dei dati
    const simpleBookData = {
      googleBooksId: book.googleBooksId,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      publishedYear: book.publishedYear,
      isbn: book.isbn,
      language: book.language,
      coverImage: book.coverImage
    };
    
    const newCacheEntry = new RecognitionCache({
      normalizedText,
      keywords,
      bookData: simpleBookData,
      source: 'prepopulated',
      confidence: 0.7,
      usageCount: 1
    });
    
    // Utilizziamo un timeout esplicito
    const savePromise = newCacheEntry.save();
    let timeoutId;
    
    const saveWithTimeout = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Timeout durante il salvataggio'));
      }, 15000); // 15 secondi di timeout
      
      savePromise
        .then(resolve)
        .catch(reject);
    });
    
    try {
      const result = await saveWithTimeout;
      clearTimeout(timeoutId);
      return true;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < 3) {
        console.log(`Retry ${attempt}/3 per "${book.title}"`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 secondi tra i retry
        return saveBook(RecognitionCache, book, attempt + 1);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error(`Errore nel salvataggio di "${book.title}": ${err.message}`);
    return false;
  }
}

// Importazione principale
async function importKaggleData() {
  let connection;
  try {
    connection = await connectToDatabase();
    const RecognitionCache = loadModel();
    
    // Percorsi ai file di dati
    const books2FilePath = path.resolve(__dirname, 'data', 'books2.csv');
    
    // Importa da Books2.csv
    const books2Data = await importFromBooks2(books2FilePath, 20); // Solo 20 per test
    console.log(`Pronti per importare ${books2Data.length} libri`);
    
    // Importa a piccoli batch con attese tra le operazioni
    const batchSize = 5;
    let successCount = 0;
    
    for (let i = 0; i < books2Data.length; i += batchSize) {
      console.log(`Elaborazione batch ${i/batchSize + 1}/${Math.ceil(books2Data.length/batchSize)}...`);
      
      const batch = books2Data.slice(i, i + batchSize);
      
      // Salva ogni libro nel batch sequenzialmente
      for (const book of batch) {
        try {
          console.log(`Tentativo di salvare "${book.title}"...`);
          const success = await saveBook(RecognitionCache, book);
          
          if (success) {
            successCount++;
            console.log(`Libro "${book.title}" salvato con successo (${successCount}/${books2Data.length})`);
          }
          
          // Pausa tra operazioni di scrittura
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`Errore nel salvataggio del libro "${book.title}":`, error);
        }
      }
      
      // Pausa più lunga tra i batch
      if (i + batchSize < books2Data.length) {
        console.log(`Pausa di 10 secondi prima del prossimo batch...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log(`Importazione completata. ${successCount}/${books2Data.length} libri importati con successo.`);
  } catch (err) {
    console.error('Errore durante l\'importazione:', err);
  } finally {
    if (connection) {
      console.log('Chiusura connessione al database...');
      await mongoose.connection.close();
    }
  }
}

// Esegui lo script
importKaggleData()
  .then(() => {
    console.log('Script completato.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Errore nello script:', err);
    process.exit(1);
  });