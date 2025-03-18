// client/src/components/layout/Layout.js
import React from 'react';
import { Box, Container, Toolbar } from '@mui/material';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', pt: 2, pb: 9 }}>
        <Toolbar /> {/* Spazio per compensare l'AppBar fixed */}
        <Container maxWidth="lg" sx={{ mt: 1 }}>
          <Outlet /> {/* Qui verranno inserite le pagine */}
        </Container>
      </Box>
      <BottomNavigation />
    </Box>
  );
};

export default Layout;