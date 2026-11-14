import type { WebSocket } from '@fastify/websocket';
import type { AlertMessage } from '@geofence/contracts';

export class AlertHub {
  private readonly clients = new Set<WebSocket>();
  private readonly heartbeatState = new Map<WebSocket, boolean>();
  private heartbeatTimer: NodeJS.Timeout | undefined;

  startHeartbeats(intervalMs = 30_000): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        if (this.heartbeatState.get(client) === false) {
          this.remove(client);
          client.terminate();
          continue;
        }

        this.heartbeatState.set(client, false);
        if (client.readyState === 1) {
          try {
            client.ping();
          } catch {
            this.remove(client);
            client.terminate();
          }
        }
      }
    }, intervalMs);
    this.heartbeatTimer.unref();
  }

  add(client: WebSocket): void {
    this.clients.add(client);
    this.heartbeatState.set(client, true);
    client.on('pong', () => this.heartbeatState.set(client, true));
  }

  remove(client: WebSocket): void {
    this.clients.delete(client);
    this.heartbeatState.delete(client);
  }

  broadcast(message: AlertMessage): void {
    const payload = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState !== 1) {
        this.remove(client);
        continue;
      }

      try {
        client.send(payload, (error?: Error) => {
          if (error) {
            this.remove(client);
            client.terminate();
          }
        });
      } catch {
        this.remove(client);
        client.terminate();
      }
    }
  }

  closeAll(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.close(1001, 'Server shutting down');
      }
    }
    this.clients.clear();
    this.heartbeatState.clear();
  }
}
