// client/src/pages/Profile.js
import React from 'react';
import { 
  Typography, 
  Box, 
  Avatar, 
  Button, 
  Divider, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Paper
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  Logout as LogoutIcon,
  Bookmark as BookmarkIcon,
  Star as StarIcon,
  DataUsage as DataUsageIcon
} from '@mui/icons-material';

const Profile = () => {
  // Nella versione reale, questi dati verrebbero dal context dell'autenticazione
  const user = {
    name: 'Utente',
    email: 'utente@example.com',
    avatar: null,
    authenticated: false
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Avatar 
          sx={{ 
            width: 80, 
            height: 80, 
            mb: 2,
            bgcolor: 'primary.main',
            fontSize: '2rem'
          }}
        >
          {user.name.charAt(0)}
        </Avatar>
        
        <Typography variant="h5" gutterBottom>
          {user.authenticated ? user.name : 'Utente non autenticato'}
        </Typography>
        
        {user.authenticated ? (
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" sx={{ mr: 1 }}>
              Accedi
            </Button>
            <Button variant="outlined" color="primary">
              Registrati
            </Button>
          </Box>
        )}
      </Box>

      <Paper sx={{ mb: 4 }}>
        <List>
          <ListItem button>
            <ListItemIcon>
              <BookmarkIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Le mie liste di lettura" />
          </ListItem>
          <Divider />
          <ListItem button>
            <ListItemIcon>
              <StarIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Le mie recensioni" />
          </ListItem>
          <Divider />
          <ListItem button>
            <ListItemIcon>
              <DataUsageIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Statistiche di lettura" />
          </ListItem>
        </List>
      </Paper>

      <Paper>
        <List>
          <ListItem button>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Impostazioni" />
          </ListItem>
          {user.authenticated && (
            <>
              <Divider />
              <ListItem button>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItem>
            </>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default Profile;