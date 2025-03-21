// client/src/components/book/variants/ListVariant.js
import React from 'react';
import { 
  Paper,
  Grid,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Rating,
  useTheme
} from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreIcon,
  ImageNotSupported as NoImageIcon
} from '@mui/icons-material';
import { getReadStatusIcon, getReadStatusLabel } from '../BookCardUtils';

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
          {coverImage ? (
            <Box
              component="img"
              src={coverImage}
              alt={title}
              sx={{
                width: { xs: '100%', sm: 50 },
                height: { xs: 'auto', sm: 70 },
                maxHeight: 70,
                objectFit: 'contain',
                borderRadius: 1
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: '100%', sm: 50 },
                height: { xs: 70, sm: 70 },
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1
              }}
            >
              <NoImageIcon sx={{ color: 'rgba(0, 0, 0, 0.3)' }} />
            </Box>
          )}
        </Grid>
        
        {/* Info libro */}
        <Grid item xs={7} sm={9}>
          {/* Badge stato lettura sopra il titolo */}
          <Tooltip title={getReadStatusLabel(readStatus)}>
            <Box sx={{ display: 'inline-flex', mb: 1 }}>
              {getReadStatusIcon(readStatus)}
            </Box>
          </Tooltip>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {title}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {author}
          </Typography>
          
          {/* Valutazione */}
          {rating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Rating 
                value={rating} 
                readOnly 
                size="small" 
                precision={0.5}
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