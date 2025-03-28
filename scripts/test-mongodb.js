// test-mongodb.js
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Tentativo di connessione a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connessione riuscita!');
    
    // Verifica se il database risponde
    const result = await mongoose.connection.db.admin().ping();
    console.log('Ping al database:', result);
    
    // Verifica informazioni server
    const serverInfo = await mongoose.connection.db.admin().serverInfo();
    console.log('Informazioni server MongoDB:');
    console.log('- Versione:', serverInfo.version);
    console.log('- Engine:', serverInfo.storageEngines);
    
    // Verifica stato connection pool
    console.log('Stato connection pool:', mongoose.connection.readyState);
    
  } catch (err) {
    console.error('Errore durante il test della connessione:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Connessione chiusa.');
  }
}

testConnection()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });