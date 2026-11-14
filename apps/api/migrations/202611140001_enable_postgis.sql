-- Up Migration
-- This is safe when PostGIS was already enabled by the database image.
CREATE EXTENSION IF NOT EXISTS postgis;
