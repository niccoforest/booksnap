// client/src/components/book/BookCard.js
import React from 'react';
import PropTypes from 'prop-types';

// Importiamo le varianti
import GridVariant from './variants/GridVariant';
import ListVariant from './variants/ListVariant';
import DetailVariant from './variants/DetailVariant';
import SearchVariant from './variants/SearchVariant';
import PreviewVariant from './variants/PreviewVariant';
import ScanResultsVariant from './variants/ScanResultsVariant';


// Importiamo il contesto dei preferiti
import { useFavorites } from '../../contexts/FavoritesContext';

// Importiamo le utility
import { getUserBookId, getBookId, isUserBook } from '../../utils/bookStatusUtils';

/**
 * Componente unificato per la visualizzazione dei libri con diverse varianti
 * Gestisce le differenze tra libri e userBooks (libri nella libreria utente)
 */
const BookCard = (props) => {
  const {
    // Dati principali
    book,         // Dati libro originali
    userBook,     // Dati relazione utente-libro
    
    // Visualizzazione
    variant = 'grid',
    loading = false,
    loadingId = null,
    
    // Stati visualizzazione
    expandedDescription,
    toggleDescription,
    
    // Dati personalizzazione
    rating,
    readStatus,
    notes,
    
    // Props per visualizzazione
    showMenuIcon = true,
    showFavoriteButton = true,
    showShareButton = false,
    showExpandableDescription = false,
    showFullDescription = false,
    showActionButtons = true,
    showDeleteButton = false,
    showPersonalization = false,
    
    // Callbacks
    onMenuOpen,
    onBookClick,
    onAddBook,
    onShareClick,
    onDeleteClick,
    onViewInLibrary,
    onRatingChange,
    onStatusChange,
    onNotesChange,
    
    // Override controllo preferiti (opzionale)
    isFavorite: propIsFavorite,
    onFavoriteToggle: propOnFavoriteToggle,
    
    // Proprietà aggiuntive per editing
    editable = false,
    onSave,
    onDelete,
    
    // Flag per stato libro
    isInLibrary = false
  } = props;

  // Estrai i dati necessari
  const bookData = userBook?.bookId || book;
  const userBookId = getUserBookId(userBook);
  const bookId = getBookId(bookData);
  
  // Usa il contesto dei preferiti
  const { isFavorite: contextIsFavorite, toggleFavorite: contextToggleFavorite } = useFavorites();
  
  // Determina se il libro è un preferito
  const isFavorite = propIsFavorite !== undefined ? propIsFavorite : contextIsFavorite(userBookId);
  
  // Handler per il toggle dei preferiti
  const handleFavoriteToggle = (id) => {
    if (propOnFavoriteToggle) {
      propOnFavoriteToggle(id);
    } else if (id) {
      contextToggleFavorite(id);
    }
  };
  
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
    
    // Aggiungiamo le proprietà mancanti
    expandedDescription,
    toggleDescription,
    rating,
    readStatus,
    notes,
    
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
    onFavoriteToggle: handleFavoriteToggle,
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
      case 'scan-result':
    return <ScanResultsVariant {...commonProps} />;
    default:
      return <GridVariant {...commonProps} />;
  }
};

// PropTypes per la documentazione e validazione
BookCard.propTypes = {
  // Dati libro
  book: PropTypes.object,
  userBook: PropTypes.object,
  
  // Opzioni visualizzazione
  variant: PropTypes.oneOf(['grid', 'list', 'detail', 'search', 'preview','scan-result']),
  showFavoriteButton: PropTypes.bool,
  showMenuIcon: PropTypes.bool,
  showShareButton: PropTypes.bool,
  showDeleteButton: PropTypes.bool,
  showActionButtons: PropTypes.bool,
  showPersonalization: PropTypes.bool,
  showExpandableDescription: PropTypes.bool,
  showFullDescription: PropTypes.bool,
  
  // Stati visualizzazione
  expandedDescription: PropTypes.bool,
  toggleDescription: PropTypes.func,
  
  // Dati personalizzazione
  rating: PropTypes.number,
  readStatus: PropTypes.string,
  notes: PropTypes.string,
  
  // Stati
  isInLibrary: PropTypes.bool,
  isFavorite: PropTypes.bool,
  loading: PropTypes.bool,
  loadingId: PropTypes.string,
  
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