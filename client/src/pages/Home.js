// client/src/pages/Home.js
import React from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardMedia,
  Grid, 
  Button, 
  Stack,
  Chip,
  Avatar,
  useTheme,
  Divider,
  alpha
} from '@mui/material';
import { 
  LibraryBooks as LibraryIcon,
  Add as AddIcon,
  BookmarkBorder as BookmarkIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Componente per mostrare un libro in anteprima
const BookPreview = ({ book, onClick }) => {
  // Nella versione reale, questi dati verrebbero dalle props
  const demoBook = book || {
    id: '1',
    title: 'Il nome della rosa',
    author: 'Umberto Eco',
    coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg',
    rating: 4.5
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
        image={demoBook.coverImage}
        alt={demoBook.title}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5, lineHeight: 1.2 }}>
          {demoBook.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {demoBook.author}
        </Typography>
      </CardContent>
    </Card>
  );
};

// Libri di esempio per il rendering
const demoRecentBooks = [
  { id: '1', title: 'Il nome della rosa', author: 'Umberto Eco', coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg' },
  { id: '2', title: '1984', author: 'George Orwell', coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg' },
  { id: '3', title: 'Il piccolo principe', author: 'Antoine de Saint-Exupéry', coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg' },
];

const demoRecommendedBooks = [
  { id: '4', title: 'Fahrenheit 451', author: 'Ray Bradbury', coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg' },
  { id: '5', title: 'Lo Hobbit', author: 'J.R.R. Tolkien', coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg' },
  { id: '6', title: 'Il signore delle mosche', author: 'William Golding', coverImage: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg' },
];

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleBookClick = (bookId) => {
    // Futura implementazione: navigate(`/book/${bookId}`);
    console.log(`Clicked on book ${bookId}`);
  };

  // Determina se ci sono libri scansionati
  const hasScannedBooks = false; // In futuro sarà determinato dai dati reali

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
                0
              </Typography>
              <Typography variant="body2">
                Libri totali
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In lettura
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completati
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
              borderRadius: 2
            }}
          >
            <CardContent>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                0
              </Typography>
              <Typography variant="body2">
                Librerie
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Le mie librerie */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
            Le mie librerie
          </Typography>
          <Button 
            startIcon={<AddIcon />} 
            variant="text" 
            size="small"
          >
            Nuova
          </Button>
        </Box>
        
        <Box sx={{ 
          textAlign: 'center', 
          py: 4, 
          bgcolor: 'background.paper', 
          borderRadius: 2,
          border: '1px dashed',
          borderColor: alpha(theme.palette.divider, 0.3)
        }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Non hai ancora creato librerie
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => navigate('/library')}
          >
            Crea libreria
          </Button>
        </Box>
      </Box>

      {/* Ultime scansioni */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
            Ultime scansioni
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
            {demoRecentBooks.map((book) => (
              <Grid item xs={4} key={book.id}>
                <BookPreview 
                  book={book} 
                  onClick={() => handleBookClick(book.id)}
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
              onClick={() => navigate('/scan')}
            >
              Scansiona il primo libro
            </Button>
          </Box>
        )}
      </Box>

      {/* Libri consigliati */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
            Consigliati per te
          </Typography>
          <Button 
            endIcon={<ArrowForwardIcon />} 
            variant="text" 
            size="small"
            onClick={() => navigate('/search')}
          >
            Esplora
          </Button>
        </Box>

        <Grid container spacing={2}>
          {demoRecommendedBooks.map((book) => (
            <Grid item xs={4} key={book.id}>
              <BookPreview 
                book={book} 
                onClick={() => handleBookClick(book.id)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Home;