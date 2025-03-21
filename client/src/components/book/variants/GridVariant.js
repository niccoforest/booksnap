// client/src/components/book/variants/GridVariant.js
import React from 'react';
import { 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions,
  Typography,
  Box,
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

const GridVariant = ({
  bookData,
  userBookId,
  bookId,
  isFavorite,
  isLoading,
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
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: '12px',
        '&:hover': {
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
        },
        cursor: 'pointer'
      }}
      onClick={handleBookClick}
    >
      {/* Stato di lettura - badge superiore */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          zIndex: 1,
          bgcolor: 'white',
          borderRadius: '50%',
          p: 0.5,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <Tooltip title={getReadStatusLabel(readStatus)}>
          {getReadStatusIcon(readStatus)}
        </Tooltip>
      </Box>
      
      {/* Copertina */}
      {coverImage ? (
        <CardMedia
          component="img"
          height="200"
          image={coverImage}
          alt={title}
          sx={{ objectFit: 'contain', p: 1 }}
        />
      ) : (
        <Box 
          sx={{ 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.04)'
          }}
        >
          <NoImageIcon sx={{ fontSize: 40, color: 'rgba(0, 0, 0, 0.3)' }} />
        </Box>
      )}
      
      {/* Info libro */}
      <CardContent sx={{ flexGrow: 1, pt: 1 }}>
        <Typography 
          variant="subtitle1" 
          component="div" 
          sx={{ 
            fontWeight: 'medium',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.2,
            mb: 0.5
          }}
        >
          {title}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical'
          }}
        >
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
      </CardContent>
      
      {/* Icona preferiti e menu */}
      <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
        {showFavoriteButton && (
          <IconButton 
            size="small"
            onClick={handleFavoriteToggle}
            color={isFavorite ? "error" : "default"}
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
      </CardActions>
    </Card>
  );
};

export default GridVariant;