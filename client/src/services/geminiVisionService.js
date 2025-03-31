// client/src/services/geminiVisionService.js

class GeminiVisionService {
    constructor() {
      this.apiKey = '';
      this.enabled = false;
      this.lastResult = null;
      this.model = 'gemini-2.0-flash-lite'; // Usiamo il modello più recente per risultati migliori
      this.initFromEnvironment();
    }
  

  /**
 * Inizializza il servizio con la chiave API dall'ambiente
 */
initFromEnvironment() {
  // Accedi alla variabile d'ambiente correttamente
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (apiKey) {
    this.setApiKey(apiKey);
    console.log('GeminiVisionService inizializzato con chiave API da variabile d\'ambiente');
  } else {
    console.warn('REACT_APP_GEMINI_API_KEY non trovata nelle variabili d\'ambiente');
    
    // Per development, usa la chiave di test solo se in ambiente di sviluppo
    if (process.env.NODE_ENV === 'development') {
      const testApiKey = 'AIzaSyDQfqO8AdXNeUOYe9NYIalus6HUcA_ftyM'; // Solo per sviluppo
      this.setApiKey(testApiKey);
      console.warn('Usando chiave API di test per ambiente di sviluppo');
    }
  }
}
    /**
     * Imposta l'API key per Gemini
     * @param {string} apiKey - API key per Gemini
     */
    setApiKey(apiKey) {
      this.apiKey = apiKey;
      this.enabled = Boolean(apiKey);
      console.log(`Gemini Vision service ${this.enabled ? 'abilitato' : 'disabilitato'}`);
      return this.enabled;
    }
  
    /**
     * Abilita o disabilita il servizio
     * @param {boolean} enabled - Stato di abilitazione
     */
    setEnabled(enabled) {
      this.enabled = Boolean(enabled) && Boolean(this.apiKey);
      console.log(`Gemini Vision service ${this.enabled ? 'abilitato' : 'disabilitato'}`);
      return this.enabled;
    }
  
    /**
     * Riconosce un libro direttamente dall'immagine della copertina
     * @param {string} imageData - Immagine in formato base64
     * @param {string} language - Lingua del libro (default: 'ita')
     * @returns {Promise<Object>} - Informazioni sul libro riconosciuto
     */
    async recognizeBookFromCover(imageData, language = 'ita') {
      if (!this.enabled || !this.apiKey) {
        console.log('Gemini Vision service disabilitato o API key mancante');
        return { 
          success: false, 
          error: 'Servizio disabilitato o API key mancante' 
        };
      }
  
      try {
        console.log(`Riconoscimento libro con Gemini Vision API (lingua: ${language})...`);
        
        // Rimuovi l'header 'data:image/jpeg;base64,' se presente
        const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
        
        // Endpoint per l'API Gemini multimodale
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;
        
        // Prompt avanzato in base alla lingua
        const promptText = language === 'ita' 
          ? "Questa è la copertina di un libro. Identifica con precisione il titolo, l'autore e l'editore se visibile. Restituisci solo un oggetto JSON con i campi 'title', 'author', 'publisher' (se visibile) e 'confidence' (alta/media/bassa). Se non riesci a identificare con certezza uno dei campi, lascialo come stringa vuota."
          : "This is a book cover. Precisely identify the title, author, and publisher if visible. Return only a JSON object with fields 'title', 'author', 'publisher' (if visible) and 'confidence' (high/medium/low). If you can't identify any field with certainty, leave it as an empty string.";
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: promptText
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1, // Temperatura più bassa per risposte più deterministiche
              topK: 32,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Errore API Gemini: ${errorData.error?.message || response.statusText}`);
        }
  
        const data = await response.json();
        const text = data.candidates && 
                     data.candidates[0] && 
                     data.candidates[0].content && 
                     data.candidates[0].content.parts && 
                     data.candidates[0].content.parts[0] && 
                     data.candidates[0].content.parts[0].text;
        
        if (!text) {
          throw new Error('Risposta Gemini vuota o malformata');
        }
  
        console.log('Risposta Gemini Vision:', text);
  
        // Estrai il JSON dalla risposta
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          throw new Error('Impossibile trovare JSON nella risposta');
        }
        
        const jsonStr = jsonMatch[0];
        const result = JSON.parse(jsonStr);
        
        // Normalizza il livello di confidenza
        let confidenceValue = 0.5; // Default medio
        if (result.confidence) {
          const confidenceText = result.confidence.toLowerCase();
          if (confidenceText.includes('alta') || confidenceText.includes('high')) {
            confidenceValue = 0.9;
          } else if (confidenceText.includes('media') || confidenceText.includes('medium')) {
            confidenceValue = 0.6;
          } else if (confidenceText.includes('bassa') || confidenceText.includes('low')) {
            confidenceValue = 0.3;
          }
        }
        
        // Risultato normalizzato
        this.lastResult = {
          success: true,
          title: result.title || '',
          author: result.author || '',
          publisher: result.publisher || '',
          confidence: confidenceValue,
          raw: text
        };
        
        return this.lastResult;
      } catch (error) {
        console.error('Errore nel riconoscimento con Gemini Vision:', error);
        
        this.lastResult = {
          success: false,
          error: error.message
        };
        
        return this.lastResult;
      }
    }
  
    /**
     * Riconosce multipli libri da un'immagine di scaffale
     * @param {string} imageData - Immagine in formato base64
     * @param {string} language - Lingua dei libri (default: 'ita')
     * @returns {Promise<Object>} - Informazioni sui libri riconosciuti
     */
    async recognizeMultipleBooksFromShelf(imageData, language = 'ita') {
      if (!this.enabled || !this.apiKey) {
        console.log('Gemini Vision service disabilitato o API key mancante');
        return { 
          success: false, 
          error: 'Servizio disabilitato o API key mancante' 
        };
      }
  
      try {
        console.log(`Riconoscimento multipli libri con Gemini Vision API (lingua: ${language})...`);
        
        // Rimuovi l'header 'data:image/jpeg;base64,' se presente
        const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
        
        // Endpoint per l'API Gemini multimodale
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;
        
        // Prompt avanzato per scaffale, in base alla lingua
        const promptText = language === 'ita' 
          ? "Questa immagine mostra uno scaffale o un insieme di libri. Identifica tutti i libri visibili. Per ciascun libro, estrai titolo e autore. Restituisci solo un array JSON di oggetti, dove ogni oggetto ha campi 'title' e 'author'. Se non riesci a identificare uno dei campi, lascialo come stringa vuota. Aggiungi un campo 'confidence' (alta/media/bassa) per ogni libro."
          : "This image shows a bookshelf or a set of books. Identify all visible books. For each book, extract title and author. Return only a JSON array of objects, where each object has fields 'title' and 'author'. If you can't identify any field with certainty, leave it as an empty string. Add a 'confidence' field (high/medium/low) for each book.";
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: promptText
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.2,
              topK: 32,
              topP: 0.95,
              maxOutputTokens: 2048, // Aumentato per gestire più libri
            }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Errore API Gemini: ${errorData.error?.message || response.statusText}`);
        }
  
        const data = await response.json();
        const text = data.candidates && 
                     data.candidates[0] && 
                     data.candidates[0].content && 
                     data.candidates[0].content.parts && 
                     data.candidates[0].content.parts[0] && 
                     data.candidates[0].content.parts[0].text;
        
        if (!text) {
          throw new Error('Risposta Gemini vuota o malformata');
        }
  
        console.log('Risposta Gemini Vision per scaffale:', text);
  
        // Estrai l'array JSON dalla risposta
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('Impossibile trovare array JSON nella risposta');
        }
        
        const jsonStr = jsonMatch[0];
        const booksArray = JSON.parse(jsonStr);
        
        // Normalizza i dati per ogni libro
        const normalizedBooks = booksArray.map(book => {
          // Normalizza il livello di confidenza
          let confidenceValue = 0.5; // Default medio
          if (book.confidence) {
            const confidenceText = book.confidence.toLowerCase();
            if (confidenceText.includes('alta') || confidenceText.includes('high')) {
              confidenceValue = 0.9;
            } else if (confidenceText.includes('media') || confidenceText.includes('medium')) {
              confidenceValue = 0.6;
            } else if (confidenceText.includes('bassa') || confidenceText.includes('low')) {
              confidenceValue = 0.3;
            }
          }
          
          return {
            title: book.title || '',
            author: book.author || '',
            publisher: book.publisher || '',
            confidence: confidenceValue
          };
        });
        
        // Risultato finale
        const result = {
          success: true,
          books: normalizedBooks,
          count: normalizedBooks.length,
          raw: text
        };
        
        this.lastResult = result;
        return result;
      } catch (error) {
        console.error('Errore nel riconoscimento multipli libri con Gemini Vision:', error);
        
        this.lastResult = {
          success: false,
          error: error.message,
          books: []
        };
        
        return this.lastResult;
      }
    }

    /**
 * Alias per recognizeBookFromCover per compatibilità con interfaccia attesa
 * @param {string} imageData - Immagine in formato base64
 * @param {string} language - Lingua del libro (default: 'ita')
 * @returns {Promise<Object>} - Informazioni sul libro riconosciuto
 */
async recognizeBookCover(imageData, language = 'ita') {
  console.log('Chiamato recognizeBookCover (alias per recognizeBookFromCover)');
  return this.recognizeBookFromCover(imageData, language);
}
  
    /**
     * Restituisce l'ultimo risultato di riconoscimento
     * @returns {Object|null} - Ultimo risultato o null
     */
    getLastResult() {
      return this.lastResult;
    }
    
    /**
     * Verifica se il servizio è abilitato
     * @returns {boolean} - True se il servizio è abilitato
     */
    isEnabled() {
      return this.enabled;
    }
  }
  
  const geminiVisionService = new GeminiVisionService();
  export default geminiVisionService;