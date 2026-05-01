// Placeholder for the planned realtime collaboration server.
//
// The previous implementation imported `ws`, `yjs`, and `y-websocket` and
// listened on a separate port. That approach does not work in Replit's
// autoscale deployments (which terminate idle connections and do not route
// arbitrary TCP ports), and the dependencies were not properly installed.
//
// This stub keeps the import in `src/index.ts` valid until a deployment-
// compatible realtime layer is designed.
import { logger } from "./lib/logger";

export function createWebSocketServer(): void {
  logger.info("WebSocket realtime collaboration is disabled in this build.");
}
