// client/src/components/book/BookCard.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  // Manteniamo tutti gli import esistenti
  Card, 
  CardMedia, 
  CardContent, 
  CardActions,
  Typography,
  Box,
  Button,  
  IconButton,
  Tooltip,
  Paper,
  Grid,
  Rating,
  useTheme,
  alpha,
  Chip,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
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
  MenuBook as LibraryIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Componenti per ogni variante
import GridVariant from './variants/GridVariant';
import ListVariant from './variants/ListVariant';
import DetailVariant from './variants/DetailVariant';
import SearchVariant from './variants/SearchVariant';
import PreviewVariant from './variants/PreviewVariant';

/**
 * Componente unificato per la visualizzazione dei libri con diverse varianti
 */
const BookCard = (props) => {
  const {
    book,
    userBook,
    variant = 'grid',
    isFavorite = false,
    isInLibrary = false,
    loading = false,
    loadingId = null,
    
    // Props per visualizzazione
    showMenuIcon = true,
    showFavoriteButton = true,
    showShareButton = false,
    showExpandableDescription = false,
    showFullDescription = false,
    showActionButtons = true,
    showDeleteButton = false,
    showPersonalization = false,
    
    // Dati personalizzazione
    rating = 0,
    readStatus = 'to-read',
    notes = '',
    
    // Callbacks
    onFavoriteToggle,
    onMenuOpen,
    onBookClick,
    onAddBook,
    onShareClick,
    onDeleteClick,
    onViewInLibrary,
    onRatingChange,
    onStatusChange,
    onNotesChange,
    
    // Proprietà aggiuntive per editing
    editable = false,
    onSave,
    onDelete
  } = props;

  // Estrai i dati in base al tipo di oggetto ricevuto
  const bookData = userBook?.bookId || book;
  const userBookId = userBook?._id;
  const bookId = bookData?.googleBooksId || bookData?._id;

  // Stato per la descrizione espandibile
  const [expandedDescription, setExpandedDescription] = useState(false);
  const toggleDescription = () => setExpandedDescription(!expandedDescription);

  // Determina se è in caricamento
  const isLoading = loading && (loadingId === bookId || loadingId === userBookId);

  // Props comuni per tutte le varianti
  const commonProps = {
    bookData,
    userBook,
    userBookId,
    bookId,
    isFavorite,
    isInLibrary,
    isLoading,
    rating,
    readStatus,
    notes,
    
    // Stati visualizzazione
    expandedDescription,
    toggleDescription,
    
    // Props visualizzazione
    showMenuIcon,
    showFavoriteButton,
    showShareButton,
    showExpandableDescription,
    showFullDescription,
    showActionButtons,
    showDeleteButton,
    showPersonalization,
    
    // Callbacks
    onFavoriteToggle,
    onMenuOpen,
    onBookClick,
    onAddBook,
    onShareClick,
    onDeleteClick,
    onViewInLibrary,
    onRatingChange,
    onStatusChange,
    onNotesChange,
    
    // Props editing
    editable,
    onSave,
    onDelete
  };

  // Scegli il rendering basato sulla variante
  switch(variant) {
    case 'grid':
      return <GridVariant {...commonProps} />;
    case 'list':
      return <ListVariant {...commonProps} />;
    case 'detail':
      return <DetailVariant {...commonProps} />;
    case 'search':
      return <SearchVariant {...commonProps} />;
    case 'preview':
      return <PreviewVariant {...commonProps} />;
    default:
      return <GridVariant {...commonProps} />;
  }
};

// PropTypes per documentazione e validazione
BookCard.propTypes = {
  // Dati libro
  book: PropTypes.object,           // Oggetto libro completo
  userBook: PropTypes.object,       // Oggetto userBook con relazione utente-libro
  
  // Opzioni visualizzazione
  variant: PropTypes.oneOf(['grid', 'list', 'detail', 'search', 'preview']),
  showFavoriteButton: PropTypes.bool,
  showMenuIcon: PropTypes.bool,
  showShareButton: PropTypes.bool,
  showDeleteButton: PropTypes.bool,
  showActionButtons: PropTypes.bool,
  showPersonalization: PropTypes.bool,
  showExpandableDescription: PropTypes.bool,
  showFullDescription: PropTypes.bool,
  
  // Stati
  isInLibrary: PropTypes.bool,
  isFavorite: PropTypes.bool,
  loading: PropTypes.bool,
  loadingId: PropTypes.string,
  
  // Dati personalizzazione
  rating: PropTypes.number,
  readStatus: PropTypes.string,
  notes: PropTypes.string,
  
  // Callbacks
  onBookClick: PropTypes.func,
  onFavoriteToggle: PropTypes.func,
  onMenuOpen: PropTypes.func,
  onAddBook: PropTypes.func,
  onViewInLibrary: PropTypes.func,
  onShareClick: PropTypes.func,
  onDeleteClick: PropTypes.func,
  onRatingChange: PropTypes.func,
  onStatusChange: PropTypes.func,
  onNotesChange: PropTypes.func,
  
  // Props aggiuntive per editing
  editable: PropTypes.bool,
  onSave: PropTypes.func,
  onDelete: PropTypes.func
};

export default BookCard;