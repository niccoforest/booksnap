/**
 * Servizio centralizzato per le chiamate API al backend
 * Gestisce la configurazione, l'autenticazione e la gestione degli errori
 */
import axios from 'axios';

class ApiService {
  constructor() {
    this.client = axios.create({
      // Usa una variabile d'ambiente o rileva l'ambiente di Codespaces
      baseURL: process.env.REACT_APP_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    // Aggiungi un interceptor per gestire gli errori globalmente
    this.client.interceptors.response.use(
      response => response,
      error => {
        // Qui potremmo aggiungere logica per gestire token scaduti
        // o altri errori comuni in modo centralizzato
        
        // Log dell'errore in sviluppo
        if (process.env.NODE_ENV !== 'production') {
          console.error('API Error:', error.response || error);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test di connessione al backend
   * @returns {Promise<Object>} Risultato del test
   */
  async testConnection() {
    try {
      // In Codespaces, l'URL potrebbe essere diverso
      // Usa il dominio pubblico fornito da Codespaces
      const codespacesUrl = window.location.origin;
      console.log('Testing connection to:', codespacesUrl + '/api/books?limit=1');
      
      const response = await axios.get(`${codespacesUrl}/api/books?limit=1`);
      console.log('Connessione al backend riuscita:', response.data);
      return { success: true, message: 'Connessione al backend riuscita' };
    } catch (error) {
      console.error('Test di connessione fallito:', error);
      return { 
        success: false, 
        message: 'Impossibile connettersi al backend. ' + (error.response?.data?.message || error.message) 
      };
    }
  }

  /**
   * Imposta il token di autenticazione per le richieste
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

 /**
 * Esegue una richiesta GET
 * @param {string} url - URL endpoint
 * @param {Object} params - Parametri query string
 * @returns {Promise} Promise con i dati della risposta
 */
async get(url, params = {}) {
  try {
    console.log(`Chiamata API GET: ${url}`, params);
    
    // Verifica validità dei parametri
    const validParams = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        validParams[key] = value;
      }
    });
    
    // Assicuriamoci di passare params direttamente all'oggetto config di axios
    const response = await this.client.get(url, { params: validParams });
    
    // Log della risposta per debug
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Risposta API GET ${url}:`, response.status, 
                  response.data ? (typeof response.data === 'object' ? 'Dati ricevuti' : response.data) : 'Nessun dato');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Errore in GET ${url}:`, error.message);
    if (error.response) {
      console.error('Stato risposta:', error.response.status);
      console.error('Dati risposta:', error.response.data);
    }
    this._handleError(error);
    throw error;
  }
}

  /**
   * Esegue una richiesta POST
   * @param {string} url - URL endpoint
   * @param {Object} data - Dati da inviare
   * @returns {Promise} Promise con i dati della risposta
   */
  async post(url, data = {}) {
    try {
      const response = await this.client.post(url, data);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  /**
   * Esegue una richiesta PUT
   * @param {string} url - URL endpoint
   * @param {Object} data - Dati da inviare
   * @returns {Promise} Promise con i dati della risposta
   */
  async put(url, data = {}) {
    try {
      const response = await this.client.put(url, data);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  /**
   * Esegue una richiesta DELETE
   * @param {string} url - URL endpoint
   * @param {Object} params - Parametri query string
   * @returns {Promise} Promise con i dati della risposta
   */
  async delete(url, params = {}) {
    try {
      const response = await this.client.delete(url, { params });
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  /**
   * Gestione personalizzata degli errori API
   * @private
   * @param {Error} error - Errore da gestire
   */
  _handleError(error) {
    // Qui possiamo aggiungere logica specifica per diversi tipi di errori
    // Ad esempio, mostrare messaggi diversi per 404, 403, 500, ecc.
    if (error.response) {
      // La richiesta è stata effettuata e il server ha risposto con un codice di stato
      // che non rientra nell'intervallo 2xx
      const status = error.response.status;
      const message = error.response.data?.message || 'Si è verificato un errore';
      
      // Possiamo gestire tipi specifici di errori qui
      switch (status) {
        case 401:
          // Gestione non autorizzato (token scaduto o non valido)
          // Potremmo ad esempio reindirizzare alla pagina di login
          console.warn('Sessione scaduta. Per favore, accedi di nuovo.');
          break;
        case 403:
          console.warn('Non hai i permessi per accedere a questa risorsa.');
          break;
        case 404:
          console.warn('La risorsa richiesta non è stata trovata.');
          break;
        default:
          if (status >= 500) {
            console.error('Errore del server. Riprova più tardi.');
          }
      }
    } else if (error.request) {
      // La richiesta è stata effettuata ma non è stata ricevuta alcuna risposta
      console.error('Impossibile connettersi al server. Verifica la tua connessione Internet.');
    }
  }
}

// Esporta un'istanza singola del servizio
const apiService = new ApiService();
export default apiService;