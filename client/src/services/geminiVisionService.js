// client/src/services/geminiVisionService.js

class GeminiVisionService {
    constructor() {
      this.apiKey = '';
      this.enabled = false;
      this.lastResult = null;
      // Usa il modello multimodale adatto
      this.model = 'gemma-3-27b-it'; // Oppure gemini-2.5-pro-exp-03-25 per risultati migliori
    }
  
    /**
     * Imposta l'API key per Gemini
     * @param {string} apiKey - API key per Gemini
     */
    setApiKey(apiKey) {
      this.apiKey = apiKey;
      this.enabled = Boolean(apiKey);
      console.log(`Gemini Vision service ${this.enabled ? 'abilitato' : 'disabilitato'}`);
    }
  
    /**
     * Abilita o disabilita il servizio
     * @param {boolean} enabled - Stato di abilitazione
     */
    setEnabled(enabled) {
      this.enabled = Boolean(enabled) && Boolean(this.apiKey);
      console.log(`Gemini Vision service ${this.enabled ? 'abilitato' : 'disabilitato'}`);
    }
  
    /**
     * Riconosce un libro direttamente dall'immagine della copertina
     * @param {string} imageData - Immagine in formato base64
     * @returns {Promise<Object>} - Informazioni sul libro riconosciuto
     */
    async recognizeBookFromCover(imageData) {
      if (!this.enabled || !this.apiKey) {
        console.log('Gemini Vision service disabilitato o API key mancante');
        return { 
          success: false, 
          error: 'Servizio disabilitato o API key mancante' 
        };
      }
  
      try {
        console.log('Riconoscimento libro con Gemini Vision API...');
        
        // Rimuovi l'header 'data:image/jpeg;base64,' se presente
        const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
        
        // Endpoint corretto per l'API Gemini multimodale
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Questa è la copertina di un libro. Identifica il titolo e l'autore esatti. Restituisci solo un oggetto JSON con i campi 'title', 'author' e 'confidence' (alta/media/bassa). Se non riesci a identificare con certezza uno dei campi, lascialo vuoto."
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
        
        this.lastResult = {
          success: true,
          title: result.title || '',
          author: result.author || '',
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
     * Restituisce l'ultimo risultato di riconoscimento
     * @returns {Object|null} - Ultimo risultato o null
     */
    getLastResult() {
      return this.lastResult;
    }
  }
  
  const geminiVisionService = new GeminiVisionService();
  export default geminiVisionService;