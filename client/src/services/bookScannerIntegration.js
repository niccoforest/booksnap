// client/src/services/bookScannerIntegration.js (aggiornamento finale)
import smartScannerService from './smartScanner.service';

/**
 * Integra i servizi di riconoscimento libri nel componente ScannerOverlay
 * @param {string} imageSrc - Immagine catturata in formato base64
 * @param {string} scanMode - Modalità di scansione ('auto', 'cover' o 'multi')
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
    // Aggiorna lo stato per mostrare che stiamo processando
    setStatusMessage('Analisi dell\'immagine in corso...');
    
    // Utilizza lo SmartScanner con la modalità specificata
    const result = await smartScannerService.scan(
      imageSrc, 
      scanMode, 
      'ita', // Lingua di default
      // Callback di progresso che aggiorna i messaggi di stato
      (progress) => {
        if (progress.message) {
          setStatusMessage(progress.message);
        }
      }
    );
    
    // Gestisci il risultato della scansione
    if (result.success) {
      if (result.books && result.books.length > 0) {
        // Modalità multi-libro
        setRecognizedBook({
          title: `${result.books.length} libri riconosciuti`
        });
        setSuccessMode(true);
        
        // Aspetta un momento per mostrare l'animazione
        setTimeout(() => {
          if (onCapture) {
            onCapture({
              type: 'camera',
              image: imageSrc,
              mode: 'multi',
              result: result.books,
              method: result.method
            });
          } else {
            setIsCapturing(false);
          }
        }, 1500);
      } 
      else if (result.book) {
        // Libro singolo (copertina, costa o ISBN)
        setRecognizedBook(result.book);
        setSuccessMode(true);
        
        // Aspetta un momento per mostrare l'animazione
        setTimeout(() => {
          if (onCapture) {
            onCapture({
              type: 'camera',
              image: imageSrc,
              mode: result.detectedMode,
              result: result.book,
              method: result.method
            });
          } else {
            setIsCapturing(false);
          }
        }, 1500);
      }
    } else {
      // Nessun libro riconosciuto o errore
      setStatusMessage(result.message || 'Nessun libro riconosciuto. Riprova con un\'inquadratura migliore.');
      setIsCapturing(false);
    }
  } catch (error) {
    console.error('Errore nel riconoscimento', error);
    setStatusMessage('Errore nel riconoscimento. Riprova con un\'inquadratura migliore.');
    setIsCapturing(false);
  }
}