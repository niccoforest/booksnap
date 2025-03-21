// client/src/components/book/variants/PreviewVariant.js
import React from 'react';
import { 
  Card, 
  CardContent,
  Typography,
  Box,
  useTheme
} from '@mui/material';
import BookCover from '../../common/BookCover';

const PreviewVariant = ({
  bookData,
  userBookId,
  bookId,
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
      <Box sx={{ p: 1 }}>
        <BookCover 
          coverImage={coverImage} 
          title={title} 
          size="medium" 
        />
      </Box>
      
      <CardContent sx={{ flexGrow: 1, p: 2, pt: 1 }}>
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
            WebkitLineClamp: 2, // Limita a 2 righe
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
 
 export default PreviewVariant;