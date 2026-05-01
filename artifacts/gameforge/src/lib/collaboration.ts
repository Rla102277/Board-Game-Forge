import { useEffect, useRef, useState, useCallback } from "react";

export interface CollaborationState {
  projectId: number;
  connectedUsers: PresenceUser[];
  isOnline: boolean;
}

export interface PresenceUser {
  userId: string;
  userName?: string;
  avatarUrl?: string;
  projectId?: number;
  workspaceId?: number;
  lastSeen?: Date;
}

export interface EditingUser {
  userId: string;
  userName?: string;
  itemId: string | number;
  itemType: string;
  startedAt: Date;
}

export interface MentionableUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  target?: string;
  timestamp: Date;
}

export interface VersionEvent {
  id: string;
  userId: string;
  userName?: string;
  versionId: number;
  action: "create" | "restore";
  timestamp: Date;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

class CollaborationManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private projectId: number | null = null;
  private workspaceId: number | null = null;
  private userId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  connect(projectId?: number, workspaceId?: number): void {
    this.projectId = projectId || null;
    this.workspaceId = workspaceId || null;

    const token = this.getAuthToken();
    if (!token) {
      console.warn("No auth token available for WebSocket connection");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    let url = `${protocol}//${host}/ws?token=${token}`;

    if (this.projectId) {
      url += `&projectId=${this.projectId}`;
    }
    if (this.workspaceId) {
      url += `&workspaceId=${this.workspaceId}`;
    }

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit("connection", { status: "connected" });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.stopHeartbeat();
      this.emit("connection", { status: "disconnected" });
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in listener for event "${event}"`, err);
      }
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "presence:init":
        this.emit("presence:init", message.data);
        break;
      case "presence":
        this.emit("presence", message);
        break;
      case "cursor:move":
        this.emit("cursor:move", message);
        break;
      case "editing:start":
        this.emit("editing:start", message);
        break;
      case "editing:stop":
        this.emit("editing:stop", message);
        break;
      case "activity:new":
        this.emit("activity:new", message);
        break;
      case "mention":
        this.emit("mention", message);
        break;
      case "version:create":
        this.emit("version:create", message);
        break;
      case "version:restore":
        this.emit("version:restore", message);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.projectId || undefined, this.workspaceId || undefined);
    }, delay);
  }

  private getAuthToken(): string | null {
    // Try to get token from cookie or localStorage
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("__session="))
      ?.split("=")[1];
    return token || localStorage.getItem("auth_token");
  }
}

// Singleton instance
const collaborationManager = new CollaborationManager();

export function useCollaboration(projectId?: number, workspaceId?: number): CollaborationState {
  const [state, setState] = useState<CollaborationState>({
    projectId: projectId || 0,
    connectedUsers: [],
    isOnline: false,
  });

  useEffect(() => {
    collaborationManager.connect(projectId, workspaceId);

    const unsubPresence = collaborationManager.on("presence:init", (users: PresenceUser[]) => {
      setState((prev) => ({
        ...prev,
        connectedUsers: users,
        isOnline: true,
      }));
    });

    const unsubPresenceUpdate = collaborationManager.on("presence", (data: any) => {
      setState((prev) => {
        if (data.action === "join") {
          return {
            ...prev,
            connectedUsers: [...prev.connectedUsers, data],
          };
        } else if (data.action === "leave") {
          return {
            ...prev,
            connectedUsers: prev.connectedUsers.filter((u) => u.userId !== data.userId),
          };
        }
        return prev;
      });
    });

    const unsubConnection = collaborationManager.on("connection", (data: any) => {
      setState((prev) => ({
        ...prev,
        isOnline: data.status === "connected",
      }));
    });

    return () => {
      unsubPresence();
      unsubPresenceUpdate();
      unsubConnection();
      collaborationManager.disconnect();
    };
  }, [projectId, workspaceId]);

  return state;
}

export function usePresence(projectId?: number): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    collaborationManager.connect(projectId);

    const unsubInit = collaborationManager.on("presence:init", (data: PresenceUser[]) => {
      setUsers(data);
    });

    const unsubUpdate = collaborationManager.on("presence", (data: any) => {
      setUsers((prev) => {
        if (data.action === "join") {
          return [...prev, data];
        } else if (data.action === "leave") {
          return prev.filter((u) => u.userId !== data.userId);
        }
        return prev;
      });
    });

    return () => {
      unsubInit();
      unsubUpdate();
      collaborationManager.disconnect();
    };
  }, [projectId]);

  return users;
}

export function useEditingUsers(projectId?: number): EditingUser[] {
  const [editingUsers, setEditingUsers] = useState<EditingUser[]>([]);

  useEffect(() => {
    collaborationManager.connect(projectId);

    const unsubStart = collaborationManager.on("editing:start", (data: any) => {
      setEditingUsers((prev) => [
        ...prev.filter((u) => u.userId !== data.userId),
        {
          userId: data.userId,
          itemId: data.itemId,
          itemType: data.itemType,
          startedAt: new Date(),
        },
      ]);
    });

    const unsubStop = collaborationManager.on("editing:stop", (data: any) => {
      setEditingUsers((prev) =>
        prev.filter((u) => !(u.userId === data.userId && u.itemId === data.itemId))
      );
    });

    return () => {
      unsubStart();
      unsubStop();
      collaborationManager.disconnect();
    };
  }, [projectId]);

  return editingUsers;
}

export function useActivityFeed(projectId?: number): ActivityEvent[] {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    collaborationManager.connect(projectId);

    const unsub = collaborationManager.on("activity:new", (data: any) => {
      setActivities((prev) => [
        {
          id: data.activity.id,
          userId: data.userId,
          action: data.activity.action,
          target: data.activity.target,
          timestamp: new Date(data.activity.timestamp),
        },
        ...prev,
      ]);
    });

    return () => {
      unsub();
      collaborationManager.disconnect();
    };
  }, [projectId]);

  return activities;
}

export function useMentionableUsers(projectId?: number): MentionableUser[] {
  const [users, setUsers] = useState<MentionableUser[]>([]);

  useEffect(() => {
    collaborationManager.connect(projectId);

    const unsub = collaborationManager.on("presence:init", (data: PresenceUser[]) => {
      setUsers(
        data.map((u) => ({
          userId: u.userId,
          userName: u.userName || "Unknown User",
          avatarUrl: u.avatarUrl,
        }))
      );
    });

    return () => {
      unsub();
      collaborationManager.disconnect();
    };
  }, [projectId]);

  return users;
}

export function sendActivity(projectId: number, activity: Omit<ActivityEvent, "id" | "userId" | "timestamp">): void {
  collaborationManager.send({
    type: "activity:new",
    activity: {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
  });
}

export function sendMention(
  projectId: number,
  toUserId: string,
  message: string,
  itemId?: string | number,
  itemType?: string
): void {
  collaborationManager.send({
    type: "mention",
    toUserId,
    message,
    itemId,
    itemType,
  });
}

export function sendEditingStart(projectId: number, itemId: string | number, itemType: string): void {
  collaborationManager.send({
    type: "editing:start",
    itemId,
    itemType,
  });
}

export function sendEditingStop(projectId: number, itemId: string | number, itemType: string): void {
  collaborationManager.send({
    type: "editing:stop",
    itemId,
    itemType,
  });
}

export function sendCursorMove(projectId: number, position: { x: number; y: number }): void {
  collaborationManager.send({
    type: "cursor:move",
    position,
  });
}

export function sendVersionEvent(
  projectId: number,
  versionId: number,
  action: "create" | "restore"
): void {
  collaborationManager.send({
    type: `version:${action}`,
    versionId,
    version: { id: versionId, action },
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${apiBase}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    let parsed: { error?: string } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ignore
    }
    throw new Error(parsed?.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}
