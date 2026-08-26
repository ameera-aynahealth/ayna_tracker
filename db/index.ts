import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Do not require DATABASE_URL just to import this module. Next.js imports API
// route modules while collecting build metadata, and those imports should not
// need a live database connection. The first real database operation still
// fails clearly if DATABASE_URL is missing.
type Database = ReturnType<typeof drizzle<typeof schema>>;

type DbGlobals = {
  queryClient?: postgres.Sql;
  database?: Database;
};

const globalForDb = globalThis as unknown as DbGlobals;

function getDatabase(): Database {
  if (globalForDb.database) return globalForDb.database;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to the Vercel environment or your local .env.local before accessing tracker data."
    );
  }

  const queryClient = globalForDb.queryClient ?? postgres(databaseUrl, { max: 5 });
  const database = drizzle(queryClient, { schema });

  // Reuse the connection/database across hot reloads in development. Vercel
  // serverless functions get a fresh instance per cold start; Neon handles the
  // pooled connection string on its side.
  if (process.env.NODE_ENV !== "production") {
    globalForDb.queryClient = queryClient;
    globalForDb.database = database;
  }

  return database;
}

// Preserve the existing `db.query`, `db.insert`, `db.update`, etc. API while
// delaying connection creation until code actually performs a database call.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDatabase();
    const value = Reflect.get(database as object, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
