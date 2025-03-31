// contexts/NotificationContext.js
import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
    duration: 4000
  });

  const showNotification = (message, severity = 'success', duration = 4000) => {
    setNotification({
      open: true,
      message,
      severity,
      duration
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.duration}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            fontWeight: 'medium',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            '& .MuiAlert-message': {
              fontSize: '1rem'
            }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

// Hook personalizzato per usare le notifiche
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve essere usato all\'interno di un NotificationProvider');
  }
  return context;
};