import type { LibSQLDatabase } from "drizzle-orm/libsql";

export let db: LibSQLDatabase<Record<string, never>>;

if (process.env.NEXT_RUNTIME === "edge") {
  db = require("./turso.edge").db;
} else {
  db = require("./turso.server").db;
}
