// client/src/components/book/variants/DetailVariant.js
import React from 'react';
import { 
  Card, 
  Box, 
  Typography,
  IconButton,
  Button,
  Chip,
  Grid,
  Rating,
  useTheme,
  alpha,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CardContent,
  CardActions
} from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreIcon,
  ImageNotSupported as NoImageIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  MenuBook as LibraryIcon
} from '@mui/icons-material';
import { getReadStatusIcon, getReadStatusLabel } from '../BookCardUtils';

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
      alignItems: 'center',
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
        {coverImage ? (
          <Box
            component="img"
            src={coverImage}
            alt={title}
            sx={{
              width: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              pb: '140%', // Proporzione copertina libro
              bgcolor: 'rgba(0,0,0,0.08)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <NoImageIcon sx={{ fontSize: 50, position: 'absolute' }} />
          </Box>
        )}
        
        {/* Badge stato di lettura */}
        <Chip
          label={getReadStatusLabel(readStatus)}
          size="small"
          icon={getReadStatusIcon(readStatus)}
          sx={{
            position: 'absolute',
            top: -10,
            right: -10,
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        />
      </Box>
      
      {/* Informazioni libro */}
      <Box sx={{ flex: 1, width: '100%' }}>
  <Typography variant="h5" component="h1" gutterBottom>
    {title}
  </Typography>
  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
    {author}
  </Typography>
  
  {/* Rating personale - mostrato sempre */}
  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
      Il tuo voto:
    </Typography>
    <Rating
      value={Number(rating) || 0}
      readOnly
      precision={0.5}
      size="medium"
    />
    {rating > 0 ? (
      <Typography variant="body2" sx={{ ml: 1, fontWeight: 'medium' }}>
        {Number(rating).toFixed(1)}
      </Typography>
    ) : (
      <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
        Non valutato
      </Typography>
    )}
  </Box>
  
  {/* Rating medio (se disponibile) */}
  {bookData && bookData.averageRating && bookData.averageRating > 0 && (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, mb: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
        Valutazione media:
      </Typography>
      <Rating
        value={Number(bookData.averageRating) || 0}
        readOnly
        precision={0.5}
        size="small"
      />
      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
        ({Number(bookData.averageRating).toFixed(1)})
        {bookData.ratingsCount && ` da ${bookData.ratingsCount} ${bookData.ratingsCount === 1 ? 'utente' : 'utenti'}`}
      </Typography>
    </Box>
  )}
        
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
          
          {showExpandableDescription && description.length > 300 && (
            <Button 
              onClick={toggleDescription} 
              sx={{ mt: 1, p: 0 }}
              color="primary"
            >
              {expandedDescription ? 'Mostra meno' : 'Leggi tutto'}
            </Button>
          )}
        </Box>
      )}
      
      {/* Note personali (solo se ci sono) */}
      {notes && !showPersonalization && (
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
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        La tua valutazione personale
        {rating > 0 && (
          <Typography 
            variant="body2" 
            sx={{ 
              ml: 1, 
              bgcolor: alpha(theme.palette.primary.light, 0.1), 
              px: 1, 
              py: 0.5, 
              borderRadius: 1, 
              color: theme.palette.primary.main,
              fontWeight: 'medium'
            }}
          >
            {Number(rating).toFixed(1)}
          </Typography>
        )}
      </Typography>
      <Rating
        value={Number(rating) || 0}
        onChange={(event, newValue) => {
          if (onRatingChange) {
            onRatingChange(newValue);
          }
        }}
        precision={0.5}
        size="large"
      />
    </Box>
          
          {onStatusChange && (
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                <InputLabel id="read-status-label">Stato lettura</InputLabel>
                <Select
                  labelId="read-status-label"
                  value={readStatus || 'to-read'}
                  onChange={(e) => onStatusChange(e.target.value)}
                  label="Stato lettura"
                  sx={{ borderRadius: '8px' }}
                >
                  <MenuItem value="to-read">Da leggere</MenuItem>
                  <MenuItem value="reading">In lettura</MenuItem>
                  <MenuItem value="completed">Completato</MenuItem>
                  <MenuItem value="abandoned">Abbandonato</MenuItem>
                  <MenuItem value="lent">Prestato</MenuItem>
                </Select>
              </FormControl>
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
                value={notes || ''}
                onChange={(e) => onNotesChange(e.target.value)}
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