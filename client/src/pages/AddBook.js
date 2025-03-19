import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  Divider, 
  useTheme,
  TextField,
  CircularProgress,
  Button,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  alpha,
  List,
  Grid,
  Snackbar,
  Alert,
  Tooltip,
  Rating,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  QrCodeScanner as ScannerIcon,
  Create as CreateIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon,
  Book as BookIcon,
  ImageNotSupported as NoImageIcon,
  Add as AddIcon,
  LibraryBooks as LibraryIcon,
  CheckCircleOutline as CheckIcon,
  AddCircleOutline as AddNewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ScannerOverlay from '../components/scan/ScannerOverlay';
import googleBooksService from '../services/googleBooks.service';

const AddBook = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Stato per la ricerca libri
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Stato per la creazione manuale di un libro
  const [isManualCreation, setIsManualCreation] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publishedYear: '',
    pageCount: '',
    description: '',
    coverImage: ''
  });
  
  // Stato per la personalizzazione del libro
  const [userBookData, setUserBookData] = useState({
    rating: 0,
    readStatus: 'to-read', // 'to-read', 'reading', 'completed', 'abandoned'
    notes: ''
  });
  
  // Stato per i libri nella libreria (simulato)
  const [libraryBooks, setLibraryBooks] = useState({});
  
  // Stato per notifiche
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Effetto per la ricerca con debounce
  useEffect(() => {
    // Se la query è vuota, non fare nulla
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    // Inizializza timer per il debounce
    const timer = setTimeout(() => {
      searchBooks(searchQuery);
    }, 600); // Aspetta 600ms dopo l'ultima digitazione
    
    // Pulisci il timer quando la query cambia
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Funzione per cercare libri
  const searchBooks = async (query) => {
    try {
      setLoading(true);
      setError('');
      const results = await googleBooksService.searchBooks(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Errore durante la ricerca:', err);
      setError('Si è verificato un errore durante la ricerca. Riprova.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per selezionare un libro
  const handleSelectBook = (book) => {
    setSelectedBook(book);
    // Resetta i dati utente quando si seleziona un nuovo libro
    setUserBookData({
      rating: 0,
      readStatus: 'to-read',
      notes: ''
    });
    console.log('Libro selezionato:', book);
  };
  
  // Funzione per tornare ai risultati di ricerca
  const handleBackToResults = () => {
    setSelectedBook(null);
    setIsManualCreation(false);
  };
  
  // Funzione per gestire la creazione manuale di un libro
  const handleCreateManually = () => {
    setIsManualCreation(true);
    setSelectedBook(null);
    // Resetta i campi del nuovo libro
    setNewBook({
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      publishedYear: '',
      pageCount: '',
      description: '',
      coverImage: ''
    });
    // Resetta i dati utente
    setUserBookData({
      rating: 0,
      readStatus: 'to-read',
      notes: ''
    });
  };
  
  // Funzione per aggiornare i campi del nuovo libro
  const handleNewBookChange = (field, value) => {
    setNewBook(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Funzione per aggiornare i dati utente (rating, status, notes)
  const handleUserBookDataChange = (field, value) => {
    setUserBookData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Funzione per aggiungere libro alla libreria
  const handleAddToLibrary = (book, fromResults = false) => {
    // Determina quale libro aggiungere (selezionato o creato manualmente)
    const bookToAdd = isManualCreation ? newBook : book;
    console.log('Aggiungi alla libreria:', bookToAdd);
    console.log('Dati personalizzati:', userBookData);
    
    // Qui in futuro implementeremo la chiamata all'API per salvare il libro
    // Per ora, simuliamo l'aggiunta alla libreria
    setLibraryBooks(prev => ({
      ...prev,
      [bookToAdd.googleBooksId || `manual-${Date.now()}`]: true
    }));
    
    // Mostro notifica di successo
    setSnackbar({
      open: true,
      message: 'Libro aggiunto alla libreria con successo!',
      severity: 'success'
    });
    
    // Se siamo nei risultati, non facciamo nulla
    // Se siamo nei dettagli o creazione manuale, torniamo ai risultati
    if (!fromResults) {
      handleBackToResults();
    }
  };
  
  // Funzione per chiudere lo snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };
  
  // Funzione per aprire lo scanner
  const handleOpenScanner = () => {
    setScannerOpen(true);
  };
  
  // Funzione per chiudere lo scanner
  const handleCloseScanner = () => {
    setScannerOpen(false);
  };
  
  // Funzione per passare alla modalità manuale
  const handleManualMode = () => {
    setIsManualMode(true);
  };
  
  // Funzione per tornare alla selezione modalità
  const handleBackToSelection = () => {
    setIsManualMode(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBook(null);
    setIsManualCreation(false);
    setError('');
  };
  
  // Funzione per gestire la cattura dall'overlay scanner
  const handleCapture = (captureData) => {
    console.log('Dati catturati:', captureData);
    setScannerOpen(false);
    // Per ora, simuliamo un fallimento nella scansione per testare il flusso
    setTimeout(() => {
      setSnackbar({
        open: true,
        message: 'Non siamo riusciti a identificare il libro. Prova ad inserirlo manualmente.',
        severity: 'warning'
      });
      setIsManualMode(true);
    }, 1000);
  };

  // Funzione per pulire il campo di ricerca
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBook(null);
    setIsManualCreation(false);
  };

  // Funzione per verificare se un libro è già nella libreria
  const isBookInLibrary = (bookId) => {
    // Verifica se il libro è nell'oggetto libraryBooks
    return libraryBooks[bookId] === true;
  };

  // Funzione per renderizzare gli stati di lettura
  const getReadStatusLabel = (status) => {
    const statusMap = {
      'to-read': 'Da leggere',
      'reading': 'In lettura',
      'completed': 'Completato',
      'abandoned': 'Abbandonato',
      'lent': 'Prestato'
    };
    return statusMap[status] || 'Da leggere';
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header con opzione per tornare indietro */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        {(isManualMode || isManualCreation) && (
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={selectedBook || isManualCreation ? handleBackToResults : handleBackToSelection}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h5" component="h1">
          {isManualMode 
            ? isManualCreation
              ? 'Crea nuovo libro'
              : selectedBook 
                ? 'Dettagli libro' 
                : 'Inserisci libro manualmente' 
            : 'Aggiungi libro'}
        </Typography>
      </Box>
      
      {/* Contenuto principale */}
      {!isManualMode ? (
        // Modalità selezione (scansiona o inserisci manualmente)
        <Stack spacing={3} sx={{ mt: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '12px',
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderColor: theme.palette.primary.light,
              }
            }}
            onClick={handleOpenScanner}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  mr: 2,
                  bgcolor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText,
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ScannerIcon fontSize="large" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Scansiona libro
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Usa la fotocamera per scansionare la copertina, 
                  la costa o il codice ISBN del libro
                </Typography>
              </Box>
            </Box>
          </Paper>
          
          <Divider sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary">
              oppure
            </Typography>
          </Divider>
          
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '12px',
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderColor: theme.palette.primary.light,
              }
            }}
            onClick={handleManualMode}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  mr: 2,
                  bgcolor: 'rgba(0,0,0,0.04)',
                  color: theme.palette.text.primary,
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreateIcon fontSize="large" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Inserisci manualmente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cerca il libro per titolo, autore o ISBN e aggiungilo 
                  alla tua libreria
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Stack>
      ) : (
        // Modalità inserimento manuale
        <Box sx={{ mt: 2 }}>
          {/* Form creazione manuale */}
          {isManualCreation ? (
            <Box sx={{ mt: 2 }}>
              <Card
                elevation={1}
                sx={{
                  borderRadius: '12px',
                  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Informazioni libro
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Titolo"
                        value={newBook.title}
                        onChange={(e) => handleNewBookChange('title', e.target.value)}
                        required
                        variant="outlined"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Autore"
                        value={newBook.author}
                        onChange={(e) => handleNewBookChange('author', e.target.value)}
                        required
                        variant="outlined"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="ISBN"
                        value={newBook.isbn}
                        onChange={(e) => handleNewBookChange('isbn', e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Editore"
                        value={newBook.publisher}
                        onChange={(e) => handleNewBookChange('publisher', e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Anno di pubblicazione"
                        value={newBook.publishedYear}
                        onChange={(e) => handleNewBookChange('publishedYear', e.target.value)}
                        variant="outlined"
                        type="number"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Numero di pagine"
                        value={newBook.pageCount}
                        onChange={(e) => handleNewBookChange('pageCount', e.target.value)}
                        variant="outlined"
                        type="number"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Descrizione"
                        value={newBook.description}
                        onChange={(e) => handleNewBookChange('description', e.target.value)}
                        variant="outlined"
                        multiline
                        rows={4}
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="URL Copertina (opzionale)"
                        value={newBook.coverImage}
                        onChange={(e) => handleNewBookChange('coverImage', e.target.value)}
                        variant="outlined"
                        placeholder="https://example.com/cover.jpg"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: '8px' }
                        }}
                        helperText="Inserisci l'URL di un'immagine online per la copertina"
                      />
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" gutterBottom>
                    Personalizzazione
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      La tua valutazione
                    </Typography>
                    <Rating
                      value={userBookData.rating}
                      onChange={(event, newValue) => {
                        handleUserBookDataChange('rating', newValue || 0);
                      }}
                      precision={0.5}
                      size="large"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
  <InputLabel id="read-status-label">Stato lettura</InputLabel>
  <Select
    labelId="read-status-label"
    value={userBookData.readStatus}
    onChange={(e) => handleUserBookDataChange('readStatus', e.target.value)}
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
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Note personali
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Aggiungi le tue note personali sul libro..."
                      value={userBookData.notes}
                      onChange={(e) => handleUserBookDataChange('notes', e.target.value)}
                      variant="outlined"
                      InputProps={{
                        sx: { borderRadius: '8px' }
                      }}
                    />
                  </Box>
                </CardContent>
                
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => handleAddToLibrary(newBook)}
                    disabled={!newBook.title || !newBook.author}
                    sx={{ borderRadius: '8px' }}
                  >
                    Aggiungi alla libreria
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ) : (
            // Modalità ricerca e dettaglio
            <>
              {/* Mostra campo di ricerca solo se non è stato selezionato un libro */}
              {!selectedBook && (
                <>
                  {/* Campo di ricerca */}
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Cerca per titolo, autore o ISBN"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          {loading ? (
                            <CircularProgress size={20} />
                          ) : searchQuery ? (
                            <IconButton 
                              edge="end" 
                              onClick={handleClearSearch}
                              size="small"
                            >
                              <ClearIcon />
                            </IconButton>
                          ) : null}
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: '12px'
                      }
                    }}
                  />
                  
                  {/* Messaggio informativo */}
                  {!searchQuery && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ mt: 2, textAlign: 'center' }}
                    >
                      Inserisci almeno 3 caratteri per cercare
                    </Typography>
                  )}
                  
                  {/* Messaggio di errore */}
                  {error && (
                    <Typography 
                      variant="body2" 
                      color="error" 
                      sx={{ mt: 2, textAlign: 'center' }}
                    >
                      {error}
                    </Typography>
                  )}
                </>
              )}

              {/* Stato iniziale della ricerca - nessuna ricerca effettuata */}
              {!selectedBook && !searchQuery && !loading && (
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <BookIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1">
                    Inizia a digitare per cercare un libro
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Oppure se non lo trovi nei risultati, puoi crearlo manualmente
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddNewIcon />}
                    onClick={handleCreateManually}
                    sx={{ borderRadius: '8px' }}
                  >
                    Crea un nuovo libro manualmente
                  </Button>
                </Box>
              )}
              
              {/* Risultati di ricerca (solo se non c'è un libro selezionato) */}
              {!selectedBook && searchResults.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Risultati della ricerca:
                  </Typography>
                  <List sx={{ width: '100%', p: 0 }}>
                    {searchResults.map((book) => (
                      <Card
                        key={book.googleBooksId}
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
                            {book.coverImage ? (
                              <Box
                                component="img"
                                src={book.coverImage}
                                alt={book.title}
                                sx={{
                                  width: 60,
                                  height: 85,
                                  borderRadius: '8px',
                                  mr: 2,
                                  objectFit: 'cover',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleSelectBook(book)}
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
                                onClick={() => handleSelectBook(book)}
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
                              onClick={() => handleSelectBook(book)}
                            >
                              <Typography variant="subtitle1" component="div" gutterBottom>
                                {book.title}
                              </Typography>
                              <Typography variant="body2" color="text.primary" gutterBottom>
                                {book.author}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                {book.publishedYear && (
                                  <Typography variant="body2" color="text.secondary">
                                    {book.publishedYear}
                                  </Typography>
                                )}
                                {book.isbn && (
                                  <Typography variant="caption" sx={{ display: 'inline-block' }}>
                                    ISBN: {book.isbn}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            
                            {/* Pulsante azione (aggiungi o nella libreria) */}
                            <Box sx={{ ml: 1 }}>
                              {isBookInLibrary(book.googleBooksId) ? (
                                <Tooltip title="Libro già nella tua libreria">
                                  <IconButton 
                                    color="success"
                                    onClick={() => navigate('/library')}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.success.main, 0.2),
                                      }
                                    }}
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Button 
                                  variant="contained"
                                  color="primary"
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToLibrary(book, true);
                                  }}
                                  sx={{ 
                                    borderRadius: '8px',
                                    minWidth: 'auto'
                                  }}
                                >
                                  Aggiungi
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </List>
                  
                  {/* Pulsante "Non trovi il tuo libro?" */}
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<AddNewIcon />}
                      onClick={handleCreateManually}
                      sx={{ borderRadius: '8px' }}
                    >
                      Non trovi il tuo libro? Crealo manualmente
                    </Button>
                  </Box>
                </Box>
              )}
              
              {/* Dettagli libro selezionato */}
              {selectedBook && (
                <Box sx={{ mt: 2 }}>
                  <Card
                    elevation={1}
                    sx={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
                      backgroundColor: theme.palette.background.paper
                    }}
                  >
                    {/* Copertina libro */}
                    <Box sx={{ 
                      position: 'relative', 
                      height: 250, 
                      background: `linear-gradient(to bottom, ${alpha(theme.palette.primary.light, 0.2)}, ${alpha(theme.palette.background.paper, 0.8)})`,
                      display: 'flex',
                      justifyContent: 'center',
                      p: 3
                    }}>
                      {selectedBook.largeImage ? (
                        <CardMedia
                          component="img"
                          image={selectedBook.largeImage}
                          alt={selectedBook.title}
                          sx={{ 
                            height: '100%',
                            width: 'auto',
                            maxWidth: '40%',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: '100%',
                            width: '40%',
                            maxWidth: 140,
                            bgcolor: 'rgba(0,0,0,0.08)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                          }}
                        >
                          <NoImageIcon sx={{ fontSize: 50 }} />
                        </Box>
                      )}
                    </Box>
                    
                    <CardContent sx={{ px: 3, py: 2 }}>
                      {/* Titolo e autore */}
                      <Typography variant="h5" component="h2" gutterBottom>
                        {selectedBook.title}
                      </Typography>
                      <Typography variant="subtitle1" color="text.primary" gutterBottom>
                        {selectedBook.author}
                      </Typography>
                      
                      {/* Informazioni libro */}
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {selectedBook.publisher && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Editore:</strong> {selectedBook.publisher}
                            </Typography>
                          </Grid>
                        )}
                        {selectedBook.publishedYear && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Anno:</strong> {selectedBook.publishedYear}
                            </Typography>
                          </Grid>
                        )}
                        {selectedBook.pageCount > 0 && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Pagine:</strong> {selectedBook.pageCount}
                            </Typography>
                          </Grid>
                        )}
                        {selectedBook.isbn && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>ISBN:</strong> {selectedBook.isbn}
                            </Typography>
                          </Grid>
                        )}
                        {selectedBook.language && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Lingua:</strong> {selectedBook.language}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                      
                      {/* Descrizione */}
                      {selectedBook.description && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Descrizione:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedBook.description.length > 300
                              ? `${selectedBook.description.substring(0, 300)}...`
                              : selectedBook.description}
                          </Typography>
                        </Box>
                      )}
                      
                      {/* Sezione personalizzazione */}
                      <Divider sx={{ my: 3 }} />
                      
                      <Typography variant="h6" gutterBottom>
                        Personalizzazione
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          La tua valutazione
                        </Typography>
                        <Rating
                          value={userBookData.rating}
                          onChange={(event, newValue) => {
                            handleUserBookDataChange('rating', newValue || 0);
                          }}
                          precision={0.5}
                          size="large"
                        />
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                          <InputLabel id="read-status-label">Stato lettura</InputLabel>
                          <Select
                            labelId="read-status-label"
                            value={userBookData.readStatus}
                            onChange={(e) => handleUserBookDataChange('readStatus', e.target.value)}
                            label="Stato lettura"
                            sx={{ borderRadius: '8px' }}
                          >
                            <MenuItem value="to-read">Da leggere</MenuItem>
                            <MenuItem value="reading">In lettura</MenuItem>
                            <MenuItem value="completed">Completato</MenuItem>
                            <MenuItem value="abandoned">Abbandonato</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Note personali
                        </Typography>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          placeholder="Aggiungi le tue note personali sul libro..."
                          value={userBookData.notes}
                          onChange={(e) => handleUserBookDataChange('notes', e.target.value)}
                          variant="outlined"
                          InputProps={{
                            sx: { borderRadius: '8px' }
                          }}
                        />
                      </Box>
                    </CardContent>
                    
                    <CardActions sx={{ p: 3, pt: 0 }}>
                      {isBookInLibrary(selectedBook.googleBooksId) ? (
                        <Button
                          variant="outlined"
                          color="success"
                          fullWidth
                          startIcon={<LibraryIcon />}
                          onClick={() => navigate('/library')}
                          sx={{ borderRadius: '8px' }}
                        >
                          Visualizza nella libreria
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<AddIcon />}
                          onClick={() => handleAddToLibrary(selectedBook)}
                          sx={{ borderRadius: '8px' }}
                        >
                          Aggiungi alla libreria
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Box>
              )}
              
              {/* Nessun risultato */}
              {!selectedBook && searchQuery.trim().length >= 3 && searchResults.length === 0 && !loading && !error && (
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <BookIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1">
                    Nessun libro trovato con questi criteri di ricerca.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Prova con un altro titolo, autore o ISBN.
                  </Typography>
                  
                  {/* Pulsante "Crea manualmente" quando non ci sono risultati */}
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddNewIcon />}
                    onClick={handleCreateManually}
                    sx={{ borderRadius: '8px' }}
                  >
                    Crea un nuovo libro manualmente
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}
      
      {/* Scanner overlay semplificato */}
      <ScannerOverlay 
        open={scannerOpen}
        onClose={handleCloseScanner}
        onCapture={handleCapture}
      />
      
      {/* Notifiche */}
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
          sx={{ 
            width: '100%',
            fontWeight: 'medium',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            '& .MuiAlert-message': {
              fontSize: '1rem'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddBook;