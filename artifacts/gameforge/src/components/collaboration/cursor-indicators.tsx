import { useEffect, useRef } from "react";
import { useCollaboration } from "@/hooks/use-collaboration";
import type { PresenceUser } from "@/lib/collaboration";

interface CursorIndicatorProps {
  user: PresenceUser;
}

function CursorIndicator({ user }: CursorIndicatorProps) {
  if (!user.cursor || !user.cursor.visible) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 transition-all duration-100 ease-out"
      style={{
        left: user.cursor.x,
        top: user.cursor.y,
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ color: user.color }}
      >
        <path
          d="M5.5 3.5L19 12L12 13L9 20L5.5 3.5Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* User name label */}
      <div
        className="ml-4 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: user.color }}
      >
        {user.firstName || user.lastName || "User"}
      </div>
    </div>
  );
}

interface SelectionIndicatorProps {
  user: PresenceUser;
}

function SelectionIndicator({ user }: SelectionIndicatorProps) {
  if (!user.selection) return null;

  return (
    <div
      className="fixed pointer-events-none z-40 transition-all duration-200 ease-out"
      style={{
        border: `2px solid ${user.color}`,
        backgroundColor: `${user.color}20`,
        borderRadius: "4px",
      }}
    >
      {/* Selection highlight would be positioned based on selected element */}
      <div className="px-2 py-1 text-xs font-medium" style={{ color: user.color }}>
        {user.firstName || user.lastName} is viewing
      </div>
    </div>
  );
}

interface ActiveUsersIndicatorProps {
  users: PresenceUser[];
}

export function ActiveUsersIndicator({ users }: ActiveUsersIndicatorProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.slice(0, 4).map((user) => (
          <div
            key={user.userId}
            className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: user.color }}
            title={`${user.firstName} ${user.lastName}`}
          >
            {user.firstName?.[0] || user.lastName?.[0] || "?"}
          </div>
        ))}
        {users.length > 4 && (
          <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
            +{users.length - 4}
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {users.length} {users.length === 1 ? "person" : "people"} viewing
      </span>
    </div>
  );
}

interface CursorIndicatorsProps {
  projectId: number;
}

export function CursorIndicators({ projectId }: CursorIndicatorsProps) {
  const { connectedUsers, updateCursor, hideCursor } = useCollaboration(projectId);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateCursor(e.clientX, e.clientY, true);
    };

    const handleMouseLeave = () => {
      hideCursor();
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [updateCursor, hideCursor]);

  return (
    <>
      {/* Other users' cursors */}
      {connectedUsers.map((user) => (
        <CursorIndicator key={user.userId} user={user} />
      ))}
      
      {/* Other users' selections */}
      {connectedUsers.map((user) => (
        <SelectionIndicator key={`selection-${user.userId}`} user={user} />
      ))}
    </>
  );
}

interface CollaborationPresenceProps {
  projectId: number;
}

export function CollaborationPresence({ projectId }: CollaborationPresenceProps) {
  const { connectedUsers, isOnline } = useCollaboration(projectId);

  return (
    <div className="flex items-center gap-3">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
        <span className="text-sm text-muted-foreground">
          {isOnline ? "Connected" : "Offline"}
        </span>
      </div>

      {/* Active users */}
      <ActiveUsersIndicator users={connectedUsers} />
    </div>
  );
}
