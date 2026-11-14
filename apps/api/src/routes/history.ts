import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { Pool } from "pg";
import { violationHistoryQuerySchema } from "../schemas/history.js";

type ViolationRow = {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  geofence_id: string;
  geofence_name: string;
  event_type: "entry" | "exit";
  latitude: number;
  longitude: number;
  timestamp: Date;
};

type HistoryResult = {
  total_count: number;
  violations: ViolationRow[];
};

function sendValidationError(
  reply: FastifyReply,
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  return reply.code(400).send({
    error: "Validation Error",
    message: "The history query contains invalid filters.",
    details: issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    })),
  });
}

export function historyRoutes(pool: Pool): FastifyPluginAsync {
  return async (app) => {
    app.get("/violations/history", async (request, reply) => {
      const parsed = violationHistoryQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const filters: string[] = [];
      const values: Array<string | number> = [];
      if (parsed.data.vehicle_id) {
        values.push(parsed.data.vehicle_id);
        filters.push(`event.vehicle_id = $${values.length}`);
      }
      if (parsed.data.geofence_id) {
        values.push(parsed.data.geofence_id);
        filters.push(`event.geofence_id = $${values.length}`);
      }
      if (parsed.data.start_date) {
        values.push(parsed.data.start_date);
        filters.push(`event.occurred_at >= $${values.length}`);
      }
      if (parsed.data.end_date) {
        values.push(parsed.data.end_date);
        filters.push(`event.occurred_at <= $${values.length}`);
      }

      const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
      values.push(parsed.data.limit);
      const limitParameter = values.length;
      values.push(parsed.data.offset);
      const offsetParameter = values.length;

      const result = await pool.query<HistoryResult>(
        `WITH filtered AS MATERIALIZED (
           SELECT event.id,
                  event.vehicle_id,
                  vehicle.vehicle_number,
                  event.geofence_id,
                  geofence.name AS geofence_name,
                  event.event_type,
                  ST_Y(event.position)::float8 AS latitude,
                  ST_X(event.position)::float8 AS longitude,
                  event.occurred_at AS timestamp
           FROM geofence_events AS event
           JOIN vehicles AS vehicle ON vehicle.id = event.vehicle_id
           JOIN geofences AS geofence ON geofence.id = event.geofence_id
           ${where}
         ),
         page AS (
           SELECT *
           FROM filtered
           ORDER BY timestamp DESC, id DESC
           LIMIT $${limitParameter} OFFSET $${offsetParameter}
         ),
         total AS (
           SELECT COUNT(*)::int AS total_count
           FROM filtered
         )
         SELECT total.total_count,
                COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      'id', page.id,
                      'vehicle_id', page.vehicle_id,
                      'vehicle_number', page.vehicle_number,
                      'geofence_id', page.geofence_id,
                      'geofence_name', page.geofence_name,
                      'event_type', page.event_type,
                      'latitude', page.latitude,
                      'longitude', page.longitude,
                      'timestamp', page.timestamp
                    ) ORDER BY page.timestamp DESC, page.id DESC
                  ) FILTER (WHERE page.id IS NOT NULL),
                  '[]'::jsonb
                ) AS violations
         FROM total
         LEFT JOIN page ON true
         GROUP BY total.total_count`,
        values,
      );

      const history = result.rows[0]!;
      return {
        violations: history.violations,
        total_count: history.total_count,
      };
    });
  };
}
