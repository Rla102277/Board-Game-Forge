import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Activity,
  CalendarDays,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  useListRichTasks,
  useListActivity,
  useListPresence,
  useListProjectUsers,
} from "@/hooks/use-collaboration";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS } from "@/lib/collaboration-types";
import { formatDistanceToNow, format, isPast, isToday, addDays } from "date-fns";

interface CollaborationDashboardProps {
  projectId: number;
}

export function CollaborationDashboard({ projectId }: CollaborationDashboardProps) {
  const { data: tasks, isLoading: tasksLoading } = useListRichTasks(projectId);
  const { data: activity, isLoading: activityLoading } = useListActivity(projectId, 10);
  const { data: presence } = useListPresence(projectId);
  const { data: users } = useListProjectUsers(projectId);

  const stats = useMemo(() => {
    if (!tasks) return null;
    const byStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = tasks.filter((t) => t.dueDate && t.status !== "done" && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;
    const dueSoon = tasks.filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      const d = new Date(t.dueDate);
      return !isPast(d) || isToday(d);
    }).length;

    return { byStatus, overdue, dueSoon, total: tasks.length };
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => t.dueDate && t.status !== "done")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [tasks]);

  if (tasksLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" /> Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded bg-muted/40">
                  <div className="text-lg font-bold">{stats.total}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
                </div>
                <div className="text-center p-2 rounded bg-red-500/10">
                  <div className="text-lg font-bold text-red-400">{stats.overdue}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</div>
                </div>
                <div className="text-center p-2 rounded bg-amber-500/10">
                  <div className="text-lg font-bold text-amber-400">{stats.dueSoon}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Due soon</div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <Badge key={status} variant="outline" className={`text-[10px] ${STATUS_COLORS[status as import("@/lib/collaboration-types").TaskStatus] ?? ""}`}>
                    {STATUS_LABELS[status as import("@/lib/collaboration-types").TaskStatus] ?? status} {count}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming deadlines */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingTasks.map((task) => {
              const due = new Date(task.dueDate!);
              const isOverdue = isPast(due) && !isToday(due);
              return (
                <div key={task.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? "bg-red-400" : "bg-primary"}`} />
                    <span className="truncate">{task.title}</span>
                  </div>
                  <span className={`text-[10px] shrink-0 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                    {isToday(due) ? "Today" : formatDistanceToNow(due, { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading || !activity || activity.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">No recent activity</div>
          ) : (
            <ScrollArea className="h-48 -mx-2 px-2">
              <div className="space-y-2">
                {activity.slice(0, 8).map((entry) => {
                  const display = [entry.user.firstName, entry.user.lastName].filter(Boolean).join(" ") || entry.user.email || "User";
                  return (
                    <div key={entry.id} className="flex items-start gap-2 text-xs">
                      <Avatar className="h-5 w-5 shrink-0">
                        {entry.user.imageUrl && <AvatarImage src={entry.user.imageUrl} alt="" />}
                        <AvatarFallback className="text-[8px]">{(display[0] ?? "?").toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{display}</span>{" "}
                        <span className="text-muted-foreground">{entry.action} {entry.entityTitle ?? entry.entityType}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Active members */}
      {presence && presence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Active Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex -space-x-2 overflow-hidden">
              {presence.map((user) => {
                const initial = (user.userName[0] ?? "?").toUpperCase();
                return (
                  <Avatar key={user.userId} className="h-7 w-7 ring-2 ring-background">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.userName} />}
                    <AvatarFallback className="text-[9px] bg-green-500/20 text-green-500">{initial}</AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
