import type { LibSQLDatabase } from "drizzle-orm/libsql";

export let db: LibSQLDatabase<Record<string, never>>;

if (process.env.NEXT_RUNTIME === "edge") {
  db = require("./turso.edge").db;
} else if (process.env.NODE_ENV === "development") {
  db = require("./turso.server").db;
} else {
  // Fallback to edge runtime
  db = require("./turso.edge").db;
}
