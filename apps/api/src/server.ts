import Fastify from 'fastify';
import websocket from '@fastify/websocket';

const app = Fastify({ logger: true });
await app.register(websocket);
app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
