// client/src/services/bookScannerIntegration.js
import bookRecognitionService from './bookRecognition.service';
import simpleOcrService from './simpleOcr.service';

/**
 * Integra i servizi di riconoscimento libri nel componente ScannerOverlay
 * @param {string} imageSrc - Immagine catturata in formato base64
 * @param {string} scanMode - Modalità di scansione ('cover' o 'multi')
 * @param {function} setStatusMessage - Funzione per aggiornare il messaggio di stato
 * @param {function} setIsCapturing - Funzione per aggiornare lo stato di cattura
 * @param {function} setSuccessMode - Funzione per attivare/disattivare la modalità successo
 * @param {function} setRecognizedBook - Funzione per aggiornare il libro riconosciuto
 * @param {function} onCapture - Callback da chiamare con i risultati
 * @returns {Promise<void>}
 */
export async function processBookScan(
  imageSrc,
  scanMode,
  setStatusMessage,
  setIsCapturing,
  setSuccessMode,
  setRecognizedBook,
  onCapture
) {
  try {
    console.log(`Avvio riconoscimento in modalità: ${scanMode}`);
    
    // Aggiorna lo stato per mostrare che stiamo processando
    setStatusMessage('Analisi dell\'immagine in corso...');
    
    // Chiama il servizio di riconoscimento appropriato
    const result = await bookRecognitionService.recognizeBooks(imageSrc, scanMode);
    
    if (scanMode === 'cover' && result) {
      // Modalità copertina singola
      setRecognizedBook(result);
      setSuccessMode(true);
      setStatusMessage(`Libro riconosciuto con successo!`);
      
      // Aspetta un momento per mostrare l'animazione
      setTimeout(() => {
        if (onCapture) {
          onCapture({
            type: 'camera',
            image: imageSrc,
            mode: scanMode,
            result
          });
        }
      }, 1500);
    } 
    else if (scanMode === 'multi' && result && result.length > 0) {
      // Modalità scaffale/multipli libri
      setRecognizedBook({
        title: `${result.length} libri riconosciuti`
      });
      setSuccessMode(true);
      setStatusMessage(`${result.length} libri riconosciuti con successo!`);
      
      // Aspetta un momento per mostrare l'animazione
      setTimeout(() => {
        if (onCapture) {
          onCapture({
            type: 'camera',
            image: imageSrc,
            mode: scanMode,
            result
          });
        }
      }, 1500);
    }
    else {
      // Nessun libro riconosciuto
      setStatusMessage('Nessun libro riconosciuto. Riprova con un\'inquadratura migliore.');
      setIsCapturing(false);
    }
  } catch (error) {
    console.error('Errore nel riconoscimento', error);
    setStatusMessage('Errore nel riconoscimento. Riprova con un\'inquadratura migliore.');
    setIsCapturing(false);
  }
}