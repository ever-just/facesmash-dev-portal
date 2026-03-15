import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionUrl = process.env.POSTGRES_URL;

if (!connectionUrl) {
  console.warn('[db] POSTGRES_URL is missing. Returning a no-op database client.');
}

type Database = ReturnType<typeof drizzle<typeof schema>>;

const client = connectionUrl
  ? postgres(connectionUrl, {
      ssl: connectionUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    })
  : null;

const noopDb: Database = new Proxy({} as Database, {
  get: () => {
    throw new Error('Database client is unavailable because POSTGRES_URL is not configured.');
  },
});

export const db: Database = client ? drizzle(client, { schema }) : noopDb;
