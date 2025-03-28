// scripts/importWithNativeDriver.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Estrai l'URI dal formato mongoose
function getMongoURI() {
  const uri = process.env.MONGODB_URI;
  return uri;
}

// Genera testo OCR simulato (semplificato)
function generateSimulatedOcr(book) {
  return `${book.title} ${book.author}`;
}

// Estrai keywords semplificato
function extractKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase().split(/\W+/);
  return words.filter(w => w.length > 3).slice(0, 8);
}

async function importBooks() {
  const uri = getMongoURI();
  const client = new MongoClient(uri, {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 5
  });
  
  try {
    console.log('Connessione a MongoDB...');
    await client.connect();
    console.log('Connessione riuscita!');
    
    const database = client.db(); // Usa il database dall'URI
    const collection = database.collection('recognitioncaches');
    
    // Leggi il CSV
    const books2FilePath = path.resolve(__dirname, 'data', 'books2.csv');
    const books = await readCSV(books2FilePath, 10); // Solo 10 libri per test
    
    console.log(`Letti ${books.length} libri dal CSV.`);
    
    // Importa in piccoli batch
    const batchSize = 2;
    let successCount = 0;
    
    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      console.log(`Elaborazione batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(books.length/batchSize)}...`);
      
      // Prepara documenti per bulk insert
      const docs = batch.map(book => {
        const ocrText = generateSimulatedOcr(book);
        const keywords = extractKeywords(ocrText);
        
        return {
          normalizedText: ocrText.toLowerCase(),
          keywords: keywords,
          bookData: {
            googleBooksId: book.googleBooksId,
            title: book.title,
            author: book.author,
            publisher: book.publisher || '',
            publishedYear: book.publishedYear || null,
            isbn: book.isbn || '',
            pageCount: book.pageCount || 0,
            language: book.language || '',
            genres: [],
            coverImage: ''
          },
          source: 'prepopulated',
          confidence: 0.7,
          usageCount: 1,
          isFalsePositive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      try {
        // Inserimento con retry
        let retries = 0;
        let success = false;
        
        while (!success && retries < 3) {
          try {
            console.log(`Tentativo ${retries + 1} di inserimento per ${docs.length} documenti...`);
            const result = await collection.insertMany(docs, { ordered: false });
            console.log(`Inseriti ${result.insertedCount} documenti.`);
            successCount += result.insertedCount;
            success = true;
          } catch (insertErr) {
            retries++;
            console.error(`Errore inserimento (tentativo ${retries}):`, insertErr.message);
            
            if (retries < 3) {
              console.log(`Attesa di 8 secondi prima del prossimo tentativo...`);
              await new Promise(resolve => setTimeout(resolve, 8000));
            }
          }
        }
      } catch (batchError) {
        console.error(`Errore nel batch:`, batchError);
      }
      
      // Pausa tra batch
      if (i + batchSize < books.length) {
        console.log('Pausa di 10 secondi prima del prossimo batch...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log(`Importazione completata. ${successCount}/${books.length} libri importati.`);
    
  } catch (err) {
    console.error('Errore durante l\'importazione:', err);
  } finally {
    await client.close();
    console.log('Connessione chiusa.');
  }
}

// Leggi il CSV
function readCSV(filePath, limit = 100) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File non trovato: ${filePath}`));
    }
    
    const books = [];
    let counter = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (counter >= limit) return;
        
        const book = {
          title: row.title || '',
          author: row.authors || '',
          isbn: row.isbn || '',
          publisher: row.publisher || '',
          publishedYear: row.publication_date ? parseInt(row.publication_date.split('/')[2]) : null,
          language: row.language_code || '',
          pageCount: row['  num_pages'] ? parseInt(row['  num_pages']) : 0,
          googleBooksId: `books2_${row.bookID || counter}`
        };
        
        if (book.title && book.author) {
          books.push(book);
          counter++;
        }
      })
      .on('end', () => resolve(books))
      .on('error', reject);
  });
}

importBooks()
  .then(() => console.log('Script completato.'))
  .catch(err => console.error('Errore script:', err));