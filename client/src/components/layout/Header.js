// client/src/components/layout/Header.js
import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box,
  Avatar,
  InputBase,
  alpha,
  styled
} from '@mui/material';
import { Search as SearchIcon, QrCodeScanner as ScannerIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Stile per la barra di ricerca
const SearchContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

const Header = () => {
  const navigate = useNavigate();

  const handleScanClick = () => {
    navigate('/scan');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSearchFocus = () => {
    navigate('/search');
  };

  return (
    <AppBar position="fixed" color="primary">
      <Toolbar>
        {/* Logo e nome app */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          BookSnap
        </Typography>

        {/* Su mobile mostra solo un'icona come logo */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            📚
          </Typography>
        </Box>

        {/* Barra di ricerca */}
        <SearchContainer>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Cerca libri..."
            inputProps={{ 'aria-label': 'search' }}
            onFocus={handleSearchFocus}
          />
        </SearchContainer>

        <Box sx={{ flexGrow: 1 }} />

        {/* Pulsante Scanner (stile Vivino camera) */}
        <IconButton
          size="large"
          edge="end"
          color="inherit"
          aria-label="scan book"
          onClick={handleScanClick}
          sx={{ mr: 1 }}
        >
          <ScannerIcon />
        </IconButton>

        {/* Avatar Profilo Utente */}
        <IconButton
          size="large"
          edge="end"
          aria-label="account of current user"
          color="inherit"
          onClick={handleProfileClick}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>U</Avatar>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;