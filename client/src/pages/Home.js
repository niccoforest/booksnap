import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';

const Home = () => {
  return (
    <Container maxWidth="sm" sx={{ mt: 5, textAlign: 'center' }}>
      <Typography variant="h3" gutterBottom>
        BookSnap 📚
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Scansiona i tuoi libri con la fotocamera e sfrutta l'Intelligenza Artificiale per organizzarli nella tua libreria digitale personale.
      </Typography>

      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button variant="contained" color="primary" size="large">
          Accedi
        </Button>
        <Button variant="outlined" color="primary" size="large">
          Registrati
        </Button>
      </Box>
    </Container>
  );
};

export default Home;