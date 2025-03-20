import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  Grid, 
  Button, 
  IconButton, 
  Divider,
  Rating,
  CircularProgress,
  Card,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  alpha
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MenuBook as ReadingIcon,
  CheckCircle as CompletedIcon,
  Bookmark as ToReadIcon,
  BookmarkRemove as AbandonedIcon,
  PeopleAlt as LentIcon,
  ImageNotSupported as NoImageIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const Book = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Stato per il dialog di conferma eliminazione
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Recupera i preferiti da localStorage
  const [favorite, setFavorite] = useState(() => {
    const savedFavorites = localStorage.getItem('booksnap_favorites');
    const favorites = savedFavorites ? JSON.parse(savedFavorites) : {};
    return favorites[id] || false;
  });
  
  useEffect(() => {
    fetchBookDetails();
  }, [id]);
  
  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Recupera i dettagli del libro dall'API
      const response = await bookService.getUserBookById(id, TEMP_USER_ID);
      
      console.log('Dettagli libro recuperati:', response);
      
      if (response && response.data) {
        setBook(response.data);
      } else {
        setError('Libro non trovato');
      }
    } catch (err) {
      console.error('Errore nel recupero dei dettagli del libro:', err);
      setError('Si è verificato un errore nel caricamento dei dettagli del libro.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleFavorite = () => {
    // Aggiorna lo stato locale
    const newFavoriteState = !favorite;
    setFavorite(newFavoriteState);
    
    // Aggiorna localStorage
    const savedFavorites = localStorage.getItem('booksnap_favorites');
    const favorites = savedFavorites ? JSON.parse(savedFavorites) : {};
    favorites[id] = newFavoriteState;
    localStorage.setItem('booksnap_favorites', JSON.stringify(favorites));
  };
  
  const handleEdit = () => {
    navigate(`/edit-book/${id}`);
  };
  
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      
      // Chiudi il dialog
      setDeleteDialogOpen(false);
      
      // Rimuovi il libro
      await bookService.removeFromLibrary(id, TEMP_USER_ID);
      
      // Naviga alla libreria
      navigate('/library');
    } catch (err) {
      console.error('Errore nella rimozione del libro:', err);
      setError('Si è verificato un errore nella rimozione del libro.');
      setLoading(false);
    }
  };
  
  const handleShare = () => {
    alert('Funzionalità di condivisione disponibile prossimamente');
  };
  
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
  
  return (
    <Box sx={{ p: 2 }}>
      {/* Header con pulsante indietro */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          edge="start" 
          color="inherit" 
          onClick={() => navigate(-1)}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Dettagli libro
        </Typography>
      </Box>
      
      {/* Contenuto principale */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 3,
            border: `1px solid ${theme.palette.error.light}`,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.light, 0.1),
            textAlign: 'center'
          }}
        >
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => navigate('/library')}
            sx={{ mt: 2 }}
          >
            Torna alla libreria
          </Button>
        </Paper>
      ) : book ? (
        <Box>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              mb: 3
            }}
          >
            <Grid container spacing={3}>
              {/* Copertina libro */}
              <Grid item xs={12} sm={4} md={3} sx={{ textAlign: 'center' }}>
                {book.bookId?.coverImage ? (
                  <CardMedia
                    component="img"
                    image={book.bookId.coverImage}
                    alt={book.bookId.title}
                    sx={{ 
                      maxWidth: '100%', 
                      maxHeight: 300, 
                      objectFit: 'contain',
                      borderRadius: 1,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 300,
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1
                    }}
                  >
                    <NoImageIcon sx={{ fontSize: 60, color: 'rgba(0, 0, 0, 0.3)' }} />
                  </Box>
                )}
                
                {/* Pulsanti azione sotto la copertina */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                  <IconButton 
                    color={favorite ? "error" : "default"}
                    onClick={handleToggleFavorite}
                  >
                    {favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <IconButton onClick={handleEdit}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={handleShare}>
                    <ShareIcon />
                  </IconButton>
                  <IconButton onClick={handleOpenDeleteDialog} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Grid>
              
              {/* Informazioni libro */}
              <Grid item xs={12} sm={8} md={9}>
                <Typography variant="h4" component="h2" gutterBottom>
                  {book.bookId?.title || 'Titolo sconosciuto'}
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {book.bookId?.author || 'Autore sconosciuto'}
                </Typography>
                
                {/* Stato di lettura */}
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 2 }}>
                  <Chip 
                    icon={getReadStatusIcon(book.readStatus)} 
                    label={getReadStatusLabel(book.readStatus)}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  
                  {/* Valutazione utente */}
                  {book.rating > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                      <Rating 
                        value={book.rating} 
                        readOnly 
                        precision={0.5}
                      />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        ({book.rating})
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Dettagli libro */}
                <Grid container spacing={2}>
                  {book.bookId?.publisher && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Editore:</strong> {book.bookId.publisher}
                      </Typography>
                    </Grid>
                  )}
                  {book.bookId?.publishedYear && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Anno:</strong> {book.bookId.publishedYear}
                      </Typography>
                    </Grid>
                  )}
                  {book.bookId?.pageCount > 0 && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Pagine:</strong> {book.bookId.pageCount}
                      </Typography>
                    </Grid>
                  )}
                  {book.bookId?.isbn && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>ISBN:</strong> {book.bookId.isbn}
                      </Typography>
                    </Grid>
                  )}
                  {book.bookId?.language && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Lingua:</strong> {book.bookId.language}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
                
                {/* Descrizione */}
                {book.bookId?.description && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Descrizione</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {book.bookId.description}
                    </Typography>
                  </Box>
                )}
                
                {/* Note personali */}
                {book.notes && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Note personali</strong>
                    </Typography>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.light, 0.05),
                        border: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {book.notes}
                      </Typography>
                    </Paper>
                  </Box>
                )}
                
                {/* Pulsante modifica visibile sulla destra in versione mobile */}
                <Box sx={{ mt: 3, display: { sm: 'none', xs: 'flex' }, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                    fullWidth
                  >
                    Modifica libro
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Box>
      ) : null}
      
      {/* Dialog di conferma eliminazione */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler rimuovere questo libro dalla tua libreria? Questa azione non può essere annullata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Annulla
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Book;