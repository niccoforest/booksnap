// client/src/pages/Home.js
import React from 'react';
import { Typography, Box, Card, CardContent, Grid, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
        Benvenuto in BookSnap
      </Typography>
      
      {/* Card di azione principale - Scansione */}
      <Card sx={{ mb: 4, bgcolor: 'primary.main', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <CardContent sx={{ py: 3 }}>
          <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, fontSize: '8rem' }}>
            📸
          </Box>
          <Typography variant="h5" component="div" sx={{ mb: 2 }}>
            Scansiona un libro
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Scatta una foto della copertina, della costa o dell'ISBN per aggiungere un libro alla tua biblioteca.
          </Typography>
          <Button 
            variant="contained" 
            color="secondary" 
            sx={{ mt: 1 }}
            onClick={() => navigate('/scan')}
          >
            Scansiona ora
          </Button>
        </CardContent>
      </Card>

      {/* Statistiche veloci */}
      <Typography variant="h5" component="h2" gutterBottom>
        La tua attività
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Libri totali
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In lettura
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completati
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Librerie
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sezione "In evidenza" o "Continua a leggere" */}
      <Typography variant="h5" component="h2" gutterBottom>
        Continua a leggere
      </Typography>

      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Non hai ancora aggiunto libri alla tua libreria
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={() => navigate('/scan')}
          >
            Scansiona un libro
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => navigate('/search')}
          >
            Cerca libri
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default Home;