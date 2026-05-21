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
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface OrganizationDashboardProps {
  workspaceId?: number; // If provided, shows workspace-scoped data. If not, platform-wide.
  workspaceName?: string;
}

// Mock data generators - in production these would be API calls
const getMockStats = (isWorkspace: boolean) => ({
  totalUsers: isWorkspace ? 12 : 147,
  activeUsers: isWorkspace ? 8 : 89,
  newUsersThisWeek: isWorkspace ? 2 : 12,
  totalWorkspaces: isWorkspace ? 24 : 312,
  activeWorkspaces: isWorkspace ? 18 : 156,
  completedWorkspaces: isWorkspace ? 4 : 43,
  totalStudios: isWorkspace ? 1 : 28,
  avgWorkspaceCompletion: isWorkspace ? 42 : 34,
});

const MOCK_DAILY_ACTIVITY = Array.from({ length: 30 }, (_, i) => ({
  date: format(subDays(new Date(), 29 - i), "MMM dd"),
  logins: Math.floor(Math.random() * 50) + 20,
  workspacesCreated: Math.floor(Math.random() * 10) + 1,
  comments: Math.floor(Math.random() * 30) + 5,
  exports: Math.floor(Math.random() * 15),
}));

const MOCK_PROJECT_HEALTH = [
  { name: "On Track", value: 89, color: "#22c55e" },
  { name: "At Risk", value: 45, color: "#f59e0b" },
  { name: "Stalled", value: 22, color: "#ef4444" },
];

const MOCK_STAGE_DISTRIBUTION = [
  { stage: "Stage 1\nConcept", workspaces: 45, color: "#3b82f6" },
  { stage: "Stage 2\nPrototype", workspaces: 67, color: "#8b5cf6" },
  { stage: "Stage 3\nRules", workspaces: 34, color: "#ec4899" },
  { stage: "Stage 4\nSimulate", workspaces: 28, color: "#f97316" },
  { stage: "Stage 5\nPlaytest", workspaces: 19, color: "#14b8a6" },
  { stage: "Stage 6\nPublish", workspaces: 12, color: "#6366f1" },
];

const MOCK_SECURITY_EVENTS = [
  { id: 1, timestamp: new Date().toISOString(), severity: "warning", action: "Failed login", user: "user@example.com", ip: "192.168.1.100", details: "3 failed attempts" },
  { id: 2, timestamp: subDays(new Date(), 1).toISOString(), severity: "info", action: "API key generated", user: "admin@boardlab.games", ip: "10.0.0.5", details: "New export API key" },
  { id: 3, timestamp: subDays(new Date(), 2).toISOString(), severity: "error", action: "Permission denied", user: "viewer@example.com", ip: "172.16.0.50", details: "Attempted admin action" },
];

const MOCK_USER_ACTIVITY = [
  { id: 1, name: "Alice Chen", email: "alice@boardlab.games", role: "Admin", lastActive: new Date().toISOString(), workspaces: 12, actions: 234 },
  { id: 2, name: "Bob Smith", email: "bob@designer.com", role: "Editor", lastActive: subDays(new Date(), 1).toISOString(), workspaces: 8, actions: 156 },
  { id: 3, name: "Carol Jones", email: "carol@tester.com", role: "Viewer", lastActive: subDays(new Date(), 3).toISOString(), workspaces: 3, actions: 45 },
  { id: 4, name: "David Wilson", email: "david@publisher.com", role: "Commenter", lastActive: subDays(new Date(), 5).toISOString(), workspaces: 5, actions: 89 },
];

export function OrganizationDashboard({ workspaceId, workspaceName }: OrganizationDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isWorkspace = !!workspaceId;
  const stats = getMockStats(isWorkspace);
  const title = isWorkspace ? (workspaceName || "Workspace") : "Organization";
  const icon = isWorkspace ? Building2 : Globe;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: "Data refreshed" });
    }, 1000);
  };

  const handleExport = () => {
    toast({ title: "Exporting report..." });
    // Would trigger CSV/Excel download
  };

  const filteredUsers = useMemo(() => {
    // In production, filter by workspaceId if provided
    if (!searchQuery) return MOCK_USER_ACTIVITY;
    return MOCK_USER_ACTIVITY.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, workspaceId]);

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
          title="Active Workspaces" 
          value={stats.activeWorkspaces}
          change={`${stats.totalWorkspaces} total`}
          icon={FolderKanban}
          trend="neutral"
        />
        <MetricCard 
          title="Avg Completion" 
          value={`${stats.avgWorkspaceCompletion}%`}
          change="Across all stages"
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard 
          title={isWorkspace ? "Studio" : "Studios"}
          value={isWorkspace ? (workspaceName || "Active") : stats.totalStudios}
          change={isWorkspace ? "Current studio" : "Active teams"}
          icon={isWorkspace ? Building2 : Globe}
          trend="neutral"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
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
                <LineChart data={MOCK_DAILY_ACTIVITY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Line type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="workspacesCreated" stroke="#22c55e" strokeWidth={2} dot={false} />
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
                      data={MOCK_PROJECT_HEALTH}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {MOCK_PROJECT_HEALTH.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {MOCK_PROJECT_HEALTH.map(h => (
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
                  Workspaces by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MOCK_STAGE_DISTRIBUTION}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="stage" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                      cursor={{ fill: "#334155", opacity: 0.3 }}
                    />
                    <Bar dataKey="workspaces" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-medium text-sm">
                        {user.name.split(" ").map(n => n[0]).join("")}
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
                        <div>{user.workspaces} workspaces • {user.actions} actions</div>
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
                  {MOCK_SECURITY_EVENTS.map(event => (
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

        <TabsContent value="workspaces" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace Analytics</CardTitle>
              <CardDescription>Detailed project metrics and health scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">312</div>
                  <div className="text-xs text-muted-foreground">Total Workspaces</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">43</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500">156</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-500">1,247</div>
                  <div className="text-xs text-muted-foreground">Total Entities</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Average Time in Stage</h4>
                <div className="space-y-2">
                  {MOCK_STAGE_DISTRIBUTION.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-muted-foreground">{stage.stage.replace("\n", " ")}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${Math.min(100, stage.workspaces * 1.5)}%`,
                            backgroundColor: stage.color 
                          }} 
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{stage.workspaces}</div>
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
