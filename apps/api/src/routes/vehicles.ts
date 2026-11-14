import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { Pool } from "pg";
import { ulid } from "ulid";
import type { AlertMessage, GeofenceCategory } from "@geofence/contracts";
import { AlertHub } from "../services/alertHub.js";
import {
  createVehicleSchema,
  updateVehicleLocationSchema,
  vehicleIdParamsSchema,
} from "../schemas/vehicle.js";

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
  current_geofences: Array<{
    geofence_id: string;
    geofence_name: string;
    category: string;
  }>;
};

type CurrentGeofenceRow = {
  geofence_id: string;
  geofence_name: string;
  category: GeofenceCategory;
};

type PreviousMembershipRow = {
  geofence_id: string;
  geofence_name: string;
  category: GeofenceCategory;
};

function sendValidationError(
  reply: FastifyReply,
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  return reply.code(400).send({
    error: "Validation Error",
    message: "The request contains invalid vehicle data.",
    details: issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    })),
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function vehicleRoutes(pool: Pool, alertHub: AlertHub): FastifyPluginAsync {
  return async (app) => {
    app.post("/vehicles", async (request, reply) => {
      const parsed = createVehicleSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const vehicle = parsed.data;
      const id = `veh_${ulid()}`;

      try {
        const result = await pool.query<{
          id: string;
          vehicle_number: string;
          status: string;
        }>(
          `INSERT INTO vehicles (id, vehicle_number, driver_name, vehicle_type, phone)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, vehicle_number, status`,
          [
            id,
            vehicle.vehicle_number,
            vehicle.driver_name,
            vehicle.vehicle_type,
            vehicle.phone,
          ],
        );

        return reply.code(201).send(result.rows[0]);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return reply.code(409).send({
            error: "Conflict",
            message:
              "A vehicle with this vehicle_number is already registered.",
          });
        }

        throw error;
      }
    });

    app.get("/vehicles", async () => {
      const result = await pool.query<VehicleRow>(
        `SELECT id, vehicle_number, driver_name, vehicle_type, phone, status, created_at
         FROM vehicles
         ORDER BY created_at DESC, id`,
      );

      return { vehicles: result.rows };
    });

    app.post("/vehicles/location", async (request, reply) => {
      const parsed = updateVehicleLocationSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const {
        vehicle_id: vehicleId,
        latitude,
        longitude,
        timestamp,
      } = parsed.data;
      const client = await pool.connect();
      let transactionOpen = false;

      try {
        await client.query("BEGIN");
        transactionOpen = true;

        const vehicleResult = await client.query<{
          id: string;
          vehicle_number: string;
          driver_name: string;
        }>(
          "SELECT id, vehicle_number, driver_name FROM vehicles WHERE id = $1 FOR UPDATE",
          [vehicleId],
        );

        if (!vehicleResult.rowCount) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return reply
            .code(404)
            .send({ error: "Not Found", message: "Vehicle was not found." });
        }
        const vehicle = vehicleResult.rows[0]!;

        const previousLocation = await client.query<{ recorded_at: Date }>(
          `SELECT recorded_at
           FROM vehicle_locations
           WHERE vehicle_id = $1
           ORDER BY recorded_at DESC, id DESC
           LIMIT 1`,
          [vehicleId],
        );

        if (
          previousLocation.rows[0] &&
          new Date(timestamp) < previousLocation.rows[0].recorded_at
        ) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return reply.code(409).send({
            error: "Conflict",
            message:
              "The location timestamp is older than the latest location already recorded for this vehicle.",
          });
        }

        await client.query(
          `INSERT INTO vehicle_locations (vehicle_id, position, recorded_at)
           VALUES (
             $1,
             ST_SetSRID(ST_MakePoint($2, $3), 4326)::geometry(Point, 4326),
             $4
           )`,
          [vehicleId, longitude, latitude, timestamp],
        );

        const currentResult = await client.query<CurrentGeofenceRow>(
          `SELECT id AS geofence_id, name AS geofence_name, category
           FROM geofences
           WHERE status = 'active'
             AND ST_Covers(
               boundary,
               ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry(Point, 4326)
             )
           ORDER BY name, id`,
          [longitude, latitude],
        );

        const previousMembershipResult =
          await client.query<PreviousMembershipRow>(
            `SELECT state.geofence_id, geofence.name AS geofence_name, geofence.category
             FROM vehicle_geofence_state AS state
             JOIN geofences AS geofence ON geofence.id = state.geofence_id
             WHERE state.vehicle_id = $1 AND state.is_inside = true
             FOR UPDATE OF state`,
            [vehicleId],
          );

        const currentIds = new Set(
          currentResult.rows.map((row) => row.geofence_id),
        );
        const previousIds = new Set(
          previousMembershipResult.rows.map((row) => row.geofence_id),
        );
        const entered = currentResult.rows.filter(
          (row) => !previousIds.has(row.geofence_id),
        );
        const exited = previousMembershipResult.rows.filter(
          (row) => !currentIds.has(row.geofence_id),
        );

        const transitions = [
          ...entered.map((geofence) => ({ ...geofence, event_type: "entry" as const })),
          ...exited.map((geofence) => ({ ...geofence, event_type: "exit" as const })),
        ];
        const alertsToBroadcast: AlertMessage[] = [];

        for (const transition of transitions) {
          const eventId = `evt_${ulid()}`;
          await client.query(
            `INSERT INTO geofence_events (id, vehicle_id, geofence_id, event_type, position, occurred_at)
             VALUES (
               $1, $2, $3, $4,
               ST_SetSRID(ST_MakePoint($5, $6), 4326)::geometry(Point, 4326),
               $7
             )`,
            [
              eventId,
              vehicleId,
              transition.geofence_id,
              transition.event_type,
              longitude,
              latitude,
              timestamp,
            ],
          );

          if (transition.event_type === "entry") {
            await client.query(
              `INSERT INTO vehicle_geofence_state (vehicle_id, geofence_id, is_inside, last_changed_at)
               VALUES ($1, $2, true, $3)
               ON CONFLICT (vehicle_id, geofence_id)
               DO UPDATE SET is_inside = true, last_changed_at = EXCLUDED.last_changed_at`,
              [vehicleId, transition.geofence_id, timestamp],
            );
          } else {
            await client.query(
              `UPDATE vehicle_geofence_state
               SET is_inside = false, last_changed_at = $3
               WHERE vehicle_id = $1 AND geofence_id = $2`,
              [vehicleId, transition.geofence_id, timestamp],
            );
          }

          const matchingRule = await client.query<{ should_alert: boolean }>(
            `SELECT EXISTS (
               SELECT 1
               FROM alert_rules
               WHERE geofence_id = $1
                 AND status = 'active'
                 AND (vehicle_id IS NULL OR vehicle_id = $2)
                 AND (event_type = $3 OR event_type = 'both')
             ) AS should_alert`,
            [transition.geofence_id, vehicleId, transition.event_type],
          );

          if (matchingRule.rows[0]?.should_alert) {
            alertsToBroadcast.push({
              event_id: eventId,
              event_type: transition.event_type,
              timestamp: new Date(timestamp).toISOString(),
              vehicle: {
                vehicle_id: vehicle.id,
                vehicle_number: vehicle.vehicle_number,
                driver_name: vehicle.driver_name,
              },
              geofence: {
                geofence_id: transition.geofence_id,
                geofence_name: transition.geofence_name,
                category: transition.category,
              },
              location: { latitude, longitude },
            });
          }
        }

        await client.query("COMMIT");
        transactionOpen = false;

        for (const alert of alertsToBroadcast) {
          setImmediate(() => alertHub.broadcast(alert));
        }

        return {
          vehicle_id: vehicleId,
          location_updated: true,
          current_geofences: currentResult.rows.map((geofence) => ({
            geofence_id: geofence.geofence_id,
            geofence_name: geofence.geofence_name,
            status: "inside" as const,
          })),
        };
      } catch (error) {
        if (transactionOpen) {
          await client.query("ROLLBACK");
        }
        throw error;
      } finally {
        client.release();
      }
    });

    app.get("/vehicles/location/:vehicle_id", async (request, reply) => {
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
        return reply
          .code(404)
          .send({ error: "Not Found", message: "Vehicle was not found." });
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
