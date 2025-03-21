import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
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
  Book as BookIcon,
  MenuBook as ReadingIcon,
  Favorite as FavoriteIcon,
  PeopleAlt as LentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';
import BookCard from '../components/book/BookCard';
import useFavorites from '../hooks/useFavorites';
import EmptyState from '../components/common/EmptyState';
import BookCarousel from '../components/book/BookCarousel';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const HomeBookSection = ({ 
  title, 
  books = [], 
  onBookClick, 
  showMoreLink,
  useCarousel = true // Parametro per decidere se usare il carousel
}) => {
  const theme = useTheme();
  
  // Determina se usare il carousel in base al numero di libri e al parametro
  const shouldUseCarousel = useCarousel && books.length > 2;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        {showMoreLink && (
          <Button 
            endIcon={<ArrowForwardIcon />} 
            variant="text" 
            size="small"
            onClick={showMoreLink}
          >
            Vedi tutti
          </Button>
        )}
      </Box>
      
      {books.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyState 
            message="Nessun libro in questa sezione" 
            icon={<BookIcon sx={{ fontSize: 48 }} />} 
          />
        </Box>
      ) : shouldUseCarousel ? (
        <BookCarousel 
          books={books} 
          onBookClick={onBookClick} 
          maxVisible={12} // Mostra fino a 12 libri nel carousel
        />
      ) : (
        <Grid container spacing={2}>
          {books.map((book) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={book._id}>
              <BookCard 
                userBook={book}
                variant="preview"
                onBookClick={() => onBookClick(book._id)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const { isFavorite } = useFavorites(TEMP_USER_ID);

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
  

  const handleStatBlockClick = (tab, additionalParams = {}) => {
    // Costruisci l'URL della libreria con i parametri corretti
    const searchParams = new URLSearchParams({
      tab: tab,
      ...additionalParams
    });
    
    navigate(`/library?${searchParams.toString()}`);
  };

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
        setRecentScans(sortedByDate.slice(0, 6));
        
        // Imposta libri consigliati (3 libri random dalla libreria)
        const randomBooks = getRandomBooks(books, 6);
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
                onClick={() => handleStatBlockClick('all')}
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
                onClick={() => handleStatBlockClick('reading')}
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
                onClick={() => handleStatBlockClick('favorites')}
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
                onClick={() => handleStatBlockClick('lent')}
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
          <HomeBookSection 
          title="La mia libreria"
          books={libraryBooks.slice(0, 12)} // Aumentato a 12 per il carousel
          onBookClick={handleBookClick}
          showMoreLink={() => handleStatBlockClick('all')}
          useCarousel={libraryBooks.length > 2} // Usa carousel solo se ci sono più di 2 libri
        />

          {/* Ultime scansioni */}
          <HomeBookSection 
          title="Ultime aggiunte"
          books={recentScans.slice(0, 12)} // Aumentato a 12 per il carousel
          onBookClick={handleBookClick}
          //showMoreLink={() => handleStatBlockClick('all')}
          useCarousel={recentScans.length > 2} // Usa carousel solo se ci sono più di 2 libri
        />

         {/* Libri consigliati */}
         {hasBooks && (
           <HomeBookSection 
           title="Dalla tua libreria"
           books={recommendedBooks.slice(0, 12)} // Aumentato a 12 per il carousel
           onBookClick={handleBookClick}
           showMoreLink={() => handleStatBlockClick('all')}
           useCarousel={recommendedBooks.length > 2} // Usa carousel solo se ci sono più di 2 libri
        />
      )}
       </>
       )}
    </Box>
  );
};

export default Home;