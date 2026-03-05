/**
 * Vercel Serverless Entry Point
 *
 * Creates an Express app with all API routes, cached across warm invocations.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createServer } from "http";

let cachedApp: ReturnType<typeof express> | null = null;

async function getApp() {
  if (cachedApp) return cachedApp;

  const app = express();
  const httpServer = createServer(app);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../server/routes");
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Express error:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  cachedApp = app;
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error("Handler initialization error:", err);
    res.status(500).json({ message: "Server initialization failed", error: err.message });
  }
}
