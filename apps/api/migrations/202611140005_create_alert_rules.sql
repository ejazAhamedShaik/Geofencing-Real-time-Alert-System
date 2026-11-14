-- Up Migration
CREATE TABLE alert_rules (
  id text PRIMARY KEY,
  geofence_id text NOT NULL REFERENCES geofences(id),
  vehicle_id text REFERENCES vehicles(id),
  event_type text NOT NULL CHECK (event_type IN ('entry', 'exit', 'both')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX alert_rules_geofence_status_idx
  ON alert_rules (geofence_id, status);

CREATE INDEX alert_rules_vehicle_idx
  ON alert_rules (vehicle_id)
  WHERE vehicle_id IS NOT NULL;

-- Down Migration
DROP TABLE alert_rules;
