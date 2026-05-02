import { useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList, Search, Download, Filter, Plus, Edit3, Trash2,
  MessageSquare, UserCheck, Users, Share2, ArrowRight, RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow, subDays, isAfter } from "date-fns";
import { useListActivity, useListProjectUsers } from "@/hooks/use-collaboration";
import type { ActivityLogEntry, CollaboratorUser, ActivityAction } from "@/lib/collaboration-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(u: CollaboratorUser): string {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  if (u.firstName) return u.firstName[0].toUpperCase();
  return (u.email?.[0] ?? "?").toUpperCase();
}

function displayName(u: CollaboratorUser): string {
  if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(" ");
  return u.email ?? "Unknown";
}

// ─── Action metadata ──────────────────────────────────────────────────────────

type ActionMeta = { label: string; icon: React.ReactNode; color: string; bg: string };

const ACTION_META: Record<ActivityAction, ActionMeta> = {
  created:   { label: "Created",   icon: <Plus className="h-3 w-3" />,        color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  updated:   { label: "Updated",   icon: <Edit3 className="h-3 w-3" />,       color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30" },
  deleted:   { label: "Deleted",   icon: <Trash2 className="h-3 w-3" />,      color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30" },
  commented: { label: "Commented", icon: <MessageSquare className="h-3 w-3" />, color: "text-slate-400", bg: "bg-slate-500/15 border-slate-500/30" },
  assigned:  { label: "Assigned",  icon: <UserCheck className="h-3 w-3" />,   color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
  moved:     { label: "Moved",     icon: <ArrowRight className="h-3 w-3" />,  color: "text-slate-400",  bg: "bg-slate-500/15 border-slate-500/30" },
  joined:    { label: "Joined",    icon: <Users className="h-3 w-3" />,       color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30" },
  shared:    { label: "Shared",    icon: <Share2 className="h-3 w-3" />,      color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/30" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  entity: "Game Piece",
  rule: "Rule",
  note: "Note",
  task: "Task",
  asset: "Asset",
  project: "Project",
  player: "Player",
  share: "Share",
};

const DATE_RANGE_OPTIONS = [
  { value: "1",  label: "Last 24 hours" },
  { value: "7",  label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCSV(entries: ActivityLogEntry[], projectId: number) {
  const rows = [
    ["ID", "User", "Email", "Action", "Entity Type", "Entity", "Timestamp"],
    ...entries.map(e => [
      e.id,
      displayName(e.user),
      e.user.email ?? "",
      e.action,
      e.entityType,
      e.entityTitle ?? "",
      format(new Date(e.createdAt), "yyyy-MM-dd HH:mm:ss"),
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-log-project-${projectId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: ActivityLogEntry }) {
  const meta = ACTION_META[entry.action] ?? ACTION_META.updated;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 hover:bg-muted/10 transition-colors group">
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={entry.user.imageUrl ?? undefined} />
        <AvatarFallback className="text-xs bg-primary/20">{initials(entry.user)}</AvatarFallback>
      </Avatar>

      {/* User + action */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-medium">{displayName(entry.user)}</span>
          {" "}
          <span className={meta.color}>{entry.action}</span>
          {" "}
          {entry.entityTitle ? (
            <span className="text-muted-foreground">"{entry.entityTitle}"</span>
          ) : entry.entityType ? (
            <span className="text-muted-foreground/60">{ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}</span>
          ) : null}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </div>

      {/* Entity type badge */}
      {entry.entityType && (
        <Badge variant="outline" className="text-[10px] text-muted-foreground/60 shrink-0 hidden group-hover:flex">
          {ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}
        </Badge>
      )}

      {/* Action badge */}
      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${meta.color} ${meta.bg} shrink-0`}>
        {meta.icon}
        {meta.label}
      </span>

      {/* Timestamp */}
      <span className="text-[11px] text-muted-foreground/50 shrink-0 min-w-[80px] text-right hidden md:block">
        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}

// ─── Date group header ────────────────────────────────────────────────────────

function DateGroup({ date, count }: { date: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 border-b border-border/40 sticky top-0 z-10">
      <span className="text-xs font-semibold text-foreground">{date}</span>
      <span className="text-[10px] text-muted-foreground/60">{count} event{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface AuditLogProps {
  projectId: number;
}

export function AuditLog({ projectId }: AuditLogProps) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<ActivityAction | "all">("all");
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");

  const { data: activity = [], isLoading, refetch, isFetching } = useListActivity(projectId, 500);
  const { data: users = [] } = useListProjectUsers(projectId);

  // Unique entity types from data
  const entityTypes = useMemo(() => {
    const types = new Set(activity.map(a => a.entityType).filter(Boolean));
    return [...types].sort();
  }, [activity]);

  // Apply all filters
  const filtered = useMemo(() => {
    let items = activity;

    if (filterAction !== "all") {
      items = items.filter(a => a.action === filterAction);
    }
    if (filterUserId !== "all") {
      items = items.filter(a => String(a.user.id) === filterUserId);
    }
    if (filterEntityType !== "all") {
      items = items.filter(a => a.entityType === filterEntityType);
    }
    if (dateRange !== "all") {
      const cutoff = subDays(new Date(), parseInt(dateRange));
      items = items.filter(a => isAfter(new Date(a.createdAt), cutoff));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(a =>
        displayName(a.user).toLowerCase().includes(q) ||
        (a.entityTitle ?? "").toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        a.entityType.toLowerCase().includes(q)
      );
    }

    return items;
  }, [activity, filterAction, filterUserId, filterEntityType, dateRange, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups = new Map<string, ActivityLogEntry[]>();
    filtered.forEach(entry => {
      const dateKey = format(new Date(entry.createdAt), "EEEE, MMMM d, yyyy");
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(entry);
    });
    return [...groups.entries()];
  }, [filtered]);

  const handleExport = useCallback(() => {
    exportToCSV(filtered, projectId);
  }, [filtered, projectId]);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Audit Log
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete record of all team activity — who did what, and when
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => refetch()} disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={handleExport} disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV ({filtered.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="h-8 text-sm pl-8 bg-card"
          />
        </div>

        {/* Action filter */}
        <Select value={filterAction} onValueChange={v => setFilterAction(v as typeof filterAction)}>
          <SelectTrigger className="h-8 text-sm w-[140px]">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_META).map(([action, meta]) => (
              <SelectItem key={action} value={action} className="text-sm">
                <span className={`flex items-center gap-1.5 ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User filter */}
        <Select value={filterUserId} onValueChange={setFilterUserId}>
          <SelectTrigger className="h-8 text-sm w-[150px]">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={String(u.id)} className="text-sm">
                {displayName(u)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Entity type filter */}
        {entityTypes.length > 1 && (
          <Select value={filterEntityType} onValueChange={setFilterEntityType}>
            <SelectTrigger className="h-8 text-sm w-[140px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {entityTypes.map(t => (
                <SelectItem key={t} value={t} className="text-sm capitalize">
                  {ENTITY_TYPE_LABELS[t] ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date range */}
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="h-8 text-sm w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      {!isLoading && (
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground border border-border/40 rounded-lg px-4 py-2 bg-muted/10">
          <span><span className="text-foreground font-medium">{filtered.length}</span> events shown</span>
          <span>·</span>
          <span><span className="text-foreground font-medium">{activity.length}</span> total</span>
          {filterAction !== "all" && (
            <>
              <span>·</span>
              <span>Filtered by <span className={`font-medium ${ACTION_META[filterAction]?.color}`}>{filterAction}</span></span>
            </>
          )}
          {(filterAction !== "all" || filterUserId !== "all" || filterEntityType !== "all" || dateRange !== "30" || search) && (
            <button
              className="ml-auto text-primary hover:underline"
              onClick={() => {
                setFilterAction("all");
                setFilterUserId("all");
                setFilterEntityType("all");
                setDateRange("30");
                setSearch("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-card/40">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No events match your filters.</p>
          </div>
        ) : (
          grouped.map(([date, entries]) => (
            <div key={date}>
              <DateGroup date={date} count={entries.length} />
              {entries.map(entry => <EntryRow key={entry.id} entry={entry} />)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
