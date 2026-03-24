import axios from 'axios';

// Creiamo un'istanza axios riutilizzabile
const api = axios.create({
  // Se siamo in produzione su vercel, usa il percorso relativo '/api',
  // se siamo in locale (sviluppo), punta a http://localhost:5000/api
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Aggiungiamo un interceptor per inserire il token in ogni richiesta privata
api.interceptors.request.use(
  (config) => {
    // Cerchiamo il token nel localStorage (impostato dopo il login)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;