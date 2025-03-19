// client/src/components/layout/Layout.js
import React from 'react';
import { Box, Container, Toolbar } from '@mui/material';
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
          pt: 10, // Più spazio per il nuovo header
          pb: 10, // Più spazio per la bottom navigation
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