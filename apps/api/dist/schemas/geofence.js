import { z } from 'zod';
import { geofenceCategories } from '@geofence/contracts';
const coordinateSchema = z.tuple([
    z.number().finite().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
    z.number().finite().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
]);
const coordinatesSchema = z.array(coordinateSchema).superRefine((coordinates, context) => {
    if (coordinates.length < 4) {
        context.addIssue({
            code: 'custom',
            message: 'A polygon requires at least four coordinate pairs, including the closing point.',
        });
    }
    const first = coordinates[0];
    const last = coordinates.at(-1);
    const isClosed = first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
    if (coordinates.length > 0 && !isClosed) {
        context.addIssue({
            code: 'custom',
            message: 'The first and last coordinate pairs must be identical to close the polygon.',
        });
    }
    const vertices = isClosed ? coordinates.slice(0, -1) : coordinates;
    const uniqueVertices = new Set(vertices.map(([latitude, longitude]) => `${latitude},${longitude}`));
    if (uniqueVertices.size < 3) {
        context.addIssue({
            code: 'custom',
            message: 'A polygon requires at least three unique vertices.',
        });
    }
});
export const createGeofenceSchema = z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    description: z.string().trim().optional(),
    coordinates: coordinatesSchema,
    category: z.enum(geofenceCategories),
});
export const listGeofencesQuerySchema = z.object({
    category: z.enum(geofenceCategories).optional(),
});
