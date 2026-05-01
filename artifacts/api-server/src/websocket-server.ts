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

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { verifyToken } from "./middlewares/clerkProxyMiddleware";
import { logger } from "./lib/logger";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  projectId?: number;
  workspaceId?: number;
}

const clients = new Map<string, ConnectedClient>();

export function createWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const projectId = url.searchParams.get("projectId");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!token) {
      ws.close(4001, "Missing authentication token");
      return;
    }

    try {
      const user = await verifyToken(token);
      if (!user) {
        ws.close(4001, "Invalid authentication token");
        return;
      }

      const clientId = `${user.id}-${Date.now()}`;
      const client: ConnectedClient = {
        ws,
        userId: user.id,
        projectId: projectId ? parseInt(projectId) : undefined,
        workspaceId: workspaceId ? parseInt(workspaceId) : undefined,
      };

      clients.set(clientId, client);

      // Notify others about new connection
      broadcastPresence(client, "join");

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          handleMessage(client, message);
        } catch (err) {
          logger.error("Failed to parse WebSocket message", err);
        }
      });

      ws.on("close", () => {
        broadcastPresence(client, "leave");
        clients.delete(clientId);
      });

      ws.on("error", (err) => {
        logger.error("WebSocket error", err);
        clients.delete(clientId);
      });

      // Send initial presence data
      const presenceData = getPresenceData(client);
      ws.send(JSON.stringify({ type: "presence:init", data: presenceData }));
    } catch (err) {
      logger.error("WebSocket authentication error", err);
      ws.close(4001, "Authentication failed");
    }
  });

  logger.info("WebSocket realtime collaboration server started.");
}

function handleMessage(client: ConnectedClient, message: any): void {
  switch (message.type) {
    case "cursor:move":
      broadcastToProject(client, {
        type: "cursor:move",
        userId: client.userId,
        position: message.position,
      });
      break;

    case "editing:start":
      broadcastToProject(client, {
        type: "editing:start",
        userId: client.userId,
        itemId: message.itemId,
        itemType: message.itemType,
      });
      break;

    case "editing:stop":
      broadcastToProject(client, {
        type: "editing:stop",
        userId: client.userId,
        itemId: message.itemId,
        itemType: message.itemType,
      });
      break;

    case "activity:new":
      broadcastToProject(client, {
        type: "activity:new",
        userId: client.userId,
        activity: message.activity,
      });
      break;

    case "mention":
      broadcastToProject(client, {
        type: "mention",
        fromUserId: client.userId,
        toUserId: message.toUserId,
        message: message.message,
        itemId: message.itemId,
        itemType: message.itemType,
      });
      break;

    case "version:create":
      broadcastToProject(client, {
        type: "version:create",
        userId: client.userId,
        version: message.version,
      });
      break;

    case "version:restore":
      broadcastToProject(client, {
        type: "version:restore",
        userId: client.userId,
        versionId: message.versionId,
      });
      break;

    default:
      logger.warn(`Unknown message type: ${message.type}`);
  }
}

function broadcastPresence(client: ConnectedClient, action: "join" | "leave"): void {
  const presenceMessage = {
    type: "presence",
    userId: client.userId,
    action,
    projectId: client.projectId,
    workspaceId: client.workspaceId,
  };

  for (const [, otherClient] of clients) {
    if (otherClient.ws.readyState === WebSocket.OPEN) {
      if (otherClient.projectId === client.projectId || otherClient.workspaceId === client.workspaceId) {
        otherClient.ws.send(JSON.stringify(presenceMessage));
      }
    }
  }
}

function broadcastToProject(sender: ConnectedClient, message: any): void {
  for (const [, client] of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (client.projectId === sender.projectId || client.workspaceId === sender.workspaceId) {
        if (client.userId !== sender.userId) {
          client.ws.send(JSON.stringify(message));
        }
      }
    }
  }
}

function getPresenceData(currentClient: ConnectedClient): any[] {
  const presenceData: any[] = [];
  for (const [, client] of clients) {
    if (client.userId !== currentClient.userId) {
      if (client.projectId === currentClient.projectId || client.workspaceId === currentClient.workspaceId) {
        presenceData.push({
          userId: client.userId,
          projectId: client.projectId,
          workspaceId: client.workspaceId,
        });
      }
    }
  }
  return presenceData;
}
