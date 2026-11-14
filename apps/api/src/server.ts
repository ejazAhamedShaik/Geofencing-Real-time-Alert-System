import "dotenv/config";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { Pool } from "pg";
import { alertRoutes } from "./routes/alerts.js";
import { geofenceRoutes } from "./routes/geofences.js";
import { historyRoutes } from "./routes/history.js";
import { vehicleRoutes } from "./routes/vehicles.js";
import { AlertHub } from "./services/alertHub.js";

const pool = new Pool({
  //   user: process.env.POSTGRES_USER,
  //   host: process.env.POSTGRES_HOST,
  //   database: process.env.POSTGRES_DB,
  //   password: process.env.POSTGRES_PASSWORD,
  //   port: Number(process.env.POSTGRES_PORT ?? 5432),
  connectionString: process.env.DATABASE_URL,
});

const testConnection = async () => {
  try {
    const response = await pool.query("SELECT postGIS_Full_version();");
    console.log("PostGIS version:", response.rows[0].postgis_full_version);

    const geoQuery = `
            SELECT ST_AsGeoJSON(ST_MakePoint(-73.9857, 40.7484)) AS location;
        `;

    const geoResponse = await pool.query(geoQuery);
    console.log("GeoJSON location:", geoResponse.rows[0].location);

    return {
      version: response.rows[0].postgis_full_version,
      location: geoResponse.rows[0].location,
    };
  } catch (error) {
    console.error("Error testing PostGIS connection:", error);
    throw error;
  }
};

const app = Fastify({ logger: true });
const alertHub = new AlertHub();
alertHub.startHeartbeats();
const requestStartTimes = new WeakMap<object, bigint>();

app.addHook("onRequest", async (request) => {
  requestStartTimes.set(request, process.hrtime.bigint());
});

app.addHook("onSend", async (request, reply, payload) => {
  const contentType = String(reply.getHeader("content-type") ?? "");
  if (
    typeof payload !== "string" ||
    !contentType.includes("application/json")
  ) {
    return payload;
  }

  const startedAt = requestStartTimes.get(request);
  if (startedAt === undefined) {
    return payload;
  }

  try {
    const body: unknown = JSON.parse(payload);
    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
      return JSON.stringify({
        ...body,
        time_ns: (process.hrtime.bigint() - startedAt).toString(),
      });
    }
  } catch {
    // Leave non-JSON payloads unchanged.
  }

  return payload;
});

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, "Request failed");
  const errorStatusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : 500;
  const errorMessage =
    error instanceof Error ? error.message : "Request failed.";

  if (errorStatusCode >= 400 && errorStatusCode < 500) {
    return reply.code(errorStatusCode).send({
      statusCode: errorStatusCode,
      error: "Bad Request",
      message: errorMessage,
    });
  }

  return reply.code(500).send({
    statusCode: 500,
    error: "Internal Server Error",
    message: "An unexpected error occurred.",
  });
});

await app.register(websocket);
await app.register(alertRoutes(pool, alertHub));
await app.register(geofenceRoutes(pool));
await app.register(historyRoutes(pool));
await app.register(vehicleRoutes(pool, alertHub));
app.get("/health", async () => ({ status: "ok" }));
app.get("/test-postgis", async () => {
  const result = await testConnection();
  return result;
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
