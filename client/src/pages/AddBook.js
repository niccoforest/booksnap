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
import bookService from '../services/book.service';
import apiService from '../services/api.service';
import BookCard from '../components/book/BookCard';

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

  const [tempUserId] = useState('655e9e1b07910b7d21dea350')
  
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
    rating: null,  // Cambiato da 0 a null
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
          
          const isInLibrary = await bookService.checkBookInUserLibrary(book.googleBooksId, tempUserId);
          
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
  }, [searchResults, tempUserId]);
  useEffect(() => {
    // Verifica dell'inizializzazione di booksInLibrary
    console.log('VERIFICA INIZIALIZZAZIONE: Stato booksInLibrary:', booksInLibrary);
    
    // Test della funzione isBookInLibrary
    const testBookId = 'test-book-id';
    
    // Test con valore true
    setBooksInLibrary(prev => {
      const result = {...prev, [testBookId]: true};
      console.log('VERIFICA TEST: Impostazione test libro a true');
      return result;
    });
    
    // Verifica dopo una modifica
    setTimeout(() => {
      console.log('VERIFICA TEST: Stato dopo impostazione true:', booksInLibrary);
      console.log('VERIFICA TEST: isBookInLibrary con true:', isBookInLibrary(testBookId));
      
      // Test con valore false
      setBooksInLibrary(prev => {
        const result = {...prev, [testBookId]: false};
        console.log('VERIFICA TEST: Impostazione test libro a false');
        return result;
      });
      
      // Seconda verifica
      setTimeout(() => {
        console.log('VERIFICA TEST: Stato dopo impostazione false:', booksInLibrary);
        console.log('VERIFICA TEST: isBookInLibrary con false:', isBookInLibrary(testBookId));
        
        // Pulizia
        setBooksInLibrary(prev => {
          const newState = {...prev};
          delete newState[testBookId];
          return newState;
        });
      }, 500);
    }, 500);
  }, []); // Solo all'inizializzazione

// Funzione per cercare libri completamente rivista
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
            
            const isInLibrary = await bookService.checkBookInUserLibrary(book.googleBooksId, tempUserId);
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
    rating: null,
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
      
      const isInLibrary = await bookService.checkBookInUserLibrary(book.googleBooksId, tempUserId);
      
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
    if (field === 'rating' && value === 0) {
      // Se il rating è 0, impostiamo null
      setUserBookData(prev => ({
        ...prev,
        rating: null
      }));
    } else {
      setUserBookData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  

// Funzione per verificare in modo asincrono se un libro è nella libreria
//const checkBookInLibrary = (bookId) => {
  // Utilizziamo solo lo stato locale per verificare se un libro è nella libreria
//  const isInLibrary = libraryBooks[bookId] === true;
  
  // Aggiorna lo stato checkedBooks
 // setCheckedBooks(prev => ({
   // ...prev,
    //[bookId]: isInLibrary
  //}));
  
  //return isInLibrary;
//};

 
 // Funzione per aggiungere libro alla libreria (aggiornata)
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
      tempUserId
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

  
  
 // Funzione per verificare se un libro è nella libreria con debug
const isBookInLibrary = (bookId) => {
  // Aggiungiamo log per debug
  console.log(`Verifica isBookInLibrary per ${bookId}: ${JSON.stringify(booksInLibrary[bookId])}`);
  
  // Verifica esplicita che il valore sia esattamente true (non truthy)
  const result = booksInLibrary[bookId] === true;
  console.log(`Risultato isBookInLibrary per ${bookId}: ${result}`);
  
  return result;
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
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                  onClick={() => handleAddToLibrary(newBook)}
                  disabled={loading || !newBook.title || !newBook.author}
                  sx={{ borderRadius: '8px' }}
                >
                  {loading ? 'Aggiunta in corso...' : 'Aggiungi alla libreria'}
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
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                        onClick={() => handleAddToLibrary(selectedBook)}
                        disabled={loading}
                        sx={{ borderRadius: '8px' }}
                      >
                        {loading ? 'Aggiunta in corso...' : 'Aggiungi alla libreria'}
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