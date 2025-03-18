// client/src/pages/Library.js
import React from 'react';
import { Typography, Box, Card, CardContent, Grid } from '@mui/material';

const Library = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        La mia libreria
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Qui troverai tutti i tuoi libri organizzati in collezioni
      </Typography>

      <Grid container spacing={3}>
        {/* Questo sarà sostituito con dati reali in futuro */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                Le tue collezioni saranno visualizzate qui
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inizia a scansionare i tuoi libri e organizzali in collezioni personalizzate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Library;