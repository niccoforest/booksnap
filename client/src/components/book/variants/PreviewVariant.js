// client/src/components/book/variants/PreviewVariant.js
import React from 'react';
import { 
  Card, 
  CardContent,
  Typography,
  Box,
  Rating,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';
import BookCover from '../../common/BookCover';
import ReadStatus from '../../common/ReadStatus';

const PreviewVariant = ({
  bookData,
  userBook,
  userBookId,
  bookId,
  isFavorite = false,
  onBookClick,
  onFavoriteToggle,
  rating // Prop opzionale per il rating
}) => {
  const theme = useTheme();
  
  // Estrai le informazioni dal libro
  const {
    title = 'Titolo sconosciuto',
    author = 'Autore sconosciuto',
    coverImage = null
  } = bookData || {};
  
  // Stato di lettura e rating dal libro dell'utente
  const readStatus = userBook?.readStatus;
  const userRating = userBook?.rating || rating || 0;
  
  // Handler per il click sul libro
  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick(userBookId || bookId);
    }
  };

  // Handler per toggle preferiti
  const handleFavoriteToggle = (e) => {
    e.stopPropagation(); // Previene il click del libro
    if (onFavoriteToggle) {
      onFavoriteToggle(userBookId || bookId);
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
        },
        position: 'relative'
      }}
      elevation={1}
      onClick={handleBookClick}
    >
      {/* Copertina del libro con layout migliorato */}
      <Box sx={{ 
        position: 'relative', 
        paddingTop: '150%', 
        backgroundColor: alpha(theme.palette.primary.main, 0.05) 
      }}>
        {/* Copertina */}
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          <BookCover 
            coverImage={coverImage} 
            title={title} 
            size="medium" 
            rounded={false}
            sx={{ 
              width: 'auto',
              height: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              objectPosition: 'center'
            }}
          />
        </Box>
        
        {/* Badge di stato lettura (se esiste) */}
        {readStatus && (
          <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
            <ReadStatus status={readStatus} variant="chip" showIcon={true} size="small" />
          </Box>
        )}
        
        {/* Icona preferito (se richiesta) */}
        {onFavoriteToggle && (
          <Box sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            backgroundColor: alpha(theme.palette.background.paper, 0.7),
            borderRadius: '50%',
            padding: '2px'
          }}>
            <IconButton 
              size="small" 
              color={isFavorite ? "error" : "default"}
              onClick={handleFavoriteToggle}
              sx={{ 
                padding: '4px',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.background.paper, 0.9)
                }
              }}
            >
              {isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
            </IconButton>
          </Box>
        )}
      </Box>
      
      {/* Contenuto testuale con layout migliorato */}
      <CardContent sx={{ 
        flexGrow: 1, 
        p: { xs: 1, sm: 2 }, 
        pt: { xs: 1, sm: 1 },
        pb: { xs: 1, sm: 1 },
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 80, sm: 90 }
      }}>
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
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
              WebkitLineClamp: { xs: 2, sm: 2 }, // 2 righe per il titolo
              textOverflow: 'ellipsis',
              fontSize: { xs: '0.875rem', sm: '0.9rem' }
            }}
          >
            {title}
          </Typography>
          
          <Typography 
            variant="caption" 
            color="text.secondary" 
            display="block"
            sx={{
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1, // 1 riga per l'autore
              textOverflow: 'ellipsis',
              mb: userRating > 0 ? 1 : 0,
              fontSize: { xs: '0.75rem', sm: '0.8rem' }
            }}
          >
            {author}
          </Typography>
        </Box>
         
        {/* Rating con posizionamento fisso in basso */}
        <Box sx={{ 
          mt: 'auto',
          minHeight: 24,
          display: 'flex',
          alignItems: 'center'
        }}>
          {userRating > 0 ? (
            <Rating 
              value={userRating} 
              readOnly 
              size="small" 
              precision={0.5}
            />
          ) : (
            <Box sx={{ height: 24 }} /> // Placeholder per mantenere l'altezza
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
 
export default PreviewVariant;