import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users, Activity, Share2, MessageSquare, AtSign,
  UserCheck, AlertTriangle, CheckCheck, ChevronRight,
  Inbox, Circle, Clock, Bell, GitCommit, Plus, Pencil, Trash2, UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useListShares, useListActivity, useListNotifications,
  useMarkNotificationRead, useMarkAllNotificationsRead,
} from "@/hooks/use-collaboration";
import type { CollaboratorUser, ActivityLogEntry, ProjectShare, NotificationItem, ProjectRole } from "@/lib/collaboration-types";
import { ROLE_LABELS } from "@/lib/collaboration-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userInitials(u: CollaboratorUser): string {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  if (u.firstName) return u.firstName[0].toUpperCase();
  if (u.email) return u.email[0].toUpperCase();
  return "?";
}

function userName(u: CollaboratorUser): string {
  if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(" ");
  return u.email ?? "Unknown";
}

type OnlineStatus = "online" | "active" | "idle" | "offline";

function inferStatus(userId: number, activity: ActivityLogEntry[]): OnlineStatus {
  const last = activity
    .filter(e => e.user?.id === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  if (!last) return "offline";
  const mins = (Date.now() - +new Date(last.createdAt)) / 60_000;
  if (mins < 5) return "online";
  if (mins < 20) return "active";
  if (mins < 90) return "idle";
  return "offline";
}

function inferSection(userId: number, activity: ActivityLogEntry[]): string | null {
  const last = activity
    .filter(e => e.user?.id === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  if (!last) return null;
  if (+new Date(last.createdAt) < Date.now() - 20 * 60_000) return null;
  const label = last.entityTitle ? `"${last.entityTitle}"` : last.entityType;
  const verb = last.action === "created" ? "creating" : last.action === "updated" ? "editing" : last.action;
  return `${verb} ${label}`;
}

const STATUS_DOT: Record<OnlineStatus, string> = {
  online: "bg-emerald-400 shadow-emerald-400/60 shadow-sm",
  active: "bg-blue-400",
  idle:   "bg-amber-400",
  offline: "bg-slate-600",
};

const STATUS_TEXT: Record<OnlineStatus, string> = {
  online:  "Online now",
  active:  "Active recently",
  idle:    "Idle",
  offline: "Offline",
};

const NOTIF_ICONS: Record<NotificationItem["type"], React.ReactNode> = {
  comment:       <MessageSquare className="h-3.5 w-3.5 text-blue-400" />,
  mention:       <AtSign className="h-3.5 w-3.5 text-purple-400" />,
  assignment:    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />,
  status_change: <GitCommit className="h-3.5 w-3.5 text-amber-400" />,
  invite:        <UserPlus className="h-3.5 w-3.5 text-indigo-400" />,
  due_soon:      <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />,
  system:        <Circle className="h-3.5 w-3.5 text-slate-400" />,
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created:   <Plus className="h-3 w-3" />,
  updated:   <Pencil className="h-3 w-3" />,
  deleted:   <Trash2 className="h-3 w-3" />,
  commented: <MessageSquare className="h-3 w-3" />,
  assigned:  <UserPlus className="h-3 w-3" />,
  joined:    <UserPlus className="h-3 w-3" />,
  shared:    <Share2 className="h-3 w-3" />,
  moved:     <ChevronRight className="h-3 w-3" />,
};

const ACTION_COLOR: Record<string, string> = {
  created:   "bg-emerald-500/20 text-emerald-400",
  updated:   "bg-blue-500/20 text-blue-400",
  deleted:   "bg-red-500/20 text-red-400",
  commented: "bg-slate-500/20 text-slate-400",
  assigned:  "bg-purple-500/20 text-purple-400",
  joined:    "bg-indigo-500/20 text-indigo-400",
  shared:    "bg-amber-500/20 text-amber-400",
  moved:     "bg-slate-500/20 text-slate-400",
};

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ share, status, section }: { share: ProjectShare; status: OnlineStatus; section: string | null }) {
  const u = share.user;
  if (!u) return null;
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={u.imageUrl ?? undefined} />
          <AvatarFallback className="text-xs bg-primary/20 text-primary-foreground">{userInitials(u)}</AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${STATUS_DOT[status]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">{userName(u)}</span>
          <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded capitalize shrink-0">
            {ROLE_LABELS[share.role]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {section ?? STATUS_TEXT[status]}
        </p>
      </div>
    </div>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({ n, onMarkRead }: { n: NotificationItem; onMarkRead: (id: string) => void }) {
  return (
    <div className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors group ${n.read ? "opacity-60" : "bg-muted/10 hover:bg-muted/20"}`}>
      <div className="shrink-0 mt-0.5">
        {n.actor ? (
          <div className="relative">
            <Avatar className="h-7 w-7">
              <AvatarImage src={n.actor.imageUrl ?? undefined} />
              <AvatarFallback className="text-[10px] bg-primary/20">{userInitials(n.actor)}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5">
              {NOTIF_ICONS[n.type]}
            </span>
          </div>
        ) : (
          <div className="h-7 w-7 rounded-full bg-muted/30 flex items-center justify-center">
            {NOTIF_ICONS[n.type]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-snug">{n.title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!n.read && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onMarkRead(n.id)} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Mark as read</TooltipContent>
          </Tooltip>
        )}
      </div>
      {!n.read && <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
    </div>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const colorClass = ACTION_COLOR[entry.action] ?? "bg-slate-500/20 text-slate-400";
  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors group">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={entry.user.imageUrl ?? undefined} />
        <AvatarFallback className="text-[9px] bg-primary/20">{userInitials(entry.user)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-foreground">{userName(entry.user)}</span>
        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${colorClass}`}>
          {ACTION_ICONS[entry.action]}
          {entry.action}
        </span>
        {entry.entityTitle && (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">"{entry.entityTitle}"</span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground/50 shrink-0">
        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface CollaborationDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  onOpenShare: () => void;
  onNavigate: (section: string) => void;
}

export function CollaborationDashboard({
  open, onOpenChange, projectId, projectName, onOpenShare, onNavigate,
}: CollaborationDashboardProps) {
  const { data: shares, isLoading: sharesLoading } = useListShares(projectId);
  const { data: activity, isLoading: activityLoading } = useListActivity(projectId, 50);
  const { data: notifications, isLoading: notifsLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const members = useMemo(
    () => (shares ?? []).filter(s => s.user !== null),
    [shares],
  );

  const memberStatuses = useMemo(() => {
    const act = activity ?? [];
    return Object.fromEntries(
      members.map(s => [s.user!.id, inferStatus(s.user!.id, act)])
    ) as Record<number, OnlineStatus>;
  }, [members, activity]);

  const memberSections = useMemo(() => {
    const act = activity ?? [];
    return Object.fromEntries(
      members.map(s => [s.user!.id, inferSection(s.user!.id, act)])
    ) as Record<number, string | null>;
  }, [members, activity]);

  const sortedMembers = useMemo(() => {
    const order: Record<OnlineStatus, number> = { online: 0, active: 1, idle: 2, offline: 3 };
    return [...members].sort((a, b) => {
      const sa = memberStatuses[a.user!.id] ?? "offline";
      const sb = memberStatuses[b.user!.id] ?? "offline";
      return order[sa] - order[sb];
    });
  }, [members, memberStatuses]);

  const unreadNotifs = useMemo(
    () => (notifications ?? []).filter(n => !n.read).slice(0, 6),
    [notifications],
  );

  const recentActivity = useMemo(
    () => (activity ?? []).slice(0, 6),
    [activity],
  );

  const onlineCount = useMemo(
    () => Object.values(memberStatuses).filter(s => s === "online" || s === "active").length,
    [memberStatuses],
  );

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-l border-border p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Team
            </SheetTitle>
            <div className="flex items-center gap-2">
              {onlineCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlineCount} online
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{projectName}</p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">

            {/* ── Online Now ───────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Team ({members.length})
                </h3>
                <button onClick={onOpenShare} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  Manage <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {sharesLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : sortedMembers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">No team members yet.</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1" onClick={onOpenShare}>
                    <Share2 className="h-3 w-3" /> Invite someone
                  </Button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {sortedMembers.map(share => (
                    <MemberRow
                      key={share.id}
                      share={share}
                      status={memberStatuses[share.user!.id] ?? "offline"}
                      section={memberSections[share.user!.id] ?? null}
                    />
                  ))}
                </div>
              )}
            </section>

            <Separator className="bg-border/50" />

            {/* ── Waiting for You ──────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" /> Waiting for You
                  {unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAll.mutateAsync()}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => { onNavigate("inbox"); onOpenChange(false); }} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                    Inbox <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {notifsLoading ? (
                <div className="space-y-2">
                  {[1,2].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : unreadNotifs.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  <CheckCheck className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
                  All caught up!
                </div>
              ) : (
                <div className="space-y-0.5">
                  {unreadNotifs.map(n => (
                    <NotifRow key={n.id} n={n} onMarkRead={id => markRead.mutateAsync(id)} />
                  ))}
                  {unreadCount > 6 && (
                    <button
                      onClick={() => { onNavigate("inbox"); onOpenChange(false); }}
                      className="w-full text-center text-xs text-primary hover:underline py-1.5"
                    >
                      View {unreadCount - 6} more →
                    </button>
                  )}
                </div>
              )}
            </section>

            <Separator className="bg-border/50" />

            {/* ── Recent Changes ────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Recent Changes
                </h3>
                <button onClick={() => { onNavigate("activity"); onOpenChange(false); }} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  View all <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {activityLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-9 rounded-lg" />)}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No activity yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {recentActivity.map(e => <ActivityRow key={e.id} entry={e} />)}
                </div>
              )}
            </section>

          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border shrink-0 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => { onNavigate("inbox"); onOpenChange(false); }}
          >
            <Inbox className="h-3.5 w-3.5" /> Open Inbox
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => { onOpenShare(); onOpenChange(false); }}
          >
            <Share2 className="h-3.5 w-3.5" /> Manage Team
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
