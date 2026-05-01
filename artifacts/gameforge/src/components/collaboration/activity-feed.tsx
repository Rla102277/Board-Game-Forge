import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, MessageSquare, ArrowRight, Plus, Trash2, Pencil, UserPlus, GitCommit } from "lucide-react";
import { useListActivity } from "@/hooks/use-collaboration";
import { formatDistanceToNow } from "date-fns";
import type { ActivityLogEntry, ActivityAction } from "@/lib/collaboration-types";

interface ActivityFeedProps {
  projectId: number;
  limit?: number;
}

const ACTION_CONFIG: Record<ActivityAction, { icon: typeof Plus; label: string; color: string }> = {
  created: { icon: Plus, label: "created", color: "text-green-400 bg-green-500/10" },
  updated: { icon: Pencil, label: "updated", color: "text-blue-400 bg-blue-500/10" },
  deleted: { icon: Trash2, label: "deleted", color: "text-red-400 bg-red-500/10" },
  commented: { icon: MessageSquare, label: "commented on", color: "text-purple-400 bg-purple-500/10" },
  assigned: { icon: UserPlus, label: "assigned", color: "text-amber-400 bg-amber-500/10" },
  moved: { icon: ArrowRight, label: "moved", color: "text-cyan-400 bg-cyan-500/10" },
  joined: { icon: UserPlus, label: "joined", color: "text-green-400 bg-green-500/10" },
  shared: { icon: GitCommit, label: "shared", color: "text-indigo-400 bg-indigo-500/10" },
};

export function ActivityFeed({ projectId, limit = 50 }: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityAction | "all">("all");
  const { data: activity, isLoading } = useListActivity(projectId, limit);

  const filtered = filter === "all" ? activity : activity?.filter((a) => a.action === filter);
  const actions = Array.from(new Set(activity?.map((a) => a.action) ?? []));

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-4 w-4" /> Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 gap-3">
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {actions.map((a) => {
              const cfg = ACTION_CONFIG[a];
              return (
                <button
                  key={a}
                  onClick={() => setFilter(a)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                    filter === a ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <cfg.icon className="h-3 w-3" /> {cfg.label}
                </button>
              );
            })}
          </div>
        )}
        <ScrollArea className="flex-1 -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No activity yet.
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {filtered.map((entry) => (
                <ActivityItem key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ entry }: { entry: ActivityLogEntry }) {
  const cfg = ACTION_CONFIG[entry.action];
  const Icon = cfg.icon;
  const display = [entry.user.firstName, entry.user.lastName].filter(Boolean).join(" ") || entry.user.email || "User";
  const initial = (display[0] ?? "?").toUpperCase();

  return (
    <div className="flex gap-3 items-start">
      <Avatar className="h-8 w-8">
        {entry.user.imageUrl && <AvatarImage src={entry.user.imageUrl} alt="" />}
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{display}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
          <span className="text-sm truncate">{entry.entityTitle ?? entry.entityType}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
