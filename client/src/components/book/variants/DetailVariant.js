// client/src/components/book/variants/DetailVariant.js
import React from 'react';
import { 
  Card, 
  Box, 
  Typography,
  IconButton,
  Button,
  Grid,
  useTheme,
  alpha,
  CircularProgress,
  TextField,
  Divider,
  CardContent,
  CardActions
} from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  MenuBook as LibraryIcon
} from '@mui/icons-material';

// Importiamo i componenti comuni
import BookCover from '../../common/BookCover';
import BookRating from '../../common/BookRating';
import ReadStatus from '../../common/ReadStatus';

const DetailVariant = ({
  bookData,
  userBook,
  userBookId,
  bookId,
  isFavorite,
  isInLibrary,
  isLoading,
  
  // Stati visualizzazione
  expandedDescription,
  toggleDescription,
  
  // Dati personalizzazione
  rating,
  readStatus,
  notes,

  // Props visualizzazione
  showMenuIcon = true,
  showFavoriteButton = true,
  showShareButton = false,
  showExpandableDescription = false,
  showFullDescription = false,
  showActionButtons = true,
  showDeleteButton = false,
  showPersonalization = false,

  // Callbacks
  onFavoriteToggle,
  onMenuOpen,
  onAddBook,
  onShareClick,
  onDeleteClick,
  onViewInLibrary,
  onRatingChange,
  onStatusChange,
  onNotesChange
}) => {
  const theme = useTheme();

  // Estrai le informazioni dal libro
  const {
    title = 'Titolo sconosciuto',
    author = 'Autore sconosciuto',
    coverImage = null,
    publishedYear,
    publisher,
    pageCount,
    isbn,
    language,
    description
  } = bookData || {};

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

  // Handler per l'aggiunta del libro
  const handleAddBook = (e) => {
    if (e) e.stopPropagation(); // Previene la propagazione al click sul libro
    if (onAddBook) {
      onAddBook(bookData);
    }
  };

  return (
    <Card
      elevation={1}
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
        backgroundColor: theme.palette.background.paper
      }}
    >
      {/* Layout superiore con copertina e informazioni base */}
      <Box sx={{ 
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'center', sm: 'flex-start' },
  p: 3,
  background: `linear-gradient(to bottom, ${alpha(theme.palette.primary.light, 0.1)}, ${alpha(theme.palette.background.paper, 0.8)})`
}}>
  {/* Copertina */}
  <Box sx={{ 
    width: { xs: '40%', sm: '25%', md: '15%' },
    minWidth: { xs: 120, sm: 150 },
    maxWidth: 200,
    mb: { xs: 2, sm: 0 },
    mr: { xs: 0, sm: 3 },
    position: 'relative'
  }}>
    <BookCover 
      coverImage={coverImage} 
      title={title} 
      size="large" 
    />
  </Box>
  
  {/* Informazioni libro */}
  <Box sx={{ flex: 1, width: '100%', alignSelf: 'flex-start' }}>
    {/* Badge stato di lettura */}
    <Box sx={{ mb: 1 }}>
      <ReadStatus status={readStatus} variant="chip" />
    </Box>
    
    <Typography variant="h5" component="h1" gutterBottom>
      {title}
    </Typography>
    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
      {author}
    </Typography>
    
    {/* Rating personale - mostrato sempre */}
    <BookRating 
      value={rating} 
      readOnly={true} 
      showEmptyLabel={true}
      size="medium"
    />
    
    {/* Riga di azioni */}
    <Box sx={{ 
      display: 'flex', 
      mt: 2,
      gap: 1,
      flexWrap: 'wrap'
    }}>
  {showFavoriteButton && (
    <IconButton 
      color={isFavorite ? "error" : "default"}
      onClick={handleFavoriteToggle}
      sx={{ 
        bgcolor: alpha(isFavorite ? theme.palette.error.main : theme.palette.action.hover, 0.1),
        '&:hover': {
          bgcolor: alpha(isFavorite ? theme.palette.error.main : theme.palette.action.hover, 0.2),
        }
      }}
    >
      {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
    </IconButton>
  )}
  
  {showShareButton && onShareClick && (
    <IconButton
      onClick={(e) => {
        e.stopPropagation();
        onShareClick();
      }}
      sx={{ 
        bgcolor: alpha(theme.palette.action.hover, 0.1),
        '&:hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.2),
        }
      }}
    >
      <ShareIcon />
    </IconButton>
  )}
  
  {showDeleteButton && onDeleteClick && (
    <IconButton
      onClick={(e) => {
        e.stopPropagation();
        onDeleteClick();
      }}
      color="error"
      sx={{ 
        bgcolor: alpha(theme.palette.error.light, 0.1),
        '&:hover': {
          bgcolor: alpha(theme.palette.error.light, 0.2),
        }
      }}
    >
      <DeleteIcon />
    </IconButton>
  )}
  
  {showMenuIcon && onMenuOpen && (
    <IconButton onClick={handleMenuOpen}>
      <MoreIcon />
    </IconButton>
  )}
</Box>
        </Box>
      </Box>
      
      {/* Dettagli libro */}
      <CardContent sx={{ px: 3, py: 2 }}>
        {/* Visualizza altre informazioni come editore, pagine, ecc. */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {publisher && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Editore:</strong> {publisher}
              </Typography>
            </Grid>
          )}
          {bookData && bookData.genres && bookData.genres.length > 0 && (
  <Grid item xs={12} sm={6}>
    <Typography variant="body2">
      <strong>Generi:</strong> {bookData.genres.join(', ')}
    </Typography>
  </Grid>
)}
          {publishedYear && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Anno:</strong> {publishedYear}
              </Typography>
            </Grid>
          )}
          {pageCount > 0 && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Pagine:</strong> {pageCount}
              </Typography>
            </Grid>
          )}
          {isbn && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>ISBN:</strong> {isbn}
              </Typography>
            </Grid>
          )}
          {language && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Lingua:</strong> {language}
              </Typography>
            </Grid>
          )}
        </Grid>
        
       
{/* Descrizione */}
{description && (
  <Box sx={{ mt: 2 }}>
    <Typography variant="subtitle2" gutterBottom>
      Descrizione:
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {showFullDescription 
        ? description 
        : showExpandableDescription 
          ? expandedDescription 
            ? description 
            : `${description.substring(0, 300)}${description.length > 300 ? '...' : ''}`
          : description.length > 300
            ? `${description.substring(0, 300)}...`
            : description
      }
    </Typography>
    
    {/* Pulsante "Leggi tutto/Mostra meno" solo se necessario e non in modalità fullDescription */}
    {!showFullDescription && showExpandableDescription && description && description.length > 300 && (
  <Button 
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      if (toggleDescription) toggleDescription();
    }} 
    sx={{ mt: 1, p: 0 }}
    color="primary"
  >
    {expandedDescription ? 'Mostra meno' : 'Leggi tutto'}
  </Button>
)}
  </Box>
)}
        
    {/* Note personali (solo se ci sono) */}
{notes && notes.trim() !== '' && !showPersonalization && (
  <Box sx={{ mt: 3 }}>
    <Typography variant="subtitle2" gutterBottom>
      Note personali:
    </Typography>
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        bgcolor: alpha(theme.palette.primary.light, 0.05),
        border: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
        {notes}
      </Typography>
    </Box>
  </Box>
)}
        
        {/* Sezione di personalizzazione - mostrata solo se necessario */}
        {showPersonalization && (
  <>
    <Divider sx={{ my: 3 }} />
    
    <Typography variant="h6" gutterBottom>
      Personalizzazione
    </Typography>
    
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        La tua valutazione personale
      </Typography>
      <BookRating
        value={rating || 0}  // Assicurati che il valore non sia mai undefined
        readOnly={false}
        onChange={(newValue) => {
          console.log('Rating cambiato a:', newValue);
          if (onRatingChange) onRatingChange(newValue);
        }}
        size="large"
        precision={0.5}
      />
    </Box>
    
    {onStatusChange && (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Stato lettura
        </Typography>
        <ReadStatus 
          status={readStatus || 'to-read'}  // Valore di default se undefined
          variant="select" 
          onChange={(newValue) => {
            console.log('Stato lettura cambiato a:', newValue);
            onStatusChange(newValue);
          }} 
          disabled={false} // Assicurati che non sia disabilitato
        />
      </Box>
    )}
    
    {onNotesChange && (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Note personali
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Aggiungi le tue note personali sul libro..."
          value={notes || ''}  // Assicurati che il valore non sia mai undefined
          onChange={(e) => {
            console.log('Note cambiate a:', e.target.value);
            onNotesChange(e.target.value);
          }}
          variant="outlined"
          InputProps={{
            sx: { borderRadius: '8px' }
          }}
        />
      </Box>
    )}
  </>
)}
      </CardContent>
      
      {/* Pulsanti azione principale */}
      {showActionButtons && (onAddBook || onViewInLibrary) && (
        <CardActions sx={{ p: 3, pt: 0 }}>
          {isInLibrary && onViewInLibrary ? (
            <Button
              variant="outlined"
              color="success"
              fullWidth
              startIcon={<LibraryIcon />}
              onClick={onViewInLibrary}
              sx={{ borderRadius: '8px' }}
            >
              Visualizza nella libreria
            </Button>
          ) : onAddBook ? (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              onClick={handleAddBook}
              disabled={isLoading}
              sx={{ borderRadius: '8px' }}
            >
              {isLoading ? 'Aggiunta in corso...' : 'Aggiungi alla libreria'}
            </Button>
          ) : null}
        </CardActions>
      )}
    </Card>
  );
};

export default DetailVariant;