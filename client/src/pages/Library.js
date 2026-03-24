import React, { useEffect, useState } from 'react';
import { Container, Typography, CircularProgress, Alert } from '@mui/material';
import api from '../services/api';

const Library = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Esempio fittizio per dimostrare come chiamare l'API dal frontend
    // In produzione fallirà senza un vero token JWT in localStorage, ma
    // questo è solo per preparare l'architettura.
    const fetchBooks = async () => {
      try {
        const response = await api.get('/books');
        setBooks(response.data);
      } catch (err) {
        setError('Effettua il login per vedere i tuoi libri. (Errore temporaneo in modalità dev senza token)');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        La tua Libreria
      </Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="warning">{error}</Alert>}

      {!loading && !error && books.length === 0 && (
        <Typography variant="body1">
          Nessun libro trovato. Inizia a scansionare!
        </Typography>
      )}
    </Container>
  );
};

export default Library;