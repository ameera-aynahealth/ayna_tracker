import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as extraRelations from "./relations";
import * as trackerSchema from "./tracker-schema";

// Drizzle needs all tables and relation definitions in the schema object used
// by the relational query builder.
const relationalSchema = { ...schema, ...extraRelations, ...trackerSchema };

type Database = ReturnType<typeof drizzle<typeof relationalSchema>>;

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
  const database = drizzle(queryClient, { schema: relationalSchema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.queryClient = queryClient;
    globalForDb.database = database;
  }

  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDatabase();
    const value = Reflect.get(database as object, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
