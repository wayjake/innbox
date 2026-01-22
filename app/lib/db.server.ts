import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../../db/schema';

/**
 * 🗄️ Database client
 *
 * Connects to Turso (SQLite at the edge).
 * All the speed of SQLite, everywhere.
 */

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
