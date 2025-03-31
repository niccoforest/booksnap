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
      multi: 0,
      details: {} // Per debug e trasparenza
    };
    
    // Parallelizza le analisi per velocizzare il processo
    const [isbnResult, dimensionAnalysis, edgeAnalysis] = await Promise.all([
      this._checkForIsbn(imageData).catch(e => ({ found: false, error: e.message })),
      this._analyzeDimensions(imageData).catch(e => ({ coverScore: 0.3, spineScore: 0, multiScore: 0, error: e.message })),
      this._analyzeEdges(imageData).catch(e => ({ coverScore: 0, spineScore: 0, multiScore: 0, error: e.message }))
    ]);
    
    // 1. Analisi ISBN
    if (isbnResult.found) {
      scores.isbn = 0.95;
      scores.isbnValue = isbnResult.isbn;
      scores.details.isbn = { found: true, value: isbnResult.isbn };
    } else {
      scores.details.isbn = { found: false };
      if (isbnResult.error) scores.details.isbn.error = isbnResult.error;
    }
    
    // 2. Analisi dimensioni
    scores.cover += dimensionAnalysis.coverScore;
    scores.spine += dimensionAnalysis.spineScore;
    scores.multi += dimensionAnalysis.multiScore;
    scores.details.dimensions = dimensionAnalysis;
    
    // 3. Analisi bordi/texture
    scores.cover += edgeAnalysis.coverScore;
    scores.spine += edgeAnalysis.spineScore;
    scores.multi += edgeAnalysis.multiScore;
    scores.details.edges = edgeAnalysis;
    
    // 4. Analisi di contenuto avanzata (distribuzioni colore, etc.)
    const contentAnalysis = await this._analyzeImageContent(imageData);
    scores.cover += contentAnalysis.coverScore;
    scores.spine += contentAnalysis.spineScore;
    scores.multi += contentAnalysis.multiScore;
    scores.details.content = contentAnalysis;
    
    // 5. Determina il tipo più probabile con pesi specifici
    // Diamo priorità all'ISBN se trovato
    let decidedType = 'cover'; // Default
    let maxScore = scores.cover;
    let confidence = 0;
    
    if (scores.isbn > 0.5) {
      decidedType = 'isbn';
      maxScore = scores.isbn;
      confidence = scores.isbn;
    } else if (scores.spine > maxScore) {
      decidedType = 'spine';
      maxScore = scores.spine;
      confidence = scores.spine / 1.5; // Normalizziamo confidenza
    } else if (scores.multi > maxScore) {
      decidedType = 'multi';
      maxScore = scores.multi;
      confidence = scores.multi / 1.5; // Normalizziamo confidenza
    } else {
      // Se è cover, calcola confidenza in modo normalizzato
      confidence = Math.min(1, scores.cover / 1.2);
    }
    
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
    return {
      type: 'cover', // Default in caso di errore
      confidence: 0.3,
      details: { error: error.message }
    };
  }
}

// Nuovo metodo per analisi bordi/texture
async _analyzeEdges(imageData) {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      // Crea canvas per analisi
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Ottieni dati immagine
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calcola gradiente semplificato per rilevare bordi
      // (versione molto semplificata - un vero edge detector userebbe Sobel o Canny)
      let horizontalEdges = 0;
      let verticalEdges = 0;
      
      // Sample a subset of pixels to improve performance
      const sampleRate = 5; // Check every 5th pixel
      
      for (let y = sampleRate; y < canvas.height - sampleRate; y += sampleRate) {
        for (let x = sampleRate; x < canvas.width - sampleRate; x += sampleRate) {
          const idx = (y * canvas.width + x) * 4;
          
          // Calcola differenza con pixel a destra (gradiente orizzontale)
          const rightIdx = (y * canvas.width + (x + sampleRate)) * 4;
          const horizDiff = Math.abs(data[idx] - data[rightIdx]) + 
                           Math.abs(data[idx+1] - data[rightIdx+1]) + 
                           Math.abs(data[idx+2] - data[rightIdx+2]);
          
          // Calcola differenza con pixel sotto (gradiente verticale)
          const bottomIdx = ((y + sampleRate) * canvas.width + x) * 4;
          const vertDiff = Math.abs(data[idx] - data[bottomIdx]) + 
                          Math.abs(data[idx+1] - data[bottomIdx+1]) + 
                          Math.abs(data[idx+2] - data[bottomIdx+2]);
          
          // Accumula solo differenze significative (riduce rumore)
          if (horizDiff > 100) horizontalEdges++;
          if (vertDiff > 100) verticalEdges++;
        }
      }
      
      // Normalizza conteggi
      const totalSamples = Math.floor(canvas.width / sampleRate) * Math.floor(canvas.height / sampleRate);
      const horizEdgeRatio = horizontalEdges / totalSamples;
      const vertEdgeRatio = verticalEdges / totalSamples;
      
      // Calcola punteggi basati sui rapporti di bordi
      let coverScore = 0;
      let spineScore = 0;
      let multiScore = 0;
      
      // Copertine: equilibrio tra bordi orizzontali e verticali
      if (Math.abs(horizEdgeRatio - vertEdgeRatio) < 0.1) {
        coverScore += 0.3;
      }
      
      // Coste: più bordi orizzontali che verticali
      if (horizEdgeRatio > vertEdgeRatio * 1.5) {
        spineScore += 0.4;
      }
      
      // Multi-libro: tanti bordi verticali (separazioni tra libri)
      if (vertEdgeRatio > horizEdgeRatio * 1.5) {
        multiScore += 0.5;
      }
      
      resolve({
        coverScore,
        spineScore,
        multiScore,
        details: {
          horizontalEdgeRatio: horizEdgeRatio,
          verticalEdgeRatio: vertEdgeRatio
        }
      });
    };
    
    img.onerror = () => {
      resolve({
        coverScore: 0,
        spineScore: 0,
        multiScore: 0,
        error: 'Errore caricamento immagine'
      });
    };
    
    img.src = imageData;
  });
}

// Nuovo metodo per analisi contenuto
async _analyzeImageContent(imageData) {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      // Crea canvas per analisi
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Analisi colore - dividi l'immagine in regioni
      const regionsX = 3;
      const regionsY = 3;
      const regionStats = [];
      
      const regWidth = Math.floor(canvas.width / regionsX);
      const regHeight = Math.floor(canvas.height / regionsY);
      
      for (let ry = 0; ry < regionsY; ry++) {
        for (let rx = 0; rx < regionsX; rx++) {
          const data = ctx.getImageData(rx * regWidth, ry * regHeight, regWidth, regHeight).data;
          
          // Calcola statistiche colore per questa regione
          let redSum = 0, greenSum = 0, blueSum = 0;
          let variance = 0;
          const pixelCount = regWidth * regHeight;
          
          for (let i = 0; i < data.length; i += 4) {
            redSum += data[i];
            greenSum += data[i+1];
            blueSum += data[i+2];
          }
          
          const avgRed = redSum / pixelCount;
          const avgGreen = greenSum / pixelCount;
          const avgBlue = blueSum / pixelCount;
          
          // Calcola varianza (per texture)
          for (let i = 0; i < data.length; i += 4) {
            const rDiff = data[i] - avgRed;
            const gDiff = data[i+1] - avgGreen;
            const bDiff = data[i+2] - avgBlue;
            variance += (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
          }
          
          variance /= pixelCount;
          
          regionStats.push({
            rx, ry,
            avgRed, avgGreen, avgBlue,
            variance
          });
        }
      }
      
      // Analizza variazione tra regioni (uniformità)
      let uniformity = 0;
      const centerRegion = regionStats[Math.floor(regionsY/2) * regionsX + Math.floor(regionsX/2)];
      
      regionStats.forEach(region => {
        const colorDiff = Math.sqrt(
          Math.pow(region.avgRed - centerRegion.avgRed, 2) +
          Math.pow(region.avgGreen - centerRegion.avgGreen, 2) +
          Math.pow(region.avgBlue - centerRegion.avgBlue, 2)
        );
        
        uniformity += colorDiff;
      });
      
      uniformity /= regionStats.length;
      
      // Calcola punteggi basati sull'analisi
      let coverScore = 0;
      let spineScore = 0;
      let multiScore = 0;
      
      // Copertine: spesso hanno colori uniformi
      if (uniformity < 30) coverScore += 0.3;
      
      // Coste: generalmente più uniformi delle copertine
      if (uniformity < 20) spineScore += 0.2;
      
      // Multi-libro: variazioni di colore significative tra regioni
      if (uniformity > 50) multiScore += 0.3;
      
      resolve({
        coverScore,
        spineScore,
        multiScore,
        details: {
          uniformity,
          regionCount: regionStats.length
        }
      });
    };
    
    img.onerror = () => {
      resolve({
        coverScore: 0,
        spineScore: 0,
        multiScore: 0,
        error: 'Errore analisi contenuto'
      });
    };
    
    img.src = imageData;
  });
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