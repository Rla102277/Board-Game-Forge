import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, Users, UserPlus, Crown, Pencil, Eye, MessageSquare, Trash2,
  CheckCircle2, XCircle, Clock, Mail, Settings2, AlertTriangle, Lock,
  Check, X, Share2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useListProjectUsers, useListShares, useListActivity,
  useUpdateShare, useRemoveShare, useCreateShare,
} from "@/hooks/use-collaboration";
import {
  ROLE_LABELS, ROLE_PERMISSIONS,
  type ProjectRole, type CollaboratorUser, type ActivityLogEntry,
} from "@/lib/collaboration-types";
import { useToast } from "@/hooks/use-toast";

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

function lastActive(userId: number, activity: ActivityLogEntry[]): string | null {
  const entry = activity.find(a => a.user.id === userId);
  if (!entry) return null;
  return formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true });
}

function onlineStatus(userId: number, activity: ActivityLogEntry[]): "online" | "active" | "idle" | "offline" {
  const entry = activity.find(a => a.user.id === userId);
  if (!entry) return "offline";
  const mins = (Date.now() - new Date(entry.createdAt).getTime()) / 60000;
  if (mins < 5) return "online";
  if (mins < 20) return "active";
  if (mins < 90) return "idle";
  return "offline";
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-400",
  active: "bg-blue-400",
  idle: "bg-amber-400",
  offline: "bg-slate-500",
};

const ROLE_ICON: Record<ProjectRole, React.ReactNode> = {
  owner:     <Crown className="h-3.5 w-3.5 text-amber-400" />,
  admin:     <Shield className="h-3.5 w-3.5 text-blue-400" />,
  editor:    <Pencil className="h-3.5 w-3.5 text-purple-400" />,
  commenter: <MessageSquare className="h-3.5 w-3.5 text-slate-400" />,
  viewer:    <Eye className="h-3.5 w-3.5 text-slate-400" />,
};

const ROLE_ORDER: ProjectRole[] = ["owner", "admin", "editor", "commenter", "viewer"];

type TabId = "members" | "permissions" | "security";

// ─── Permission Matrix ─────────────────────────────────────────────────────

const PERMISSION_ROWS: { key: keyof typeof ROLE_PERMISSIONS["owner"]; label: string; description: string }[] = [
  { key: "canEdit",          label: "Edit Content",      description: "Modify game components, rules, and assets" },
  { key: "canComment",       label: "Comment",           description: "Leave comments and mentions on any item" },
  { key: "canShare",         label: "Share & Invite",    description: "Invite new members and share the project" },
  { key: "canDelete",        label: "Delete Items",      description: "Permanently delete entities and files" },
  { key: "canManageMembers", label: "Manage Members",    description: "Change member roles and remove members" },
];

function PermissionMatrix() {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[200px]">Permission</th>
            {ROLE_ORDER.map(role => (
              <th key={role} className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    {ROLE_ICON[role]}
                    {ROLE_LABELS[role]}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_ROWS.map((row, i) => (
            <tr key={row.key} className={`border-b border-border/40 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{row.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{row.description}</p>
                </div>
              </td>
              {ROLE_ORDER.map(role => (
                <td key={role} className="px-4 py-3 text-center">
                  {ROLE_PERMISSIONS[role][row.key] ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityPanel({ projectId, activity }: { projectId: number; activity: ActivityLogEntry[] }) {
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activity.forEach(a => { counts[a.action] = (counts[a.action] ?? 0) + 1; });
    return counts;
  }, [activity]);

  const userActivity = useMemo(() => {
    const map = new Map<number, { user: CollaboratorUser; count: number; last: string }>();
    activity.forEach(a => {
      const existing = map.get(a.user.id);
      if (!existing) {
        map.set(a.user.id, { user: a.user, count: 1, last: a.createdAt });
      } else {
        existing.count++;
        if (a.createdAt > existing.last) existing.last = a.createdAt;
      }
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [activity]);

  const deletions = useMemo(() => activity.filter(a => a.action === "deleted"), [activity]);

  return (
    <div className="space-y-6">
      {/* Activity overview */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Activity Overview (last 100 events)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(actionCounts).map(([action, count]) => (
            <div key={action} className="bg-muted/20 border border-border/40 rounded-lg px-4 py-3">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top contributors */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Top Contributors
        </h3>
        <div className="space-y-2">
          {userActivity.slice(0, 8).map(({ user, count, last }) => (
            <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/10 border border-border/30">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user.imageUrl ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/20">{initials(user)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{displayName(user)}</p>
                <p className="text-[11px] text-muted-foreground">Last active {formatDistanceToNow(new Date(last), { addSuffix: true })}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{count} actions</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Recent deletions */}
      {deletions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Recent Deletions
          </h3>
          <div className="space-y-1.5">
            {deletions.slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
                <Trash2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{displayName(d.user)}</span>
                    {" deleted "}
                    {d.entityTitle ? <span className="text-muted-foreground">"{d.entityTitle}"</span> : <span className="text-muted-foreground/60">{d.entityType}</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security notices */}
      <div className="rounded-lg border border-border/40 bg-muted/10 px-4 py-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Security Controls
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            All member access controlled via role-based permissions
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            Authentication managed by Clerk — SSO/MFA available on Pro
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            All activity logged with user, timestamp, and entity reference
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            Project data isolated per workspace — no cross-project leakage
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersPanel({
  projectId,
  activity,
}: {
  projectId: number;
  activity: ActivityLogEntry[];
}) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("editor");
  const [editingShareId, setEditingShareId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<ProjectRole>("viewer");
  const [removeConfirm, setRemoveConfirm] = useState<{ shareId: number; name: string } | null>(null);

  const { data: shares, isLoading } = useListShares(projectId);
  const createShare = useCreateShare();
  const updateShare = useUpdateShare();
  const removeShare = useRemoveShare();

  const members = useMemo(() => {
    return (shares ?? [])
      .filter(s => s.user)
      .sort((a, b) => {
        const roleOrderMap: Record<ProjectRole, number> = { owner: 0, admin: 1, editor: 2, commenter: 3, viewer: 4 };
        return (roleOrderMap[a.role] ?? 99) - (roleOrderMap[b.role] ?? 99);
      });
  }, [shares]);

  const pending = useMemo(() => (shares ?? []).filter(s => !s.user && s.email), [shares]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await createShare.mutateAsync({ projectId, email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      toast({ title: "Invitation sent", description: `${inviteEmail.trim()} will receive an email.` });
    } catch {
      toast({ title: "Failed to invite", variant: "destructive" });
    }
  };

  const handleRoleSave = async (shareId: number) => {
    try {
      await updateShare.mutateAsync({ projectId, shareId, role: editRole });
      setEditingShareId(null);
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    if (!removeConfirm) return;
    try {
      await removeShare.mutateAsync({ projectId, shareId: removeConfirm.shareId });
      setRemoveConfirm(null);
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Invite New Member
        </h3>
        <form onSubmit={handleInvite} className="flex gap-2">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@studio.com"
              type="email"
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={inviteRole} onValueChange={v => setInviteRole(v as ProjectRole)}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ORDER.filter(r => r !== "owner").map(r => (
                <SelectItem key={r} value={r} className="text-sm">
                  <span className="flex items-center gap-1.5">{ROLE_ICON[r]} {ROLE_LABELS[r]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" className="h-9" disabled={createShare.isPending}>
            {createShare.isPending ? "Sending…" : "Invite"}
          </Button>
        </form>
      </div>

      {/* Member list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Active Members
            <Badge variant="outline" className="text-xs">{members.length}</Badge>
          </h3>
        </div>
        <div className="space-y-1.5">
          {members.map(share => {
            const user = share.user!;
            const status = onlineStatus(user.id, activity);
            const last = lastActive(user.id, activity);
            const isEditing = editingShareId === share.id;

            return (
              <div key={share.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-card/40 hover:bg-card/60 group transition-colors">
                {/* Avatar + status */}
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.imageUrl ?? undefined} />
                    <AvatarFallback className="text-xs bg-primary/20">{initials(user)}</AvatarFallback>
                  </Avatar>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${STATUS_DOT[status]}`} />
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName(user)}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user.email}
                    {last && <span className="ml-1.5 text-muted-foreground/50">· {last}</span>}
                  </p>
                </div>

                {/* Role */}
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Select value={editRole} onValueChange={v => setEditRole(v as ProjectRole)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_ORDER.filter(r => r !== "owner").map(r => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRoleSave(share.id)}>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingShareId(null)}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {ROLE_ICON[share.role]}
                      {ROLE_LABELS[share.role]}
                    </span>
                    {share.role !== "owner" && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { setEditingShareId(share.id); setEditRole(share.role); }}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => setRemoveConfirm({ shareId: share.id, name: displayName(user) })}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" /> Pending Invites
            <Badge variant="outline" className="text-xs">{pending.length}</Badge>
          </h3>
          <div className="space-y-1.5">
            {pending.map(share => (
              <div key={share.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 border-dashed bg-muted/10">
                <div className="h-9 w-9 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">{share.email}</p>
                  <p className="text-[11px] text-muted-foreground/50">
                    Invited {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{ROLE_LABELS[share.role]}</span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => setRemoveConfirm({ shareId: share.id, name: share.email ?? "invite" })}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remove confirm dialog */}
      <AlertDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeConfirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to this project immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface WorkspaceSettingsProps {
  projectId: number;
  projectName: string;
}

export function WorkspaceSettings({ projectId, projectName }: WorkspaceSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("members");
  const { data: activity = [] } = useListActivity(projectId, 100);

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "members",     label: "Members",     icon: <Users className="h-3.5 w-3.5" /> },
    { id: "permissions", label: "Permissions", icon: <Shield className="h-3.5 w-3.5" /> },
    { id: "security",    label: "Security",    icon: <Lock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" /> Workspace Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage team access, permissions, and security for <span className="text-foreground">{projectName}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Share2 className="h-3.5 w-3.5" /> Share Project
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "members" && (
          <MembersPanel projectId={projectId} activity={activity} />
        )}
        {activeTab === "permissions" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Role Permissions Matrix
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                What each role can do within this project. Roles are set per-project — one member can have different roles across projects.
              </p>
              <PermissionMatrix />
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/10 p-4 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">Role Descriptions</h4>
              <div className="space-y-3">
                {ROLE_ORDER.map(role => (
                  <div key={role} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{ROLE_ICON[role]}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{ROLE_LABELS[role]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role === "owner" && "Full control. Can delete the project, manage all members, and transfer ownership."}
                        {role === "admin" && "Full edit and member management rights. Cannot delete the project or demote the owner."}
                        {role === "editor" && "Can create, edit, and delete game components, rules, and assets. Cannot manage members."}
                        {role === "commenter" && "Can view all content and leave comments. Cannot make structural changes."}
                        {role === "viewer" && "Read-only access. Can view all content but cannot comment or make changes."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === "security" && (
          <SecurityPanel projectId={projectId} activity={activity} />
        )}
      </div>
    </div>
  );
}
