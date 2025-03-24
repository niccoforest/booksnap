// client/src/services/decisionEngine.service.js
import barcodeService from './barcode.service';
import simpleOcrService from './simpleOcr.service';

class DecisionEngineService {
  constructor() {
    this.lastDecision = null;
    this.decisionConfidence = 0;
    this.lastAnalysisResult = null;
  }

  /**
   * Analizza un'immagine e determina cosa sta inquadrando
   * @param {string} imageData - Immagine in formato base64
   * @returns {Promise<Object>} - Risultato dell'analisi con tipo di contenuto e confidenza
   */
  async analyzeImage(imageData) {
    if (!imageData) {
      throw new Error('Immagine non valida');
    }

    try {
      console.log('Decision Engine: analisi immagine in corso...');
      
      // Inizializza le variabili per il punteggio di confidenza
      const scores = {
        isbn: 0,
        cover: 0,
        spine: 0,
        multi: 0
      };
      
      // 1. Verifica se è un ISBN (barcode)
      const isbnResult = await this._checkForIsbn(imageData);
      if (isbnResult.found) {
        console.log('Decision Engine: rilevato ISBN');
        scores.isbn = 0.95; // Alta confidenza se troviamo un ISBN
      }
      
      // 2. Analizza le dimensioni e proporzioni dell'immagine
      const dimensionAnalysis = await this._analyzeDimensions(imageData);
      
      // Aggiorna i punteggi in base alle dimensioni
      scores.cover += dimensionAnalysis.coverScore;
      scores.spine += dimensionAnalysis.spineScore;
      scores.multi += dimensionAnalysis.multiScore;
      
      // 3. Analisi OCR preliminare (se non abbiamo già un ISBN)
      if (scores.isbn < 0.8) {
        const ocrAnalysis = await this._analyzeOcrContent(imageData);
        
        // Aggiorna i punteggi in base al contenuto OCR
        scores.cover += ocrAnalysis.coverScore;
        scores.spine += ocrAnalysis.spineScore;
      }
      
      // 4. Determina il tipo più probabile
      let decidedType = 'cover'; // Default
      let maxScore = scores.cover;
      
      if (scores.isbn > maxScore) {
        decidedType = 'isbn';
        maxScore = scores.isbn;
      }
      
      if (scores.spine > maxScore) {
        decidedType = 'spine';
        maxScore = scores.spine;
      }
      
      if (scores.multi > maxScore) {
        decidedType = 'multi';
        maxScore = scores.multi;
      }
      
      // Normalizza la confidenza tra 0 e 1
      const confidence = Math.min(1, maxScore);
      
      // Salva il risultato per riferimento futuro
      this.lastDecision = decidedType;
      this.decisionConfidence = confidence;
      this.lastAnalysisResult = scores;
      
      console.log(`Decision Engine: immagine classificata come "${decidedType}" con confidenza ${confidence.toFixed(2)}`);
      
      return {
        type: decidedType,
        confidence,
        details: scores,
        isbnData: isbnResult.found ? { isbn: isbnResult.isbn } : null
      };
    } catch (error) {
      console.error('Errore nell\'analisi dell\'immagine:', error);
      // In caso di errore, ritorna un risultato di default con confidenza bassa
      return {
        type: 'cover', // Default
        confidence: 0.3,
        details: { error: error.message },
        isbnData: null
      };
    }
  }
  
  /**
   * Verifica se l'immagine contiene un ISBN/barcode
   * @private
   */
  async _checkForIsbn(imageData) {
    try {
      // Tenta di decodificare un barcode
      const isbn = await barcodeService.decodeFromImage(imageData);
      
      return {
        found: Boolean(isbn),
        isbn
      };
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }
  
  /**
   * Analizza le dimensioni dell'immagine per determinare il tipo
   * @private
   */
  async _analyzeDimensions(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const ratio = height / width;
        
        // Inizializza i punteggi
        let coverScore = 0;
        let spineScore = 0;
        let multiScore = 0;
        
        // Analisi del rapporto altezza/larghezza
        if (ratio > 2.5) {
          // Probabilmente è una costa di libro (verticale e stretta)
          spineScore += 0.6;
          coverScore += 0.2;
        } else if (ratio > 1.2 && ratio < 1.8) {
          // Proporzioni tipiche di una copertina
          coverScore += 0.5;
          spineScore += 0.1;
        } else if (ratio < 0.8) {
          // Immagine orizzontale, potrebbe essere uno scaffale
          multiScore += 0.4;
          coverScore += 0.2;
        } else {
          // Proporzioni intermedie, potrebbero essere varie cose
          coverScore += 0.3;
          multiScore += 0.2;
          spineScore += 0.1;
        }
        
        // Analisi dimensioni assolute
        if (width > 1000 && height > 1000) {
          // Immagini grandi potrebbero contenere più libri
          multiScore += 0.2;
        }
        
        resolve({
          coverScore,
          spineScore,
          multiScore,
          dimensions: { width, height, ratio }
        });
      };
      
      img.onerror = () => {
        resolve({
          coverScore: 0.3, // Default a copertina
          spineScore: 0.1,
          multiScore: 0.1,
          dimensions: { width: 0, height: 0, ratio: 0 }
        });
      };
      
      img.src = imageData;
    });
  }
  
  /**
   * Analizza rapidamente il contenuto OCR per determinare il tipo
   * @private
   */
  async _analyzeOcrContent(imageData) {
    try {
      // Esegui OCR con parametri limitati (rapidità > accuratezza)
      const text = await simpleOcrService.recognizeText(imageData);
      
      // Inizializza i punteggi
      let coverScore = 0;
      let spineScore = 0;
      
      if (!text || text.trim().length === 0) {
        return { coverScore: 0.2, spineScore: 0.1 };
      }
      
      // Analizza il testo per pattern che potrebbero suggerire una costa
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      // Analisi orientamento testo (verticale vs orizzontale)
      if (lines.length > 3) {
        // Più linee suggeriscono testo orizzontale (copertina)
        coverScore += 0.3;
      } else {
        // Poche linee potrebbero suggerire testo verticale (costa)
        spineScore += 0.2;
      }
      
      // Analisi lunghezza linee
      const shortLines = lines.filter(line => line.length < 5).length;
      const longLines = lines.filter(line => line.length > 15).length;
      
      if (shortLines > longLines && lines.length > 0) {
        // Molte linee corte suggeriscono una costa (testo verticale)
        spineScore += 0.2;
        coverScore -= 0.1;
      } else if (longLines > 0) {
        // Linee lunghe suggeriscono una copertina
        coverScore += 0.2;
        spineScore -= 0.1;
      }
      
      return {
        coverScore,
        spineScore,
        text
      };
    } catch (error) {
      console.error('Errore nell\'analisi OCR:', error);
      return {
        coverScore: 0.2,
        spineScore: 0.1
      };
    }
  }
  
  /**
   * Ottiene l'ultima decisione e i dettagli dell'analisi
   * @returns {Object} Risultato dell'ultima analisi
   */
  getLastAnalysis() {
    return {
      decision: this.lastDecision,
      confidence: this.decisionConfidence,
      details: this.lastAnalysisResult
    };
  }
}

const decisionEngineService = new DecisionEngineService();
export default decisionEngineService;