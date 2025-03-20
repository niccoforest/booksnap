import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardMedia,
  Grid, 
  Button, 
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import { 
  LibraryBooks as LibraryIcon,
  Add as AddIcon,
  BookmarkBorder as BookmarkIcon,
  ArrowForward as ArrowForwardIcon,
  MenuBook as ReadingIcon,
  Favorite as FavoriteIcon,
  PeopleAlt as LentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

// Componente per mostrare un libro in anteprima
const BookPreview = ({ book, onClick }) => {
  // Usa i dati reali o predefiniti
  const bookData = book || {
    id: '1',
    title: 'Il nome della rosa',
    author: 'Umberto Eco',
    coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg'
  };

  return (
    <Card 
      sx={{ 
        borderRadius: 2, 
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
        }
      }}
      elevation={1}
      onClick={onClick}
    >
      <CardMedia
        component="img"
        height="160"
        image={bookData.coverImage || 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg'}
        alt={bookData.title}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5, lineHeight: 1.2 }}>
          {bookData.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {bookData.author}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Stati per i dati della libreria
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    reading: 0,
    favorite: 0,
    lent: 0
  });
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [recommendedBooks, setRecommendedBooks] = useState([]);

  // Carica i dati all'avvio
  useEffect(() => {
    fetchLibraryData();
  }, []);
  
  // Funzione per recuperare i dati della libreria
  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      
      // Recupera tutti i libri dell'utente
      const response = await bookService.getUserBooks({ userId: TEMP_USER_ID, limit: 100 });
      console.log('Dati libreria:', response);
      
      if (response && response.books) {
        const books = response.books;
        
        // Calcola le statistiche
        const readingBooks = books.filter(book => book.readStatus === 'reading');
        const lentBooks = books.filter(book => book.readStatus === 'lent');
        const favoriteBooks = books.filter(book => book.rating && book.rating >= 4);
        
        setStats({
          total: books.length,
          reading: readingBooks.length,
          favorite: favoriteBooks.length,
          lent: lentBooks.length
        });
        
        // Salva tutti i libri
        setLibraryBooks(books);
        
        // Imposta le ultime scansioni (ultimi 3 libri aggiunti)
        const sortedByDate = [...books].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRecentScans(sortedByDate.slice(0, 3));
        
        // Imposta libri consigliati (3 libri random dalla libreria)
        const randomBooks = getRandomBooks(books, 3);
        setRecommendedBooks(randomBooks);
      }
    } catch (err) {
      console.error('Errore nel recupero dei dati della libreria:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per ottenere n libri casuali da un array
  const getRandomBooks = (books, n) => {
    if (books.length <= n) return books;
    
    const shuffled = [...books].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };

  const handleBookClick = (bookId) => {
    navigate(`/book/${bookId}`);
  };

  // Determina se ci sono libri
  const hasBooks = libraryBooks.length > 0;
  const hasScannedBooks = recentScans.length > 0;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="h5" 
        component="h1" 
        gutterBottom 
        sx={{ fontWeight: 'bold', mb: 3 }}
      >
        La tua attività
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Statistiche a schede */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6}>
              <Card 
                sx={{ 
                  bgcolor: theme.palette.primary.main, 
                  color: 'white', 
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2
                }}
                onClick={() => navigate('/library')}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: -15, 
                    right: -15, 
                    fontSize: '5rem', 
                    opacity: 0.1,
                    transform: 'rotate(15deg)'
                  }}
                >
                  <LibraryIcon fontSize="inherit" />
                </Box>
                <CardContent>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2">
                    Libri totali
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card 
                sx={{ 
                  height: '100%', 
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate('/library?tab=reading')}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: -15, 
                    right: -15, 
                    fontSize: '5rem', 
                    opacity: 0.05,
                    transform: 'rotate(15deg)'
                  }}
                >
                  <ReadingIcon fontSize="inherit" />
                </Box>
                <CardContent>
                  <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {stats.reading}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In lettura
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card 
                sx={{ 
                  height: '100%', 
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate('/library?favorites=true')}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: -15, 
                    right: -15, 
                    fontSize: '5rem', 
                    opacity: 0.05,
                    transform: 'rotate(15deg)'
                  }}
                >
                  <FavoriteIcon fontSize="inherit" />
                </Box>
                <CardContent>
                  <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {stats.favorite}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Preferiti
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card 
                sx={{ 
                  bgcolor: theme.palette.secondary.main, 
                  color: 'white',
                  height: '100%',
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate('/library?tab=lent')}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: -15, 
                    right: -15, 
                    fontSize: '5rem', 
                    opacity: 0.1,
                    transform: 'rotate(15deg)'
                  }}
                >
                  <LentIcon fontSize="inherit" />
                </Box>
                <CardContent>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {stats.lent}
                  </Typography>
                  <Typography variant="body2">
                    Prestati
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* La mia libreria */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                La mia libreria
              </Typography>
              {hasBooks && (
                <Button 
                  endIcon={<ArrowForwardIcon />} 
                  variant="text" 
                  size="small"
                  onClick={() => navigate('/library')}
                >
                  Vedi tutti
                </Button>
              )}
            </Box>
            
            {hasBooks ? (
              <Grid container spacing={2}>
                {libraryBooks.slice(0, 3).map((book) => (
                  <Grid item xs={4} key={book._id}>
                    <BookPreview 
                      book={{
                        id: book._id,
                        title: book.bookId?.title || 'Titolo sconosciuto',
                        author: book.bookId?.author || 'Autore sconosciuto',
                        coverImage: book.bookId?.coverImage
                      }} 
                      onClick={() => handleBookClick(book._id)}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                py: 4, 
                bgcolor: 'background.paper', 
                borderRadius: 2,
                border: '1px dashed',
                borderColor: alpha(theme.palette.divider, 0.3)
              }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Non hai ancora aggiunto libri alla tua libreria
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/add-book')}
                >
                  Aggiungi libro
                </Button>
              </Box>
            )}
          </Box>

          {/* Ultime scansioni */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Ultime aggiunte
              </Typography>
              {hasScannedBooks && (
                <Button 
                  endIcon={<ArrowForwardIcon />} 
                  variant="text" 
                  size="small"
                  onClick={() => navigate('/library')}
                >
                  Vedi tutte
                </Button>
              )}
            </Box>

            {hasScannedBooks ? (
              <Grid container spacing={2}>
                {recentScans.map((book) => (
                  <Grid item xs={4} key={book._id}>
                    <BookPreview 
                      book={{
                        id: book._id,
                        title: book.bookId?.title || 'Titolo sconosciuto',
                        author: book.bookId?.author || 'Autore sconosciuto',
                        coverImage: book.bookId?.coverImage
                      }} 
                      onClick={() => handleBookClick(book._id)}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                py: 4, 
                bgcolor: 'background.paper', 
                borderRadius: 2,
                border: '1px dashed',
                borderColor: alpha(theme.palette.divider, 0.3)
              }}>
                <BookmarkIcon color="primary" sx={{ fontSize: 40, mb: 1, opacity: 0.7 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Non hai ancora scansionato libri
                </Typography>
                <Button 
                  variant="contained" 
                  color="secondary"
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/add-book')}
                >
                  Scansiona il primo libro
                </Button>
              </Box>
            )}
          </Box>

          {/* Libri consigliati */}
          {hasBooks && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                  Dalla tua libreria
                </Typography>
                <Button 
                  endIcon={<ArrowForwardIcon />} 
                  variant="text" 
                  size="small"
                  onClick={() => navigate('/library')}
                >
                  Esplora
                </Button>
              </Box>

              <Grid container spacing={2}>
                {recommendedBooks.map((book) => (
                  <Grid item xs={4} key={book._id}>
                    <BookPreview 
                      book={{
                        id: book._id,
                        title: book.bookId?.title || 'Titolo sconosciuto',
                        author: book.bookId?.author || 'Autore sconosciuto',
                        coverImage: book.bookId?.coverImage
                      }} 
                      onClick={() => handleBookClick(book._id)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Home;