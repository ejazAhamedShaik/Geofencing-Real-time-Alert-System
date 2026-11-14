import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import { ulid } from 'ulid';
import type { AlertEventType } from '@geofence/contracts';
import { configureAlertSchema, listAlertsQuerySchema } from '../schemas/alert.js';
import { AlertHub } from '../services/alertHub.js';

type AlertRuleRow = {
  alert_id: string;
  geofence_id: string;
  geofence_name: string;
  vehicle_id: string | null;
  vehicle_number: string | null;
  event_type: AlertEventType;
  status: string;
  created_at: Date;
};

function sendValidationError(reply: FastifyReply, issues: Array<{ path: PropertyKey[]; message: string }>) {
  return reply.code(400).send({
    error: 'Validation Error',
    message: 'The request contains invalid alert rule data.',
    details: issues.map((issue) => ({ field: issue.path.map(String).join('.'), message: issue.message })),
  });
}

export function alertRoutes(pool: Pool, hub: AlertHub): FastifyPluginAsync {
  return async (app) => {
    app.post('/alerts/configure', async (request, reply) => {
      const parsed = configureAlertSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const input = parsed.data;
      const geofence = await pool.query('SELECT id FROM geofences WHERE id = $1', [input.geofence_id]);
      if (!geofence.rowCount) {
        return reply.code(404).send({ error: 'Not Found', message: 'Geofence was not found.' });
      }

      if (input.vehicle_id) {
        const vehicle = await pool.query('SELECT id FROM vehicles WHERE id = $1', [input.vehicle_id]);
        if (!vehicle.rowCount) {
          return reply.code(404).send({ error: 'Not Found', message: 'Vehicle was not found.' });
        }
      }

      const id = `alert_${ulid()}`;
      const result = await pool.query<{
        id: string;
        geofence_id: string;
        vehicle_id: string | null;
        event_type: AlertEventType;
        status: string;
      }>(
        `INSERT INTO alert_rules (id, geofence_id, vehicle_id, event_type)
         VALUES ($1, $2, $3, $4)
         RETURNING id, geofence_id, vehicle_id, event_type, status`,
        [id, input.geofence_id, input.vehicle_id ?? null, input.event_type],
      );

      const rule = result.rows[0]!;
      return reply.code(201).send({
        alert_id: rule.id,
        geofence_id: rule.geofence_id,
        vehicle_id: rule.vehicle_id,
        event_type: rule.event_type,
        status: rule.status,
      });
    });

    app.get('/alerts', async (request, reply) => {
      const parsed = listAlertsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error.issues);
      }

      const conditions: string[] = [];
      const values: string[] = [];
      if (parsed.data.geofence_id) {
        values.push(parsed.data.geofence_id);
        conditions.push(`ar.geofence_id = $${values.length}`);
      }
      if (parsed.data.vehicle_id) {
        values.push(parsed.data.vehicle_id);
        conditions.push(`ar.vehicle_id = $${values.length}`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query<AlertRuleRow>(
        `SELECT ar.id AS alert_id,
                ar.geofence_id,
                g.name AS geofence_name,
                ar.vehicle_id,
                v.vehicle_number,
                ar.event_type,
                ar.status,
                ar.created_at
         FROM alert_rules AS ar
         JOIN geofences AS g ON g.id = ar.geofence_id
         LEFT JOIN vehicles AS v ON v.id = ar.vehicle_id
         ${where}
         ORDER BY ar.created_at DESC, ar.id`,
        values,
      );

      return { alerts: result.rows };
    });

    app.get('/ws/alerts', { websocket: true }, (socket, request) => {
      hub.add(socket);
      request.log.info('Alert WebSocket client connected.');
      socket.on('close', () => hub.remove(socket));
      socket.on('error', () => hub.remove(socket));
    });

    app.addHook('onClose', async () => hub.closeAll());
  };
}
