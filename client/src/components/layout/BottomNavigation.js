// client/src/components/layout/BottomNavigation.js
import React from 'react';
import { 
  Paper, 
  BottomNavigation as MuiBottomNavigation, 
  BottomNavigationAction,
  Box,
  Fab,
  styled
} from '@mui/material';
import { 
  Home as HomeIcon, 
  LibraryBooks as LibraryIcon,
  Search as SearchIcon, 
  Person as PersonIcon,
  QrCodeScanner as ScannerIcon
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
const ScanButton = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  top: -25,
  left: 'calc(50% - 25px)',
  width: 50,
  height: 50,
  boxShadow: '0px 4px 10px rgba(93, 95, 239, 0.3)',
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: '0px 6px 15px rgba(93, 95, 239, 0.4)',
  },
}));

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determina quale tab è attivo basato sul percorso corrente
  const getActiveTab = (pathname) => {
    if (pathname === '/') return 0;
    if (pathname.startsWith('/library')) return 1;
    if (pathname.startsWith('/search')) return 2;
    if (pathname.startsWith('/profile')) return 3;
    return 0;
  };

  const [value, setValue] = React.useState(getActiveTab(location.pathname));

  // Aggiorna il tab attivo quando cambia la route
  React.useEffect(() => {
    setValue(getActiveTab(location.pathname));
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    
    // Naviga alla pagina corrispondente
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/library');
        break;
      case 2:
        navigate('/search');
        break;
      case 3:
        navigate('/profile');
        break;
      default:
        navigate('/');
    }
  };

  const handleScanClick = () => {
    navigate('/scan');
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
        overflow: 'visible', // Importante per il pulsante FAB
      }} 
      elevation={0}
    >
      {/* Pulsante di scansione centrale */}
      <ScanButton 
        color="primary" 
        aria-label="scan" 
        onClick={handleScanClick}
      >
        <ScannerIcon />
      </ScanButton>

      <StyledBottomNavigation
        showLabels
        value={value}
        onChange={handleChange}
      >
        <BottomNavigationAction 
          label="Home" 
          icon={<HomeIcon />} 
          sx={{ maxWidth: '25%' }}
        />
        <BottomNavigationAction 
          label="Libreria" 
          icon={<LibraryIcon />}
          sx={{ maxWidth: '25%' }}
        />
        <BottomNavigationAction 
          label="Cerca" 
          icon={<SearchIcon />}
          sx={{ 
            maxWidth: '25%',
            visibility: 'hidden', // Questo spazio è per il pulsante FAB centrale
          }}
        />
        <BottomNavigationAction 
          label="Cerca" 
          icon={<SearchIcon />}
          sx={{ maxWidth: '25%' }}
        />
        <BottomNavigationAction 
          label="Profilo" 
          icon={<PersonIcon />}
          sx={{ maxWidth: '25%' }}
        />
      </StyledBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;