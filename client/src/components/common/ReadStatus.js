// client/src/components/common/ReadStatus.js
import React from 'react';
import { Chip, FormControl, InputLabel, Select, MenuItem, useTheme } from '@mui/material';
import { getReadStatusIcon, getReadStatusLabel } from '../../utils/bookStatusUtils';

/**
 * Componente per visualizzare e gestire lo stato di lettura di un libro
 * Supporta diverse varianti di visualizzazione (chip, icona, testo, select)
 */
const ReadStatus = ({ 
  status = 'to-read', 
  variant = 'chip', // 'chip', 'icon', 'text', 'select'
  onChange,
  size = 'small',
  showIcon = true,
  disabled = false,
  sx = {}
}) => {
  const theme = useTheme();
  
  // Per il chip, determina il colore
  const getChipColor = (status) => {
    switch (status) {
      case 'reading':
        return { bg: theme.palette.primary.light, color: theme.palette.primary.contrastText };
      case 'completed':
        return { bg: theme.palette.success.light, color: theme.palette.success.contrastText };
      case 'abandoned':
        return { bg: theme.palette.error.light, color: theme.palette.error.contrastText };
      case 'lent':
        return { bg: theme.palette.warning.light, color: theme.palette.warning.contrastText };
      case 'to-read':
      default:
        return { bg: theme.palette.grey[300], color: theme.palette.grey[800] };
    }
  };
  
  // Rendering condizionale in base alla variante richiesta
  if (variant === 'select') {
    return (
      <FormControl fullWidth variant="outlined" disabled={disabled} sx={{ ...sx }}>
        <InputLabel id="read-status-label">Stato lettura</InputLabel>
        <Select
          labelId="read-status-label"
          value={status || 'to-read'} // Valore di default per evitare undefined
          onChange={(e) => {
            console.log('ReadStatus onChange:', e.target.value);
            if (onChange) onChange(e.target.value);
          }}
          label="Stato lettura"
          sx={{ borderRadius: '8px', ...sx }}
        >
          <MenuItem value="to-read">
            {showIcon && getReadStatusIcon('to-read')}
            <span style={{ marginLeft: showIcon ? 8 : 0 }}>Da leggere</span>
          </MenuItem>
          <MenuItem value="reading">
            {showIcon && getReadStatusIcon('reading')}
            <span style={{ marginLeft: showIcon ? 8 : 0 }}>In lettura</span>
          </MenuItem>
          <MenuItem value="completed">
            {showIcon && getReadStatusIcon('completed')}
            <span style={{ marginLeft: showIcon ? 8 : 0 }}>Completato</span>
          </MenuItem>
          <MenuItem value="abandoned">
            {showIcon && getReadStatusIcon('abandoned')}
            <span style={{ marginLeft: showIcon ? 8 : 0 }}>Abbandonato</span>
          </MenuItem>
          <MenuItem value="lent">
            {showIcon && getReadStatusIcon('lent')}
            <span style={{ marginLeft: showIcon ? 8 : 0 }}>Prestato</span>
          </MenuItem>
        </Select>
      </FormControl>
    );
  }
  
  if (variant === 'chip') {
    const chipColor = getChipColor(status);
    return (
      <Chip
        icon={showIcon ? getReadStatusIcon(status) : undefined}
        label={getReadStatusLabel(status)}
        size={size}
        disabled={disabled}
        sx={{
          backgroundColor: chipColor.bg,
          color: chipColor.color,
          '& .MuiChip-icon': {
            color: 'inherit'
          },
          ...sx
        }}
        onClick={onChange ? () => {} : undefined}
      />
    );
  }
  
  if (variant === 'icon') {
    return getReadStatusIcon(status);
  }
  
  // Variante 'text' o default
  return (
    <span style={sx}>{getReadStatusLabel(status)}</span>
  );
};

export default ReadStatus;