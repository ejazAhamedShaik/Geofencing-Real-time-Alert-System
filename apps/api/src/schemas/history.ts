import { z } from "zod";

export const violationHistoryQuerySchema = z
  .object({
    vehicle_id: z
      .string()
      .trim()
      .min(1, "Vehicle ID cannot be blank.")
      .optional(),
    geofence_id: z
      .string()
      .trim()
      .min(1, "Geofence ID cannot be blank.")
      .optional(),
    start_date: z.iso.datetime({ offset: true }).optional(),
    end_date: z.iso.datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((query, context) => {
    if (
      query.start_date &&
      query.end_date &&
      Date.parse(query.start_date) > Date.parse(query.end_date)
    ) {
      context.addIssue({
        code: "custom",
        path: ["start_date"],
        message: "start_date must be earlier than or equal to end_date.",
      });
    }
  });
