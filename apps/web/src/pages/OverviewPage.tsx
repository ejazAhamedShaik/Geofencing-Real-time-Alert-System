import { Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';
import { PageHeading } from '../components/PageHeading';
import { formatDate, humanize } from '../lib/format';
import { useAlerts, useGeofences, useVehicles, useViolationHistory } from '../lib/queries';

const cards = [
  { label: 'Geofences', mark: 'GF', tone: 'mint', to: '/geofences' },
  { label: 'Registered vehicles', mark: 'VH', tone: 'sand', to: '/vehicles' },
  { label: 'Alert rules', mark: 'AL', tone: 'lilac', to: '/alerts' },
  { label: 'Recorded crossings', mark: 'EV', tone: 'blue', to: '/history' },
];

export function OverviewPage() {
  const geofences = useGeofences();
  const vehicles = useVehicles();
  const alerts = useAlerts();
  const history = useViolationHistory('limit=5');

  const summary = [geofences.data?.geofences.length, vehicles.data?.vehicles.length, alerts.data?.alerts.length, history.data?.total_count];
  const errors = [geofences.error, vehicles.error, alerts.error, history.error].filter(Boolean);

  return (
    <>
      <PageHeading eyebrow="LIVE OPERATIONS" title="Good day, operator." description="A clear view of your zones, vehicles, and recent activity." action={<Button component={Link} to="/history" variant="outlined" endIcon={<span>→</span>}>View event history</Button>} />
      <Box className="metric-grid">
        {cards.map((card, index) => {
          const isLoading = [geofences, vehicles, alerts, history][index]?.isLoading;
          return (
            <Card key={card.label} component={Link} to={card.to} className="metric-card">
              <CardContent>
                <Box className="metric-topline"><span className={`metric-icon metric-icon--${card.tone}`}>{card.mark}</span><span className="metric-arrow">↗</span></Box>
                <Typography className="metric-value">{isLoading ? '—' : summary[index] ?? 0}</Typography>
                <Typography color="text.secondary" variant="body2">{card.label}</Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {errors.length > 0 && <Box sx={{ mt: 2 }}><ErrorState message="Some dashboard totals could not be loaded. Retry from the affected section." onRetry={() => { void geofences.refetch(); void vehicles.refetch(); void alerts.refetch(); void history.refetch(); }} /></Box>}

      <Box className="content-grid">
        <Card className="section-card activity-card">
          <CardContent>
            <Box className="section-card-heading"><Box><Typography className="eyebrow">LATEST MOVEMENT</Typography><Typography variant="h6" sx={{ mt: 0.5 }}>Recent crossings</Typography></Box><Button component={Link} to="/history" endIcon={<span>→</span>} size="small">All events</Button></Box>
            {history.isLoading ? <LoadingState label="Loading recent events…" /> : history.isError ? <ErrorState message={history.error.message} onRetry={() => void history.refetch()} /> : history.data?.violations.length ? (
              <Table size="small" className="data-table">
                <TableHead><TableRow><TableCell>Vehicle</TableCell><TableCell>Geofence</TableCell><TableCell>Event</TableCell><TableCell>Time</TableCell></TableRow></TableHead>
                <TableBody>{history.data.violations.map((event) => <TableRow key={event.id}><TableCell><Typography fontWeight={700} variant="body2">{event.vehicle_number}</Typography></TableCell><TableCell>{event.geofence_name}</TableCell><TableCell><Chip size="small" label={humanize(event.event_type)} className={`event-chip event-chip--${event.event_type}`} /></TableCell><TableCell className="muted-cell">{formatDate(event.timestamp)}</TableCell></TableRow>)}</TableBody>
              </Table>
            ) : <EmptyState title="No crossings recorded" description="Entry and exit activity will appear here once vehicles move through monitored zones." />}
          </CardContent>
        </Card>

        <Card className="section-card readiness-card">
          <CardContent>
            <Typography className="eyebrow">SYSTEM SNAPSHOT</Typography>
            <Typography variant="h6" sx={{ mt: 0.5, mb: 2.5 }}>Your operations</Typography>
            <Stack spacing={2.2}>
              <div className="readiness-row"><span className="readiness-dot readiness-dot--green" /><Box><Typography variant="body2" fontWeight={700}>Geofence coverage</Typography><Typography variant="caption" color="text.secondary">{geofences.data?.geofences.filter((zone) => zone.status === 'active').length ?? '—'} active zones</Typography></Box><Button component={Link} to="/geofences" size="small" aria-label="View geofences">›</Button></div>
              <div className="readiness-row"><span className="readiness-dot readiness-dot--blue" /><Box><Typography variant="body2" fontWeight={700}>Fleet roster</Typography><Typography variant="caption" color="text.secondary">{vehicles.data?.vehicles.filter((vehicle) => vehicle.status === 'active').length ?? '—'} active vehicles</Typography></Box><Button component={Link} to="/vehicles" size="small" aria-label="View vehicles">›</Button></div>
              <div className="readiness-row"><span className="readiness-dot readiness-dot--orange" /><Box><Typography variant="body2" fontWeight={700}>Alert coverage</Typography><Typography variant="caption" color="text.secondary">{alerts.data?.alerts.filter((rule) => rule.status === 'active').length ?? '—'} active rules</Typography></Box><Button component={Link} to="/alerts" size="small" aria-label="View alert rules">›</Button></div>
            </Stack>
            <Box className="readiness-note"><span className="note-mark">!</span><Typography variant="caption">Keep alert rules aligned with your highest-priority zones.</Typography></Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
