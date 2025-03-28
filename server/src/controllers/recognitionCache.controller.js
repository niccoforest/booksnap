// server/src/controllers/recognitionCache.controller.js
const RecognitionCache = require('../models/recognitionCache.model');
const googleBooksService = require('../services/googleBooks.service');

/**
 * Estrae parole chiave da un testo
 * @private
 */
function extractKeywords(text) {
  if (!text) return [];
  
  // Preprocessing
  const cleanedText = text
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  // Dividi in parole
  const words = cleanedText.split(' ');
  
  // Lista di stopwords italiane
  const stopwords = ['della', 'dello', 'degli', 'delle', 'nella', 'nello', 
                    'negli', 'nelle', 'sono', 'essere', 'questo', 'questi', 
                    'quella', 'quelle', 'come', 'dove', 'quando', 'perché',
                    'più', 'meno', 'poco', 'molto', 'troppo', 'con', 'senza'];
  
  // Filtra le parole
  const filteredWords = words
    .filter(word => word.length > 3 && !stopwords.includes(word))
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);
  
  return filteredWords;
}

/**
 * Genera testo OCR simulato da un libro
 */
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
    parts.push(`Editore: ${book.publisher}`);
  }
  
  // Aggiungi l'ISBN se disponibile
  if (book.isbn) {
    parts.push(`ISBN ${book.isbn}`);
  }
  
  // Combina tutte le parti con newline
  return parts.join('\n');
}

/**
 * Cerca un libro nella cache in base al testo OCR
 */
exports.findByOcrText = async (req, res) => {
  try {
    const { ocrText } = req.body;
    
    if (!ocrText || typeof ocrText !== 'string' || ocrText.length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Testo OCR non fornito o troppo corto' 
      });
    }
    
    // Normalizza il testo OCR
    const normalizedText = ocrText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Cerca corrispondenza esatta del testo
    const exactMatch = await RecognitionCache.findOne({ 
      normalizedText,
      isFalsePositive: { $ne: true }
    });
    
    if (exactMatch) {
      // Aggiorna il contatore di utilizzo
      exactMatch.usageCount += 1;
      await exactMatch.save();
      
      return res.json({
        success: true,
        data: exactMatch.bookData,
        cacheType: 'exact'
      });
    }
    
    // Se non c'è corrispondenza esatta, estrai parole chiave e cerca
    const keywords = extractKeywords(normalizedText);
    
    if (keywords.length > 0) {
      // Cerca per parole chiave
      const keywordResults = await RecognitionCache.find({
        keywords: { $in: keywords },
        isFalsePositive: { $ne: true }
      })
        .sort({ usageCount: -1, confidence: -1 })
        .limit(5);
      
      if (keywordResults.length > 0) {
        // Aggiorna il contatore di utilizzo
        const topResult = keywordResults[0];
        topResult.usageCount += 1;
        await topResult.save();
        
        return res.json({
          success: true,
          data: topResult.bookData,
          alternatives: keywordResults.slice(1, 4).map(r => r.bookData),
          cacheType: 'keywords'
        });
      }
    }
    
    return res.status(404).json({ 
      success: false, 
      message: 'Nessun risultato trovato nella cache' 
    });
  } catch (error) {
    console.error('Errore nella ricerca cache per testo OCR:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Errore durante la ricerca nella cache',
      error: error.message
    });
  }
};

/**
 * Cerca un libro nella cache in base a parole chiave
 */
exports.findByKeywords = async (req, res) => {
  try {
    const { keywords } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parole chiave non fornite o in formato non valido' 
      });
    }
    
    // Cerca nella cache per parole chiave
    const cacheResults = await RecognitionCache.find({
      keywords: { $in: keywords },
      isFalsePositive: { $ne: true }
    })
      .sort({ usageCount: -1, confidence: -1 })
      .limit(5);
    
    if (cacheResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nessun risultato trovato nella cache' 
      });
    }
    
    // Aggiorna il contatore di utilizzo per i risultati
    const topResult = cacheResults[0];
    topResult.usageCount += 1;
    await topResult.save();
    
    return res.json({
      success: true,
      data: topResult.bookData,
      alternatives: cacheResults.slice(1, 4).map(r => r.bookData),
      cacheType: 'keywords'
    });
  } catch (error) {
    console.error('Errore nella ricerca cache:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Errore durante la ricerca nella cache',
      error: error.message
    });
  }
};

/**
 * Aggiungi una nuova entry alla cache
 */
exports.addToCache = async (req, res) => {
  try {
    const { ocrText, bookData, source = 'user', confidence = 0.7 } = req.body;
    
    if (!ocrText || !bookData || !bookData.googleBooksId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dati insufficienti per aggiungere alla cache' 
      });
    }
    
    // Normalizza il testo OCR
    const normalizedText = ocrText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Estrai parole chiave
    const keywords = extractKeywords(normalizedText);
    
    // Cerca se esiste già una entry con lo stesso googleBooksId e testo simile
    const existingEntry = await RecognitionCache.findOne({
      'bookData.googleBooksId': bookData.googleBooksId,
      normalizedText
    });
    
    if (existingEntry) {
      // Aggiorna l'entry esistente
      existingEntry.usageCount += 1;
      existingEntry.confidence = Math.min(1.0, existingEntry.confidence + 0.05);
      existingEntry.updatedAt = Date.now();
      await existingEntry.save();
      
      return res.json({
        success: true,
        message: 'Entry aggiornata nella cache',
        data: existingEntry
      });
    }
    
    // Crea una nuova entry
    const newCacheEntry = new RecognitionCache({
      normalizedText,
      keywords,
      bookData,
      source,
      confidence,
      usageCount: 1
    });
    
    await newCacheEntry.save();
    
    return res.status(201).json({
      success: true,
      message: 'Nuova entry aggiunta alla cache',
      data: newCacheEntry
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta alla cache:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Errore durante l\'aggiunta alla cache',
      error: error.message
    });
  }
};

/**
 * Registra un feedback negativo per un riconoscimento
 */
exports.registerFalsePositive = async (req, res) => {
    try {
      const { ocrText, bookId } = req.body;
      
      if (!ocrText || !bookId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dati insufficienti per registrare falso positivo' 
        });
      }
      
      // Normalizza il testo OCR
      const normalizedText = ocrText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Cerca la entry nella cache
      const cacheEntry = await RecognitionCache.findOne({
        'bookData.googleBooksId': bookId,
        normalizedText: { $regex: normalizedText.substring(0, 50), $options: 'i' }
      });
      
      if (cacheEntry) {
        // Marca come falso positivo
        cacheEntry.isFalsePositive = true;
        await cacheEntry.save();
        
        return res.json({
          success: true,
          message: 'Falso positivo registrato con successo'
        });
      }
      
      // Se non troviamo una corrispondenza esatta, creiamo una nuova entry
      // che segnala questo come falso positivo
      const keywords = extractKeywords(normalizedText);
      
      const newNegativeEntry = new RecognitionCache({
        normalizedText,
        keywords,
        bookData: null, // Non abbiamo un libro corretto
        isFalsePositive: true,
        falsePositiveBookId: bookId,
        confidence: 0.7,
        usageCount: 1,
        source: 'feedback'
      });
      
      await newNegativeEntry.save();
      
      return res.json({
        success: true,
        message: 'Feedback registrato come nuova entry negativa'
      });
    } catch (error) {
      console.error('Errore nella registrazione falso positivo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante la registrazione del falso positivo',
        error: error.message
      });
    }
  };

/**
 * Pre-popola la cache con libri popolari
 */
exports.prepopulateCache = async (req, res) => {
    try {
      // Lista di categorie da utilizzare per il pre-popolamento
      const categories = [
        'fiction', 'mystery', 'romance', 'science fiction',
        'biography', 'history', 'classics', 'fantasy'
      ];
      
      // Avvia il processo in background
      res.json({
        success: true,
        message: 'Avviato processo di pre-popolamento cache'
      });
      
      // Limita il numero di libri per categoria per rispettare quota API
      const booksPerCategory = 5;
      let totalAdded = 0;
      
      for (const category of categories) {
        try {
          console.log(`Pre-popolamento cache: categoria ${category}`);
          
          // Aggiungi un ritardo di 1.5 secondi tra le categorie per evitare rate limiting
          if (totalAdded > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
          // Recupera libri popolari per la categoria con gestione degli errori
          let books = [];
          try {
            books = await googleBooksService.getPopularBooks(category, booksPerCategory);
          } catch (apiError) {
            console.error(`Errore API per categoria ${category}:`, apiError.message);
            console.log(`Riprova con backoff per categoria ${category}`);
            
            // Riprova dopo 3 secondi in caso di errore API
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
              books = await googleBooksService.getPopularBooks(category, 3); // Riduci il numero per evitare problemi
            } catch (retryError) {
              console.error(`Fallito anche secondo tentativo per ${category}:`, retryError.message);
              continue; // Passa alla prossima categoria
            }
          }
          
          // Conta quanti libri sono stati aggiunti per questa categoria
          let categoryCount = 0;
          
          // Aggiungi libri alla cache
          for (const book of books) {
            try {
              // Genera testo OCR simulato
              const simulatedOcrText = generateSimulatedOcr(book);
              
              // Verifica se esiste già
              const existing = await RecognitionCache.findOne({
                'bookData.googleBooksId': book.googleBooksId
              });
              
              if (!existing) {
                // Crea entry di cache
                const keywords = extractKeywords(simulatedOcrText);
                
                const newCacheEntry = new RecognitionCache({
                  normalizedText: simulatedOcrText.toLowerCase()
                    .replace(/[^\w\s]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim(),
                  keywords,
                  bookData: book,
                  source: 'prepopulated',
                  confidence: 0.7,
                  usageCount: 1
                });
                
                await newCacheEntry.save();
                categoryCount++;
                totalAdded++;
                
                // Limita la velocità per non sovraccaricare il database
                if (totalAdded % 5 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            } catch (bookError) {
              console.error(`Errore nell'aggiunta del libro "${book.title}" alla cache:`, bookError);
            }
          }
          
          console.log(`Aggiunti ${categoryCount} libri dalla categoria ${category}`);
          
          // Pausa tra categorie per rispettare limiti di quota API
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (categoryError) {
          console.error(`Errore nella categoria ${category}:`, categoryError);
          // Continua con la prossima categoria anche in caso di errore
        }
      }
      
      console.log(`Pre-popolamento cache completato: aggiunti ${totalAdded} libri`);
    } catch (error) {
      console.error('Errore nel pre-popolamento cache:', error);
      // Non c'è bisogno di rispondere in quanto abbiamo già inviato la risposta
    }
  };

/**
 * Ottieni statistiche sulla cache
 */
exports.getStatistics = async (req, res) => {
  try {
    const totalEntries = await RecognitionCache.countDocuments();
    const bySource = await RecognitionCache.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    const topUsed = await RecognitionCache.find()
      .sort({ usageCount: -1 })
      .limit(10)
      .select('bookData.title bookData.author usageCount');
    
    return res.json({
      success: true,
      statistics: {
        totalEntries,
        bySource,
        topUsed
      }
    });
  } catch (error) {
    console.error('Errore nel recupero statistiche cache:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Errore durante il recupero delle statistiche',
      error: error.message
    });
  }
};

/**
 * Cerca un libro usando OCR e Google Books
 */
exports.searchWithOcr = async (req, res) => {
  try {
    const { ocrText } = req.body;
    
    if (!ocrText || typeof ocrText !== 'string' || ocrText.length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Testo OCR non fornito o troppo corto' 
      });
    }
    
    console.log('Ricerca con OCR:', ocrText.substring(0, 100) + '...');
    
    // Prima cerca nella cache
    const normalizedText = ocrText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Cerca corrispondenza esatta del testo
    const exactMatch = await RecognitionCache.findOne({ 
      normalizedText,
      isFalsePositive: { $ne: true }
    });
    
    if (exactMatch) {
      // Aggiorna il contatore di utilizzo
      exactMatch.usageCount += 1;
      await exactMatch.save();
      
      return res.json({
        success: true,
        data: exactMatch.bookData,
        method: 'cache_exact'
      });
    }
    
    // Se non c'è corrispondenza esatta, estrai parole chiave e cerca
    const keywords = extractKeywords(normalizedText);
    
    if (keywords.length > 0) {
      // Cerca per parole chiave
      const keywordResults = await RecognitionCache.find({
        keywords: { $in: keywords },
        isFalsePositive: { $ne: true }
      })
        .sort({ usageCount: -1, confidence: -1 })
        .limit(5);
      
      if (keywordResults.length > 0) {
        // Aggiorna il contatore di utilizzo
        const topResult = keywordResults[0];
        topResult.usageCount += 1;
        await topResult.save();
        
        return res.json({
          success: true,
          data: topResult.bookData,
          alternatives: keywordResults.slice(1, 4).map(r => r.bookData),
          method: 'cache_keywords'
        });
      }
    }
    
    // Se non troviamo nulla nella cache, proviamo con Google Books
    
    // Prima cerca un possibile ISBN nel testo OCR
    const isbnRegex = /(?:97[89])?(\d{9}[\dXx]|\d{12}[\dXx]?)/gi;
    const isbnMatches = normalizedText.match(isbnRegex);
    
    if (isbnMatches && isbnMatches.length > 0) {
      // Pulisci ISBN
      const isbn = isbnMatches[0].replace(/[^\dXx]/gi, '');
      
      if (isbn.length >= 10) {
        // Cerca per ISBN
        console.log('Ricerca per ISBN:', isbn);
        try {
          const book = await googleBooksService.getBookByIsbn(isbn);
          
          if (book) {
            // Salva nella cache per uso futuro
            const newCacheEntry = new RecognitionCache({
              normalizedText,
              keywords,
              bookData: book,
              source: 'google_books',
              confidence: 0.95,
              usageCount: 1
            });
            
            await newCacheEntry.save();
            
            return res.json({
              success: true,
              data: book,
              method: 'isbn'
            });
          }
        } catch (isbnError) {
          console.error('Errore nella ricerca per ISBN:', isbnError);
        }
      }
    }
    
    // Se non abbiamo trovato per ISBN, prova con parole chiave
    if (keywords.length > 0) {
      // Le parole chiave più lunghe hanno più probabilità di essere distintive
      keywords.sort((a, b) => b.length - a.length);
      
      // Usa al massimo le prime 5 parole chiave più significative
      const searchKeywords = keywords.slice(0, 5);
      const query = searchKeywords.join(' ');
      
      console.log('Ricerca per query:', query);
      
      try {
        const books = await googleBooksService.searchBooks(query, 5);
        
        if (books && books.length > 0) {
          // Salva il primo risultato nella cache
          const newCacheEntry = new RecognitionCache({
            normalizedText,
            keywords,
            bookData: books[0],
            source: 'google_books',
            confidence: 0.7,
            usageCount: 1
          });
          
          await newCacheEntry.save();
          
          return res.json({
            success: true,
            data: books[0],
            alternatives: books.slice(1, 4), // Primi 3 risultati alternativi
            method: 'keywords'
          });
        }
      } catch (keywordError) {
        console.error('Errore nella ricerca per parole chiave:', keywordError);
      }
    }
    
    // Se arriviamo qui, non abbiamo trovato nulla
    return res.status(404).json({
      success: false,
      message: 'Nessun libro trovato con il testo OCR fornito'
    });
  } catch (error) {
    console.error('Errore nella ricerca con OCR:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Errore durante la ricerca',
      error: error.message
    });
  }
};

/**
 * Registra un feedback positivo per un riconoscimento alternativo
 */
exports.registerCorrection = async (req, res) => {
  try {
    const { ocrText, incorrectBookId, correctBookId } = req.body;
    
    if (!ocrText || !incorrectBookId || !correctBookId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dati insufficienti per registrare correzione' 
      });
    }
    
    // Normalizza il testo OCR
    const normalizedText = ocrText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Marca l'entry incorretta come falso positivo
    const incorrectEntry = await RecognitionCache.findOne({
      'bookData.googleBooksId': incorrectBookId,
      normalizedText: { $regex: normalizedText, $options: 'i' }
    });
    
    if (incorrectEntry) {
      incorrectEntry.isFalsePositive = true;
      await incorrectEntry.save();
    }
    
  // Trova il libro corretto nella cache o recuperalo da Google Books
  let correctBook = await RecognitionCache.findOne({
    'bookData.googleBooksId': correctBookId
  });
  
  if (!correctBook) {
    // Recupera da Google Books API
    const bookData = await googleBooksService.getBookDetails(correctBookId);
    
    if (!bookData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Libro corretto non trovato' 
      });
    }
    
    // Crea una nuova entry con alta confidenza
    const keywords = extractKeywords(normalizedText);
    
    const newCacheEntry = new RecognitionCache({
      normalizedText,
      keywords,
      bookData,
      source: 'corrected',
      confidence: 0.9,
      usageCount: 1
    });
    
    await newCacheEntry.save();
    
    return res.status(201).json({
      success: true,
      message: 'Correzione registrata con successo',
      data: newCacheEntry
    });
  } else {
    // Aumenta la confidenza per il libro corretto
    correctBook.confidence = Math.min(1.0, correctBook.confidence + 0.1);
    correctBook.usageCount += 1;
    await correctBook.save();
    
    return res.json({
      success: true,
      message: 'Correzione registrata con successo',
      data: correctBook
    });
  }
} catch (error) {
  console.error('Errore nella registrazione correzione:', error);
  return res.status(500).json({ 
    success: false, 
    message: 'Errore durante la registrazione della correzione',
    error: error.message
  });
}
};