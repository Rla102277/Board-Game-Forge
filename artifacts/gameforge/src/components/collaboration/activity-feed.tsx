import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Activity, MessageSquare, Edit, Trash2, CheckCircle, UserPlus } from "lucide-react";
import { collaborationApi, type ActivityFeedItem } from "@/lib/collaboration";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityFeedProps {
  projectId: number;
  limit?: number;
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
