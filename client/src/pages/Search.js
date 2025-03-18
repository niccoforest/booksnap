// client/src/pages/Search.js
import React from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  InputAdornment, 
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

const Search = () => {
  const [query, setQuery] = React.useState('');
  
  const handleClear = () => {
    setQuery('');
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Cerca libri
      </Typography>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Titolo, autore, ISBN..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: query && (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={handleClear}
                edge="end"
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      <Card sx={{ mt: 4, textAlign: 'center', py: 4 }}>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Inizia a cercare inserendo il titolo, l'autore o l'ISBN di un libro
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Search;