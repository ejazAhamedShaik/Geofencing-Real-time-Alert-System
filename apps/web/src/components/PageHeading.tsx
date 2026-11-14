import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <Box className="page-heading">
      <Box>
        <Typography className="eyebrow">{eyebrow}</Typography>
        <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{description}</Typography>
      </Box>
      {action && <Box className="page-heading-action">{action}</Box>}
    </Box>
  );
}
