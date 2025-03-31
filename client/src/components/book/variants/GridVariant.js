// client/src/components/book/variants/GridVariant.js
import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography,
  Box,
  Button,
  IconButton,
  Rating,
  useTheme,
  alpha
} from '@mui/material';
import { 
  MoreVert as MoreIcon,
  CheckCircleOutline as CheckIcon,
  MenuBook as LibraryIcon
} from '@mui/icons-material';
import BookCover from '../../common/BookCover';
import ReadStatus from '../../common/ReadStatus';
import FavoriteButton from '../../common/FavoriteButton';
import { extractBookData, getUserBookId } from '../../../utils/bookStatusUtils';

/**
 * Variante Grid del componente BookCard
 * Visualizza un libro in un layout a griglia
 */
const GridVariant = (props) => {
  const {
    bookData,
    userBook,
    userBookId: propUserBookId,
    
    // Stati
    isLoading = false,
    isInLibrary = false,
    isFavorite = false,
    
    // Configurazione visualizzazione
    showFavoriteButton = true,
    showMenuIcon = true,
    showActionButtons = true,
    
    // Callbacks
    onBookClick,
    onFavoriteToggle,
    onMenuOpen,
    onAddBook,
    onViewInLibrary
  } = props;
  
  const theme = useTheme();
  
  // Usa i dati corretti, dal libro o dalla relazione userBook
  const displayData = userBook?.bookId || bookData || {};
  const { title, author, coverImage, publishedYear } = extractBookData(displayData);
  
  // Determina l'ID userBook corretto
  const userBookId = propUserBookId || getUserBookId(userBook);
  
  // Determina lo stato di lettura
  const readStatus = userBook?.readStatus || 'to-read';
  
  // Gestisce il clic sul libro
  const handleClick = () => {
    if (onBookClick && !isLoading) {
      onBookClick(userBook || bookData);
    }
  };
  
  // Gestisce il clic sul pulsante del menu
  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (onMenuOpen) {
      onMenuOpen(e, userBook || bookData);
    }
  };
  
  // Gestisce l'aggiunta del libro alla libreria
  const handleAddBook = (e) => {
    e.stopPropagation();
    if (onAddBook) {
      onAddBook(bookData);
    }
  };
  console.log(`[GridVariant] Rendering libro: userBookId=${userBookId}, isFavorite=${isFavorite}`);
  // Gestisce la visualizzazione del libro nella libreria
  const handleViewInLibrary = (e) => {
    e.stopPropagation();
    if (onViewInLibrary) {
      onViewInLibrary(userBook || bookData);
    }
  };
  
  return (
    <Card 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: '12px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: 2,
        cursor: onBookClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'visible',
        '&:hover': onBookClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 4
        } : {}
      }}
      onClick={handleClick}
    >
      <Box sx={{ position: 'relative', paddingTop: '150%', backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
      {/* Copertina - Corretto il problema dello stretch */}
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
            width: 'auto',         // Invece di 100%
            height: '100%',        // Manteniamo l'altezza piena
            maxWidth: '100%',      // Ma limitiamo la larghezza al 100%
            objectFit: 'contain',  // Manteniamo le proporzioni
            objectPosition: 'center' // Centrato nel contenitore
          }}
        />
      </Box>
        
        {/* Badge di stato lettura (solo per libri nella libreria) */}
        {userBook && userBook.readStatus && (
  <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
    <ReadStatus status={userBook.readStatus} variant="chip" showIcon={true} size="small" />
  </Box>
)}
        
        {/* Icone e azioni nella parte superiore */}
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          display: 'flex', 
          gap: 0.5,
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          borderRadius: '16px',
          padding: '2px'
        }}>
          {/* Pulsante preferiti */}
          {showFavoriteButton && userBookId && (
            <FavoriteButton 
              userBookId={userBookId}
              isFavorite={isFavorite}
              onClick={onFavoriteToggle}
              size="small"
            />
          )}
          
          {/* Pulsante menu */}
          {showMenuIcon && (
            <IconButton 
              size="small" 
              onClick={handleMenuClick}
              aria-label="Opzioni libro"
              disabled={isLoading}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      
      {/* Contenuto testuale */}
      <CardContent sx={{ 
  flexGrow: 1, 
  pb: 1,
  display: 'flex',
  flexDirection: 'column',
  // Rimuoviamo l'altezza fissa e usiamo min-height
  minHeight: { xs: 120, sm: 120 }  // Altezza minima che crescerà in base al contenuto
}}>
  <Typography 
    variant="subtitle1" 
    component="h2" 
    sx={{ 
      fontWeight: 600, 
      mb: 0.5,
      // Incrementiamo ulteriormente il numero di righe per dispositivi molto piccoli
      display: '-webkit-box',
      WebkitLineClamp: { xs: 4, sm: 2 },  // 4 righe per mobile piccolo, 2 per altri
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      lineHeight: 1.2,
      fontSize: { xs: '0.875rem', sm: '1rem' }, // Font leggermente più piccolo su mobile
      textOverflow: 'ellipsis'
    }}
  >
    {title}
  </Typography>
  
  <Typography 
    variant="body2" 
    color="text.secondary"
    sx={{ 
      display: '-webkit-box',
      WebkitLineClamp: { xs: 1, sm: 2 }, // Ridotto a 1 riga su mobile per fare spazio
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      mb: 0.5,
      textOverflow: 'ellipsis',
      fontSize: { xs: '0.75rem', sm: '0.875rem' }, // Font leggermente più piccolo su mobile
    }}
  >
    {author}
    {publishedYear && ` (${publishedYear})`}
  </Typography>
  
  {/* Spacer flessibile */}
  <Box sx={{ flexGrow: 1, minHeight: 4 }} /> {/* Spazio minimo tra autore e rating */}
  
  {/* Rating sempre in basso */}
  <Box sx={{ mt: 'auto' }}>
    {userBook && userBook.rating > 0 ? (
      <Rating 
        value={userBook.rating} 
        precision={0.5} 
        size="small" 
        readOnly
      />
    ) : (
      <Box sx={{ height: 16 }} /> 
    )}
  </Box>
</CardContent>
      
      {/* Azioni in fondo */}
      {showActionButtons && (
        <Box sx={{ p: 1, pt: 0 }}>
          {isInLibrary && onViewInLibrary ? (
            <Button 
              startIcon={<LibraryIcon />}
              size="small" 
              variant="outlined"
              onClick={handleViewInLibrary}
              fullWidth
              sx={{ borderRadius: '8px' }}
            >
              Nella tua libreria
            </Button>
          ) : onAddBook ? (
            <Button 
              startIcon={<CheckIcon />}
              size="small" 
              variant="contained"
              onClick={handleAddBook}
              fullWidth
              disabled={isLoading}
              sx={{ borderRadius: '8px' }}
            >
              Aggiungi
            </Button>
          ) : null}
        </Box>
      )}
    </Card>
  );
};

export default GridVariant;