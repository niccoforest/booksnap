// client/src/components/layout/BottomNavigation.js
import React, { useState } from 'react';
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
  QrCodeScanner as ScannerIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import ScannerOverlay from '../scan/ScannerOverlay';

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
  const [scannerOpen, setScannerOpen] = useState(false);

  
  // Determina quale tab è attivo basato sul percorso corrente
  const getActiveTab = (pathname) => {
    if (pathname === '/' || pathname === '/home') return 0;
    if (pathname.startsWith('/library')) return 1;
    return pathname === '/scan' ? -1 : 0; // -1 è un valore speciale per nessuna tab selezionata
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
      default:
        navigate('/');
    }
  };

  const handleScanClick = () => {
    // Apre il scanner overlay invece di navigare
    setScannerOpen(true);
  };

  const handleScannerClose = () => {
    setScannerOpen(false);
  };

  return (
    <>
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
          value={value}
          onChange={handleChange}
          showLabels
        >
          {/* Home a sinistra */}
          <BottomNavigationAction 
            label="Home" 
            icon={<HomeIcon />} 
            sx={{ 
              maxWidth: '50%', // Ora occupa metà dello spazio (escludendo lo spazio centrale)
              flexGrow: 1
            }}
          />
          
          {/* Spazio centrale per il FAB */}
          <BottomNavigationAction
            sx={{
              maxWidth: '0%',
              padding: 0,
              minWidth: '80px', // Spazio per il pulsante centrale
              opacity: 0,
              pointerEvents: 'none' // Disabilita interazioni su questo spazio
            }}
            disabled
          />
          
          {/* Library a destra */}
          <BottomNavigationAction 
            label="Libreria" 
            icon={<LibraryIcon />}
            sx={{ 
              maxWidth: '50%', // Ora occupa metà dello spazio (escludendo lo spazio centrale)
              flexGrow: 1 
            }}
          />
        </StyledBottomNavigation>
      </Paper>
      <ScannerOverlay 
        open={scannerOpen} 
        onClose={handleScannerClose} 
      />
    </>
  );
};

export default BottomNavigation;