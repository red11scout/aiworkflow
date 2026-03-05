/**
 * Vercel Serverless Entry Point
 *
 * Wraps the Express app from createApp() as a Vercel serverless function.
 * The Express instance is cached across invocations for warm starts.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/index";
import type { Express } from "express";

let cachedApp: Express | null = null;

async function getApp(): Promise<Express> {
  if (!cachedApp) {
    const { app } = await createApp();
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  return app(req, res);
}
