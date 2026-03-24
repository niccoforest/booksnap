import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import darkTheme from './theme/darkTheme';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Scanner from './pages/Scanner';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scanner" element={<Scanner />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
