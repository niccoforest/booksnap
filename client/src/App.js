// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Home from './pages/Home';
import Library from './pages/Library';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Scan from './pages/Scan';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="library" element={<Library />} />
            <Route path="search" element={<Search />} />
            <Route path="profile" element={<Profile />} />
            {/* Redirector per /scan, ora gestito con overlay */}
            <Route path="scan" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;