import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Paper,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  CircularProgress,
  Divider,
  Tooltip,
  Tab,
  Tabs,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Menu,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  StarRate as StarIcon,
  MenuBook as ReadingIcon,
  CheckCircle as CompletedIcon,
  Bookmark as ToReadIcon,
  BookmarkRemove as AbandonedIcon,
  PeopleAlt as LentIcon,
  MoreVert as MoreIcon,
  ImageNotSupported as NoImageIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import bookService from '../services/book.service';
import Rating from '@mui/material/Rating';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const Library = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // Stati per i libri e caricamento
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState({});
  
  // Stati per la visualizzazione
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
  const [currentTab, setCurrentTab] = useState('all'); // 'all', 'reading', 'to-read', 'completed', 'abandoned', 'lent'
  
  // Stati per sorting e filtering
  const [sortBy, setSortBy] = useState('dateAdded'); // 'dateAdded', 'title', 'author', 'rating'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' o 'desc'
  
  // Menu contestuale
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  
  // Snackbar per notifiche
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Carica i libri dell'utente all'avvio
  useEffect(() => {
    fetchBooks();
  }, [currentTab]);
  
  // Funzione per recuperare i libri dalla libreria dell'utente
  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Costruisci i filtri in base al tab corrente
      const filters = { userId: TEMP_USER_ID };
      
      if (currentTab !== 'all') {
        filters.readStatus = currentTab;
      }
      
      // Recupera i libri dall'API
      const response = await bookService.getUserBooks(filters);
      
      console.log('Libri recuperati:', response);
      
      // Ordina i libri in base alle opzioni correnti
      const sortedBooks = sortBooks(response.books || []);
      setBooks(sortedBooks);
    } catch (err) {
      console.error('Errore nel recupero dei libri:', err);
      setError('Si è verificato un errore nel caricamento dei libri. Riprova.');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per ordinare i libri
  const sortBooks = (booksToSort) => {
    return [...booksToSort].sort((a, b) => {
      let valueA, valueB;
      
      // Estrai i valori da confrontare in base al criterio di ordinamento
      switch (sortBy) {
        case 'title':
          valueA = a.bookId?.title || '';
          valueB = b.bookId?.title || '';
          break;
        case 'author':
          valueA = a.bookId?.author || '';
          valueB = b.bookId?.author || '';
          break;
        case 'rating':
          valueA = a.rating || 0;
          valueB = b.rating || 0;
          break;
        case 'dateAdded':
        default:
          valueA = new Date(a.createdAt || 0).getTime();
          valueB = new Date(b.createdAt || 0).getTime();
          break;
      }
      
      // Esegui il confronto considerando l'ordine
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  };
  
  // Cambia il tab corrente
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Cambia la modalità di visualizzazione (griglia/lista)
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  

  const handleToggleFavorite = (e, bookId) => {
    e.stopPropagation(); // Previene il click sul libro
    setFavorites(prev => ({
      ...prev,
      [bookId]: !prev[bookId]
    }));
    
    // In futuro, qui chiameremo l'API per salvare lo stato dei preferiti
    setSnackbar({
      open: true,
      message: favorites[bookId] 
        ? 'Libro rimosso dai preferiti' 
        : 'Libro aggiunto ai preferiti',
      severity: 'success'
    });
  };  
  // Gestione menu di ordinamento
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);
  
  const handleSortMenuOpen = (event) => {
    setSortMenuAnchorEl(event.currentTarget);
  };
  
  const handleSortMenuClose = () => {
    setSortMenuAnchorEl(null);
  };
  
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Se stiamo già ordinando per questo criterio, inverti l'ordine
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Altrimenti, imposta il nuovo criterio e resetta l'ordine a decrescente
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    
    // Riordina i libri con le nuove opzioni
    setBooks(sortBooks(books));
    
    // Chiudi il menu
    handleSortMenuClose();
  };
  
  // Gestione menu libro
  const handleBookMenuOpen = (event, bookId) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedBookId(bookId);
  };
  
  const handleBookMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedBookId(null);
  };
  
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
  
  // Funzione per rimuovere un libro dalla libreria
  const handleRemoveBook = async (userBookId) => {
    try {
      setLoading(true);
      
      // Chiudi il menu
      handleBookMenuClose();
      
      // Chiama l'API per rimuovere il libro
      await bookService.removeFromLibrary(userBookId);
      
      // Aggiorna la lista di libri
      setBooks(books.filter(book => book._id !== userBookId));
      
      // Mostra notifica di successo
      setSnackbar({
        open: true,
        message: 'Libro rimosso dalla libreria con successo',
        severity: 'success'
      });
    } catch (err) {
      console.error('Errore nella rimozione del libro:', err);
      
      // Mostra notifica di errore
      setSnackbar({
        open: true,
        message: 'Errore durante la rimozione del libro',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per modificare le informazioni di un libro
  const handleEditBook = (userBookId) => {
    // Chiudi il menu
    handleBookMenuClose();
    
    // Naviga alla pagina di modifica (da implementare)
    navigate(`/edit-book/${userBookId}`);
  };
  
  // Funzione per condividere un libro
  const handleShareBook = (userBookId) => {
    // Chiudi il menu
    handleBookMenuClose();
    
    // Per ora, mostra solo un messaggio che la funzione sarà disponibile in futuro
    setSnackbar({
      open: true,
      message: 'La funzione di condivisione sarà disponibile prossimamente',
      severity: 'info'
    });
  };
  
  // Funzione per visualizzare i dettagli di un libro
  const handleViewBookDetails = (userBookId) => {
    // Naviga alla pagina di dettaglio (da implementare)
    navigate(`/book/${userBookId}`);
  };
  
  // Chiude lo snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}
      >
        <Typography variant="h5" component="h1">
          La mia libreria
        </Typography>
        
        <Box>
          {/* Controlli visualizzazione */}
          <Tooltip title="Vista griglia">
            <IconButton 
              onClick={() => handleViewModeChange('grid')}
              color={viewMode === 'grid' ? 'primary' : 'default'}
            >
              <GridViewIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Vista lista">
            <IconButton 
              onClick={() => handleViewModeChange('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
            >
              <ListViewIcon />
            </IconButton>
          </Tooltip>
          
          {/* Menu ordinamento */}
          <Tooltip title="Ordina">
            <IconButton 
              onClick={handleSortMenuOpen}
              aria-controls="sort-menu"
              aria-haspopup="true"
            >
              <SortIcon />
            </IconButton>
          </Tooltip>
          <Menu
            id="sort-menu"
            anchorEl={sortMenuAnchorEl}
            keepMounted
            open={Boolean(sortMenuAnchorEl)}
            onClose={handleSortMenuClose}
          >
            <MenuItem 
              onClick={() => handleSortChange('dateAdded')}
              selected={sortBy === 'dateAdded'}
            >
              {sortBy === 'dateAdded' && sortOrder === 'desc' ? '↓ ' : sortBy === 'dateAdded' && sortOrder === 'asc' ? '↑ ' : ''}
              Data aggiunta
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortChange('title')} 
              selected={sortBy === 'title'}
            >
              {sortBy === 'title' && sortOrder === 'desc' ? '↓ ' : sortBy === 'title' && sortOrder === 'asc' ? '↑ ' : ''}
              Titolo
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortChange('author')} 
              selected={sortBy === 'author'}
            >
              {sortBy === 'author' && sortOrder === 'desc' ? '↓ ' : sortBy === 'author' && sortOrder === 'asc' ? '↑ ' : ''}
              Autore
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortChange('rating')} 
              selected={sortBy === 'rating'}
            >
              {sortBy === 'rating' && sortOrder === 'desc' ? '↓ ' : sortBy === 'rating' && sortOrder === 'asc' ? '↑ ' : ''}
              Valutazione
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Tab per filtrare per stato di lettura */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Tutti" value="all" />
          <Tab label="In lettura" value="reading" />
          <Tab label="Da leggere" value="to-read" />
          <Tab label="Completati" value="completed" />
          <Tab label="Abbandonati" value="abandoned" />
          <Tab label="Prestati" value="lent" />
        </Tabs>
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
            onClick={fetchBooks}
            sx={{ mt: 1 }}
          >
            Riprova
          </Button>
        </Paper>
      ) : books.length === 0 ? (
        // Visualizzazione quando non ci sono libri
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 3,
            border: '2px dashed rgba(0, 0, 0, 0.12)',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {currentTab === 'all'
              ? 'Non hai ancora aggiunto libri alla tua libreria'
              : `Non hai libri con stato "${getReadStatusLabel(currentTab)}"`}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/add-book')}
            sx={{ mt: 2 }}
          >
            {currentTab === 'all' ? 'Aggiungi libro' : 'Aggiungi nuovo libro'}
          </Button>
        </Paper>
      ) : (
        // Visualizzazione dei libri
        viewMode === 'grid' ? (
          // Vista griglia
          <Grid container spacing={2}>
            {/* Card "Aggiungi libro" */}
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: '12px',
                  border: '2px dashed rgba(0, 0, 0, 0.12)',
                  boxShadow: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/add-book')}
              >
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: 200,
                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <AddIcon sx={{ fontSize: 40, color: 'rgba(0, 0, 0, 0.3)' }} />
                </Box>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Aggiungi libro
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Libri nella griglia */}
            {books.map((book) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={book._id}>
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
                  onClick={() => handleViewBookDetails(book._id)}
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
                    <Tooltip title={getReadStatusLabel(book.readStatus || 'to-read')}>
                      {getReadStatusIcon(book.readStatus || 'to-read')}
                    </Tooltip>
                  </Box>
                  
                  {/* Copertina */}
                  {book.bookId?.coverImage ? (
                    <CardMedia
                      component="img"
                      height="200"
                      image={book.bookId.coverImage}
                      alt={book.bookId.title}
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
                      {book.bookId?.title || 'Titolo sconosciuto'}
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
                      {book.bookId?.author || 'Autore sconosciuto'}
                    </Typography>
                    
                    {/* Valutazione */}
                    {book.rating > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Rating 
                          value={book.rating} 
                          readOnly 
                          size="small" 
                          precision={0.5}
                        />
                      </Box>
                    )}
                  </CardContent>
                  
                  {/* Aggiungi icona preferiti e menu */}
                  <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                    <IconButton 
                      size="small"
                      onClick={(e) => handleToggleFavorite(e, book._id)}
                      color={favorites[book._id] ? "error" : "default"}
                    >
                      {favorites[book._id] ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    </IconButton>
                    
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookMenuOpen(e, book._id);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          // Vista lista
          <Box>
            {/* Pulsante Aggiungi in vista lista */}
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: '12px',
                border: '2px dashed rgba(0, 0, 0, 0.12)',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/add-book')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    mr: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AddIcon color="primary" />
                </Box>
                <Typography color="text.secondary">
                  Aggiungi nuovo libro
                </Typography>
              </Box>
            </Paper>
            
            {/* Lista libri */}
            {books.map((book) => (
              <Paper
                key={book._id}
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
                onClick={() => handleViewBookDetails(book._id)}
              >
                <Grid container spacing={2} alignItems="center">
                  {/* Copertina */}
                  <Grid item xs={3} sm={1}>
                    {book.bookId?.coverImage ? (
                      <Box
                        component="img"
                        src={book.bookId.coverImage}
                        alt={book.bookId.title}
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
                        {book.bookId?.title || 'Titolo sconosciuto'}
                      </Typography>
                      
                      {/* Badge stato lettura */}
                      <Tooltip title={getReadStatusLabel(book.readStatus || 'to-read')}>
                        <Box sx={{ display: 'inline-flex' }}>
                          {getReadStatusIcon(book.readStatus || 'to-read')}
                        </Box>
                      </Tooltip>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      {book.bookId?.author || 'Autore sconosciuto'}
                    </Typography>
                    
                    {/* Valutazione */}
                    {book.rating > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Rating 
                          value={book.rating} 
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
    onClick={(e) => handleToggleFavorite(e, book._id)}
    color={favorites[book._id] ? "error" : "default"}
    sx={{ mr: 1 }}
  >
    {favorites[book._id] ? <FavoriteIcon /> : <FavoriteBorderIcon />}
  </IconButton>
  
  <IconButton 
    size="small"
    onClick={(e) => {
      e.stopPropagation();
      handleBookMenuOpen(e, book._id);
    }}
  >
    <MoreIcon />
  </IconButton>
</Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        )
      )}
      
      {/* Menu contestuale libro */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleBookMenuClose}
      >
        <MenuItem onClick={() => handleEditBook(selectedBookId)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifica</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleShareBook(selectedBookId)}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Condividi</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleRemoveBook(selectedBookId)}
          sx={{ color: theme.palette.error.main }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Rimuovi dalla libreria</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Snackbar per notifiche */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Library;