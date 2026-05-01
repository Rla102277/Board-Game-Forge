import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye } from "lucide-react";

interface PresenceUser {
  userId: string;
  userName?: string;
}

interface ItemPresenceProps {
  itemType: string;
  itemId: string | number;
  users: PresenceUser[];
  className?: string;
}

export function ItemPresence({ users, className }: ItemPresenceProps) {
  if (users.length === 0) return null;
  return (
    <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground ${className ?? ""}`}>
      <Eye className="h-3 w-3" />
      <div className="flex -space-x-1.5">
        {users.slice(0, 3).map((u) => {
          const initial = (u.userName?.[0] ?? "?").toUpperCase();
          return (
            <Avatar key={u.userId} className="h-4 w-4 ring-1 ring-background">
              <AvatarFallback className="text-[7px] bg-green-500/20 text-green-500">{initial}</AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      <span>
        {users.length === 1
          ? `${users[0].userName ?? "Someone"} is viewing`
          : `${users.length} viewing`}
      </span>
    </div>
  );
}

interface ItemPresenceBadgeProps {
  users: PresenceUser[];
  showCount?: boolean;
}

export function ItemPresenceBadge({ users, showCount = true }: ItemPresenceBadgeProps) {
  if (users.length === 0) return null;
  return (
    <div className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-1.5 py-0.5">
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {showCount && <span>{users.length}</span>}
    </div>
  );
}
