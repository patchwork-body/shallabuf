import type { LibSQLDatabase } from "drizzle-orm/libsql";

export let db: LibSQLDatabase<Record<string, never>>;

if (process.env.NEXT_RUNTIME === "edge") {
  db = require("./turso.edge").db;
} else if (process.env.NEXT_RUNTIME === "nodejs") {
  db = require("./turso.server").db;
} else {
  throw new Error(`Unknown nextjs runtime ${process.env.NEXT_RUNTIME}`);
}
