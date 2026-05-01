import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3 } from "lucide-react";

interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  action: "viewing" | "editing";
  timestamp: string;
}

import { usePresence } from "../../lib/collaboration";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

import { usePresence } from "../../lib/collaboration";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface ItemPresenceProps {
  itemType: string;
  itemId: string | number;
  users: PresenceUser[];
  className?: string;
}

export function ItemPresence({ itemType, itemId, users, className = "" }: ItemPresenceProps) {
  const connectedUsers = usePresence();

  const viewingUsers = connectedUsers.filter(
    (u) => u.projectId === Number(itemId) || u.workspaceId === Number(itemId)
  );

  if (viewingUsers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex -space-x-1.5">
        {viewingUsers.slice(0, 5).map((user) => (
          <TooltipProvider key={user.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-5 w-5 border-2 border-background">
                  <AvatarImage src={`/avatars/${user.userId}`} />
                  <AvatarFallback className="text-[8px]">
                    {user.userName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{user.userName || "Unknown"} is viewing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {viewingUsers.length > 5 && (
        <span className="text-[10px] text-muted-foreground">
          +{viewingUsers.length - 5}
        </span>
      )}
    </div>
  );
}

export function ItemPresence({ itemType, itemId, users, className = "" }: ItemPresenceProps) {
  const connectedUsers = usePresence();

  const viewingUsers = connectedUsers.filter(
    (u) => u.projectId === Number(itemId) || u.workspaceId === Number(itemId)
  );

  if (viewingUsers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex -space-x-1.5">
        {viewingUsers.slice(0, 5).map((user) => (
          <TooltipProvider key={user.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-5 w-5 border-2 border-background">
                  <AvatarImage src={`/avatars/${user.userId}`} />
                  <AvatarFallback className="text-[8px]">
                    {user.userName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{user.userName || "Unknown"} is viewing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {viewingUsers.length > 5 && (
        <span className="text-[10px] text-muted-foreground">
          +{viewingUsers.length - 5}
        </span>
      )}
    </div>
  );
}

export function ItemPresence({ itemType, itemId, users, className }: ItemPresenceProps) {
  if (users.length === 0) return null;

  const now = new Date();
  const recentUsers = users.filter(u => {
    const timestamp = new Date(u.timestamp);
    const diffMs = now.getTime() - timestamp.getTime();
    return diffMs < 60000; // Active within last minute
  });

  if (recentUsers.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 px-2 py-1 bg-primary/5 rounded-lg ${className}`}>
      {recentUsers.length === 1 ? (
        <>
          {recentUsers[0].action === "editing" ? (
            <Edit3 className="h-3 w-3 text-primary" />
          ) : (
            <Eye className="h-3 w-3 text-muted-foreground" />
          )}
          <Avatar className="h-5 w-5">
            {recentUsers[0].avatar && <AvatarImage src={recentUsers[0].avatar} alt="" />}
            <AvatarFallback className="text-[8px]">{recentUsers[0].name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {recentUsers[0].action === "editing" ? "editing" : "viewing"}
          </span>
        </>
      ) : (
        <>
          <Eye className="h-3 w-3 text-muted-foreground" />
          <div className="flex -space-x-2">
            {recentUsers.slice(0, 3).map((user) => (
              <Avatar key={user.id} className="h-5 w-5 border-2 border-background">
                {user.avatar && <AvatarImage src={user.avatar} alt="" />}
                <AvatarFallback className="text-[8px]">{user.name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {recentUsers.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium">
                +{recentUsers.length - 3}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {recentUsers.length} viewing
          </span>
        </>
      )}
    </div>
  );
}

interface ItemPresenceBadgeProps {
  users: PresenceUser[];
  showCount?: boolean;
}

export function ItemPresenceBadge({ users, showCount = true }: ItemPresenceBadgeProps) {
  const now = new Date();
  const recentUsers = users.filter(u => {
    const timestamp = new Date(u.timestamp);
    const diffMs = now.getTime() - timestamp.getTime();
    return diffMs < 60000;
  });

  if (recentUsers.length === 0) return null;

  const editingCount = recentUsers.filter(u => u.action === "editing").length;
  const viewingCount = recentUsers.length - editingCount;

  return (
    <Badge variant="secondary" className="gap-1">
      {editingCount > 0 && (
        <>
          <Edit3 className="h-3 w-3" />
          <span className="text-xs">{editingCount}</span>
        </>
      )}
      {viewingCount > 0 && editingCount > 0 && <span>·</span>}
      {viewingCount > 0 && (
        <>
          <Eye className="h-3 w-3" />
          <span className="text-xs">{viewingCount}</span>
        </>
      )}
      {showCount && <span className="text-xs text-muted-foreground">active</span>}
    </Badge>
  );
}
