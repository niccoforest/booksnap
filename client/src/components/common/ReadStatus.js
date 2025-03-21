// components/common/ReadStatus.js
import React from 'react';
import { Chip, FormControl, InputLabel, Select, MenuItem, useTheme } from '@mui/material';
import { 
  MenuBook as ReadingIcon,
  CheckCircle as CompletedIcon,
  Bookmark as ToReadIcon,
  BookmarkRemove as AbandonedIcon,
  PeopleAlt as LentIcon
} from '@mui/icons-material';

export const getReadStatusIcon = (status) => {
  switch (status) {
    case 'reading': return <ReadingIcon color="primary" />;
    case 'completed': return <CompletedIcon color="success" />;
    case 'abandoned': return <AbandonedIcon color="error" />;
    case 'lent': return <LentIcon color="warning" />;
    case 'to-read':
    default: return <ToReadIcon color="disabled" />;
  }
};

export const getReadStatusLabel = (status) => {
  switch (status) {
    case 'reading': return 'In lettura';
    case 'completed': return 'Completato';
    case 'abandoned': return 'Abbandonato';
    case 'lent': return 'Prestato';
    case 'to-read':
    default: return 'Da leggere';
  }
};

const ReadStatus = ({ 
  status = 'to-read', 
  variant = 'chip', // 'chip', 'icon', 'text', 'select'
  onChange,
  size = 'small',
  showIcon = true
}) => {
  const theme = useTheme();
  
  // Per il chip, determina il colore
  const getChipColor = (status) => {
    switch (status) {
      case 'reading': return { bg: theme.palette.primary.light, color: theme.palette.primary.main };
      case 'completed': return { bg: theme.palette.success.light, color: theme.palette.success.main };
      case 'abandoned': return { bg: theme.palette.error.light, color: theme.palette.error.main };
      case 'lent': return { bg: theme.palette.warning.light, color: theme.palette.warning.main };
      case 'to-read':
      default: return { bg: theme.palette.grey[200], color: theme.palette.grey[700] };
    }
  };
  
  if (variant === 'select') {
    return (
      <FormControl fullWidth variant="outlined">
        <InputLabel id="read-status-label">Stato lettura</InputLabel>
        <Select
          labelId="read-status-label"
          value={status}
          onChange={(e) => onChange(e.target.value)}
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
    );
  }
  
  if (variant === 'chip') {
    const chipColor = getChipColor(status);
    return (
      <Chip
        icon={showIcon ? getReadStatusIcon(status) : undefined}
        label={getReadStatusLabel(status)}
        size={size}
        sx={{
          backgroundColor: chipColor.bg,
          color: chipColor.color,
          '& .MuiChip-icon': {
            color: 'inherit'
          }
        }}
      />
    );
  }
  
  if (variant === 'icon') {
    return getReadStatusIcon(status);
  }
  
  return getReadStatusLabel(status);
};

export default ReadStatus;