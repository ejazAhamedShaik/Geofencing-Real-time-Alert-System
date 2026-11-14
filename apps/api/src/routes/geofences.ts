import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { Pool } from "pg";
import { ulid } from "ulid";
import type { GeofenceCategory } from "@geofence/contracts";
import {
  createGeofenceSchema,
  listGeofencesQuerySchema,
} from "../schemas/geofence.js";

type GeoJsonPolygon = {
  coordinates: Array<Array<[number, number]>>;
};

type GeofenceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  created_at: Date;
  geometry: string;
};

function sendValidationError(
  reply: FastifyReply,
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  return reply.code(400).send({
    error: "Validation Error",
    message: "The request contains invalid geofence data.",
    details: issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    })),
  });
}

export function geofenceRoutes(pool: Pool): FastifyPluginAsync {
  return async (app) => {
    app.post("/geofences", async (request, reply) => {
      const parsed = createGeofenceSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const input = parsed.data;
      // The API contract uses [latitude, longitude]; GeoJSON and PostGIS use [longitude, latitude].
      const polygon: GeoJsonPolygon = {
        coordinates: [
          input.coordinates.map(([latitude, longitude]) => [
            longitude,
            latitude,
          ]),
        ],
      };
      const polygonJson = JSON.stringify({ type: "Polygon", ...polygon });

      const validity = await pool.query<{ is_valid: boolean; reason: string }>(
        `SELECT ST_IsValid(geometry) AS is_valid, ST_IsValidReason(geometry) AS reason
         FROM (
           SELECT ST_SetSRID(ST_GeomFromGeoJSON($1::jsonb), 4326) AS geometry
         ) AS candidate`,
        [polygonJson],
      );

      if (!validity.rows[0]?.is_valid) {
        return reply.code(400).send({
          error: "Validation Error",
          message: "The polygon geometry is invalid.",
          details: [
            {
              field: "coordinates",
              message: validity.rows[0]?.reason ?? "Invalid polygon.",
            },
          ],
        });
      }

      const id = `geo_${ulid()}`;
      const result = await pool.query<{
        id: string;
        name: string;
        status: string;
      }>(
        `INSERT INTO geofences (id, name, description, category, boundary)
         VALUES (
           $1,
           $2,
           $3,
           $4,
           ST_SetSRID(ST_GeomFromGeoJSON($5::jsonb), 4326)::geometry(Polygon, 4326)
         )
         RETURNING id, name, status`,
        [
          id,
          input.name,
          input.description ?? null,
          input.category,
          polygonJson,
        ],
      );

      return reply.code(201).send(result.rows[0]);
    });

    app.get("/geofences", async (request, reply) => {
      const parsed = listGeofencesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const category = parsed.data.category;
      const result = category
        ? await pool.query<GeofenceRow>(
            `SELECT id, name, description, category, status, created_at,
                    ST_AsGeoJSON(boundary) AS geometry
             FROM geofences
             WHERE category = $1
             ORDER BY created_at DESC, id`,
            [category],
          )
        : await pool.query<GeofenceRow>(
            `SELECT id, name, description, category, status, created_at,
                    ST_AsGeoJSON(boundary) AS geometry
             FROM geofences
             ORDER BY created_at DESC, id`,
          );

      const geofences = result.rows.map((row) => {
        const geometry = JSON.parse(row.geometry) as GeoJsonPolygon;
        const outerRing = geometry.coordinates[0] ?? [];

        return {
          id: row.id,
          name: row.name,
          description: row.description,
          coordinates: outerRing.map(([longitude, latitude]) => [
            latitude,
            longitude,
          ]),
          category: row.category as GeofenceCategory,
          status: row.status,
          created_at: row.created_at,
        };
      });

      return { geofences };
    });
  };
}
