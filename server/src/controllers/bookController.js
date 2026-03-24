const Book = require('../models/Book');
const llmService = require('../services/llmService');
const googleBooksService = require('../services/googleBooksService');

/**
 * Endpoint POST /api/scan
 * Riceve l'immagine della libreria dal frontend, la analizza con LLM (OpenRouter),
 * arricchisce i dati con Google Books API e salva i libri nel DB.
 */
const scanLibrary = async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nessuna immagine fornita.' });
    }

    // 1. Invia immagine a OpenRouter per riconoscere i titoli/autori
    console.log('Analizzo immagine con OpenRouter...');
    const recognizedBooks = await llmService.analyzeLibraryImage(imageBase64);

    if (!recognizedBooks || recognizedBooks.length === 0) {
      return res.status(200).json({
        message: 'Nessun libro riconosciuto nell\'immagine.',
        books: []
      });
    }

    console.log(`Riconosciuti ${recognizedBooks.length} libri.`);

    // 2. Arricchisci i dati tramite Google Books API per ogni libro trovato
    const enrichedBooks = [];
    const savedBooks = [];

    for (const bookData of recognizedBooks) {
      const { title, author } = bookData;
      if (!title) continue; // Salta se non c'è il titolo

      console.log(`Cerco metadati per: "${title}" di "${author || 'sconosciuto'}"`);

      try {
        const metadata = await googleBooksService.searchBookMetadata(title, author);

        if (metadata) {
          // Se trovato, crea oggetto arricchito
          enrichedBooks.push(metadata);

          // Controlla se il libro esiste già (es. tramite ISBN) per evitare duplicati
          let existingBook = null;
          if (metadata.isbn) {
            existingBook = await Book.findOne({ isbn: metadata.isbn });
          } else {
            // Se non c'è isbn controlla per titolo (case insensitive) - safe per caratteri speciali
            const safeTitle = metadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            existingBook = await Book.findOne({ title: new RegExp(`^${safeTitle}$`, 'i') });
          }

          if (!existingBook) {
            // Salva nel DB
            const newBook = new Book(metadata);
            await newBook.save();
            savedBooks.push(newBook);
            console.log(`Salvato nuovo libro: "${metadata.title}"`);
          } else {
            console.log(`Libro già presente nel DB: "${metadata.title}"`);
            // Opzionale: potremmo voler restituire anche i libri già presenti,
            // ma per "savedCount" contiamo solo i nuovi aggiunti.
          }
        } else {
          // Se Google Books non lo trova, salvalo comunque come base
          console.warn(`Metadati non trovati per "${title}". Salvo solo titolo/autore.`);

          const safeTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const existingBookTitle = await Book.findOne({ title: new RegExp(`^${safeTitle}$`, 'i') });
          if (!existingBookTitle) {
            const baseBook = {
              title: title,
              authors: author ? [author] : [],
            };
            const newBook = new Book(baseBook);
            await newBook.save();
            savedBooks.push(newBook);
            console.log(`Salvato nuovo libro (base): "${title}"`);
          } else {
            console.log(`Libro (base) già presente: "${title}"`);
          }
        }
      } catch (innerError) {
        console.error(`Errore durante l'elaborazione del libro "${title}":`, innerError);
        // Continua con il prossimo libro anche se uno fallisce
      }
    }

    // Risposta di successo con i libri trovati e arricchiti (sia nuovi che preesistenti non gestito qui, restituiamo i salvati)
    return res.status(200).json({
      message: 'Scansione completata.',
      recognizedCount: recognizedBooks.length,
      savedCount: savedBooks.length,
      books: savedBooks
    });

  } catch (error) {
    console.error('Errore durante la scansione:', error);
    return res.status(500).json({
      error: 'Errore durante l\'elaborazione dell\'immagine.',
      details: error.message
    });
  }
};

/**
 * Endpoint GET /api/books
 * Recupera tutti i libri salvati nel database.
 */
const getBooks = async (req, res) => {
  try {
    // Ordina per data aggiunta decrescente
    const books = await Book.find().sort({ dateAdded: -1 });
    return res.status(200).json({
      count: books.length,
      books: books
    });
  } catch (error) {
    console.error('Errore nel recupero dei libri:', error);
    return res.status(500).json({ error: 'Errore nel recupero dei libri.' });
  }
};

module.exports = {
  scanLibrary,
  getBooks
};
