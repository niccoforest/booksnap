// client/src/components/layout/Header.js
import React, { useState } from 'react';
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
  useTheme,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Stile per la barra di ricerca
const SearchContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: alpha(theme.palette.common.black, 0.04),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.black, 0.06),
  },
  width: '100%',
  display: 'flex',
  alignItems: 'center'
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: alpha(theme.palette.common.black, 0.5)
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 1, 1.5, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

const Header = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Qui in futuro implementeremo la logica di ricerca contestuale
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // Focus nuovamente l'input dopo la cancellazione
    document.getElementById('search-input').focus();
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleProfilePageClick = () => {
    navigate('/profile');
    handleProfileClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'profile-popover' : undefined;

  return (
    <AppBar 
      position="fixed" 
      elevation={0} 
      color="transparent"
      sx={{
        backdropFilter: 'blur(10px)',
        backgroundColor: alpha(theme.palette.background.default, 0.8),
        borderBottom: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.1)
      }}
    >
      <Box sx={{ px: 2, pt: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {/* Logo e nome app */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold',cursor: 'pointer' }}
            onClick={() => navigate('/')}
            >
              BookSnap
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ciao, Utente
            </Typography>
          </Box>
          
          {/* Notifiche */}
          <IconButton 
            color="primary" 
            sx={{ mr: 1 }}
            onClick={() => {/* Funzionalità notifiche future */}}
          >
            <NotificationsIcon />
          </IconButton>
          
          {/* Avatar utente con popover */}
          <Avatar 
            sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: theme.palette.primary.main,
              cursor: 'pointer'
            }}
            onClick={handleProfileClick}
            aria-describedby={id}
          >
            U
          </Avatar>
          
          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleProfileClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              elevation: 2,
              sx: { borderRadius: 2, width: 220, mt: 1 }
            }}
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: theme.palette.primary.main,
                mr: 1.5
              }}>
                U
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  Utente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  utente@example.com
                </Typography>
              </Box>
            </Box>
            <Divider />
            <List sx={{ p: 0 }}>
            <ListItem component="li" onClick={handleProfilePageClick} sx={{ cursor: 'pointer' }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Profilo" />
              </ListItem>
              <ListItem component="li" onClick={handleProfilePageClick} sx={{ cursor: 'pointer' }}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Impostazioni" />
              </ListItem>
              <Divider />
              <ListItem component="li" onClick={handleProfilePageClick} sx={{ cursor: 'pointer' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItem>
            </List>
          </Popover>
        </Box>

        {/* Barra di ricerca */}
        <Card 
          sx={{ 
            boxShadow: 'none', 
            backgroundColor: alpha(theme.palette.common.black, 0.04),
            borderRadius: 3,
          }}
        >
          <SearchContainer>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              id="search-input"
              placeholder="Cerca libri..."
              inputProps={{ 'aria-label': 'search' }}
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <IconButton 
                size="small" 
                onClick={handleClearSearch}
                sx={{ mr: 1 }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            )}
          </SearchContainer>
        </Card>
      </Box>
    </AppBar>
  );
};

export default Header;