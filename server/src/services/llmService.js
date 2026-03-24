const axios = require('axios');

/**
 * Servizio per comunicare con OpenRouter LLM Vision
 *
 * @param {String} imageBase64 - Immagine in formato base64
 * @returns {Array} - Array di oggetti { title: String, author: String }
 */
const analyzeLibraryImage = async (imageBase64) => {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    // Fallback: se la chiave non c'è nel test mocka la risposta
    if (!OPENROUTER_API_KEY) {
      console.warn('ATTENZIONE: Nessuna chiave OPENROUTER_API_KEY trovata. Uso dati mockati.');
      return [
        { title: "Il Signore degli Anelli", author: "J.R.R. Tolkien" },
        { title: "1984", author: "George Orwell" }
      ];
    }

    // Assicurarsi che ci sia il prefisso del data URI (es. data:image/jpeg;base64,...)
    const formattedImage = imageBase64.startsWith('data:image')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    // Prompt per l'LLM Vision
    const prompt = `
Sei un assistente esperto nel riconoscere libri.
Analizza questa immagine di una libreria o di libri.
Identifica tutti i libri visibili (leggendo titoli e autori da dorsi o copertine).
Rispondi SOLO con un array JSON nel seguente formato, senza altro testo:
[
  {
    "title": "Titolo del libro",
    "author": "Nome Autore"
  }
]
Se non riesci a leggere l'autore, lascia il campo author vuoto o null. Se non trovi libri, restituisci [].
Assicurati che l'output sia strettamente un JSON valido, poiché verrà parsato programmaticamente.
`;

    // Puoi cambiare modello qui, es. 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro-vision'
    const model = process.env.LLM_MODEL || 'anthropic/claude-3.5-sonnet';

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: formattedImage } }
          ]
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000', // Necessario per OpenRouter
        'X-Title': 'BookSnap' // Necessario per OpenRouter
      }
    });

    const responseText = response.data.choices[0].message.content;

    // Tenta di parsare la risposta JSON (estraendo eventuale blocco markdown ```json ... ```)
    try {
      // Pulizia della stringa prima del parsing
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const books = JSON.parse(jsonStr);
      return Array.isArray(books) ? books : [];
    } catch (parseError) {
      console.error('Errore nel parsing JSON dall\'LLM. Risposta grezza:', responseText);
      throw new Error('Formato risposta LLM non valido');
    }

  } catch (error) {
    console.error('Errore nel servizio OpenRouter:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  analyzeLibraryImage
};
