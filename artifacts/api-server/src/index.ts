import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env.development in development mode
if (process.env.NODE_ENV === "development") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, "../.env.development");
  dotenv.config({ path: envPath });
}

const { default: app } = await import("./app");
const { logger } = await import("./lib/logger");
const { createWebSocketServer } = await import("./websocket-server");
const { runStartupMigrations } = await import("./lib/startup-migrations");

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start everything after migrations complete (or gracefully log failures)
(async () => {
  try {
    await runStartupMigrations();
  } catch (err) {
    logger.error({ err }, "startup migrations failed — server will start anyway");
  }

  // Start WebSocket server
  createWebSocketServer();

  app.listen(port, (listenErr) => {
    if (listenErr) {
      logger.error({ err: listenErr }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
})();
