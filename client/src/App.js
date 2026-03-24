import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, CssBaseline } from '@mui/material';
import Home from './pages/Home';
import Library from './pages/Library';

function App() {
  return (
    <Router>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                BookSnap
              </Link>
            </Typography>
            <Button color="inherit" component={Link} to="/library">
              Libreria
            </Button>
          </Toolbar>
        </AppBar>

        {/* Contenuto principale gestito dal router */}
        <Box sx={{ flexGrow: 1, p: 2 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;