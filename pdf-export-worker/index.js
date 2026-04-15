import express from "express";
import cron from "node-cron";
import { processPdfExportJobs } from "./src/cron-job.js";
import { createLogger } from "./src/logger.js";

const app = express();
const logger = createLogger("pdf-export-worker");

const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET || "default-secret";

// Middleware
app.use(express.json());

// Health check endpoint (for Docker health checks and monitoring)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Manual trigger endpoint (for testing or on-demand processing)
app.post("/process", async (req, res) => {
  const authHeader = req.headers.authorization;
  const secret = authHeader ? authHeader.split(" ")[1] : null;

  // Verify CRON_SECRET
  if (secret !== CRON_SECRET) {
    logger.warn("Unauthorized /process request");
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    logger.info("Manual /process trigger");
    const result = await processPdfExportJobs();
    res.json(result);
  } catch (err) {
    logger.error("Error in /process:", err);
    res.status(500).json({ error: "processing_failed", detail: String(err) });
  }
});

// Cron job: every 30 seconds
cron.schedule("*/30 * * * * *", async () => {
  try {
    logger.debug("Cron job: processing PDF export jobs");
    await processPdfExportJobs();
  } catch (err) {
    logger.error("Cron job error:", err);
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`PDF export worker listening on port ${PORT}`);
  logger.info(`CRON_SECRET configured: ${CRON_SECRET ? "yes" : "no"}`);
  logger.info(`Puppeteer timeout: ${process.env.PUPPETEER_TIMEOUT_MS || 55000}ms`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});
