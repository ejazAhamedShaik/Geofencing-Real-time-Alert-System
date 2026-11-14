import { Chip } from '@mui/material';

export function StatusPill({ status }: { status: string }) {
  return <Chip size="small" label={status} className={`status-pill status-pill--${status.toLowerCase()}`} />;
}
