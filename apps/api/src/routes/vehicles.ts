import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import { ulid } from 'ulid';
import { createVehicleSchema, vehicleIdParamsSchema } from '../schemas/vehicle.js';

type VehicleRow = {
  id: string;
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  phone: string;
  status: string;
  created_at: Date;
};

type VehicleLocationRow = {
  id: string;
  vehicle_number: string;
  latitude: number | null;
  longitude: number | null;
  recorded_at: Date | null;
  current_geofences: Array<{ geofence_id: string; geofence_name: string; category: string }>;
};

function sendValidationError(reply: FastifyReply, issues: Array<{ path: PropertyKey[]; message: string }>) {
  return reply.code(400).send({
    error: 'Validation Error',
    message: 'The request contains invalid vehicle data.',
    details: issues.map((issue) => ({ field: issue.path.map(String).join('.'), message: issue.message })),
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export function vehicleRoutes(pool: Pool): FastifyPluginAsync {
  return async (app) => {
    app.post('/vehicles', async (request, reply) => {
      const parsed = createVehicleSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const vehicle = parsed.data;
      const id = `veh_${ulid()}`;

      try {
        const result = await pool.query<{ id: string; vehicle_number: string; status: string }>(
          `INSERT INTO vehicles (id, vehicle_number, driver_name, vehicle_type, phone)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, vehicle_number, status`,
          [id, vehicle.vehicle_number, vehicle.driver_name, vehicle.vehicle_type, vehicle.phone],
        );

        return reply.code(201).send(result.rows[0]);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'A vehicle with this vehicle_number is already registered.',
          });
        }

        throw error;
      }
    });

    app.get('/vehicles', async () => {
      const result = await pool.query<VehicleRow>(
        `SELECT id, vehicle_number, driver_name, vehicle_type, phone, status, created_at
         FROM vehicles
         ORDER BY created_at DESC, id`,
      );

      return { vehicles: result.rows };
    });

    app.get('/vehicles/location/:vehicle_id', async (request, reply) => {
      const parsed = vehicleIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const { vehicle_id: vehicleId } = parsed.data;
      const result = await pool.query<VehicleLocationRow>(
        `SELECT
           v.id,
           v.vehicle_number,
           latest.latitude,
           latest.longitude,
           latest.recorded_at,
           COALESCE(
             (
               SELECT jsonb_agg(
                 jsonb_build_object(
                   'geofence_id', g.id,
                   'geofence_name', g.name,
                   'category', g.category
                 ) ORDER BY g.name, g.id
               )
               FROM geofences AS g
               WHERE g.status = 'active'
                 AND latest.position IS NOT NULL
                 AND ST_Covers(g.boundary, latest.position)
             ),
             '[]'::jsonb
           ) AS current_geofences
         FROM vehicles AS v
         LEFT JOIN LATERAL (
           SELECT
             position,
             ST_Y(position)::float8 AS latitude,
             ST_X(position)::float8 AS longitude,
             recorded_at
           FROM vehicle_locations
           WHERE vehicle_id = v.id
           ORDER BY recorded_at DESC, id DESC
           LIMIT 1
         ) AS latest ON true
         WHERE v.id = $1`,
        [vehicleId],
      );

      const vehicle = result.rows[0];
      if (!vehicle) {
        return reply.code(404).send({ error: 'Not Found', message: 'Vehicle was not found.' });
      }

      return {
        vehicle_id: vehicle.id,
        vehicle_number: vehicle.vehicle_number,
        current_location:
          vehicle.recorded_at === null
            ? null
            : {
                latitude: vehicle.latitude,
                longitude: vehicle.longitude,
                timestamp: vehicle.recorded_at,
              },
        current_geofences: vehicle.current_geofences,
      };
    });
  };
}
