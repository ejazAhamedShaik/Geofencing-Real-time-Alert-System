import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import type { AlertEventType } from '@geofence/contracts';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';
import { PageHeading } from '../components/PageHeading';
import { StatusPill } from '../components/StatusPill';
import { useToast } from '../components/ToastProvider';
import { formatDate, humanize } from '../lib/format';
import { useAlerts, useConfigureAlert, useGeofences, useVehicles } from '../lib/queries';

const emptyRule = { geofence_id: '', vehicle_id: '', event_type: 'both' as AlertEventType };
type InputChangeEvent = { target: { value: string } };

export function AlertsPage() {
  const query = useAlerts();
  const geofences = useGeofences();
  const vehicles = useVehicles();
  const configureAlert = useConfigureAlert();
  const showToast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyRule);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await configureAlert.mutateAsync({ geofence_id: form.geofence_id, ...(form.vehicle_id ? { vehicle_id: form.vehicle_id } : {}), event_type: form.event_type });
      setDialogOpen(false);
      setForm(emptyRule);
      showToast('Alert rule configured successfully.');
    } catch {
      // The mutation error is shown inside the dialog.
    }
  }

  const canConfigure = Boolean(geofences.data?.geofences.length && vehicles.data?.vehicles.length);
  return (
    <>
      <PageHeading eyebrow="NOTIFICATION LOGIC" title="Alert rules" description="Choose which vehicle crossings in a geofence should trigger an alert." action={<Button variant="contained" onClick={() => { configureAlert.reset(); setDialogOpen(true); }}>Configure rule</Button>} />
      <Card className="section-card table-card"><CardContent>
        <div className="section-card-heading"><div><Typography variant="h6">Configured rules</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>A rule can target one vehicle or the full fleet.</Typography></div><Chip label={`${query.data?.alerts.length ?? 0} rules`} size="small" className="soft-chip" /></div>
        {query.isLoading ? <LoadingState label="Loading alert rules…" /> : query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : query.data?.alerts.length ? (
          <Table size="small" className="data-table"><TableHead><TableRow><TableCell>Geofence</TableCell><TableCell>Vehicle scope</TableCell><TableCell>Trigger</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell></TableRow></TableHead><TableBody>{query.data.alerts.map((rule) => <TableRow key={rule.alert_id}><TableCell><Typography fontWeight={700} variant="body2">{rule.geofence_name}</Typography><Typography variant="caption" color="text.secondary">{rule.geofence_id}</Typography></TableCell><TableCell>{rule.vehicle_number ?? <span className="muted-cell">All vehicles</span>}</TableCell><TableCell><Chip size="small" label={humanize(rule.event_type)} className="event-chip" /></TableCell><TableCell><StatusPill status={rule.status} /></TableCell><TableCell className="muted-cell">{formatDate(rule.created_at)}</TableCell></TableRow>)}</TableBody></Table>
        ) : <EmptyState title="No alert rules configured" description="Configure a rule to choose which vehicle crossings should raise an alert." />}
      </CardContent></Card>

      <Dialog open={dialogOpen} onClose={() => !configureAlert.isPending && setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogTitle>Configure a geofence alert</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            {!canConfigure && <Alert severity="info">Register at least one vehicle and create at least one geofence before configuring a rule.</Alert>}
            {geofences.isError && <Alert severity="error">Could not load geofences: {geofences.error.message}</Alert>}
            {vehicles.isError && <Alert severity="error">Could not load vehicles: {vehicles.error.message}</Alert>}
            <TextField select required label="Geofence" value={form.geofence_id} onChange={(event: InputChangeEvent) => setForm({ ...form, geofence_id: event.target.value })} disabled={!geofences.data?.geofences.length}>{(geofences.data?.geofences ?? []).map((zone) => <MenuItem key={zone.id} value={zone.id}>{zone.name}</MenuItem>)}</TextField>
            <TextField select label="Vehicle" value={form.vehicle_id} onChange={(event: InputChangeEvent) => setForm({ ...form, vehicle_id: event.target.value })} disabled={!vehicles.data?.vehicles.length}><MenuItem value="">All vehicles</MenuItem>{(vehicles.data?.vehicles ?? []).map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number} — {vehicle.driver_name}</MenuItem>)}</TextField>
            <TextField select required label="Notify on" value={form.event_type} onChange={(event: InputChangeEvent) => setForm({ ...form, event_type: event.target.value as AlertEventType })}><MenuItem value="entry">Entry</MenuItem><MenuItem value="exit">Exit</MenuItem><MenuItem value="both">Entry and exit</MenuItem></TextField>
            {configureAlert.isError && <Alert severity="error">{configureAlert.error.message}</Alert>}
          </Stack></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setDialogOpen(false)} disabled={configureAlert.isPending}>Cancel</Button><Button type="submit" variant="contained" disabled={!canConfigure || configureAlert.isPending}>{configureAlert.isPending ? 'Saving…' : 'Save rule'}</Button></DialogActions>
        </form>
      </Dialog>
    </>
  );
}
