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
  styled,
  Card,
  useTheme
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Notifications as NotificationsIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Stile per la barra di ricerca
const SearchContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.04),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.black, 0.06),
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
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 1, 1.5, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

const Header = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSearchFocus = () => {
    navigate('/search');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <AppBar position="fixed" elevation={0} color="transparent">
      <Box sx={{ px: 2, pt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              BookSnap
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ciao, Utente
            </Typography>
          </Box>
          
          <IconButton color="primary" sx={{ mr: 1 }}>
            <NotificationsIcon />
          </IconButton>
          
          <Avatar 
            sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: theme.palette.primary.main,
              cursor: 'pointer'
            }}
            onClick={handleProfileClick}
          >
            U
          </Avatar>
        </Box>

        {/* Barra di ricerca */}
        <Card 
          sx={{ 
            mb: 2, 
            boxShadow: 'none', 
            backgroundColor: alpha(theme.palette.common.black, 0.04),
            borderRadius: 3,
          }}
        >
          <SearchContainer>
            <SearchIconWrapper>
              <SearchIcon color="action" />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Cerca libri..."
              inputProps={{ 'aria-label': 'search' }}
              onFocus={handleSearchFocus}
            />
          </SearchContainer>
        </Card>
      </Box>
    </AppBar>
  );
};

export default Header;