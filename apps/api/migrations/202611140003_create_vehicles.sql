-- Up Migration
CREATE TABLE vehicles (
  id text PRIMARY KEY,
  vehicle_number text NOT NULL UNIQUE CHECK (length(btrim(vehicle_number)) > 0),
  driver_name text NOT NULL CHECK (length(btrim(driver_name)) > 0),
  vehicle_type text NOT NULL CHECK (length(btrim(vehicle_type)) > 0),
  phone text NOT NULL CHECK (length(btrim(phone)) > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_locations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  position geometry(Point, 4326) NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_locations_vehicle_recorded_idx
  ON vehicle_locations (vehicle_id, recorded_at DESC, id DESC);

-- Down Migration
DROP TABLE vehicle_locations;
DROP TABLE vehicles;
