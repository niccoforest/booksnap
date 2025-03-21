// components/common/EmptyState.js
import React from 'react';
import { Box, Typography, Button, Paper, alpha, useTheme } from '@mui/material';

const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  paperVariant = 'outlined', // 'outlined', 'dashed', 'filled'
  spacing = 'normal', // 'compact', 'normal', 'spacious'
}) => {
  const theme = useTheme();
  
  // Definisci stili in base alle props
  const paperStyles = {
    outlined: {
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: 'background.paper'
    },
    dashed: {
      border: '2px dashed rgba(0, 0, 0, 0.12)',
      bgcolor: 'background.paper'
    },
    filled: {
      bgcolor: alpha(theme.palette.primary.main, 0.04),
      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
    }
  };
  
  const spacingValues = {
    compact: { py: 2, px: 2 },
    normal: { py: 3, px: 3 },
    spacious: { py: 4, px: 3 }
  };
  
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        ...spacingValues[spacing],
        ...paperStyles[paperVariant]
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, color: 'text.secondary', fontSize: 40 }}>
          {icon}
        </Box>
      )}
      
      {title && (
        <Typography variant="body1" gutterBottom>
          {title}
        </Typography>
      )}
      
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: actionLabel ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      
      {actionLabel && onAction && (
        <Button
          variant="contained"
          color="primary"
          onClick={onAction}
          sx={{ mt: 2 }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
};

export default EmptyState;