// client/src/theme/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#26A69A', // Verde Teal per l'header
      light: '#4DB6AC',
      dark: '#00897B',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#42A5F5', // Azzurro per CTA
      light: '#64B5F6',
      dark: '#1E88E5',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#37474F',
      secondary: '#546E7A',
    },
    action: {
      active: '#26A69A',
      hover: 'rgba(38, 166, 154, 0.08)',
    },
    error: {
      main: '#EF9A9A', // Rosso pastello
    },
    warning: {
      main: '#FFB74D', // Arancione pastello
    },
    info: {
      main: '#90CAF9', // Blu pastello
    },
    success: {
      main: '#A5D6A7', // Verde pastello
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
      fontSize: '2rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontWeight: 500,
      fontSize: '1.75rem',
      lineHeight: 1.2,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontWeight: 500,
      fontSize: '1.5rem',
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.2,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.1rem',
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.2,
      letterSpacing: '0.0075em',
    },
    button: {
      textTransform: 'none', // Evita il testo tutto maiuscolo nei pulsanti
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 5px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;