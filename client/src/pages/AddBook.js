// client/src/pages/AddBook.js
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
  alpha,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  QrCodeScanner as ScannerIcon,
  Create as CreateIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon,
  Book as BookIcon,
  MenuBook as LibraryIcon,
  Add as AddIcon,
  AddCircleOutline as AddNewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ScannerOverlay from '../components/scan/ScannerOverlay';
import googleBooksService from '../services/googleBooks.service';
import bookService from '../services/book.service';
import BookCard from '../components/book/BookCard';

// ID utente temporaneo (da sostituire con autenticazione)
const TEMP_USER_ID = '655e9e1b07910b7d21dea350';

const AddBook = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [booksInLibrary, setBooksInLibrary] = useState({});

  // Stato per la ricerca libri
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingBookId, setLoadingBookId] = useState(null);
  
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
    rating: 0,  // Inizializzato a 0 invece di null
    readStatus: 'to-read',
    notes: ''
  });
  
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

  // Effetto per controllare se i libri sono già nella libreria
  useEffect(() => {
    // Verifica solo se ci sono risultati di ricerca
    if (searchResults.length === 0) return;
    
    // Limitiamo le verifiche per non sovraccaricare l'API
    // Creiamo un array delle verifiche da effettuare (max 5 contemporaneamente)
    const booksToCheck = searchResults
      .filter(book => book.googleBooksId && booksInLibrary[book.googleBooksId] === undefined)
      .slice(0, 5);
    
    if (booksToCheck.length === 0) return;
    
    // Funzione asincrona per verificare i libri
    const checkBooks = async () => {
      for (const book of booksToCheck) {
        try {
          // Imposta stato "in verifica"
          setBooksInLibrary(prev => ({
            ...prev,
            [book.googleBooksId]: 'checking'
          }));
          
          const isInLibrary = await bookService.checkBookInUserLibrary(book.googleBooksId, TEMP_USER_ID);
          
          // Aggiorna lo stato con il risultato finale
          setBooksInLibrary(prev => ({
            ...prev,
            [book.googleBooksId]: isInLibrary
          }));
        } catch (err) {
          console.error(`Errore nella verifica del libro ${book.title}:`, err);
          // In caso di errore, imposta a false
          setBooksInLibrary(prev => ({
            ...prev,
            [book.googleBooksId]: false
          }));
        }
      }
    };
    
    checkBooks();
  }, [searchResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // Funzione per cercare libri
  const searchBooks = async (query) => {
    try {
      setLoading(true);
      setError('');
      
      // IMPORTANTE: Resetta lo stato dei libri in libreria
      // per evitare che valori precedenti influenzino la nuova ricerca
      setBooksInLibrary({});
      
      // Esegui la ricerca
      const results = await googleBooksService.searchBooks(query);
      console.log(`Ricevuti ${results.length} risultati per la query "${query}"`);
      setSearchResults(results);
      
      // Verifica quali libri sono già nella libreria dell'utente
      if (results.length > 0) {
        // Processa i libri in batch per evitare troppe chiamate simultanee
        const batchSize = 3;
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          
          // Processa i libri in parallelo all'interno del batch
          await Promise.all(batch.map(async (book) => {
            if (!book.googleBooksId) return;
            
            try {
              // Imposta stato iniziale esplicitamente a false mentre verifichiamo
              setBooksInLibrary(prev => ({
                ...prev,
                [book.googleBooksId]: false
              }));
              
              console.log(`Verifica libro "${book.title}" (${book.googleBooksId})`);
              
              const isInLibrary = await bookService.checkBookInUserLibrary(book.googleBooksId, TEMP_USER_ID);
              console.log(`Risultato verifica "${book.title}": ${isInLibrary}`);
              
              // Aggiorna lo stato con il risultato ESPLICITO della verifica
              setBooksInLibrary(prev => ({
                ...prev,
                [book.googleBooksId]: isInLibrary === true
              }));
            } catch (err) {
              console.error(`Errore nella verifica del libro ${book.title}:`, err);
              
              // In caso di errore, imposta esplicitamente a false
              setBooksInLibrary(prev => ({
                ...prev,
                [book.googleBooksId]: false
              }));
            }
          }));
        }
      }
    } catch (err) {
      console.error('Errore durante la ricerca:', err);
      setError('Si è verificato un errore durante la ricerca. Riprova.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per aggiornare lo stato di un libro nella libreria
  const updateBookInLibraryStatus = (bookId, status) => {
    setBooksInLibrary(prev => ({
      ...prev,
      [bookId]: status
    }));
  };

  // Funzione per selezionare un libro
  const handleSelectBook = async (book) => {
    setSelectedBook(book);
    // Resetta i dati utente quando si seleziona un nuovo libro
    setUserBookData({
      rating: 0,
      readStatus: 'to-read',
      notes: ''
    });
    console.log('Libro selezionato:', book);
    
    // Verifica se il libro è già nella libreria
    if (book.googleBooksId) {
      try {
        // Imposta lo stato temporaneo "checking"
        setBooksInLibrary(prev => ({
          ...prev,
          [book.googleBooksId]: 'checking'
        }));
        
        const isInLibrary = await bookService.checkBookInUserLibrary(book.googleBooksId, TEMP_USER_ID);
        
        // Aggiorna lo stato con il risultato finale
        setBooksInLibrary(prev => ({
          ...prev,
          [book.googleBooksId]: isInLibrary
        }));
        
        console.log(`Libro "${book.title}" in libreria: ${isInLibrary}`);
      } catch (err) {
        console.error(`Errore nella verifica del libro ${book.title}:`, err);
        
        // In caso di errore, imposta a false
        setBooksInLibrary(prev => ({
          ...prev,
          [book.googleBooksId]: false
        }));
      }
    }
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
    console.log(`Cambio ${field}:`, value); // Debug
    
    if (field === 'rating') {
      // Usa direttamente il valore, Material UI Rating restituisce numeri
      setUserBookData(prev => ({
        ...prev,
        rating: value === null ? 0 : Number(value)
      }));
    } else {
      setUserBookData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  // Funzione per verificare se un libro è nella libreria con debug
  const isBookInLibrary = (bookId) => {
    // Verifica esplicita che il valore sia esattamente true (non truthy)
    const result = booksInLibrary[bookId] === true;
    return result;
  };
  
  // Funzione per aggiungere libro alla libreria
  const handleAddToLibrary = async (book, fromResults = false) => {
    try {
      // Mostra stato di caricamento
      setLoading(true);
      setLoadingBookId(fromResults ? book.googleBooksId : null);
      
      // Determina quale libro aggiungere (selezionato o creato manualmente)
      const bookToAdd = isManualCreation ? newBook : book;
      console.log('Aggiungi alla libreria:', bookToAdd);
      
      // Verifica se il libro è già nella libreria
      if (bookToAdd.googleBooksId && isBookInLibrary(bookToAdd.googleBooksId)) {
        setSnackbar({
          open: true,
          message: 'Questo libro è già presente nella tua libreria',
          severity: 'info'
        });
        
        // Se non siamo nei risultati, torna ai risultati
        if (!fromResults) {
          handleBackToResults();
        }
        
        setLoading(false);
        return;
      }
      
      // Assicurati che ci siano almeno titolo e autore
      if (isManualCreation && (!bookToAdd.title || !bookToAdd.author)) {
        throw new Error('Titolo e autore sono campi obbligatori');
      }
      
      // Gestisci correttamente il rating
      const adjustedUserBookData = { ...userBookData };
      
      if (!adjustedUserBookData.rating || adjustedUserBookData.rating === 0) {
        delete adjustedUserBookData.rating;
      }
      
      // Chiamata al servizio per salvare il libro e aggiungerlo alla libreria
      const result = await bookService.addBookToLibrary(
        bookToAdd, 
        adjustedUserBookData,
        null, // libraryId (opzionale) 
        TEMP_USER_ID
      );
      
      console.log('Risultato aggiunta libro:', result);
      
      // Aggiorna lo stato dei libri nella libreria
      if (bookToAdd.googleBooksId) {
        updateBookInLibraryStatus(bookToAdd.googleBooksId, true);
      }
      
      // Mostra notifica di successo
      setSnackbar({
        open: true,
        message: 'Libro aggiunto alla libreria con successo!',
        severity: 'success'
      });
      
      // Se non siamo nei risultati, torna ai risultati
      if (!fromResults) {
        handleBackToResults();
      }
      
    } catch (error) {
      console.error('Errore durante l\'aggiunta del libro:', error);
      
      // Gestione degli errori
      let errorMessage = 'Si è verificato un errore durante l\'aggiunta del libro.';
      let errorSeverity = 'error';
      
      // Verifica se l'errore indica che il libro è già nella libreria
      if (error.response?.status === 400 && 
          error.response?.data?.error?.includes('già nella tua biblioteca')) {
        
        errorMessage = 'Questo libro è già presente nella tua libreria';
        errorSeverity = 'info';
        
        // Aggiorna lo stato locale - assicurati che bookToAdd sia definito qui
        const updatedBookId = (isManualCreation ? newBook.googleBooksId : book.googleBooksId);
        if (updatedBookId) {
          updateBookInLibraryStatus(updatedBookId, true);
        }
        
        // Se non siamo nei risultati, torna ai risultati
        if (!fromResults) {
          handleBackToResults();
        }
      } else {
        // Per altri tipi di errori, estrai messaggi utili
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      // Mostra errore
      setSnackbar({
        open: true,
        message: errorSeverity === 'info' ? errorMessage : `Errore: ${errorMessage}`,
        severity: errorSeverity
      });
    } finally {
      setLoading(false);
      setLoadingBookId(null);
    }
  };

  // Funzione per condividere un libro
  const handleShare = () => {
    // Per ora, mostra solo un messaggio che la funzione sarà disponibile in futuro
    setSnackbar({
      open: true,
      message: 'La funzione di condivisione sarà disponibile prossimamente',
      severity: 'info'
    });
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
            <>
              {/* Formulario di creazione libro manuale */}
              {/* ... mantieni il tuo formulario esistente ... */}
            </>
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
                  {searchResults.map((book) => (
                    <BookCard
                      key={book.googleBooksId || book._id}
                      book={book}
                      variant="search"
                      isInLibrary={isBookInLibrary(book.googleBooksId)}
                      loading={loading}
                      loadingId={loadingBookId}
                      onBookClick={() => handleSelectBook(book)}
                      onAddBook={() => handleAddToLibrary(book, true)}
                    />
                  ))}
                  
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
                  <BookCard
                    variant="detail"
                    book={selectedBook}
                    isInLibrary={isBookInLibrary(selectedBook.googleBooksId)}
                    loading={loading && loadingBookId === selectedBook.googleBooksId}
                    showPersonalization={true}
                    showExpandableDescription={true}
                    showFavoriteButton={false}
                    showShareButton={true}
                    onShareClick={handleShare}
                    rating={userBookData.rating}
                    readStatus={userBookData.readStatus}
                    notes={userBookData.notes}
                    onRatingChange={(newValue) => handleUserBookDataChange('rating', newValue)}
                    onStatusChange={(value) => handleUserBookDataChange('readStatus', value)}
                    onNotesChange={(value) => handleUserBookDataChange('notes', value)}
                    onAddBook={() => handleAddToLibrary(selectedBook)}
                    showActionButtons={false} // Disabilitiamo i pulsanti integrati per usare il nostro personalizzato sotto
                  />
                  
                  {/* Pulsante esterno */}
                  <Box sx={{ mt: 3 }}>
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
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                        onClick={() => handleAddToLibrary(selectedBook)}
                        disabled={loading}
                        sx={{ borderRadius: '8px' }}
                      >
                        {loading ? 'Aggiunta in corso...' : 'Aggiungi alla libreria'}
                      </Button>
                    )}
                  </Box>
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