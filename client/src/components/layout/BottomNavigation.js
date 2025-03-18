// client/src/components/layout/BottomNavigation.js
import React from 'react';
import { Paper, BottomNavigation as MuiBottomNavigation, BottomNavigationAction } from '@mui/material';
import { Home as HomeIcon, LocalLibrary as LibraryIcon, Search as SearchIcon, Person as PersonIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

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

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1100, // Assicura che sia sopra ad altri elementi
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)'
      }} 
      elevation={3}
    >
      <MuiBottomNavigation
        showLabels
        value={value}
        onChange={handleChange}
        sx={{
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 0',
          },
        }}
      >
        <BottomNavigationAction label="Home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Libreria" icon={<LibraryIcon />} />
        <BottomNavigationAction label="Cerca" icon={<SearchIcon />} />
        <BottomNavigationAction label="Profilo" icon={<PersonIcon />} />
      </MuiBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;