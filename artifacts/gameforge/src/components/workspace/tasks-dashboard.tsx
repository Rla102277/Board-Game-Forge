import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Users } from "lucide-react";
import { format, isAfter, subDays } from "date-fns";
import {
  MONDAY_STATUS_LABEL,
  MONDAY_STATUS_HEX,
  MONDAY_STATUS_ORDER,
  StatusPill,
} from "./status-pill";
import type {
  RichTask,
  CollaboratorUser,
  TaskStatus,
} from "@/lib/collaboration-types";

interface TasksDashboardProps {
  tasks: RichTask[];
  users: CollaboratorUser[];
  onSelectTask?: (task: RichTask) => void;
}

export function TasksDashboard({
  tasks,
  users,
  onSelectTask,
}: TasksDashboardProps) {
  const statusBreakdown = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      backlog: 0,
      in_progress: 0,
      review: 0,
      blocked: 0,
      done: 0,
    };
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    });
    return MONDAY_STATUS_ORDER.map((s) => ({
      name: MONDAY_STATUS_LABEL[s],
      value: counts[s],
      status: s,
    }));
  }, [tasks]);

  const overdue = useMemo(() => {
    const now = new Date();
    return tasks
      .filter(
        (t) =>
          t.dueDate && new Date(t.dueDate) < now && t.status !== "done",
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      );
  }, [tasks]);

  const workload = useMemo(() => {
    const map = new Map<number, { user: CollaboratorUser; active: number; done: number }>();
    tasks.forEach((t) => {
      t.assigneeIds.forEach((uid) => {
        const u = users.find((x) => x.id === uid);
        if (!u) return;
        const cur = map.get(uid) ?? { user: u, active: 0, done: 0 };
        if (t.status === "done") cur.done += 1;
        else cur.active += 1;
        map.set(uid, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.active - a.active);
  }, [tasks, users]);

  const throughput = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);
    const thisWeek = tasks.filter(
      (t) => t.status === "done" && isAfter(new Date(t.updatedAt), oneWeekAgo),
    ).length;
    const lastWeek = tasks.filter(
      (t) =>
        t.status === "done" &&
        isAfter(new Date(t.updatedAt), twoWeeksAgo) &&
        !isAfter(new Date(t.updatedAt), oneWeekAgo),
    ).length;
    const delta = thisWeek - lastWeek;
    return { thisWeek, lastWeek, delta };
  }, [tasks]);

  const totals = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Status breakdown */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {statusBreakdown.map((d) => (
                    <Cell
                      key={d.status}
                      fill={MONDAY_STATUS_HEX[d.status]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10 }}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">
            <span className="text-2xl font-bold text-foreground">{totals.pct}%</span>{" "}
            done · {totals.done}/{totals.total}
          </div>
        </CardContent>
      </Card>

      {/* Workload */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Who's working on what
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workload.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              No assignees yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {workload.slice(0, 6).map(({ user, active, done }) => {
                const name =
                  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  user.email ||
                  `User ${user.id}`;
                const initial = (name[0] ?? "?").toUpperCase();
                return (
                  <li key={user.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {user.imageUrl && <AvatarImage src={user.imageUrl} alt="" />}
                      <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {active} active · {done} done
                      </div>
                    </div>
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, (active / Math.max(1, active + done)) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Throughput */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Weekly throughput</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-3xl font-bold">{throughput.thisWeek}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                done this week
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              vs <span className="text-foreground">{throughput.lastWeek}</span> last
              week
            </div>
          </div>
          <div
            className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
              throughput.delta > 0
                ? "text-emerald-400"
                : throughput.delta < 0
                  ? "text-red-400"
                  : "text-muted-foreground"
            }`}
          >
            {throughput.delta > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : throughput.delta < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : null}
            {throughput.delta > 0 ? "+" : ""}
            {throughput.delta} from last week
          </div>
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-400" /> Overdue
            <span className="ml-1 text-xs text-muted-foreground">
              ({overdue.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 text-center">
              Nothing overdue. Nice work.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {overdue.slice(0, 5).map((t) => (
                <li
                  key={t.id}
                  className="py-2 flex items-center gap-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                  onClick={() => onSelectTask?.(t)}
                >
                  <StatusPill status={t.status} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                  </div>
                  <div className="text-xs text-red-400 whitespace-nowrap">
                    Due {format(new Date(t.dueDate!), "MMM d")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
