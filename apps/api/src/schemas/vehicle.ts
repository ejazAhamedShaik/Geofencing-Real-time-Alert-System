import { z } from "zod";

export const createVehicleSchema = z.object({
  vehicle_number: z.string().trim().min(1, "Vehicle number is required."),
  driver_name: z.string().trim().min(1, "Driver name is required."),
  vehicle_type: z.string().trim().min(1, "Vehicle type is required."),
  phone: z.string().trim().min(1, "Phone is required."),
});

export const vehicleIdParamsSchema = z.object({
  vehicle_id: z.string().trim().min(1, "Vehicle ID is required."),
});

export const updateVehicleLocationSchema = z.object({
  vehicle_id: z.string().trim().min(1, "Vehicle ID is required."),
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90.")
    .max(90, "Latitude must be between -90 and 90."),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180, "Longitude must be between -180 and 180."),
  timestamp: z.iso.datetime({ offset: true }),
});
