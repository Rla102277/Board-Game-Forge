import app from "./app";
import { logger } from "./lib/logger";
import { createWebSocketServer } from "./websocket-server";
import { runStartupMigrations } from "./lib/startup-migrations";

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
