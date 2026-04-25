// Root-level Vercel serverless function entrypoint.
// Vercel auto-detects files under `/api/` at the project root and deploys them
// as serverless functions. We re-export the Express app from the backend
// package so every request to /api/* (and any subpath via the rewrite below)
// is handled by our Express router.
import { app } from "../backend/src/server";

export default app;
