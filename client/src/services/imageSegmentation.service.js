// client/src/services/imageSegmentation.service.js
class ImageSegmentationService {
    /**
     * Segmenta un'immagine per identificare potenziali copertine di libri
     * @param {string} imageData - Immagine in formato base64
     * @returns {Promise<Array>} - Array di immagini segmentate in base64
     */
    async segmentBookshelfImage(imageData) {
      return new Promise((resolve, reject) => {
        try {
          console.log('Avvio segmentazione immagine scaffale...');
          
          const img = new Image();
          img.onload = () => {
            // Creiamo un canvas per l'elaborazione
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Ottieni i dati dell'immagine
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 1. Applica algoritmo di rilevamento dei bordi
            const edgeData = this._detectEdges(imageData);
            
            // 2. Trova linee verticali (separazione tra libri)
            const verticalLines = this._findVerticalLines(edgeData, canvas.width, canvas.height);
            
            console.log(`Rilevate ${verticalLines.length} possibili separazioni tra libri`);
            
            // 3. Segmenta l'immagine in base alle linee rilevate
            const segments = this._createSegmentsFromLines(img, verticalLines);
            
            console.log(`Creati ${segments.length} segmenti`);
            
            resolve(segments);
          };
          
          img.onerror = () => {
            reject(new Error('Errore nel caricamento dell\'immagine per segmentazione'));
          };
          
          img.src = imageData;
        } catch (error) {
          console.error('Errore nella segmentazione:', error);
          reject(error);
        }
      });
    }
    
    /**
     * Rileva i bordi in un'immagine (implementazione semplificata di Sobel)
     * @private
     */
    _detectEdges(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      
      // Crea array per i dati dell'immagine con i bordi
      const edgeData = new Uint8ClampedArray(width * height);
      
      // Converte in scala di grigi e applica rilevamento bordi semplificato
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = (y * width + x) * 4;
          
          // Pixel corrente in scala di grigi
          const gray = 0.3 * data[index] + 0.59 * data[index + 1] + 0.11 * data[index + 2];
          
          // Pixel a sinistra e destra in scala di grigi
          const grayLeft = 0.3 * data[index - 4] + 0.59 * data[index - 3] + 0.11 * data[index - 2];
          const grayRight = 0.3 * data[index + 4] + 0.59 * data[index + 5] + 0.11 * data[index + 6];
          
          // Calcola gradiente orizzontale
          let edgeValue = Math.abs(grayRight - grayLeft);
          
          // Soglia per ridurre rumore
          if (edgeValue < 20) edgeValue = 0;
          
          // Salva il valore del bordo
          edgeData[y * width + x] = edgeValue;
        }
      }
      
      return edgeData;
    }
    
    /**
     * Trova linee verticali in un'immagine con bordi rilevati
     * @private
     */
    _findVerticalLines(edgeData, width, height) {
      // 1. Calcola istogramma verticale (somma dei valori dei bordi per ogni colonna)
      const histogram = new Array(width).fill(0);
      
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          histogram[x] += edgeData[y * width + x];
        }
      }
      
      // 2. Normalizza l'istogramma
      const maxVal = Math.max(...histogram);
      for (let i = 0; i < histogram.length; i++) {
        histogram[i] = histogram[i] / maxVal;
      }
      
      // 3. Trova picchi nell'istogramma (possibili separazioni tra libri)
      const peaks = [];
      const threshold = 0.4; // Soglia per considerare un picco
      
      for (let x = 10; x < width - 10; x++) {
        if (histogram[x] > threshold) {
          // Verifica se è un massimo locale in una finestra di 10 pixel
          let isLocalMax = true;
          for (let i = Math.max(0, x - 5); i <= Math.min(width - 1, x + 5); i++) {
            if (i !== x && histogram[i] > histogram[x]) {
              isLocalMax = false;
              break;
            }
          }
          
          if (isLocalMax) {
            peaks.push(x);
            // Salta i pixel vicini per evitare picchi duplicati
            x += 10;
          }
        }
      }
      
      // Aggiungi i bordi dell'immagine come separazioni
      peaks.unshift(0);
      peaks.push(width - 1);
      
      // Ordina le linee
      peaks.sort((a, b) => a - b);
      
      return peaks;
    }
    
    /**
     * Crea segmenti di immagine in base alle linee verticali rilevate
     * @private
     */
    _createSegmentsFromLines(img, lines) {
      const segments = [];
      
      // Deve esserci almeno una linea di separazione per creare segmenti
      if (lines.length < 2) {
        console.log('Segmentazione fallita: non abbastanza linee di separazione');
        return segments;
      }
      
      // Crea segmenti tra coppie di linee adiacenti
      for (let i = 0; i < lines.length - 1; i++) {
        const startX = lines[i];
        const endX = lines[i + 1];
        
        // Ignora segmenti troppo stretti
        if (endX - startX < 50) continue;
        
        const segmentCanvas = document.createElement('canvas');
        const segmentCtx = segmentCanvas.getContext('2d');
        
        segmentCanvas.width = endX - startX;
        segmentCanvas.height = img.height;
        
        // Copia la porzione dell'immagine
        segmentCtx.drawImage(
          img,
          startX, 0, endX - startX, img.height, // fonte
          0, 0, endX - startX, img.height // destinazione
        );
        
        // Converti in base64
        const segmentDataUrl = segmentCanvas.toDataURL('image/jpeg', 0.9);
        segments.push(segmentDataUrl);
      }
      
      // Se non sono stati creati segmenti, crea un segmento per l'intera immagine
      if (segments.length === 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        segments.push(canvas.toDataURL('image/jpeg', 0.9));
      }
      
      return segments;
    }
  }
  
  const imageSegmentationService = new ImageSegmentationService();
  export default imageSegmentationService;