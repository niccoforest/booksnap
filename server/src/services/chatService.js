const axios = require('axios');
const Book = require('../models/Book');

/**
 * Servizio per la chat con il Bibliotecario AI (OpenRouter)
 *
 * @param {Array} chatHistory - Array di messaggi {role: 'user'|'assistant', content: String}
 * @returns {String} - Risposta dell'assistente
 */
const chatWithLibrarian = async (chatHistory) => {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    // Recupera la libreria dell'utente (qui prendiamo tutti i libri come proxy singolo utente)
    const userBooks = await Book.find().select('title authors categories -_id');
    const libraryContext = userBooks.map(b => `- ${b.title} di ${b.authors.join(', ')}`).join('\n');

    // Prompt di sistema (Persona del Bibliotecario)
    const systemPrompt = `
Sei un assistente bibliotecario amichevole, colto e appassionato, integrato nell'app BookSnap.
Il tuo scopo è aiutare l'utente a gestire la sua libreria, consigliare libri da leggere tra quelli che già possiede,
e suggerire nuovi acquisti basandoti sui suoi gusti (dedotti dai libri che possiede).

Questa è la libreria attuale dell'utente:
${libraryContext ? libraryContext : 'La libreria è attualmente vuota.'}

Regole importanti:
1. Sii conciso ma coinvolgente.
2. Formatta i titoli dei libri in corsivo o grassetto (es. *Il Signore degli Anelli* o **1984**).
3. Se l'utente chiede cosa leggere stasera, proponi una o due opzioni motivando la scelta.
4. Se la libreria è vuota, incoraggialo a scansionare i suoi primi libri.
`;

    const model = process.env.LLM_CHAT_MODEL || 'anthropic/claude-3.5-sonnet';

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory
    ];

    if (!OPENROUTER_API_KEY) {
       console.warn('Nessuna chiave OPENROUTER_API_KEY, mock chatbot');
       return "Ciao! Non sono collegato al mio cervello artificiale in questo momento, ma vedo che hai un'ottima libreria!";
    }

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: model,
      messages: messages
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'BookSnap Chat'
      }
    });

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Errore nel servizio Chat OpenRouter:', error.response?.data || error.message);
    throw new Error('Impossibile contattare il Bibliotecario in questo momento.');
  }
};

module.exports = {
  chatWithLibrarian
};
