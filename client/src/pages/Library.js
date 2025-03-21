import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Box, 
  Typography, 
  Button,
  Paper,
  Grid,
  IconButton,
  CircularProgress,
  Divider,
  Tooltip,
  Tab,
  Tabs,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Card,
  alpha
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  //FilterList as FilterIcon,
  Sort as SortIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import bookService from '../services/book.service';
import BookCard from '../components/book/BookCard';
import useFavorites from '../hooks/useFavorites';
import FilterBar from '../components/common/FilterBar';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const Library = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Stati per i libri e caricamento
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites(TEMP_USER_ID);
  
  // Stati per la visualizzazione
  const [viewMode, setViewMode] = useState(() => {
    const savedViewMode = localStorage.getItem('booksnap_view_mode');
    return savedViewMode || 'grid'; // Default a grid se non c'è preferenza salvata
  });
  const [currentTab, setCurrentTab] = useState('all'); // 'all', 'reading', 'to-read', 'completed', 'abandoned', 'lent'
  
  // Stati per sorting e filtering
  const [sortBy, setSortBy] = useState('dateAdded'); // 'dateAdded', 'title', 'author', 'rating'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' o 'desc'
  
  // Menu contestuale
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  
  // Snackbar per notifiche
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const sortOptions = [
    { value: 'dateAdded', label: 'Data aggiunta' },
    { value: 'title', label: 'Titolo' },
    { value: 'author', label: 'Autore' },
    { value: 'rating', label: 'Valutazione' }
  ];
  
  // Definisci le opzioni di filtro (puoi espanderle in base alle tue esigenze)
  const filterOptions = [
    {
      key: 'readStatus',
      label: 'Stato lettura',
      options: [
        { value: 'all', label: 'Tutti' },
        { value: 'reading', label: 'In lettura' },
        { value: 'to-read', label: 'Da leggere' },
        { value: 'completed', label: 'Completati' },
        { value: 'abandoned', label: 'Abbandonati' },
        { value: 'lent', label: 'Prestati' }
      ]
    }
  ];
  
  // Carica i libri dell'utente all'avvio e quando cambia il tab
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab') || 'all';
    const favoritesParam = searchParams.get('favorites');
    
    setCurrentTab(favoritesParam ? 'favorites' : tabFromUrl);
    
    fetchBooks();
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Funzione per recuperare i libri dalla libreria dell'utente
  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Ottieni il tab corrente dai parametri URL per sicurezza
      const searchParams = new URLSearchParams(location.search);
      const tabFromUrl = searchParams.get('tab') || 'all';
      const favoritesParam = searchParams.get('favorites');
      const currentTabValue = favoritesParam ? 'favorites' : tabFromUrl;
      
      console.log('Tab corrente:', currentTabValue);
      
      // Costruisci i filtri in base al tab corrente
      const filters = { userId: TEMP_USER_ID };
      
      // Gestisci i diversi casi di filtraggio
      switch (currentTabValue) {
        case 'reading':
          filters.readStatus = 'reading';
          break;
        case 'to-read':
          filters.readStatus = 'to-read';
          break;
        case 'completed':
          filters.readStatus = 'completed';
          break;
        case 'abandoned':
          filters.readStatus = 'abandoned';
          break;
        case 'lent':
          filters.readStatus = 'lent';
          break;
        case 'favorites':
          // Per i preferiti, recupera tutti i libri e poi filtra
          break;
        case 'all':
        default:
          // Nessun filtro specifico per 'all'
          delete filters.readStatus;
          break;
      }
      
      console.log('Filtri API:', filters);
      
      // Recupera i libri dall'API
      const response = await bookService.getUserBooks(filters);
      console.log('Risposta API completa:', response);
      
      let booksToShow = response.books || [];
      
      // Se non ci sono libri, esci prima
      if (booksToShow.length === 0) {
        setBooks([]);
        return;
      }
      
      // Log di debug per vedere la struttura del primo libro
      if (booksToShow.length > 0) {
        console.log('Esempio struttura libro:', booksToShow[0]);
      }
      
      // Filtra per preferiti se necessario
      if (currentTabValue === 'favorites') {
        booksToShow = booksToShow.filter(book => isFavorite(book._id));
      }
      
      console.log(`Libri dopo filtro: ${booksToShow.length}`);
      
      // Ordina i libri
      const sortedBooks = sortBooks(booksToShow);
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


  // Quando cambia un filtro dal FilterBar
const handleFilterChange = (filterKey, value) => {
  if (filterKey === 'readStatus') {
    const searchParams = new URLSearchParams(location.search);
    
    if (value === 'all') {
      searchParams.delete('tab');
      searchParams.delete('favorites');
    } else {
      searchParams.set('tab', value);
      searchParams.delete('favorites');
    }
    
    // Questo aggiorna automaticamente anche le tabs attraverso l'useEffect che osserva location.search
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  }
};
  

  
  // Gestione tab corrente
  const handleTabChange = (event, newValue) => {
    // Costruisci i nuovi parametri URL
    const searchParams = new URLSearchParams(location.search);
    
    // Se è il tab "Preferiti", imposta un parametro speciale
    if (newValue === 'favorites') {
      searchParams.set('favorites', 'true');
      searchParams.delete('tab');
    } else {
      // Per altri tab, imposta il parametro tab
      searchParams.set('tab', newValue);
      searchParams.delete('favorites');
    }

    // Naviga con i nuovi parametri
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  };
  
  // Cambia la modalità di visualizzazione (griglia/lista)
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('booksnap_view_mode', mode);
  };
  
  // Gestione preferiti
  const handleToggleFavorite = async (bookId) => {
    try {
      await toggleFavorite(bookId);
      
      // Mostra notifica
      setSnackbar({
        open: true,
        message: isFavorite(bookId) 
          ? 'Libro rimosso dai preferiti' 
          : 'Libro aggiunto ai preferiti',
        severity: 'success'
      });
    } catch (err) {
      console.error('Errore nella gestione dei preferiti:', err);
      
      // Mostra errore
      setSnackbar({
        open: true,
        message: 'Errore nella gestione dei preferiti',
        severity: 'error'
      });
    }
  };
  
  // Gestione menu di ordinamento
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);
  
  const handleSortMenuOpen = (event) => {
    setSortMenuAnchorEl(event.currentTarget);
  };
  
  const handleSortMenuClose = () => {
    setSortMenuAnchorEl(null);
  };
  
  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    
    // Aggiorna l'ordinamento dei libri
    setBooks(sortBooks([...books]));
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
  
  // Funzione per rimuovere un libro dalla libreria
  const handleRemoveBook = (userBookId) => {
    // Chiudi il menu
    handleBookMenuClose();
    
    // Imposta il libro da eliminare e apri il dialog
    setBookToDelete(userBookId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Rimuovi il libro tramite API
      await bookService.removeFromLibrary(bookToDelete);
      
      // Aggiorna la lista di libri
      setBooks(books.filter(book => book._id !== bookToDelete));
      
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
      setDeleteDialogOpen(false);
      setBookToDelete(null);
    }
  };
  
  // Funzione per modificare le informazioni di un libro
  const handleEditBook = (userBookId) => {
    // Chiudi il menu
    handleBookMenuClose();
    
    // Naviga alla pagina di modifica
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
    // Naviga alla pagina di dettaglio
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
        
        <FilterBar 
          sortOptions={sortOptions}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          filterOptions={filterOptions}
          selectedFilters={{ readStatus: currentTab === 'all' ? 'all' : currentTab }}
          onFilterChange={handleFilterChange}
          extraActions={
            <Box>
              <Tooltip title="Vista griglia">
                <IconButton 
                  onClick={() => handleViewModeChange('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  sx={{ 
                    bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': {
                      bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.action.hover, 0.1),
                    }
                  }}
                >
                  <GridViewIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Vista lista">
                <IconButton 
                  onClick={() => handleViewModeChange('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  sx={{ 
                    bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': {
                      bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.action.hover, 0.1),
                    }
                  }}
                >
                  <ViewListIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
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
          <Tab label="Preferiti" value="favorites" />
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
              : `Non hai libri con stato "${currentTab === 'favorites' ? 'preferiti' : currentTab}"`}
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
                <Box sx={{ flexGrow: 1, p: 2, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Aggiungi libro
                  </Typography>
                </Box>
              </Card>
            </Grid>
            
            {/* Libri nella griglia */}
            {books.map((book) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={book._id}>
                <BookCard 
                  userBook={book}
                  variant="grid"
                  isFavorite={isFavorite(book._id)}
                  onFavoriteToggle={() => handleToggleFavorite(book._id)}
                  onMenuOpen={(e) => handleBookMenuOpen(e, book._id)}
                  onBookClick={() => handleViewBookDetails(book._id)}
                  showFavoriteButton={true}
                  showMenuIcon={true}
                />
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
              <BookCard 
                key={book._id}
                userBook={book}
                variant="list"
                isFavorite={isFavorite(book._id)}
                onFavoriteToggle={() => handleToggleFavorite(book._id)}
                onMenuOpen={(e) => handleBookMenuOpen(e, book._id)}
                onBookClick={() => handleViewBookDetails(book._id)}
              />
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
      
      {/* Dialog di conferma eliminazione */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setBookToDelete(null);
        }}
      >
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler rimuovere questo libro dalla tua libreria? Questa azione non può essere annullata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setBookToDelete(null);
            }} 
            color="primary"
          >
            Annulla
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
      
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