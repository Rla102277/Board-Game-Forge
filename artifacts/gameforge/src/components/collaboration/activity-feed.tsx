import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Activity, MessageSquare, Edit, Trash2, CheckCircle, UserPlus } from "lucide-react";
import { collaborationApi, type ActivityFeedItem } from "@/lib/collaboration";
import { Skeleton } from "@/components/ui/skeleton";

import { useEffect, useState } from "react";
import { useActivityFeed, ActivityEvent } from "../../lib/collaboration";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { formatDistanceToNow } from "date-fns";

import { useEffect, useState } from "react";
import { useActivityFeed, ActivityEvent } from "../../lib/collaboration";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  projectId: number;
  limit?: number;
}

const activityIcons: Record<string, string> = {
  create: "➕",
  update: "✏️",
  delete: "🗑️",
  comment: "💬",
  mention: "@",
  share: "🔗",
  version: "📝",
  restore: "↩️",
};

export function ActivityFeed({ projectId, limit = 20 }: ActivityFeedProps) {
  const activities = useActivityFeed(projectId);
  const [displayActivities, setDisplayActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    setDisplayActivities(activities.slice(0, limit));
  }, [activities, limit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Feed</h3>
        <Badge variant="secondary" className="text-xs">
          {activities.length} events
        </Badge>
      </div>
      <ScrollArea className="h-[400px] pr-4">
        {displayActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm">Changes will appear here as they happen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`/avatars/${activity.userId}`} />
                  <AvatarFallback>
                    {activity.userName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {activity.userName || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activityIcons[activity.action] || "•"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.action === "create" && `Created ${activity.target || "an item"}`}
                    {activity.action === "update" && `Updated ${activity.target || "an item"}`}
                    {activity.action === "delete" && `Deleted ${activity.target || "an item"}`}
                    {activity.action === "comment" && `Commented on ${activity.target || "an item"}`}
                    {activity.action === "mention" && `Mentioned you in ${activity.target || "a comment"}`}
                    {activity.action === "share" && `Shared ${activity.target || "a project"}`}
                    {activity.action === "version" && `Created version ${activity.target || ""}`}
                    {activity.action === "restore" && `Restored version ${activity.target || ""}`}
                    {!["create", "update", "delete", "comment", "mention", "share", "version", "restore"].includes(activity.action) &&
                      `${activity.action} ${activity.target || ""}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

const activityIcons: Record<string, string> = {
  create: "➕",
  update: "✏️",
  delete: "🗑️",
  comment: "💬",
  mention: "@",
  share: "🔗",
  version: "📝",
  restore: "↩️",
};

export function ActivityFeed({ projectId, limit = 20 }: ActivityFeedProps) {
  const activities = useActivityFeed(projectId);
  const [displayActivities, setDisplayActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    setDisplayActivities(activities.slice(0, limit));
  }, [activities, limit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Feed</h3>
        <Badge variant="secondary" className="text-xs">
          {activities.length} events
        </Badge>
      </div>
      <ScrollArea className="h-[400px] pr-4">
        {displayActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm">Changes will appear here as they happen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`/avatars/${activity.userId}`} />
                  <AvatarFallback>
                    {activity.userName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {activity.userName || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activityIcons[activity.action] || "•"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.action === "create" && `Created ${activity.target || "an item"}`}
                    {activity.action === "update" && `Updated ${activity.target || "an item"}`}
                    {activity.action === "delete" && `Deleted ${activity.target || "an item"}`}
                    {activity.action === "comment" && `Commented on ${activity.target || "an item"}`}
                    {activity.action === "mention" && `Mentioned you in ${activity.target || "a comment"}`}
                    {activity.action === "share" && `Shared ${activity.target || "a project"}`}
                    {activity.action === "version" && `Created version ${activity.target || ""}`}
                    {activity.action === "restore" && `Restored version ${activity.target || ""}`}
                    {!["create", "update", "delete", "comment", "mention", "share", "version", "restore"].includes(activity.action) &&
                      `${activity.action} ${activity.target || ""}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  created: Edit,
  updated: Edit,
  deleted: Trash2,
  commented: MessageSquare,
  resolved: CheckCircle,
  mentioned: UserPlus,
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-500/10 text-green-500",
  updated: "bg-blue-500/10 text-blue-500",
  deleted: "bg-red-500/10 text-red-500",
  commented: "bg-purple-500/10 text-purple-500",
  resolved: "bg-emerald-500/10 text-emerald-500",
  mentioned: "bg-orange-500/10 text-orange-500",
};

export function ActivityFeed({ projectId, limit = 10 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        const data = await collaborationApi.getActivityFeed(projectId, limit);
        setActivities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    };

    loadActivities();

    // Poll for new activities every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [projectId, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-4 w-4" /> Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = ACTION_ICONS[activity.action] || Activity;
            const colorClass = ACTION_COLORS[activity.action] || "bg-gray-500/10 text-gray-500";
            
            return (
              <div key={activity.id} className="flex items-start gap-3 group hover:bg-muted/30 p-2 rounded-lg transition-colors">
                <Avatar className="h-8 w-8">
                  {activity.user.imageUrl && <AvatarImage src={activity.user.imageUrl} alt="" />}
                  <AvatarFallback className="text-xs">
                    {activity.user.firstName?.[0] || activity.user.lastName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {activity.user.firstName || activity.user.lastName || "User"}{" "}
                      {activity.user.lastName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {activity.action}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`inline-flex p-1.5 rounded-md ${colorClass}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
