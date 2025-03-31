// checkJsonCount.js
const fs = require('fs');
const path = require('path');

// Percorso al file
const jsonPath = path.resolve(__dirname, 'booksnap_recognition_cache.json');

// Leggi il file
try {
  const data = fs.readFileSync(jsonPath, 'utf8');
  const jsonData = JSON.parse(data);
  console.log(`Il file JSON contiene ${jsonData.length} record.`);
} catch (err) {
  console.error(`Errore durante la lettura del file: ${err.message}`);
}