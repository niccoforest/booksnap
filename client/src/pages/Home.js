import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Card,
  CardMedia,
  CardContent,
  Fab,
  AppBar,
  Toolbar,
  Skeleton
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LibrarianChat from '../components/LibrarianChat';

const Home = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await api.get('/books');
      setBooks(response.data.books);
    } catch (error) {
      console.error('Errore nel caricamento libri:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: 7, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
            BookSnap
          </Typography>
          {/* Pulsante per il bibliotecario AI */}
          <Fab size="small" color="secondary" aria-label="ai" onClick={() => setChatOpen(true)}>
            <AutoAwesomeIcon />
          </Fab>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 3 }}>
        <Typography variant="h2" gutterBottom>
          La tua libreria
        </Typography>

        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={item}>
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
              </Grid>
            ))}
          </Grid>
        ) : books.length > 0 ? (
          <Grid container spacing={2}>
            {books.map((book) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={book._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <CardMedia
                    component="img"
                    height="180"
                    image={book.coverUrl || 'https://via.placeholder.com/120x180?text=No+Cover'}
                    alt={book.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {book.title}
                    </Typography>
                    {book.authors && book.authors[0] && (
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {book.authors[0]}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="body1" color="text.secondary">
              Nessun libro trovato. Inizia scansionando la tua libreria!
            </Typography>
          </Box>
        )}
      </Container>

      {/* FAB per aprire lo scanner */}
      <Fab
        color="primary"
        aria-label="scan"
        sx={{
          position: 'fixed',
          bottom: 30,
          right: 30,
          boxShadow: '0 4px 20px rgba(123, 31, 162, 0.5)'
        }}
        onClick={() => navigate('/scanner')}
      >
        <PhotoCameraIcon />
      </Fab>

      <LibrarianChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </Box>
  );
};

export default Home;
