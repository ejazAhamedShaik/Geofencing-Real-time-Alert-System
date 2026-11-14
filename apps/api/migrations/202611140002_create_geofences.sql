-- Up Migration
CREATE TABLE geofences (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  category text NOT NULL CHECK (
    category IN ('delivery_zone', 'restricted_zone', 'toll_zone', 'customer_area')
  ),
  boundary geometry(Polygon, 4326) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT geofences_boundary_valid
    CHECK (ST_IsValid(boundary) AND NOT ST_IsEmpty(boundary))
);

CREATE INDEX geofences_boundary_gix
  ON geofences
  USING GIST (boundary);

-- Down Migration
DROP TABLE geofences;
