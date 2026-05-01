import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useListPresence } from "@/hooks/use-collaboration";

interface PresenceAvatarsProps {
  projectId: number;
  className?: string;
}

export function PresenceAvatars({ projectId, className = "" }: PresenceAvatarsProps) {
  const { data: users } = useListPresence(projectId);
  const activeUsers = users ?? [];

  if (activeUsers.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-[10px] text-muted-foreground mr-1">
        {activeUsers.length} viewing
      </span>
      <div className="flex -space-x-2">
        {activeUsers.slice(0, 5).map((user) => {
          const initial = (user.userName[0] ?? "?").toUpperCase();
          return (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 ring-2 ring-background">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.userName} />}
                  <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{user.userName}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {user.section ?? "project"} — active now
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {activeUsers.length > 5 && (
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
            <span className="text-[9px] text-muted-foreground">
              +{activeUsers.length - 5}
            </span>
          </div>
        )}
      </div>
      <div className="ml-1.5 flex gap-0.5">
        {activeUsers.slice(0, 3).map((user) => (
          <span
            key={`dot-${user.userId}`}
            className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
