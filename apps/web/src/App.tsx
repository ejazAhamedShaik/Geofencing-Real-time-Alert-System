import { lazy, Suspense } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link, Route, Routes } from 'react-router-dom';
import { LoadingState } from './components/AsyncState';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppShell } from './components/AppShell';

const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const GeofencesPage = lazy(() => import('./pages/GeofencesPage').then((module) => ({ default: module.GeofencesPage })));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage').then((module) => ({ default: module.VehiclesPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then((module) => ({ default: module.AlertsPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));

function NotFoundPage() {
  return <Box className="not-found"><Typography className="eyebrow">404 / ROUTE NOT FOUND</Typography><Typography variant="h4" sx={{ my: 1 }}>This page isn’t on the route.</Typography><Button component={Link} to="/" variant="contained">Back to overview</Button></Box>;
}

export function App() {
  return (
    <AppShell>
      <AppErrorBoundary>
        <Suspense fallback={<LoadingState label="Opening dashboard section…" />}>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/geofences" element={<GeofencesPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </AppShell>
  );
}
