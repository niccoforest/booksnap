// client/src/services/llmTextService.js

class LLMTextService {
    constructor() {
      this.provider = 'gemini'; // Default provider: 'gemini', 'openai', ecc.
      this.apiKey = ''; // Verrà impostata tramite setApiKey
      this.enabled = false;
      this.lastCleaningResult = null;
      this.lastRawText = null;
    }
  
    /**
     * Imposta il provider LLM da utilizzare
     * @param {string} provider - Provider da utilizzare ('gemini', 'openai', 'anthropic', ecc.)
     */
    setProvider(provider) {
      this.provider = provider;
      console.log(`Provider LLM impostato: ${provider}`);
    }
  
    /**
     * Imposta l'API key per il provider corrente
     * @param {string} apiKey - API key per il provider
     */
    setApiKey(apiKey) {
      this.apiKey = apiKey;
      this.enabled = Boolean(apiKey);
      console.log(`API key impostata per ${this.provider}: ${this.enabled ? 'valida' : 'non valida'}`);
    }
  
    /**
     * Abilita o disabilita il servizio
     * @param {boolean} enabled - Stato di abilitazione
     */
    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      console.log(`Servizio LLM ${this.enabled ? 'abilitato' : 'disabilitato'}`);
    }
  
    /**
     * Pulisce il testo OCR utilizzando un LLM
     * @param {string} ocrText - Testo OCR grezzo
     * @returns {Promise<Object>} - Oggetto con titolo, autore e confidenza
     */
    async cleanOcrText(ocrText) {
      if (!this.enabled || !ocrText) {
        console.log('Servizio LLM disabilitato o testo vuoto');
        return { 
          success: false, 
          title: '', 
          author: '',
          confidence: 0,
          error: 'Servizio disabilitato o testo vuoto'
        };
      }
  
      this.lastRawText = ocrText;
      console.log(`Pulizia testo OCR con ${this.provider}...`);
      
      try {
        let result;
        
        switch (this.provider) {
          case 'gemini':
            result = await this._cleanWithGemini(ocrText);
            break;
          case 'openai':
            result = await this._cleanWithOpenAI(ocrText);
            break;
          default:
            throw new Error(`Provider non supportato: ${this.provider}`);
        }
        
        this.lastCleaningResult = result;
        return result;
      } catch (error) {
        console.error(`Errore nella pulizia del testo con ${this.provider}:`, error);
        return {
          success: false,
          title: '',
          author: '',
          confidence: 0,
          error: error.message
        };
      }
    }
  
    /**
     * Pulisce il testo OCR utilizzando Google Gemini
     * @private
     * @param {string} ocrText - Testo OCR grezzo
     * @returns {Promise<Object>} - Oggetto con titolo, autore e confidenza
     */
    async _cleanWithGemini(ocrText) {
      try {
        // Utilizziamo l'endpoint REST di Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Il seguente testo è stato riconosciuto tramite OCR da una copertina di libro, ma potrebbe contenere errori. 
                Estrai il titolo e l'autore del libro, correggendo eventuali errori evidenti.
                
                Testo OCR:
                ${ocrText}
                
                Formato risposta richiesto:
                {
                  "title": "Titolo del libro",
                  "author": "Nome dell'autore",
                  "confidence": "alta/media/bassa"
                }
                
                Se non riesci a identificare con certezza titolo o autore, lascia il campo vuoto. 
                Restituisci SOLO il JSON, senza spiegazioni o altro testo.`
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
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
        const text = data.candidates[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
          throw new Error('Risposta Gemini vuota o malformata');
        }
  
        // Tenta di estrarre JSON dalla risposta
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          throw new Error('Impossibile trovare JSON nella risposta');
        }
        
        const jsonStr = jsonMatch[0];
        const result = JSON.parse(jsonStr);
        
        // Normalizza il livello di confidenza
        let confidenceValue = 0.5; // Default medio
        if (result.confidence) {
          switch(result.confidence.toLowerCase()) {
            case 'alta':
              confidenceValue = 0.9;
              break;
            case 'media':
              confidenceValue = 0.6;
              break;
            case 'bassa':
              confidenceValue = 0.3;
              break;
          }
        }
        
        return {
          success: true,
          title: result.title || '',
          author: result.author || '',
          confidence: confidenceValue,
          raw: text
        };
      } catch (error) {
        console.error('Errore nella pulizia con Gemini:', error);
        throw error;
      }
    }
  
    /**
     * Pulisce il testo OCR utilizzando OpenAI
     * @private
     * @param {string} ocrText - Testo OCR grezzo
     * @returns {Promise<Object>} - Oggetto con titolo, autore e confidenza
     */
    async _cleanWithOpenAI(ocrText) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Sei un assistente specializzato nell\'estrazione di informazioni da testi OCR di copertine di libri.'
              },
              {
                role: 'user',
                content: `Il seguente testo è stato riconosciuto tramite OCR da una copertina di libro, ma potrebbe contenere errori.
                Estrai il titolo e l'autore del libro, correggendo eventuali errori evidenti.
                
                Testo OCR:
                ${ocrText}
                
                Formato risposta richiesto:
                {
                  "title": "Titolo del libro",
                  "author": "Nome dell'autore",
                  "confidence": "alta/media/bassa"
                }
                
                Se non riesci a identificare con certezza titolo o autore, lascia il campo vuoto.
                Restituisci SOLO il JSON, senza spiegazioni o altro testo.`
              }
            ],
            temperature: 0.2,
            max_tokens: 500
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Errore API OpenAI: ${errorData.error?.message || response.statusText}`);
        }
  
        const data = await response.json();
        const text = data.choices[0]?.message?.content;
        
        if (!text) {
          throw new Error('Risposta OpenAI vuota o malformata');
        }
  
        // Tenta di estrarre JSON dalla risposta
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          throw new Error('Impossibile trovare JSON nella risposta');
        }
        
        const jsonStr = jsonMatch[0];
        const result = JSON.parse(jsonStr);
        
        // Normalizza il livello di confidenza
        let confidenceValue = 0.5; // Default medio
        if (result.confidence) {
          switch(result.confidence.toLowerCase()) {
            case 'alta':
              confidenceValue = 0.9;
              break;
            case 'media':
              confidenceValue = 0.6;
              break;
            case 'bassa':
              confidenceValue = 0.3;
              break;
          }
        }
        
        return {
          success: true,
          title: result.title || '',
          author: result.author || '',
          confidence: confidenceValue,
          raw: text
        };
      } catch (error) {
        console.error('Errore nella pulizia con OpenAI:', error);
        throw error;
      }
    }
  
    /**
     * Restituisce l'ultimo risultato di pulizia
     * @returns {Object|null} - Ultimo risultato o null
     */
    getLastResult() {
      return this.lastCleaningResult;
    }
  }
  
  const llmTextService = new LLMTextService();
  export default llmTextService;