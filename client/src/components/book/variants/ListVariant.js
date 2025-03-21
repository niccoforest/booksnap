// client/src/components/book/variants/ListVariant.js
import React from 'react';
import { 
  Paper,
  Grid,
  Box,
  Typography,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import BookCover from '../../common/BookCover';
import BookRating from '../../common/BookRating';
import ReadStatus from '../../common/ReadStatus';

const ListVariant = ({
  bookData,
  userBookId,
  bookId,
  isFavorite,
  readStatus,
  rating,
  showFavoriteButton = true,
  showMenuIcon = true,
  onFavoriteToggle,
  onMenuOpen,
  onBookClick
}) => {
  const theme = useTheme();
  
  // Estrai le informazioni dal libro
  const {
    title = 'Titolo sconosciuto',
    author = 'Autore sconosciuto',
    coverImage = null
  } = bookData || {};
  
  // Handler per il click sul libro
  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick(userBookId || bookId);
    }
  };
  
  // Handler per il toggle dei preferiti
  const handleFavoriteToggle = (e) => {
    e.stopPropagation(); // Previene la propagazione al click sul libro
    if (onFavoriteToggle) {
      onFavoriteToggle(userBookId || bookId);
    }
  };
  
  // Handler per l'apertura del menu
  const handleMenuOpen = (e) => {
    e.stopPropagation(); // Previene la propagazione al click sul libro
    if (onMenuOpen) {
      onMenuOpen(e, userBookId || bookId);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        p: 2,
        borderRadius: '12px',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.08)'
        },
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={handleBookClick}
    >
      <Grid container spacing={2} alignItems="center">
        {/* Copertina */}
        <Grid item xs={3} sm={1}>
          <BookCover 
            coverImage={coverImage} 
            title={title} 
            size="small" 
          />
        </Grid>
        
        {/* Info libro */}
        <Grid item xs={7} sm={9}>
          {/* Badge stato lettura sopra il titolo */}
          <Box sx={{ mb: 1 }}>
            <ReadStatus status={readStatus} variant="chip" size="small" />
          </Box>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {title}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {author}
          </Typography>
          
          {/* Valutazione */}
          {rating > 0 && (
            <Box sx={{ mt: 1 }}>
              <BookRating 
                value={rating} 
                readOnly={true} 
                size="small" 
                precision={0.5}
                showValue={false}
              />
            </Box>
          )}
        </Grid>
        
        {/* Azioni */}
        <Grid item xs={2} sm={2} sx={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {showFavoriteButton && (
            <IconButton 
              size="small"
              onClick={handleFavoriteToggle}
              color={isFavorite ? "error" : "default"}
              sx={{ mr: 1 }}
            >
              {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          )}
          
          {showMenuIcon && (
            <IconButton 
              size="small"
              onClick={handleMenuOpen}
            >
              <MoreIcon />
            </IconButton>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ListVariant;