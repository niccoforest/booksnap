// client/src/components/book/variants/GridVariant.js
import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography,
  Box,
  IconButton,
  alpha,
  useTheme
} from '@mui/material';
import { 
  MoreVert as MoreIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';
import BookCover from '../../common/BookCover';
import ReadStatus from '../../common/ReadStatus';

const GridVariant = ({
  bookData,
  userBook,
  userBookId,
  bookId,
  
  // Stato e visualizzazione
  isFavorite = false,
  readStatus = 'to-read',
  
  // Callbacks
  onFavoriteToggle,
  onMenuOpen,
  onBookClick,
  
  // Flags di visualizzazione
  showFavoriteButton = true,
  showMenuIcon = true
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
        borderRadius: 2, 
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
        }
      }}
      elevation={1}
      onClick={handleBookClick}
    >
      {/* Container immagine con aspect ratio fisso */}
      <Box 
        sx={{ 
          position: 'relative', 
          paddingTop: '150%', // Aspect ratio 2:3
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Icone sovrapposte */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            p: 1, 
            display: 'flex', 
            justifyContent: 'space-between',
            zIndex: 10
          }}
        >
          {showFavoriteButton && (
            <IconButton 
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.7)', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } 
              }}
              onClick={handleFavoriteToggle}
            >
              {isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
            </IconButton>
          )}
          
          {showMenuIcon && (
            <IconButton 
              size="small"
              sx={{ 
                ml: 'auto',
                bgcolor: 'rgba(255,255,255,0.7)', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } 
              }}
              onClick={handleMenuOpen}
            >
              <MoreIcon />
            </IconButton>
          )}
        </Box>

        {/* Utilizziamo il componente BookCover per la copertina */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <BookCover 
            coverImage={coverImage} 
            title={title} 
            size="medium" 
            rounded={false}
          />
        </Box>

        {/* Stato di lettura */}
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            p: 0.5, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.7)
          }}
        >
          <ReadStatus status={readStatus} variant="chip" size="small" />
        </Box>
      </Box>
      
      {/* Contenuto testuale */}
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography 
          variant="subtitle2" 
          component="div" 
          sx={{ 
            fontWeight: 'bold', 
            mb: 0.5, 
            lineHeight: 1.2,
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            textOverflow: 'ellipsis'
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          display="block"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {author}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default GridVariant;