// client/src/components/book/variants/ListVariant.js
import React from 'react';
import { 
  Paper,
  Grid,
  Box,
  Typography,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import { 
  MoreVert as MoreIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';
import BookCover from '../../common/BookCover';
import BookRating from '../../common/BookRating';
import ReadStatus from '../../common/ReadStatus';
import { extractBookData, getUserBookId } from '../../../utils/bookStatusUtils';

/**
 * Variante List del componente BookCard
 * Visualizza un libro in un layout a lista orizzontale
 */
const ListVariant = (props) => {
  const {
    bookData,
    userBook,
    userBookId: propUserBookId,
    
    // Stati
    isFavorite = false,
    isLoading = false,
    
    // Props di visualizzazione
    showFavoriteButton = true,
    showMenuIcon = true,
    
    // Callbacks
    onFavoriteToggle,
    onMenuOpen,
    onBookClick
  } = props;
  
  const theme = useTheme();
  
  // Usa i dati corretti, dal libro o dalla relazione userBook
  const displayData = userBook?.bookId || bookData || {};
  const { title, author, coverImage } = extractBookData(displayData);
  
  // Determina l'ID userBook corretto
  const userBookId = propUserBookId || getUserBookId(userBook);
  
  // Determina lo stato di lettura e rating
  const readStatus = userBook?.readStatus || 'to-read';
  const rating = userBook?.rating || 0;
  
  // Handler per il click sul libro
  const handleBookClick = () => {
    if (onBookClick && !isLoading) {
      onBookClick(userBook || bookData);
    }
  };
  
  // Handler per il toggle dei preferiti
  const handleFavoriteToggle = (e) => {
    e.stopPropagation(); // Previene la propagazione al click sul libro
    if (onFavoriteToggle) {
      onFavoriteToggle(userBookId);
    }
  };
  
  // Handler per l'apertura del menu
  const handleMenuOpen = (e) => {
    e.stopPropagation(); // Previene la propagazione al click sul libro
    if (onMenuOpen) {
      onMenuOpen(e, userBook || bookData);
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
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.08)',
          backgroundColor: alpha(theme.palette.background.default, 0.5)
        },
        cursor: onBookClick ? 'pointer' : 'default',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
      onClick={handleBookClick}
    >
      <Grid container spacing={2} alignItems="center">
  {/* Copertina */}
  <Grid item xs={3} sm={2} md={1}>
    <BookCover 
      coverImage={coverImage} 
      title={title} 
      size="small" 
    />
  </Grid>
  
  {/* Info libro */}
  <Grid item xs={6} sm={8} md={9}>
    {/* Badge stato lettura sopra il titolo */}
    <Box sx={{ mb: 1 }}>
      <ReadStatus status={readStatus} variant="chip" size="small" />
    </Box>
    
    <Typography variant="subtitle1" sx={{ fontWeight: 'medium', wordBreak: 'break-word' }}>
      {title}
    </Typography>
    
    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
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
  <Grid item xs={3} sm={2} sx={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
    {showFavoriteButton && userBookId && (
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
        disabled={isLoading}
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