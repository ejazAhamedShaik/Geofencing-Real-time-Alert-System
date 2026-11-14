-- Up Migration
CREATE TABLE vehicle_geofence_state (
  vehicle_id text NOT NULL REFERENCES vehicles(id),
  geofence_id text NOT NULL REFERENCES geofences(id),
  is_inside boolean NOT NULL,
  last_changed_at timestamptz NOT NULL,
  PRIMARY KEY (vehicle_id, geofence_id)
);

CREATE TABLE geofence_events (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL REFERENCES vehicles(id),
  geofence_id text NOT NULL REFERENCES geofences(id),
  event_type text NOT NULL CHECK (event_type IN ('entry', 'exit')),
  position geometry(Point, 4326) NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX geofence_events_vehicle_occurred_idx
  ON geofence_events (vehicle_id, occurred_at DESC, id DESC);

CREATE INDEX geofence_events_geofence_occurred_idx
  ON geofence_events (geofence_id, occurred_at DESC, id DESC);

-- Down Migration
DROP TABLE geofence_events;
DROP TABLE vehicle_geofence_state;
