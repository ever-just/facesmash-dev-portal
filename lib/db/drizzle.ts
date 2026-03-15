import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionUrl = process.env.POSTGRES_URL;

if (!connectionUrl) {
  console.warn('[db] POSTGRES_URL is missing. Returning a no-op database client.');
}

const client = connectionUrl
  ? postgres(connectionUrl, {
      ssl: connectionUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    })
  : null;

export const db = client ? drizzle(client, { schema }) : ({} as ReturnType<typeof drizzle>);
