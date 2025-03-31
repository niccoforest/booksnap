// client/src/services/textAnalysis.service.js
class TextAnalysisService {
    /**
     * Analizza il testo di una copertina per estrarre informazioni strutturate
     * @param {string} text - Testo riconosciuto dalla copertina
     * @returns {Object} - Informazioni estratte (titolo, autore, editore, ecc.)
     */
    analyzeBookCoverText(text) {
      if (!text || typeof text !== 'string') {
        return { title: null, author: null, publisher: null };
      }
      
      // Normalizza il testo
      const normalizedText = this._normalizeText(text);
      const lines = this._extractLines(normalizedText);
      
      // Estrai le informazioni chiave
      const title = this._extractTitle(lines);
      const author = this._extractAuthor(lines, title);
      const publisher = this._extractPublisher(lines, title, author);
      
      // Debug
      console.log('Analisi copertina:');
      console.log('Titolo:', title);
      console.log('Autore:', author);
      console.log('Editore:', publisher);
      
      return {
        title,
        author,
        publisher
      };
    }
    
    /**
     * Normalizza il testo per l'elaborazione
     * @private
     */
    _normalizeText(text) {
      return text
        .replace(/\r\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    /**
     * Estrae le linee di testo significative
     * @private
     */
    _extractLines(text) {
      // Dividi in linee e filtra quelle vuote
      return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    
    /**
     * Estrae il titolo del libro
     * @private
     */
    _extractTitle(lines) {
      if (lines.length === 0) return null;
      
      // Euristiche per il titolo:
      // 1. Spesso è una delle prime 2-3 righe
      // 2. Generalmente è una delle righe più lunghe
      // 3. Non contiene pattern tipici di autori o editori
      
      // Prendi le prime righe come candidati titolo
      const candidateLines = lines.slice(0, Math.min(3, lines.length));
      
      // Filtra linee troppo corte o che sembrano essere autori/editori
      const filteredCandidates = candidateLines
        .filter(line => {
          // Escludi linee troppo corte
          if (line.length < 3) return false;
          
          // Escludi linee che sembrano essere autori
          if (/^(by|di|authored by|written by|a cura di)/i.test(line)) return false;
          
          // Escludi linee che sembrano essere editori
          if (/^(published by|editore|edizioni|publisher)/i.test(line)) return false;
          
          return true;
        });
      
      // Se non ci sono candidati, prendi la prima riga non vuota
      if (filteredCandidates.length === 0) {
        return lines[0];
      }
      
      // Tra i candidati, prendi la riga più lunga che probabilmente è il titolo
      return filteredCandidates.sort((a, b) => b.length - a.length)[0];
    }
    
    /**
     * Estrae l'autore del libro
     * @private
     */
    _extractAuthor(lines, title) {
      if (lines.length <= 1) return null;
      
      // Indice del titolo
      const titleIndex = lines.findIndex(line => line === title);
      
      // Cerca nelle righe dopo il titolo
      const startIndex = titleIndex !== -1 ? titleIndex + 1 : 1;
      const endIndex = Math.min(startIndex + 3, lines.length);
      
      // Pattern comuni per gli autori
      const authorPatterns = [
        /^(?:by|di|authored by|written by|a cura di)\s+(.+)/i,
        /^(.+?)(?:\s+author|\s+autore)$/i
      ];
      
      // Cerca pattern di autore nelle righe successive al titolo
      for (let i = startIndex; i < endIndex; i++) {
        const line = lines[i].trim();
        
        // Salta linee troppo corte
        if (line.length < 3) continue;
        
        // Cerca pattern di autore
        for (const pattern of authorPatterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
        
        // Se non è stato trovato un pattern ma la riga è probabilmente un autore
        // (non troppo lunga e non contiene pattern di editori)
        if (line.length < 50 && 
            !line.match(/(?:editore|edizioni|publisher|published by|copyright)/i)) {
          return line;
        }
      }
      
      return null;
    }
    
    /**
     * Estrae l'editore del libro
     * @private
     */
    _extractPublisher(lines, title, author) {
      if (lines.length <= 2) return null;
      
      // Trova le posizioni di titolo e autore
      const titleIndex = lines.findIndex(line => line === title);
      const authorIndex = author ? lines.findIndex(line => line === author) : -1;
      
      // Calcola da dove iniziare a cercare l'editore
      const startIndex = Math.max(
        titleIndex !== -1 ? titleIndex + 1 : 1,
        authorIndex !== -1 ? authorIndex + 1 : 1
      );
      
      // Pattern comuni per gli editori
      const publisherPatterns = [
        /^(?:published by|editore|edizioni|publisher)\s+(.+)/i,
        /^(.+?)(?:\s+editore|\s+edizioni|\s+publisher)$/i
      ];
      
      // Cerca pattern di editore nelle righe rimanenti
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Salta linee troppo corte
        if (line.length < 3) continue;
        
        // Cerca pattern di editore
        for (const pattern of publisherPatterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
      }
      
      // Se non troviamo un pattern chiaro, prendiamo l'ultima riga significativa
      // che potrebbe essere l'editore
      for (let i = lines.length - 1; i >= startIndex; i--) {
        const line = lines[i].trim();
        if (line.length > 3 && line.length < 40) {
          return line;
        }
      }
      
      return null;
    }
  }
  
  const textAnalysisService = new TextAnalysisService();
  export default textAnalysisService;