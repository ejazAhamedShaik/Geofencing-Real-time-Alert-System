import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GeofenceCategory } from '@geofence/contracts';
import { getJson, postJson } from './api';
import type { AlertRecord, GeofenceRecord, VehicleRecord, ViolationHistory } from '../types';

export const queryKeys = {
  health: ['health'] as const,
  geofences: (category?: GeofenceCategory) => ['geofences', category ?? 'all'] as const,
  vehicles: ['vehicles'] as const,
  alerts: ['alerts'] as const,
  history: (query: string) => ['history', query] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => getJson<{ status: string }>('/health', signal),
    refetchInterval: 30_000,
  });
}

export function useGeofences(category?: GeofenceCategory) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return useQuery({ queryKey: queryKeys.geofences(category), queryFn: ({ signal }) => getJson<{ geofences: GeofenceRecord[] }>(`/geofences${query}`, signal) });
}

export function useVehicles() {
  return useQuery({ queryKey: queryKeys.vehicles, queryFn: ({ signal }) => getJson<{ vehicles: VehicleRecord[] }>('/vehicles', signal) });
}

export function useAlerts() {
  return useQuery({ queryKey: queryKeys.alerts, queryFn: ({ signal }) => getJson<{ alerts: AlertRecord[] }>('/alerts', signal) });
}

export function useViolationHistory(query: string) {
  return useQuery({ queryKey: queryKeys.history(query), queryFn: ({ signal }) => getJson<ViolationHistory>(`/violations/history${query ? `?${query}` : ''}`, signal) });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicle: { vehicle_number: string; driver_name: string; vehicle_type: string; phone: string }) =>
      postJson('/vehicles', vehicle),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.vehicles }),
  });
}

export function useCreateGeofence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (geofence: { name: string; description?: string; category: GeofenceCategory; coordinates: [number, number][] }) =>
      postJson('/geofences', geofence),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['geofences'] }),
  });
}

export function useConfigureAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: { geofence_id: string; vehicle_id?: string; event_type: 'entry' | 'exit' | 'both' }) =>
      postJson('/alerts/configure', rule),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}
