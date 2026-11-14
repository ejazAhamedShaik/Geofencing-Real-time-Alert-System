import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

export function LoadingState({ label = 'Loading data…' }: { label?: string }) {
  return <Stack className="state-panel" alignItems="center" justifyContent="center" spacing={1.5}><CircularProgress size={28} /><Typography color="text.secondary" variant="body2">{label}</Typography></Stack>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>} sx={{ borderRadius: 3, alignItems: 'center' }}>{message}</Alert>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <Box className="empty-state"><span className="empty-state-mark">∅</span><Typography variant="subtitle1" fontWeight={700}>{title}</Typography><Typography color="text.secondary" variant="body2">{description}</Typography></Box>;
}
