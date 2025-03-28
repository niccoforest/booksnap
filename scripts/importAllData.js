// scripts/importAllData.js
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// File checkpoint per ripresa importazione
const CHECKPOINT_FILE = path.resolve(__dirname, 'recognition_cache_import_checkpoint.json');

// Leggi checkpoint se esiste
let checkpoint = { processed: 0, imported: 0 };

if (fs.existsSync(CHECKPOINT_FILE)) {
  try {
    checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    console.log('Ripresa importazione da checkpoint:', checkpoint);
  } catch (err) {
    console.error('Errore lettura checkpoint, ripartenza da zero:', err);
  }
}

// Salva checkpoint
function saveCheckpoint() {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint), 'utf8');
  console.log('Checkpoint salvato:', checkpoint);
}

// Importa dataset nel database con supporto batch
async function importCacheToMongoDB(cacheData, batchSize = 20) {
  const uri = process.env.MONGODB_URI;
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
    
    const database = client.db();
    const collection = database.collection('recognitioncaches');
    
    console.log(`Preparazione importazione di ${cacheData.length} record di riconoscimento...`);
    
    let successCount = 0;
    const totalBatches = Math.ceil(cacheData.length / batchSize);
    
    for (let i = 0; i < cacheData.length; i += batchSize) {
      const batch = cacheData.slice(i, i + batchSize);
      console.log(`Elaborazione batch ${Math.floor(i/batchSize) + 1}/${totalBatches}...`);
      
      // Trasforma i record nel formato desiderato per MongoDB
      const docs = batch.map(item => {
        return {
          normalizedText: item.ocrText.toLowerCase(),
          ocrText: item.ocrText,
          keywords: item.keywords,
          bookData: {
            ...item.bookData,
            // Assicurati che googleBooksId sia presente, altrimenti generane uno
            googleBooksId: item.bookData.googleBooksId || `gen_${item.bookData.isbn || Math.random().toString(36).substring(7)}`
          },
          source: item.source || 'prepopulated',
          confidence: item.confidence || 0.85,
          usageCount: 1,
          isFalsePositive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      // Inserimento con retry
      let retries = 0;
      let success = false;
      
      while (!success && retries < 3) {
        try {
          const result = await collection.insertMany(docs, { ordered: false });
          console.log(`Inseriti ${result.insertedCount} documenti.`);
          successCount += result.insertedCount;
          success = true;
          
          // Aggiorna checkpoint
          checkpoint.processed = i + batch.length;
          checkpoint.imported += result.insertedCount;
          saveCheckpoint();
        } catch (insertErr) {
          retries++;
          // Gestisci l'errore di documenti duplicati
          if (insertErr.code === 11000) { // Duplicate key error
            const insertedCount = insertErr.result ? insertErr.result.insertedCount : 0;
            console.warn(`Avviso: ${insertedCount} documenti inseriti, alcuni duplicati saltati.`);
            successCount += insertedCount;
            success = true;
            
            // Aggiorna checkpoint anche in caso di parziale successo
            checkpoint.processed = i + batch.length;
            checkpoint.imported += insertedCount;
            saveCheckpoint();
          } else {
            console.error(`Errore inserimento (tentativo ${retries}):`, insertErr.message);
            
            if (retries < 3) {
              console.log(`Attesa di 5 secondi prima del prossimo tentativo...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }
      }
      
      // Pausa tra batch
      if (i + batchSize < cacheData.length) {
        const pauseTime = 1000;
        console.log(`Pausa di ${pauseTime/1000} secondi prima del prossimo batch...`);
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
    }
    
    return successCount;
  } finally {
    await client.close();
    console.log('Connessione chiusa.');
  }
}

// Funzione principale con supporto ripresa
async function importRecognitionCache() {
  try {
    // Impostazione limiti per batch
    const batchLimit = process.argv[2] ? parseInt(process.argv[2]) : Infinity; // Numero di record massimi
    const batchSize = process.argv[3] ? parseInt(process.argv[3]) : 100;  // Dimensione di ogni batch inserito
    
    // Percorso al file
    const cachePath = path.resolve(__dirname, process.argv[4] || 'booksnap_recognition_cache.json');
    
    console.log(`Importazione file cache: ${cachePath}`);
    console.log(`Limite record: ${batchLimit === Infinity ? 'Nessun limite' : batchLimit}`);
    console.log(`Dimensione batch: ${batchSize}`);
    
    if (!fs.existsSync(cachePath)) {
      throw new Error(`File non trovato: ${cachePath}`);
    }
    
    // Leggi tutto il file JSON
    console.log('Lettura file JSON...');
    const fileContent = fs.readFileSync(cachePath, 'utf8');
    let cacheData = JSON.parse(fileContent);
    console.log(`File JSON caricato: ${cacheData.length} record trovati.`);
    
    // Applica skip e limit
    if (checkpoint.processed > 0) {
      console.log(`Ripresa da record #${checkpoint.processed}`);
      cacheData = cacheData.slice(checkpoint.processed);
    }
    
    if (batchLimit !== Infinity && batchLimit < cacheData.length) {
      console.log(`Applicazione limite di ${batchLimit} record.`);
      cacheData = cacheData.slice(0, batchLimit);
    }
    
    if (cacheData.length === 0) {
      console.log('Nessun nuovo record da importare.');
      return;
    }
    
    console.log(`Importazione di ${cacheData.length} record...`);
    const importedCount = await importCacheToMongoDB(cacheData, batchSize);
    
    console.log('\nImportazione completata.');
    console.log(`Totale record importati: ${importedCount}/${cacheData.length}`);
    console.log(`Progresso complessivo: ${checkpoint.imported} record importati.`);
    
  } catch (err) {
    console.error('Errore durante l\'importazione:', err);
  }
}

// Esegui lo script
importRecognitionCache()
  .then(() => console.log('Script completato. Esegui nuovamente per importare il prossimo batch se necessario.'))
  .catch(err => console.error('Errore script:', err));