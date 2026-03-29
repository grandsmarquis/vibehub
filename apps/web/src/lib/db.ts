import pg from "pg";
import { poolSslOption, resolveDatabaseUrl } from "@/lib/database-url";

const { Pool } = pg;

const globalForPool = globalThis as typeof globalThis & {
  __vibehubPool?: pg.Pool;
};

function createPool() {
  const connectionString = resolveDatabaseUrl();
  const ssl = poolSslOption(connectionString);
  return new Pool({ connectionString, ssl });
}

export function getPool(): pg.Pool {
  if (process.env.NODE_ENV === "production") {
    return createPool();
  }
  if (!globalForPool.__vibehubPool) {
    globalForPool.__vibehubPool = createPool();
  }
  return globalForPool.__vibehubPool;
}

export type Db = pg.Pool;
