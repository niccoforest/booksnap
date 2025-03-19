// client/src/pages/Home.js
import React from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Button, 
  Stack,
  Chip,
  Avatar,
  useTheme
} from '@mui/material';
import { 
  LibraryBooks as LibraryIcon,
  Add as AddIcon,
  LocalLibrary as ReadingIcon,
  Check as CompletedIcon,
  Bookmark as WishlistIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();

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
              overflow: 'hidden'
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
          <Card sx={{ height: '100%' }}>
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
          <Card sx={{ height: '100%' }}>
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
              height: '100%'
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
        
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'background.paper', borderRadius: 3 }}>
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

      {/* Continua a leggere */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2 }}>
          Continua a leggere
        </Typography>

        <Box sx={{ 
          textAlign: 'center', 
          py: 4, 
          bgcolor: 'background.paper', 
          borderRadius: 3,
          border: '1px dashed',
          borderColor: 'divider' 
        }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Non hai ancora libri in lettura
          </Typography>
          <Button 
            variant="contained" 
            color="secondary"
            sx={{ mt: 2 }}
            onClick={() => navigate('/scan')}
          >
            Aggiungi un libro
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;