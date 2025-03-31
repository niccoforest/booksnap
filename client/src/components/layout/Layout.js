// client/src/components/layout/Layout.js
import React from 'react';
import { Box, Container } from '@mui/material';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}
    >
      <Header />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: '100%', 
          // Aggiungiamo più padding top per evitare sovrapposizioni con l'header
          pt: '120px', // Questo valore potrebbe dover essere regolato in base all'altezza effettiva dell'header
          pb: '80px', // Leggermente più alto per dare più spazio
          px: 0
        }}
      >
        <Container 
          disableGutters 
          maxWidth="lg" 
          sx={{ 
            px: 2, 
            height: '100%'
          }}
        >
          <Outlet /> {/* Qui verranno inserite le pagine */}
        </Container>
      </Box>
      <BottomNavigation />
    </Box>
  );
};

export default Layout;