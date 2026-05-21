/**
 * Ably presence helper functions for real-time notifications
 */
import Ably from "ably";

function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  return new Ably.Rest(key);
}

/**
 * Publish a notification to Ably channel(s)
 * Used for real-time updates: new comments, mentions, task assignments, etc.
 */
export async function publishNotification(
  channelName: string,
  event: string,
  data: unknown,
  targetUserIds?: number[]
): Promise<void> {
  const ably = getAblyRest();
  if (!ably) {
    console.warn("Ably not configured - notification not sent");
    return;
  }

  const channel = ably.channels.get(channelName);
  
  const message = {
    event,
    data,
    targetUserIds, // If specified, only these users should process this notification
    timestamp: new Date().toISOString(),
  };

  await channel.publish("notification", message);
}

/**
 * Publish presence update (cursor position, section change, etc.)
 */
export async function publishPresenceUpdate(
  projectId: number,
  userId: number,
  update: {
    section?: string;
    cursorX?: number;
    cursorY?: number;
    isTyping?: boolean;
    entityId?: string;
  }
): Promise<void> {
  const ably = getAblyRest();
  if (!ably) return;

  const channel = ably.channels.get(`presence:project-${projectId}`);
  
  await channel.publish("presence-update", {
    userId,
    ...update,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast to all users in a project
 */
export async function broadcastToProject(
  projectId: number,
  event: string,
  data: unknown
): Promise<void> {
  await publishNotification(`presence:project-${projectId}`, event, data);
}
