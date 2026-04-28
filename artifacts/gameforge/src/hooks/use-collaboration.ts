import { useEffect, useState, useCallback, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import { useUser } from "@clerk/react";
import type { PresenceUser } from "@/lib/collaboration";

const USER_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

function getUserColor(userId: string): string {
  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
}

export function useCollaboration(projectId: number) {
  const { user } = useUser();
  const [connectedUsers, setConnectedUsers] = useState<PresenceUser[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const idbProviderRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!user || !projectId) return;

    // Initialize Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Set up IndexedDB for offline persistence
    const idbProvider = new IndexeddbPersistence(`gameforge-project-${projectId}`, ydoc);
    idbProviderRef.current = idbProvider;

    idbProvider.whenSynced.then(() => {
      console.log("Document loaded from IndexedDB");
    });

    // Set up WebSocket provider for real-time collaboration
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:1234";
    const wsProvider = new WebsocketProvider(
      wsUrl,
      `gameforge-project-${projectId}`,
      ydoc,
      {
        connect: true,
        params: {
          userId: user.id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          imageUrl: user.imageUrl || "",
        },
      }
    );
    wsProviderRef.current = wsProvider;

    // Set up awareness for presence
    const awareness = wsProvider.awareness;
    const localUserState = {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      color: getUserColor(user.id),
      cursor: null,
      selection: null,
      lastSeen: new Date().toISOString(),
    };
    awareness.setLocalStateField("user", localUserState);

    // Handle connection status
    wsProvider.on("status", (event: { status: string }) => {
      setIsOnline(event.status === "connected");
    });

    // Handle awareness changes (other users joining/leaving/updating)
    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const users: PresenceUser[] = [];
      
      states.forEach((state: unknown, clientId: number) => {
        const stateData = state as { user?: PresenceUser; lastSeen?: string };
        const userState = stateData.user;
        if (userState && userState.userId !== user.id) {
          users.push({
            ...userState,
            lastSeen: stateData.lastSeen || new Date().toISOString(),
          });
        }
      });
      
      setConnectedUsers(users);
    };

    awareness.on("change", handleAwarenessChange);

    // Initial sync
    handleAwarenessChange();

    // Cleanup
    return () => {
      awareness.off("change", handleAwarenessChange);
      wsProvider.destroy();
      idbProvider.destroy();
      ydoc.destroy();
    };
  }, [user, projectId]);

  // Function to update cursor position
  const updateCursor = useCallback((x: number, y: number, visible: boolean = true) => {
    if (!wsProviderRef.current) return;
    const awareness = wsProviderRef.current.awareness;
    const currentUser = awareness.getLocalState()?.user as PresenceUser | undefined;
    if (currentUser) {
      awareness.setLocalStateField("user", {
        ...currentUser,
        cursor: { x, y, visible },
        lastSeen: new Date().toISOString(),
      });
    }
  }, []);

  // Function to update selection
  const updateSelection = useCallback((entityType: string, entityId: number | null) => {
    if (!wsProviderRef.current) return;
    const awareness = wsProviderRef.current.awareness;
    const currentUser = awareness.getLocalState()?.user as PresenceUser | undefined;
    if (currentUser) {
      awareness.setLocalStateField("user", {
        ...currentUser,
        selection: { entityType, entityId },
        lastSeen: new Date().toISOString(),
      });
    }
  }, []);

  // Function to hide cursor
  const hideCursor = useCallback(() => {
    if (!wsProviderRef.current) return;
    const awareness = wsProviderRef.current.awareness;
    const currentUser = awareness.getLocalState()?.user as PresenceUser | undefined;
    if (currentUser) {
      awareness.setLocalStateField("user", {
        ...currentUser,
        cursor: { x: 0, y: 0, visible: false },
        lastSeen: new Date().toISOString(),
      });
    }
  }, []);

  return {
    connectedUsers,
    isOnline,
    updateCursor,
    updateSelection,
    hideCursor,
    ydoc: ydocRef.current,
  };
}

export function useSharedText(projectId: number, key: string) {
  const [text, setText] = useState("");
  const ydocRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const idbProvider = new IndexeddbPersistence(`gameforge-${projectId}-${key}`, ydoc);
    
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:1234";
    const wsProvider = new WebsocketProvider(wsUrl, `gameforge-${projectId}-${key}`, ydoc);

    const ytext = ydoc.getText(key);
    
    const updateText = () => {
      setText(ytext.toString());
    };

    ytext.observe(updateText);
    updateText();

    return () => {
      ytext.unobserve(updateText);
      wsProvider.destroy();
      idbProvider.destroy();
      ydoc.destroy();
    };
  }, [projectId, key]);

  const setTextContent = useCallback((newText: string) => {
    if (!ydocRef.current) return;
    const ytext = ydocRef.current.getText(key);
    ydocRef.current.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, newText);
    });
  }, [key]);

  return { text, setText: setTextContent };
}
