import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Card, CardContent, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';
import { PageHeading } from '../components/PageHeading';
import { formatDate, humanize } from '../lib/format';
import { useViolationHistory } from '../lib/queries';

type DraftFilters = { vehicle_id: string; geofence_id: string; start_date: string; end_date: string; limit: number };
const initialFilters: DraftFilters = { vehicle_id: '', geofence_id: '', start_date: '', end_date: '', limit: 25 };
type SelectValueEvent = { target: { value: string } };

function toIso(value: string) {
  return value ? new Date(value).toISOString() : '';
}

export function HistoryPage() {
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState<DraftFilters>(initialFilters);
  const [offset, setOffset] = useState(0);
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (applied.vehicle_id.trim()) params.set('vehicle_id', applied.vehicle_id.trim());
    if (applied.geofence_id.trim()) params.set('geofence_id', applied.geofence_id.trim());
    if (applied.start_date) params.set('start_date', toIso(applied.start_date));
    if (applied.end_date) params.set('end_date', toIso(applied.end_date));
    params.set('limit', String(applied.limit));
    params.set('offset', String(offset));
    return params.toString();
  }, [applied, offset]);
  const query = useViolationHistory(queryString);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setApplied(draft);
  }

  return (
    <>
      <PageHeading eyebrow="AUDIT TRAIL" title="Event history" description="Review recorded geofence entries and exits with filters and paging." />
      <Card className="section-card filter-card"><CardContent>
        <form onSubmit={applyFilters}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField size="small" label="Vehicle ID" value={draft.vehicle_id} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, vehicle_id: event.target.value })} />
            <TextField size="small" label="Geofence ID" value={draft.geofence_id} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, geofence_id: event.target.value })} />
            <TextField size="small" type="datetime-local" label="From" value={draft.start_date} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, start_date: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="datetime-local" label="To" value={draft.end_date} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, end_date: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select size="small" label="Rows" value={draft.limit} onChange={(event: SelectValueEvent) => setDraft({ ...draft, limit: Number(event.target.value) })} sx={{ minWidth: 92 }}>{[10, 25, 50, 100].map((limit) => <MenuItem key={limit} value={limit}>{limit}</MenuItem>)}</TextField>
            <Button type="submit" variant="contained">Apply filters</Button>
          </Stack>
        </form>
      </CardContent></Card>

      <Card className="section-card table-card"><CardContent>
        <div className="section-card-heading"><div><Typography variant="h6">Crossing records</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{query.data?.total_count ?? '—'} matching events</Typography></div><Typography className="eyebrow">NEWEST FIRST</Typography></div>
        {query.isLoading ? <LoadingState label="Loading event history…" /> : query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : query.data?.violations.length ? (
          <>
            <Table size="small" className="data-table"><TableHead><TableRow><TableCell>Event</TableCell><TableCell>Vehicle</TableCell><TableCell>Geofence</TableCell><TableCell>Coordinates</TableCell><TableCell>Timestamp</TableCell></TableRow></TableHead><TableBody>{query.data.violations.map((event) => <TableRow key={event.id}><TableCell><span className={`event-indicator event-indicator--${event.event_type}`} />{humanize(event.event_type)}</TableCell><TableCell><Typography fontWeight={700} variant="body2">{event.vehicle_number}</Typography></TableCell><TableCell>{event.geofence_name}</TableCell><TableCell className="muted-cell">{event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}</TableCell><TableCell className="muted-cell">{formatDate(event.timestamp)}</TableCell></TableRow>)}</TableBody></Table>
            <div className="pagination-row"><Typography variant="caption" color="text.secondary">Showing {offset + 1}–{Math.min(offset + query.data.violations.length, query.data.total_count)} of {query.data.total_count}</Typography><Stack direction="row" spacing={1}><Button size="small" variant="outlined" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - applied.limit))}>Previous</Button><Button size="small" variant="outlined" disabled={offset + applied.limit >= query.data.total_count} onClick={() => setOffset(offset + applied.limit)}>Next</Button></Stack></div>
          </>
        ) : <EmptyState title="No events match these filters" description="Try widening the date range or removing one of the filters." />}
      </CardContent></Card>
    </>
  );
}
