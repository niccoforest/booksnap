// client/src/theme/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5D5FEF', // Viola principale
      light: '#7879F1',
      dark: '#4A4ADB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF576B', // Rosa/Rosso per accenti e CTA
      light: '#FF8A9A',
      dark: '#E5304A',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F9FE', // Grigio chiarissimo quasi bianco
      paper: '#FFFFFF',
    },
    text: {
      primary: '#303146', // Grigio scuro quasi nero
      secondary: '#6E7191', // Grigio medio
    },
    action: {
      active: '#5D5FEF',
      hover: 'rgba(93, 95, 239, 0.08)',
    },
    error: {
      main: '#FF576B', // Rosso/Rosa
    },
    warning: {
      main: '#FFBD12', // Giallo/Arancione
    },
    info: {
      main: '#5D5FEF', // Viola principale
    },
    success: {
      main: '#53D0EC', // Azzurro/Turchese
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.2,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.2,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.2,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
      lineHeight: 1.2,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.2,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          background: '#FFFFFF',
          color: '#303146',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 16px',
          boxShadow: 'none',
        },
        contained: {
          boxShadow: '0px 4px 10px rgba(93, 95, 239, 0.2)',
          '&:hover': {
            boxShadow: '0px 6px 15px rgba(93, 95, 239, 0.3)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default theme;