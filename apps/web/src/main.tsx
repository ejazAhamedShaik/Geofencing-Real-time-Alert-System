import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastProvider } from './components/ToastProvider';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#087e78', dark: '#06645f', light: '#dff3ef' },
    secondary: { main: '#d88755' },
    background: { default: '#f4f7f6', paper: '#ffffff' },
    text: { primary: '#182a32', secondary: '#6b7c82' },
    success: { main: '#278b68' },
    warning: { main: '#c78232' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.04em' },
    h5: { fontWeight: 700, letterSpacing: '-0.03em' },
    h6: { fontWeight: 700, letterSpacing: '-0.02em' },
    button: { textTransform: 'none', fontWeight: 650 },
  },
  components: {
    MuiCard: { styleOverrides: { root: { border: '1px solid #e6ecea', boxShadow: '0 12px 32px rgba(25, 49, 53, .045)' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTableCell: { styleOverrides: { head: { color: '#78888d', fontWeight: 700, fontSize: 11, letterSpacing: '.09em', textTransform: 'uppercase' } } },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <ToastProvider><App /></ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
