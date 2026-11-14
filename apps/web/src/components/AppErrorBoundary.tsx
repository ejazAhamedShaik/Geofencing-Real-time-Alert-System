import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard rendering failed.', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <Box sx={{ maxWidth: 620, mx: 'auto', mt: 8, p: 3 }}><Alert severity="error" sx={{ mb: 2 }}>The dashboard hit an unexpected error.</Alert><Typography color="text.secondary" sx={{ mb: 2 }}>Reload this section to continue.</Typography><Button variant="contained" onClick={() => this.setState({ hasError: false })}>Try again</Button></Box>;
    }
    return this.props.children;
  }
}
