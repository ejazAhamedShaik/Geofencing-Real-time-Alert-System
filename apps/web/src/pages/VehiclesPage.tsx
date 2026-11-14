import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';
import { PageHeading } from '../components/PageHeading';
import { StatusPill } from '../components/StatusPill';
import { useToast } from '../components/ToastProvider';
import { formatDate } from '../lib/format';
import { useCreateVehicle, useVehicles } from '../lib/queries';

const emptyVehicle = { vehicle_number: '', driver_name: '', vehicle_type: '', phone: '' };
type InputChangeEvent = { target: { value: string } };

export function VehiclesPage() {
  const query = useVehicles();
  const createVehicle = useCreateVehicle();
  const showToast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyVehicle);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createVehicle.mutateAsync(form);
      setDialogOpen(false);
      setForm(emptyVehicle);
      createVehicle.reset();
      showToast('Vehicle registered successfully.');
    } catch {
      // The mutation error is shown inside the dialog.
    }
  }

  return (
    <>
      <PageHeading eyebrow="FLEET DIRECTORY" title="Vehicles" description="Register vehicles and manage their assigned drivers." action={<Button variant="contained" onClick={() => { createVehicle.reset(); setDialogOpen(true); }}>Register vehicle</Button>} />
      <Card className="section-card table-card"><CardContent>
        <div className="section-card-heading"><div><Typography variant="h6">Fleet roster</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{query.data?.vehicles.length ?? 0} registered vehicles</Typography></div><Chip label="Vehicle directory" size="small" className="soft-chip" /></div>
        {query.isLoading ? <LoadingState label="Loading vehicles…" /> : query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : query.data?.vehicles.length ? (
          <Table size="small" className="data-table"><TableHead><TableRow><TableCell>Vehicle</TableCell><TableCell>Driver</TableCell><TableCell>Type</TableCell><TableCell>Phone</TableCell><TableCell>Status</TableCell><TableCell>Added</TableCell></TableRow></TableHead><TableBody>{query.data.vehicles.map((vehicle) => <TableRow key={vehicle.id}><TableCell><Typography fontWeight={700} variant="body2">{vehicle.vehicle_number}</Typography><Typography variant="caption" color="text.secondary">{vehicle.id}</Typography></TableCell><TableCell>{vehicle.driver_name}</TableCell><TableCell><Chip size="small" label={vehicle.vehicle_type} className="soft-chip" /></TableCell><TableCell>{vehicle.phone}</TableCell><TableCell><StatusPill status={vehicle.status} /></TableCell><TableCell className="muted-cell">{formatDate(vehicle.created_at)}</TableCell></TableRow>)}</TableBody></Table>
        ) : <EmptyState title="No vehicles registered" description="Use Register vehicle to add a vehicle and its driver contact details." />}
      </CardContent></Card>

      <Dialog open={dialogOpen} onClose={() => !createVehicle.isPending && setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogTitle>Register a vehicle</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus required label="Vehicle number" placeholder="KA-01-AB-1234" value={form.vehicle_number} onChange={(event: InputChangeEvent) => setForm({ ...form, vehicle_number: event.target.value })} />
            <TextField required label="Driver name" value={form.driver_name} onChange={(event: InputChangeEvent) => setForm({ ...form, driver_name: event.target.value })} />
            <TextField required label="Vehicle type" placeholder="Truck, car, van…" value={form.vehicle_type} onChange={(event: InputChangeEvent) => setForm({ ...form, vehicle_type: event.target.value })} />
            <TextField required label="Driver phone" type="tel" value={form.phone} onChange={(event: InputChangeEvent) => setForm({ ...form, phone: event.target.value })} />
            {createVehicle.isError && <Alert severity="error">{createVehicle.error.message}</Alert>}
          </Stack></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setDialogOpen(false)} disabled={createVehicle.isPending}>Cancel</Button><Button type="submit" variant="contained" disabled={createVehicle.isPending}>{createVehicle.isPending ? 'Registering…' : 'Register vehicle'}</Button></DialogActions>
        </form>
      </Dialog>
    </>
  );
}
