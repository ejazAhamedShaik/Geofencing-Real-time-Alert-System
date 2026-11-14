import { z } from 'zod';
import { eventTypes } from '@geofence/contracts';

export const configureAlertSchema = z.object({
  geofence_id: z.string().trim().min(1, 'Geofence ID is required.'),
  vehicle_id: z.string().trim().min(1, 'Vehicle ID cannot be blank.').nullable().optional(),
  event_type: z.enum(eventTypes),
});

export const listAlertsQuerySchema = z.object({
  geofence_id: z.string().trim().min(1).optional(),
  vehicle_id: z.string().trim().min(1).optional(),
});
