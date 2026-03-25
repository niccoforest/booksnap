const chatService = require('../services/chatService');

/**
 * Endpoint POST /api/chat
 * Gestisce la conversazione con il Bibliotecario AI
 */
const chat = async (req, res) => {
  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: 'Cronologia chat non fornita o in formato non valido.' });
    }

    const reply = await chatService.chatWithLibrarian(history);

    return res.status(200).json({
      reply: reply
    });

  } catch (error) {
    console.error('Errore nella chat:', error);
    return res.status(500).json({
      error: 'Impossibile comunicare con l\'assistente in questo momento.'
    });
  }
};

module.exports = {
  chat
};
