// client/src/components/layout/BottomNavigation.js
import React, { useState } from 'react';
import { 
  Paper, 
  BottomNavigation as MuiBottomNavigation, 
  BottomNavigationAction,
  Fab,
  styled
} from '@mui/material';
import { 
  Home as HomeIcon, 
  LibraryBooks as LibraryIcon,
  Add as AddIcon // Cambiato da ScannerIcon a AddIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// Stile personalizzato per la bottom navigation
const StyledBottomNavigation = styled(MuiBottomNavigation)(({ theme }) => ({
  height: 70,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  backgroundColor: theme.palette.background.paper,
  '& .MuiBottomNavigationAction-root': {
    minWidth: 'auto',
    padding: '6px 0',
    color: theme.palette.text.secondary,
  },
  '& .Mui-selected': {
    color: theme.palette.primary.main,
  },
}));

// FAB personalizzato per il pulsante di scansione
const AddButton = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  top: -25,
  left: 'calc(50% - 25px)',
  width: 56,
  height: 56,
  boxShadow: '0px 4px 10px rgba(93, 95, 239, 0.3)',
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: '0px 6px 15px rgba(93, 95, 239, 0.4)',
  },
  // Aggiunta di transizione per movimento fluido
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:active': {
    transform: 'scale(0.95)', // Leggera riduzione quando premuto
  }
}));

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determina quale tab è attivo basato sul percorso corrente
  const getActiveTab = (pathname) => {
    if (pathname === '/' || pathname === '/home') return 0;
    if (pathname.startsWith('/library')) return 1;
    return 0; // Default a home se non corrisponde
  };

  const [value, setValue] = React.useState(getActiveTab(location.pathname));

  // Aggiorna il tab attivo quando cambia la route
  React.useEffect(() => {
    setValue(getActiveTab(location.pathname));
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    
    // Naviga alla pagina corrispondente
    if (newValue === 0) {
      navigate('/');
    } else if (newValue === 1) {
      navigate('/library');
    }
  };

  const handleAddClick = () => {
    // Naviga direttamente alla pagina add-book
    navigate('/add-book');
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1100,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.05)',
        overflow: 'visible',
      }} 
      elevation={0}
    >
      {/* Pulsante di aggiunta centrale */}
      <AddButton 
        color="primary" 
        aria-label="add" 
        onClick={handleAddClick}
      >
        <AddIcon />
      </AddButton>
  
      <StyledBottomNavigation
        value={value}
        onChange={handleChange}
        showLabels
      >
        {/* Home a sinistra */}
        <BottomNavigationAction 
          label="Home" 
          icon={<HomeIcon />}
          onClick={() => navigate('/')} // Aggiungiamo un handler onClick esplicito
          sx={{ 
            maxWidth: '50%',
            flexGrow: 1
          }}
        />
        
        {/* Spazio centrale per il FAB */}
        <BottomNavigationAction
          sx={{
            maxWidth: '0%',
            padding: 0,
            minWidth: '80px',
            opacity: 0,
            pointerEvents: 'none'
          }}
          disabled
        />
        
        {/* Library a destra */}
        <BottomNavigationAction 
          label="Libreria" 
          icon={<LibraryIcon />}
          onClick={() => navigate('/library')} // Aggiungiamo un handler onClick esplicito
          sx={{ 
            maxWidth: '50%',
            flexGrow: 1 
          }}
        />
      </StyledBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;