import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// A single connection is reused across hot reloads in dev; Vercel's
// serverless functions get a fresh connection per cold start, which is fine
// for Neon (it pools on its end via the pooled connection string).
const globalForDb = globalThis as unknown as { queryClient?: postgres.Sql };

const queryClient = globalForDb.queryClient ?? postgres(process.env.DATABASE_URL, { max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.queryClient = queryClient;

export const db = drizzle(queryClient, { schema });
