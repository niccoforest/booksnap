// server/src/controllers/googleVision.controller.js
const axios = require('axios');

/**
 * Controller per Google Cloud Vision API
 */
const googleVisionController = {
  /**
   * Rileva testo in un'immagine
   */
  async detectText(req, res) {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API_KEY_MISSING',
        message: 'Google Cloud Vision API key non configurata'
      });
    }

    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_IMAGE',
          message: 'Immagine non fornita'
        });
      }
      
      // Invia la richiesta a Google Cloud Vision API
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          requests: [
            {
              image: {
                content: image
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 10
                }
              ]
            }
          ]
        }
      );
      
      // Estrai il risultato
      const result = response.data.responses[0];
      
      return res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Errore nel riconoscimento testo:', error.response ? error.response.data : error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: 'Errore durante il riconoscimento del testo'
      });
    }
  },

  /**
   * Verifica lo stato della configurazione
   */
  getStatus(req, res) {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    console.log("Google Vision status check - API Key configurata:", Boolean(apiKey));
    
    return res.json({
      success: true,
      configured: Boolean(apiKey)
    });
  }
};

module.exports = googleVisionController;