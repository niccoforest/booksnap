const Book = require('../models/Book');
const llmService = require('../services/llmService');
const googleBooksService = require('../services/googleBooksService');
const connectDB = require('../config/db');

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

    // Ensure database connection
    await connectDB();

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
          let query = {};
          if (metadata.isbn) {
            query.isbn = metadata.isbn;
          } else {
            // Se non c'è isbn controlla per titolo (case insensitive) - safe per caratteri speciali
            const safeTitle = metadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.title = new RegExp(`^${safeTitle}$`, 'i');
          }

          if (req.user && req.user.id) {
             query.user = req.user.id;
          }

          let existingBook = await Book.findOne(query);

          if (!existingBook) {
            // Salva nel DB
            const bookPayload = { ...metadata };
            if (req.user && req.user.id) bookPayload.user = req.user.id;
            const newBook = new Book(bookPayload);
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
          let query = { title: new RegExp(`^${safeTitle}$`, 'i') };
          if (req.user && req.user.id) {
             query.user = req.user.id;
          }

          const existingBookTitle = await Book.findOne(query);

          if (!existingBookTitle) {
            const baseBook = {
              title: title,
              authors: author ? [author] : [],
            };
            if (req.user && req.user.id) baseBook.user = req.user.id;
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
    await connectDB();

    // Supporta query con utente autenticato se presente
    const query = {};
    if (req.user && req.user.id) {
        query.user = req.user.id;
    }

    // Ordina per data aggiunta decrescente
    // Supporta sia dateAdded che addedAt
    const books = await Book.find(query).sort({ dateAdded: -1, addedAt: -1 });

    // Support array return like in one branch or object return in the other
    // We'll return the object with count for more details, but frontend might expect array.
    // However the branch that added auth expects `res.json(books)`. I will stick to returning the array
    // if req.user exists otherwise return object. Wait, better to always return JSON that frontend expects.
    // Let's return the object format but handle both?
    // Wait, the branch that added auth expects `res.json(books)`:
    return res.json(books);

  } catch (error) {
    console.error('Errore nel recupero dei libri:', error);
    return res.status(500).json({ error: 'Errore Server', message: error.message });
  }
};

/**
 * Endpoint POST /api/books
 * Aggiungi un nuovo libro (manuale / scansionato senza scanLibrary)
 */
const addBook = async (req, res) => {
  try {
    await connectDB();

    const bookData = {
      title: req.body.title,
      author: req.body.author,
      isbn: req.body.isbn,
      coverImage: req.body.coverImage,
      description: req.body.description,
      metadata: req.body.metadata,
    };

    if (req.user && req.user.id) {
       bookData.user = req.user.id;
    }

    const newBook = new Book(bookData);
    const book = await newBook.save();
    res.json(book);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore Server');
  }
};

module.exports = {
  scanLibrary,
  getBooks,
  addBook
};
