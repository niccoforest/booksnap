// client/src/components/book/BookCard.js
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
  Paper,
  Grid,
  Rating,
  useTheme,
  alpha,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreIcon,
  ImageNotSupported as NoImageIcon,
  MenuBook as ReadingIcon,
  CheckCircle as CompletedIcon,
  Bookmark as ToReadIcon,
  BookmarkRemove as AbandonedIcon,
  PeopleAlt as LentIcon,
  CheckCircleOutline as CheckIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon
} from '@mui/icons-material';

/**
 * Componente unificato per la visualizzazione dei libri con diverse varianti
 * @param {Object} props - Le props del componente
 * @param {Object} props.book - L'oggetto libro da visualizzare
 * @param {Object} props.userBook - La relazione utente-libro con metadati come rating, status, etc.
 * @param {string} props.variant - La variante di visualizzazione ('preview', 'grid', 'list', 'search', 'detail')
 * @param {boolean} props.isFavorite - Se il libro è nei preferiti
 * @param {boolean} props.isInLibrary - Se il libro è già nella libreria (per variante 'search')
 * @param {boolean} props.loading - Se il libro è in fase di caricamento
 * @param {Function} props.onFavoriteToggle - Callback quando si attiva/disattiva il preferito
 * @param {Function} props.onMenuOpen - Callback quando si apre il menu contestuale
 * @param {Function} props.onBookClick - Callback quando si clicca sul libro
 * @param {Function} props.onAddBook - Callback quando si aggiunge un libro (per variante 'search')
 */
const BookCard = ({
  book,
  userBook,
  variant = 'grid',
  isFavorite = false,
  isInLibrary = false,
  loading = false,
  loadingId = null,
  onFavoriteToggle,
  onMenuOpen,
  onBookClick,
  onAddBook
}) => {
  const theme = useTheme();
  
  // Estrai i dati in base al tipo di oggetto ricevuto
  // Questo è necessario perché a volte riceviamo l'oggetto libro direttamente,
  // altre volte tramite userBook che ha bookId come proprietà
  const bookData = userBook?.bookId || book;
  const userBookId = userBook?._id;
  const bookId = bookData?.googleBooksId || bookData?._id;
  
  // Estrai le informazioni dal libro
  const {
    title = 'Titolo sconosciuto',
    author = 'Autore sconosciuto',
    coverImage = null,
    publishedYear,
    publisher,
    isbn
  } = bookData || {};
  
  // Estrai le informazioni utente-libro
  const {
    readStatus = 'to-read',
    rating = 0
  } = userBook || {};
  
  // Determina se è in caricamento
  const isLoading = loading && (loadingId === bookId || loadingId === userBookId);
  
  // Funzione per ottenere l'icona dello stato di lettura
  const getReadStatusIcon = (status) => {
    switch (status) {
      case 'reading':
        return <ReadingIcon color="primary" />;
      case 'completed':
        return <CompletedIcon color="success" />;
      case 'abandoned':
        return <AbandonedIcon color="error" />;
      case 'lent':
        return <LentIcon color="warning" />;
      case 'to-read':
      default:
        return <ToReadIcon color="disabled" />;
    }
  };
  
  // Funzione per ottenere l'etichetta dello stato di lettura
  const getReadStatusLabel = (status) => {
    switch (status) {
      case 'reading':
        return 'In lettura';
      case 'completed':
        return 'Completato';
      case 'abandoned':
        return 'Abbandonato';
      case 'lent':
        return 'Prestato';
      case 'to-read':
      default:
        return 'Da leggere';
    }
  };
  
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
  
  // Handler per l'aggiunta del libro
  const handleAddBook = (e) => {
    e.stopPropagation(); // Previene la propagazione al click sul libro
    if (onAddBook) {
      onAddBook(book);
    }
  };
  
  // Visualizzazione anteprima (usata in Home.js)
  if (variant === 'preview') {
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
        {coverImage ? (
          <CardMedia
            component="img"
            height="160"
            image={coverImage}
            alt={title}
            sx={{ objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.04)'
            }}
          >
            <NoImageIcon sx={{ fontSize: 40, color: 'rgba(0, 0, 0, 0.3)' }} />
          </Box>
        )}
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {author}
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  // Visualizzazione griglia (usata in Library.js)
  if (variant === 'grid') {
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
          <IconButton 
            size="small"
            onClick={handleFavoriteToggle}
            color={isFavorite ? "error" : "default"}
          >
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          
          <IconButton 
            size="small"
            onClick={handleMenuOpen}
          >
            <MoreIcon />
          </IconButton>
        </CardActions>
      </Card>
    );
  }
  
  // Visualizzazione lista (usata in Library.js)
  if (variant === 'list') {
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                {title}
              </Typography>
              
              {/* Badge stato lettura */}
              <Tooltip title={getReadStatusLabel(readStatus)}>
                <Box sx={{ display: 'inline-flex' }}>
                  {getReadStatusIcon(readStatus)}
                </Box>
              </Tooltip>
            </Box>
            
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
            <IconButton 
              size="small"
              onClick={handleFavoriteToggle}
              color={isFavorite ? "error" : "default"}
              sx={{ mr: 1 }}
            >
              {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            
            <IconButton 
              size="small"
              onClick={handleMenuOpen}
            >
              <MoreIcon />
            </IconButton>
          </Grid>
        </Grid>
      </Paper>
    );
  }
  
  // Visualizzazione risultato ricerca (usata in AddBook.js)
  if (variant === 'search') {
    return (
      <Card
        sx={{
          mb: 2,
          borderRadius: '12px',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Copertina libro */}
            {coverImage ? (
              <Box
                component="img"
                src={coverImage}
                alt={title}
                sx={{
                  width: 60,
                  height: 85,
                  borderRadius: '8px',
                  mr: 2,
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
                onClick={handleBookClick}
              />
            ) : (
              <Box
                sx={{
                  width: 60,
                  height: 85,
                  borderRadius: '8px',
                  mr: 2,
                  bgcolor: 'rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={handleBookClick}
              >
                <NoImageIcon />
              </Box>
            )}
            
            {/* Info libro */}
            <Box 
              sx={{ 
                flex: 1,
                cursor: 'pointer'
              }}
              onClick={handleBookClick}
            >
              <Typography variant="subtitle1" component="div" gutterBottom>
                {title}
              </Typography>
              <Typography variant="body2" color="text.primary" gutterBottom>
                {author}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {publishedYear && (
                  <Typography variant="body2" color="text.secondary">
                    {publishedYear}
                  </Typography>
                )}
                {isbn && (
                  <Typography variant="caption" sx={{ display: 'inline-block' }}>
                    ISBN: {isbn}
                  </Typography>
                )}
              </Box>
            </Box>
            
            {/* Pulsante azione */}
            <Box sx={{ ml: 1 }}>
              {isInLibrary ? (
                <Tooltip title="Libro già nella tua libreria">
                  <IconButton 
                    color="success"
                    onClick={handleBookClick}
                    size="small"
                    sx={{ 
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.success.main, 0.2),
                      }
                    }}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                </Tooltip>
              ) : isLoading ? (
                <CircularProgress size={24} color="primary" />
              ) : (
                <IconButton 
                  color="primary"
                  size="small"
                  onClick={handleAddBook}
                  sx={{ 
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  // Per altre varianti o default, ritorna la variante 'grid'
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: '12px',
        cursor: 'pointer'
      }}
      onClick={handleBookClick}
    >
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
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" component="div">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {author}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BookCard;