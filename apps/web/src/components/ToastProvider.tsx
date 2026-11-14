import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';

type ToastContextValue = (message: string) => void;
const ToastContext = createContext<ToastContextValue>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const showToast = useCallback((nextMessage: string) => { setMessage(nextMessage); setOpen(true); }, []);
  const contextValue = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Snackbar open={open} autoHideDuration={4000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>{message}</Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
