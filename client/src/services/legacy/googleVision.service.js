// client/src/services/googleVision.service.js
import apiService from './api.service';

class GoogleVisionService {
  constructor() {
    this.enabled = true;
    this.isConfigured = false;
  }

  /**
   * Esegue il riconoscimento del testo usando Google Cloud Vision API
   * @param {string} imageData - Immagine in formato base64
   * @returns {Promise<string>} - Testo riconosciuto
   */
  async recognizeText(imageData) {
    if (!this.enabled) {
      return null;
    }

    try {
      // Rimuovi l'header del data URL se presente
      const base64Image = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      
      console.log("Google Vision: invio richiesta al server");
      
      // Chiamata al server che farà da proxy per l'API di Google
      const response = await apiService.post('/google-vision/text-detection', {
        image: base64Image
      });
      
      if (response.data && response.data.success) {
        this.isConfigured = true;
        console.log("Google Vision: testo riconosciuto con successo");
        
        // Il testo è organizzato in paragrafi e linee
        return this._processVisionResponse(response.data.result);
      } else {
        if (response.data && response.data.error === 'API_KEY_MISSING') {
          this.isConfigured = false;
          console.warn("Google Vision: API non configurata sul server");
        } else {
          console.error("Google Vision: errore", response.data?.error);
        }
        return null;
      }
    } catch (error) {
      console.error('Errore nel riconoscimento Google Vision:', error);
      return null;
    }
  }

  /**
   * Processa la risposta dall'API di Google Vision
   * @private
   */
  _processVisionResponse(visionResult) {
    if (!visionResult || !visionResult.textAnnotations || visionResult.textAnnotations.length === 0) {
      return '';
    }
    
    // Il primo elemento contiene il testo completo
    const fullText = visionResult.textAnnotations[0].description;
    
    // Log per debug
    console.log("Google Vision - Testo completo:", fullText);
    
    return fullText;
  }

  /**
   * Controlla se l'API key è configurata sul server
   * @returns {Promise<boolean>}
   */
  async checkConfiguration() {
    try {
      console.log("Verifica configurazione Google Vision API...");
      const response = await apiService.get('/google-vision/status'); // rimosso "/api/"
      
      console.log("Risposta status API:", response);
      
      // Il problema è probabilmente qui: response è già il valore di response.data
      // a causa della configurazione di apiService.get()
      
      // Controlla se response contiene direttamente la proprietà configured
      if (response && typeof response === 'object') {
        this.isConfigured = Boolean(response.configured);
        console.log("Valore API configurata:", this.isConfigured);
      } else {
        this.isConfigured = false;
      }
      
      console.log(`Google Vision API configurata: ${this.isConfigured}`);
      return this.isConfigured;
    } catch (error) {
      console.error('Errore nella verifica configurazione Google Vision:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Attiva/disattiva il servizio
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    console.log(`Google Vision ${this.enabled ? 'attivato' : 'disattivato'}`);
  }
}

const googleVisionService = new GoogleVisionService();
export default googleVisionService;