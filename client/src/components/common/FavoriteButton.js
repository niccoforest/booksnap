// client/src/components/common/FavoriteButton.js
import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';

/**
 * Componente per il pulsante dei preferiti
 * Gestisce l'aggiunta/rimozione di un libro dai preferiti
 */
const FavoriteButton = ({ 
  userBookId, 
  isFavorite = false,
  onClick,
  size = 'medium',
  disabled = false,
  sx = {}
}) => {
  // Gestisce il toggle del preferito
  const handleToggle = (e) => {
    // Ferma la propagazione per evitare che il clic attivi altre azioni del contenitore
    e.stopPropagation();
    
    if (onClick && !disabled) {
      onClick(userBookId);
    }
  };
  
  // Testo del tooltip
  const tooltipText = isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti';
  
  return (
    <Tooltip title={tooltipText}>
      <IconButton
        onClick={handleToggle}
        disabled={disabled || !userBookId}
        aria-label={tooltipText}
        size={size}
        color={isFavorite ? "error" : "default"}
        sx={sx}
      >
        {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default FavoriteButton;