import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

function getDatabaseUrl(): string {
  if (process.env.NEON_DB_URL) {
    const url = process.env.NEON_DB_URL.trim();
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
      return url;
    }
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  throw new Error(
    "Database URL not configured. Set NEON_DB_URL or DATABASE_URL.",
  );
}

const databaseUrl = getDatabaseUrl();

// Neon serverless driver works in both Node.js and Vercel serverless environments.
// The ws polyfill is needed in Node.js; Vercel provides native WebSocket support.
export const db = drizzle({
  connection: databaseUrl,
  schema,
  ws: ws,
});
