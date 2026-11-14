export const geofenceCategories = ['delivery_zone', 'restricted_zone', 'toll_zone', 'customer_area'] as const;
export type GeofenceCategory = (typeof geofenceCategories)[number];
export const eventTypes = ['entry', 'exit', 'both'] as const;
export type AlertEventType = (typeof eventTypes)[number];

export interface AlertMessage {
  event_id: string;
  event_type: 'entry' | 'exit';
  timestamp: string;
  vehicle: { vehicle_id: string; vehicle_number: string; driver_name: string };
  geofence: { geofence_id: string; geofence_name: string; category: GeofenceCategory };
  location: { latitude: number; longitude: number };
}
