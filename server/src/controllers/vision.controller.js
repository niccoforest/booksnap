// Aggiungere in server/src/controllers/vision.controller.js
const fetch = require('node-fetch');
const config = require('../config');

exports.processImage = async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({ success: false, message: 'Richiesta non valida' });
    }
    
    // Chiama Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${config.googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Errore Google Vision API:', errorText);
      return res.status(response.status).json({ 
        success: false, 
        message: `Errore API Vision: ${response.status} ${response.statusText}`
      });
    }
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Errore durante l\'elaborazione Vision:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server durante l\'elaborazione Vision'
    });
  }
};