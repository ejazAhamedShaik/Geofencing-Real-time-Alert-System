import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { geofenceCategories, type GeofenceCategory } from '@geofence/contracts';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';
import { PageHeading } from '../components/PageHeading';
import { StatusPill } from '../components/StatusPill';
import { useToast } from '../components/ToastProvider';
import { formatDate, humanize } from '../lib/format';
import { useCreateGeofence, useGeofences } from '../lib/queries';

type GeofenceInput = { name: string; description: string; category: GeofenceCategory; coordinates: string };
type InputChangeEvent = { target: { value: string } };
const emptyGeofence: GeofenceInput = { name: '', description: '', category: 'delivery_zone', coordinates: '' };

function parseCoordinates(text: string): [number, number][] {
  const points = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/[\s,]+/).map(Number);
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) throw new Error('Enter one latitude, longitude pair on each line.');
    const [latitude, longitude] = parts;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('Latitude must be -90 to 90 and longitude -180 to 180.');
    return [latitude, longitude] as [number, number];
  });
  if (points.length < 3) throw new Error('Enter at least three distinct boundary points.');
  const first = points[0]!;
  const last = points.at(-1)!;
  if (first[0] !== last[0] || first[1] !== last[1]) points.push(first);
  if (new Set(points.slice(0, -1).map(([lat, lng]) => `${lat},${lng}`)).size < 3) throw new Error('A polygon needs at least three distinct boundary points.');
  return points;
}

export function GeofencesPage() {
  const [category, setCategory] = useState<GeofenceCategory | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<GeofenceInput>(emptyGeofence);
  const [formError, setFormError] = useState('');
  const query = useGeofences(category || undefined);
  const createGeofence = useCreateGeofence();
  const showToast = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    try {
      const coordinates = parseCoordinates(form.coordinates);
      await createGeofence.mutateAsync({ name: form.name, description: form.description, category: form.category, coordinates });
      setDialogOpen(false);
      setForm(emptyGeofence);
      showToast('Geofence created successfully.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create this geofence.');
    }
  }

  return (
    <>
      <PageHeading eyebrow="BOUNDARY MANAGEMENT" title="Geofences" description="Create and browse the virtual boundaries used to monitor vehicle movement." action={<Stack direction="row" spacing={1}><TextField select size="small" label="Category" value={category} onChange={(event: InputChangeEvent) => setCategory(event.target.value as GeofenceCategory | '')} sx={{ minWidth: 175 }}><MenuItem value="">All categories</MenuItem>{geofenceCategories.map((value) => <MenuItem key={value} value={value}>{humanize(value)}</MenuItem>)}</TextField><Button variant="contained" onClick={() => { setFormError(''); createGeofence.reset(); setDialogOpen(true); }}>Create geofence</Button></Stack>} />
      <Card className="section-card table-card"><CardContent>
        <div className="section-card-heading"><Box><Typography variant="h6">Your zones</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{query.data?.geofences.length ?? 0} zones in this view</Typography></Box><Chip label="Polygon boundaries" size="small" className="soft-chip" /></div>
        {query.isLoading ? <LoadingState label="Loading geofences…" /> : query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : query.data?.geofences.length ? (
          <Table size="small" className="data-table"><TableHead><TableRow><TableCell>Zone</TableCell><TableCell>Category</TableCell><TableCell>Vertices</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell></TableRow></TableHead><TableBody>{query.data.geofences.map((zone) => <TableRow key={zone.id}><TableCell><Typography fontWeight={700} variant="body2">{zone.name}</Typography><Typography variant="caption" color="text.secondary">{zone.description || zone.id}</Typography></TableCell><TableCell><Chip size="small" label={humanize(zone.category)} className={`category-chip category-chip--${zone.category}`} /></TableCell><TableCell>{Math.max(zone.coordinates.length - 1, 0)}</TableCell><TableCell><StatusPill status={zone.status} /></TableCell><TableCell className="muted-cell">{formatDate(zone.created_at)}</TableCell></TableRow>)}</TableBody></Table>
        ) : <EmptyState title="No geofences yet" description="Use Create geofence to add a polygon boundary and start monitoring a defined area." />}
      </CardContent></Card>

      <Dialog open={dialogOpen} onClose={() => !createGeofence.isPending && setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogTitle>Create a geofence</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus required label="Zone name" value={form.name} onChange={(event: InputChangeEvent) => setForm({ ...form, name: event.target.value })} />
            <TextField label="Description" value={form.description} onChange={(event: InputChangeEvent) => setForm({ ...form, description: event.target.value })} />
            <TextField select required label="Category" value={form.category} onChange={(event: InputChangeEvent) => setForm({ ...form, category: event.target.value as GeofenceCategory })}>{geofenceCategories.map((value) => <MenuItem key={value} value={value}>{humanize(value)}</MenuItem>)}</TextField>
            <TextField required multiline minRows={5} label="Boundary coordinates" placeholder={'37.7749, -122.4194\n37.7849, -122.4194\n37.7849, -122.4094'} value={form.coordinates} onChange={(event: InputChangeEvent) => setForm({ ...form, coordinates: event.target.value })} helperText="One latitude, longitude pair per line. The starting point is added at the end to close the polygon." />
            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setDialogOpen(false)} disabled={createGeofence.isPending}>Cancel</Button><Button type="submit" variant="contained" disabled={createGeofence.isPending}>{createGeofence.isPending ? 'Creating…' : 'Create geofence'}</Button></DialogActions>
        </form>
      </Dialog>
    </>
  );
}
