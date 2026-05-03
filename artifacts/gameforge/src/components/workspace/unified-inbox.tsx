import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare, AtSign, UserCheck, AlertTriangle, GitCommit,
  UserPlus, Circle, CheckCheck, Trash2, Bell, Activity,
  Search, Filter, Inbox, FolderOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useListNotifications, useListActivity,
  useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification,
} from "@/hooks/use-collaboration";
import type { NotificationItem, ActivityLogEntry, CollaboratorUser } from "@/lib/collaboration-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userInitials(u: CollaboratorUser): string {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  if (u.firstName) return u.firstName[0].toUpperCase();
  return (u.email?.[0] ?? "?").toUpperCase();
}

function userName(u: CollaboratorUser): string {
  if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(" ");
  return u.email ?? "Unknown";
}

type TabId = "all" | "mentions" | "comments" | "assignments" | "activity";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "all",         label: "All",         icon: <Inbox className="h-3.5 w-3.5" /> },
  { id: "mentions",    label: "Mentions",    icon: <AtSign className="h-3.5 w-3.5" /> },
  { id: "comments",    label: "Comments",    icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: "assignments", label: "Assignments", icon: <UserCheck className="h-3.5 w-3.5" /> },
  { id: "activity",    label: "Activity",    icon: <Activity className="h-3.5 w-3.5" /> },
];

const NOTIF_META: Record<NotificationItem["type"], { icon: React.ReactNode; color: string; bg: string }> = {
  comment:       { icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-blue-400",   bg: "bg-blue-500/20" },
  mention:       { icon: <AtSign className="h-3.5 w-3.5" />,        color: "text-purple-400", bg: "bg-purple-500/20" },
  assignment:    { icon: <UserCheck className="h-3.5 w-3.5" />,     color: "text-emerald-400",bg: "bg-emerald-500/20" },
  status_change: { icon: <GitCommit className="h-3.5 w-3.5" />,     color: "text-amber-400",  bg: "bg-amber-500/20" },
  invite:        { icon: <UserPlus className="h-3.5 w-3.5" />,      color: "text-indigo-400", bg: "bg-indigo-500/20" },
  due_soon:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-orange-400", bg: "bg-orange-500/20" },
  system:        { icon: <Circle className="h-3.5 w-3.5" />,        color: "text-slate-400",  bg: "bg-slate-500/20" },
};

const ACTIVITY_COLORS: Record<string, string> = {
  created:   "text-emerald-400",
  updated:   "text-blue-400",
  deleted:   "text-red-400",
  commented: "text-slate-400",
  assigned:  "text-purple-400",
  joined:    "text-indigo-400",
  shared:    "text-amber-400",
  moved:     "text-slate-400",
};

// ─── Notification card ────────────────────────────────────────────────────────

function NotifCard({ n, onMarkRead, onDelete }: {
  n: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-border/40 group transition-colors ${n.read ? "" : "bg-primary/3"}`}>
      {/* Avatar + type badge */}
      <div className="relative shrink-0 mt-0.5">
        {n.actor ? (
          <>
            <Avatar className="h-8 w-8">
              <AvatarImage src={n.actor.imageUrl ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/20">{userInitials(n.actor)}</AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-1 -right-1 rounded-full p-0.5 ${meta.bg}`}>
              <span className={meta.color}>{meta.icon}</span>
            </span>
          </>
        ) : (
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${meta.bg}`}>
            <span className={meta.color}>{meta.icon}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm leading-snug ${n.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
              {n.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
          </div>
          {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[11px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </span>
          {n.projectName && (
            <span className="text-[10px] text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded">
              {n.projectName}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        {!n.read && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMarkRead(n.id)}>
            <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(n.id)}>
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({ entry }: { entry: ActivityLogEntry }) {
  const color = ACTIVITY_COLORS[entry.action] ?? "text-slate-400";
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/10 transition-colors">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={entry.user.imageUrl ?? undefined} />
        <AvatarFallback className="text-xs bg-primary/20">{userInitials(entry.user)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-medium">{userName(entry.user)}</span>
          {" "}
          <span className={color}>{entry.action}</span>
          {entry.entityTitle && (
            <> <span className="text-muted-foreground">"{entry.entityTitle}"</span></>
          )}
          {!entry.entityTitle && entry.entityType && (
            <> <span className="text-muted-foreground/60">{entry.entityType}</span></>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function Empty({ tab }: { tab: TabId }) {
  const messages: Record<TabId, { icon: React.ReactNode; text: string }> = {
    all:         { icon: <Inbox className="h-8 w-8 text-muted-foreground/40" />, text: "Your inbox is empty." },
    mentions:    { icon: <AtSign className="h-8 w-8 text-muted-foreground/40" />, text: "No mentions yet." },
    comments:    { icon: <MessageSquare className="h-8 w-8 text-muted-foreground/40" />, text: "No comment notifications." },
    assignments: { icon: <UserCheck className="h-8 w-8 text-muted-foreground/40" />, text: "No assignments." },
    activity:    { icon: <Activity className="h-8 w-8 text-muted-foreground/40" />, text: "No recent activity." },
  };
  const { icon, text } = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      {icon}
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function UnifiedInbox({ projectId }: { projectId: number }) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [groupByProject, setGroupByProject] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: notifications, isLoading: notifsLoading } = useListNotifications();
  const { data: activity, isLoading: activityLoading } = useListActivity(projectId, 100);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unreadCount = useMemo(
    () => notifications?.filter(n => !n.read).length ?? 0,
    [notifications],
  );

  // Filter notifications by tab
  const filteredNotifs = useMemo(() => {
    let items = notifications ?? [];

    if (activeTab === "mentions")    items = items.filter(n => n.type === "mention");
    if (activeTab === "comments")    items = items.filter(n => n.type === "comment");
    if (activeTab === "assignments") items = items.filter(n => n.type === "assignment");

    if (showUnreadOnly) items = items.filter(n => !n.read);

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.actor && userName(n.actor).toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => {
      // Unread first, then by date
      if (!a.read && b.read) return -1;
      if (a.read && !b.read) return 1;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [notifications, activeTab, showUnreadOnly, search]);

  const filteredActivity = useMemo(() => {
    let items = activity ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(e =>
        (e.entityTitle ?? "").toLowerCase().includes(q) ||
        userName(e.user).toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activity, search]);

  const isLoading = notifsLoading || (activeTab === "activity" && activityLoading);

  // Tab counts
  const tabCounts: Record<TabId, number> = {
    all:         (notifications ?? []).filter(n => !n.read).length,
    mentions:    (notifications ?? []).filter(n => !n.read && n.type === "mention").length,
    comments:    (notifications ?? []).filter(n => !n.read && n.type === "comment").length,
    assignments: (notifications ?? []).filter(n => !n.read && n.type === "assignment").length,
    activity:    0,
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" /> Inbox
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comments, mentions, assignments, and team activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => markAll.mutateAsync()}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="h-8 text-sm pl-8 bg-card"
          />
        </div>
        <Button
          variant={showUnreadOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={() => setShowUnreadOnly(v => !v)}
        >
          <Bell className="h-3.5 w-3.5" />
          Unread only
        </Button>
        <Button
          variant={groupByProject ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={() => setGroupByProject(v => !v)}
          title="Group notifications by project"
          data-testid="inbox-group-by-project"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Group by project
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-0 overflow-x-auto shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center">
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto border border-t-0 border-border rounded-b-lg bg-card/40">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : activeTab === "activity" ? (
          filteredActivity.length === 0 ? (
            <Empty tab="activity" />
          ) : (
            filteredActivity.map(e => <ActivityCard key={e.id} entry={e} />)
          )
        ) : filteredNotifs.length === 0 ? (
          <Empty tab={activeTab} />
        ) : groupByProject ? (
          // ─── Grouped by project ────────────────────────────────────────
          (() => {
            const groups = new Map<string, { name: string; items: NotificationItem[] }>();
            for (const n of filteredNotifs) {
              const key = n.projectId != null ? `p:${n.projectId}` : "none";
              const name = n.projectName ?? "No project";
              if (!groups.has(key)) groups.set(key, { name, items: [] });
              groups.get(key)!.items.push(n);
            }
            const ordered = [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
            return ordered.map(([key, g]) => {
              const isCollapsed = collapsed.has(key);
              const unread = g.items.filter(n => !n.read).length;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setCollapsed(prev => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key); else next.add(key);
                      return next;
                    })}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/20 hover:bg-muted/40 border-b border-border/40 sticky top-0 z-10"
                  >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span className="truncate flex-1 text-left">{g.name}</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {g.items.length}
                      {unread > 0 && <span className="ml-1 text-primary">· {unread} unread</span>}
                    </span>
                  </button>
                  {!isCollapsed && g.items.map(n => (
                    <NotifCard
                      key={n.id}
                      n={n}
                      onMarkRead={id => markRead.mutateAsync(id)}
                      onDelete={id => deleteNotif.mutateAsync(id)}
                    />
                  ))}
                </div>
              );
            });
          })()
        ) : (
          filteredNotifs.map(n => (
            <NotifCard
              key={n.id}
              n={n}
              onMarkRead={id => markRead.mutateAsync(id)}
              onDelete={id => deleteNotif.mutateAsync(id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
