// client/src/components/book/variants/PreviewVariant.js
import React from 'react';
import { 
  Card, 
  CardContent,
  Typography,
  Box,
  Rating,
  useTheme
} from '@mui/material';
import BookCover from '../../common/BookCover';

const PreviewVariant = ({
  bookData,
  userBookId,
  bookId,
  onBookClick,
  rating // Prop opzionale per il rating
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
      
      <CardContent sx={{ 
        flexGrow: 1, 
        p: 2, 
        pt: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '120px', // Altezza fissa
        maxHeight: '120px', // Altezza fissa
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
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
              WebkitLineClamp: 2, // Limita a 2 righe
              textOverflow: 'ellipsis',
              height: '2.4em', // Altezza fissa per 2 righe
              minHeight: '2.4em'
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
               whiteSpace: 'nowrap',
               mb: rating ? 1 : 0
             }}
           >
             {author}
           </Typography>
        </Box>
         
        {rating > 0 && (
           <Box sx={{ 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'flex-start',
             mt: 'auto',
             height: '24px' // Altezza fissa per il rating
           }}>
             <Rating 
               value={rating} 
               readOnly 
               size="small" 
               precision={0.5}
               sx={{ 
                 color: theme.palette.primary.main,
                 '& .MuiRating-iconFilled': {
                   color: theme.palette.primary.main
                 }
               }}
             />
           </Box>
         )}
       </CardContent>
     </Card>
   );
 };
 
 export default PreviewVariant;