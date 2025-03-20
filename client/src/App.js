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
import Book from './pages/Book';           // Nuova pagina dettaglio libro
import EditBook from './pages/EditBook';  
import AddBook from './pages/AddBook';
import NotFound from './pages/NotFound';
import ApiTest from './components/ApiTest';

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
            <Route path="add-book" element={<AddBook />} />
            <Route path="book/:id" element={<Book />} />        
            <Route path="edit-book/:id" element={<EditBook />} /> 
            <Route path="scan" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/test-api" element={<ApiTest />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;