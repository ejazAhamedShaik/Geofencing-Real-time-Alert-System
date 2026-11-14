import 'dotenv/config';
import { runner } from 'node-pg-migrate';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to apps/api/.env before running migrations.');
}

const migrationsDirectory = fileURLToPath(new URL('../../migrations', import.meta.url));

await runner({
  databaseUrl,
  dir: migrationsDirectory,
  migrationsTable: 'schema_migrations',
  direction: 'up',
  checkOrder: true,
  singleTransaction: true,
  verbose: true,
});
