import type { AlertEventType, GeofenceCategory } from '@geofence/contracts';

export interface GeofenceRecord {
  id: string;
  name: string;
  description: string | null;
  coordinates: [number, number][];
  category: GeofenceCategory;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface VehicleRecord {
  id: string;
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface AlertRecord {
  alert_id: string;
  geofence_id: string;
  geofence_name: string;
  vehicle_id: string | null;
  vehicle_number: string | null;
  event_type: AlertEventType;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ViolationRecord {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  geofence_id: string;
  geofence_name: string;
  event_type: 'entry' | 'exit';
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface ViolationHistory {
  violations: ViolationRecord[];
  total_count: number;
}
