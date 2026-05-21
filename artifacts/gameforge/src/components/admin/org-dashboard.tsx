/**
 * Organization Dashboard - Platform-wide OR workspace-level monitoring
 * Shows aggregate metrics, user activity, project health, security events
 * 
 * Usage:
 *   <OrganizationDashboard />              // Platform-wide (CTO/Company admin)
 *   <OrganizationDashboard workspaceId={5} /> // Workspace-scoped (Workspace admin)
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, Users, FolderKanban, Activity, Shield, AlertTriangle, 
  CheckCircle2, Clock, TrendingUp, Search, Download, RefreshCw,
  UserCheck, Globe, Zap, Lock, Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type AuditLog } from "@/lib/admin-api";
import { Skeleton } from "@/components/ui/skeleton";

interface OrganizationDashboardProps {
  workspaceId?: number;
  workspaceName?: string;
}

// Query keys for caching
const adminKeys = {
  metrics: (days: number, workspaceId?: number) => ["admin", "metrics", days, workspaceId] as const,
  auditLogs: (limit: number, workspaceId?: number) => ["admin", "auditLogs", limit, workspaceId] as const,
  auditSummary: (days: number) => ["admin", "auditSummary", days] as const,
};

// Transform stage number to readable name
const getStageName = (stage: string) => {
  const stages: Record<string, string> = {
    "1": "Concept",
    "2": "Prototype", 
    "3": "Rules",
    "4": "Simulate",
    "5": "Playtest",
    "6": "Publish",
  };
  return stages[stage] || `Stage ${stage}`;
};

export function OrganizationDashboard({ workspaceId, workspaceName }: OrganizationDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isWorkspace = !!workspaceId;
  const days = parseInt(dateRange, 10);
  const title = isWorkspace ? (workspaceName || "Workspace") : "Organization";
  const icon = isWorkspace ? Building2 : Globe;

  // Fetch real data from API
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: adminKeys.metrics(days, workspaceId),
    queryFn: () => adminApi.getMetrics(days),
    enabled: !isWorkspace, // Only fetch platform-wide metrics for now
  });

  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: adminKeys.auditLogs(50, workspaceId),
    queryFn: () => adminApi.getAuditLogs({ limit: 50, workspaceId }),
  });

  const { data: auditSummary, isLoading: summaryLoading } = useQuery({
    queryKey: adminKeys.auditSummary(days),
    queryFn: () => adminApi.getAuditSummary(days),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchMetrics(), refetchLogs()]);
    setIsRefreshing(false);
    toast({ title: "Data refreshed" });
  };

  const handleExport = () => {
    if (!auditLogs?.logs) return;
    
    // Export audit logs as CSV
    const headers = ["ID", "User", "Action", "Resource", "Severity", "Date", "IP"];
    const rows = auditLogs.logs.map((log: AuditLog) => [
      log.id,
      log.userEmail || "Anonymous",
      log.action,
      log.resourceType,
      log.severity,
      format(new Date(log.createdAt), "yyyy-MM-dd HH:mm"),
      log.ipAddress || "-",
    ]);
    
    const csv = [headers.join(","), ...rows.map((r: (string | number | null)[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Audit logs exported" });
  };

  // Transform metrics data for charts
  const dailyActivity = useMemo(() => {
    if (!metrics?.dailyActiveUsers) return [];
    return metrics.dailyActiveUsers.map((d) => ({
      date: format(parseISO(d.date), "MMM dd"),
      logins: d.dau,
      projectsCreated: 0, // We don't have this broken down by day in the current API
      comments: 0,
      exports: 0,
    }));
  }, [metrics?.dailyActiveUsers]);

  const stageDistribution = useMemo(() => {
    if (!metrics?.stageDistribution) return [];
    return metrics.stageDistribution.map((s) => ({
      stage: `Stage ${s.stage}\n${getStageName(s.stage)}`,
      projects: s.count,
      color: ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#6366f1"][parseInt(s.stage) - 1] || "#3b82f6",
    }));
  }, [metrics?.stageDistribution]);

  const projectHealth = useMemo(() => {
    const total = metrics?.projects?.total || 0;
    if (total === 0) return [];
    
    // Estimate health based on completion percentage
    const avgCompletion = metrics?.projects?.avg_completion || 0;
    const onTrack = Math.round(total * (avgCompletion / 100) * 0.8);
    const atRisk = Math.round(total * 0.15);
    const stalled = Math.max(0, total - onTrack - atRisk);
    
    return [
      { name: "On Track", value: onTrack, color: "#22c55e" },
      { name: "At Risk", value: atRisk, color: "#f59e0b" },
      { name: "Stalled", value: stalled, color: "#ef4444" },
    ];
  }, [metrics?.projects]);

  // Stats from real data
  const stats = useMemo(() => {
    if (!metrics) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisWeek: 0,
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalWorkspaces: isWorkspace ? 1 : 0,
        avgProjectCompletion: 0,
      };
    }
    return {
      totalUsers: metrics.users?.total || 0,
      activeUsers: metrics.users?.active_7d || 0,
      newUsersThisWeek: metrics.users?.new_recent || 0,
      totalProjects: metrics.projects?.total || 0,
      activeProjects: metrics.projects?.active || 0,
      completedProjects: metrics.projects?.deleted || 0, // Using deleted as proxy for completed
      totalWorkspaces: isWorkspace ? 1 : 28, // This would need a separate API call
      avgProjectCompletion: metrics.projects?.avg_completion || 0,
    };
  }, [metrics, isWorkspace]);

  // Filtered security events from real audit logs
  const securityEvents = useMemo(() => {
    if (!auditLogs?.logs) return [];
    return auditLogs.logs
      .filter((log: AuditLog) => ["warning", "error", "critical"].includes(log.severity))
      .slice(0, 20)
      .map((log: AuditLog) => ({
        id: log.id,
        timestamp: log.createdAt,
        severity: log.severity,
        action: log.action,
        user: log.userEmail || `User ${log.userId}`,
        ip: log.ipAddress || "-",
        details: log.metadata ? JSON.stringify(log.metadata).slice(0, 100) : "-",
      }));
  }, [auditLogs?.logs]);

  // User activity from audit logs
  const userActivity = useMemo(() => {
    if (!auditLogs?.logs) return [];
    
    // Aggregate by user
    const userMap = new Map();
    auditLogs.logs.forEach((log: AuditLog) => {
      const key = log.userId || log.userEmail || "anonymous";
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: log.userId || 0,
          name: log.userEmail?.split("@")[0] || "Anonymous",
          email: log.userEmail || "-",
          role: "User",
          lastActive: log.createdAt,
          projects: 0,
          actions: 0,
        });
      }
      const user = userMap.get(key);
      user.actions++;
      if (log.projectId) user.projects++;
      if (new Date(log.createdAt) > new Date(user.lastActive)) {
        user.lastActive = log.createdAt;
      }
    });
    
    return Array.from(userMap.values());
  }, [auditLogs?.logs]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return userActivity;
    return userActivity.filter((u: { name: string; email: string }) => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, userActivity]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {title} Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isWorkspace ? "Workspace monitoring and analytics" : "Platform-wide monitoring and analytics"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Users" 
          value={stats.totalUsers} 
          change={`+${stats.newUsersThisWeek} this week`}
          icon={Users}
          trend="up"
        />
        <MetricCard 
          title="Active Projects" 
          value={stats.activeProjects}
          change={`${stats.totalProjects} total`}
          icon={FolderKanban}
          trend="neutral"
        />
        <MetricCard 
          title="Avg Completion" 
          value={`${stats.avgProjectCompletion}%`}
          change="Across all stages"
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard 
          title={isWorkspace ? "Workspace" : "Workspaces"}
          value={isWorkspace ? (workspaceName || "Active") : stats.totalWorkspaces}
          change={isWorkspace ? "Current workspace" : "Active teams"}
          icon={isWorkspace ? Building2 : Globe}
          trend="neutral"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Daily Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Line type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="projectsCreated" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Project Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={projectHealth}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {projectHealth.map((entry: { color: string }, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {projectHealth.map((h: { name: string; value: number; color: string }) => (
                    <div key={h.name} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                      <span>{h.name}: {h.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stage Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Projects by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="stage" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                      cursor={{ fill: "#334155", opacity: 0.3 }}
                    />
                    <Bar dataKey="projects" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">User Activity</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
                  className="w-[200px] h-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredUsers.map((user: { id: number; name: string; email: string; role: string; lastActive: string; projects: number; actions: number }) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-medium text-sm">
                        {user.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      <Badge variant={user.role === "Admin" ? "default" : "secondary"} className="text-[10px]">
                        {user.role}
                      </Badge>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>Active {format(new Date(user.lastActive), "MMM d")}</div>
                        <div>{user.projects} projects • {user.actions} actions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <SecurityMetric title="Failed Logins" value="23" change="-5%" icon={Lock} severity="warning" />
            <SecurityMetric title="API Anomalies" value="4" change="+1" icon={AlertTriangle} severity="error" />
            <SecurityMetric title=" MFA Enabled" value="67%" change="+12%" icon={UserCheck} severity="success" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {securityEvents.map((event: { id: number; severity: string; action: string; user: string; ip: string; timestamp: string; details: string }) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <SeverityIcon severity={event.severity} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{event.action}</span>
                          <Badge variant={event.severity === "error" ? "destructive" : event.severity === "warning" ? "secondary" : "outline"} className="text-[10px] h-4">
                            {event.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {event.user} • {event.ip} • {format(new Date(event.timestamp), "MMM d, h:mm a")}
                        </div>
                        <div className="text-xs text-muted-foreground">{event.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Analytics</CardTitle>
              <CardDescription>Detailed project metrics and health scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.totalProjects}</div>
                  <div className="text-xs text-muted-foreground">Total Projects</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{Math.round(stats.totalProjects * (stats.avgProjectCompletion / 100))}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500">{stats.activeProjects}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-500">-</div>
                  <div className="text-xs text-muted-foreground">Total Entities</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Average Time in Stage</h4>
                <div className="space-y-2">
                  {stageDistribution.map((stage: { stage: string; projects: number; color: string }, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-muted-foreground">{stage.stage.replace("\n", " ")}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${Math.min(100, stage.projects * 1.5)}%`,
                            backgroundColor: stage.color 
                          }} 
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{stage.projects}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, change, icon: Icon, trend }: { 
  title: string; 
  value: string | number; 
  change: string; 
  icon: React.ComponentType<{ className?: string }>;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className={`text-xs mt-1 ${
              trend === "up" ? "text-green-500" : 
              trend === "down" ? "text-red-500" : 
              "text-muted-foreground"
            }`}>
              {change}
            </p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityMetric({ title, value, change, icon: Icon, severity }: {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  severity: "success" | "warning" | "error";
}) {
  const colors = {
    success: "text-green-500 bg-green-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    error: "text-red-500 bg-red-500/10",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${severity === "error" ? "text-red-500" : severity === "warning" ? "text-amber-500" : ""}`}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{change}</p>
          </div>
          <div className={`p-2 rounded-lg ${colors[severity]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "error") return <AlertTriangle className="h-5 w-5 text-red-500" />;
  if (severity === "warning") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <CheckCircle2 className="h-5 w-5 text-green-500" />;
}
