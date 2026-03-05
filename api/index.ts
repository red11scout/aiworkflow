/**
 * Vercel Serverless Entry Point
 *
 * Thin wrapper that loads the pre-built Express app from dist/index.cjs.
 * The app is cached across warm invocations.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let handler: any = null;

async function getHandler() {
  if (handler) return handler;
  try {
    const mod = require("../dist/index.cjs");
    const { app } = await mod.createApp();
    handler = app;
    return handler;
  } catch (err: any) {
    console.error("Failed to initialize app:", err);
    throw err;
  }
}

export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getHandler();
    return app(req, res);
  } catch (err: any) {
    console.error("Handler error:", err);
    res.status(500).json({ message: "Server initialization failed", error: err.message });
  }
}
