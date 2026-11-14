import "dotenv/config";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { Pool } from "pg";

const pool = new Pool({
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
await app.register(websocket);
app.get("/health", async () => ({ status: "ok" }));
app.get("/test-postgis", async () => {
  const result = await testConnection();
  return result;
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
