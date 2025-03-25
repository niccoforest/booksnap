// client/src/services/decisionEngine.service.js - Versione semplificata
import barcodeService from './barcode.service';

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
        cover: 0.3, // Default di base per cover
        spine: 0,
        multi: 0
      };
      
      // 1. Verifica se è un ISBN (barcode)
      try {
        const isbnResult = await this._checkForIsbn(imageData);
        if (isbnResult.found) {
          console.log('Decision Engine: rilevato ISBN');
          scores.isbn = 0.95; // Alta confidenza se troviamo un ISBN
          scores.isbnValue = isbnResult.isbn;
        }
      } catch (error) {
        console.log('Errore nella verifica ISBN:', error.message);
      }
      
      // 2. Analizza le dimensioni e proporzioni dell'immagine
      try {
        const dimensionAnalysis = await this._analyzeDimensions(imageData);
        
        // Aggiorna i punteggi in base alle dimensioni
        scores.cover += dimensionAnalysis.coverScore;
        scores.spine += dimensionAnalysis.spineScore;
        scores.multi += dimensionAnalysis.multiScore;
      } catch (error) {
        console.log('Errore nell\'analisi dimensioni:', error.message);
      }
      
      // 3. Determina il tipo più probabile
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
        isbnData: (decidedType === 'isbn' && scores.isbnValue) ? { isbn: scores.isbnValue } : null
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