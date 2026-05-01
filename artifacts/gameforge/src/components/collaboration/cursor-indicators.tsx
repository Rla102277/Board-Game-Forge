import { useListPresence } from "@/hooks/use-collaboration";
import { PresenceAvatars } from "./presence-avatars";

interface CollaborationPresenceProps {
  projectId: number;
}

export function CollaborationPresence({ projectId }: CollaborationPresenceProps) {
  return <PresenceAvatars projectId={projectId} />;
}

interface ActiveUsersIndicatorProps {
  projectId?: number;
}

export function ActiveUsersIndicator({ projectId }: ActiveUsersIndicatorProps) {
  if (!projectId) return null;
  return <PresenceAvatars projectId={projectId} className="justify-end" />;
}

interface CursorIndicatorsProps {
  projectId: number;
}

const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function CursorIndicators({ projectId }: CursorIndicatorsProps) {
  const { data: users } = useListPresence(projectId);
  const activeUsers = (users ?? []).filter((u) => u.section !== null);

  if (activeUsers.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {activeUsers.map((user, idx) => {
        const color = COLORS[idx % COLORS.length];
        return (
          <div
            key={user.userId}
            className="absolute transition-all duration-300 ease-out"
            style={{ left: user.cursorX, top: user.cursorY }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-15deg)" }}>
              <path d="M5.5 3.21V20.8L11.25 14.25L17.5 16.5L5.5 3.21Z" fill={color} stroke="white" strokeWidth="1.5" />
            </svg>
            <span
              className="absolute left-4 top-4 text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              {user.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
