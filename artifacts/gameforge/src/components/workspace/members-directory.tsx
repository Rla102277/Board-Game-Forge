import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Shield,
  Mail,
  Crown,
  Pencil,
  Check,
  X,
  UserPlus,
  Trash2,
} from "lucide-react";
import { useListProjectUsers, useListShares, useUpdateShare, useRemoveShare, useCreateShare } from "@/hooks/use-collaboration";
import { ROLE_LABELS, ROLE_PERMISSIONS, type ProjectRole } from "@/lib/collaboration-types";
import { useToast } from "@/hooks/use-toast";

interface MembersDirectoryProps {
  projectId: number;
  canManage?: boolean;
}

export function MembersDirectory({ projectId, canManage = true }: MembersDirectoryProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("editor");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<ProjectRole>("viewer");

  const { data: users, isLoading: usersLoading } = useListProjectUsers(projectId);
  const { data: shares, isLoading: sharesLoading } = useListShares(projectId);
  const createShare = useCreateShare();
  const updateShare = useUpdateShare();
  const removeShare = useRemoveShare();

  const isLoading = usersLoading || sharesLoading;

  const members = useMemo(() => {
    const shareMap = new Map((shares ?? []).map((s) => [s.user?.id ?? s.email, s]));
    return (users ?? []).map((u) => {
      const share = shareMap.get(u.id);
      return { user: u, share };
    });
  }, [users, shares]);

  const pending = useMemo(() => (shares ?? []).filter((s) => !s.user && s.email), [shares]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return members;
    return members.filter(
      (m) =>
        m.user.email?.toLowerCase().includes(term) ||
        m.user.firstName?.toLowerCase().includes(term) ||
        m.user.lastName?.toLowerCase().includes(term)
    );
  }, [members, search]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await createShare.mutateAsync({ projectId, email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      toast({ title: "Invitation sent" });
    } catch (err) {
      toast({ title: "Invite failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleRoleSave = async (shareId: number) => {
    try {
      await updateShare.mutateAsync({ projectId, shareId, role: editRole });
      setEditingId(null);
      toast({ title: "Role updated" });
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleRemove = async (shareId: number) => {
    if (!confirm("Remove this member?")) return;
    try {
      await removeShare.mutateAsync({ projectId, shareId });
      toast({ title: "Member removed" });
    } catch (err) {
      toast({ title: "Remove failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const roleOptions: ProjectRole[] = ["admin", "editor", "commenter", "viewer"];

  return (
    <div className="h-full flex flex-col pb-8 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Members
        </h2>
        <Badge variant="secondary">{members.length + pending.length} total</Badge>
      </div>

      {canManage && (
        <form onSubmit={handleInvite} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Invite by email</label>
            <Input
              type="email"
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectRole)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!inviteEmail.trim() || createShare.isPending}>
            <UserPlus className="h-4 w-4 mr-1" /> Invite
          </Button>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ user, share }) => {
              const display = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";
              const initial = (display[0] ?? "?").toUpperCase();
              const role = (share?.role ?? "viewer") as ProjectRole;
              const perms = ROLE_PERMISSIONS[role];
              const isOwner = role === "owner";
              const isEditing = editingId === share?.id;

              return (
                <Card key={user.id} className="overflow-hidden group">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {user.imageUrl && <AvatarImage src={user.imageUrl} alt="" />}
                      <AvatarFallback className="text-sm">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{display}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <Badge variant="outline" className="text-xs gap-1 border-amber-500/30 text-amber-500 bg-amber-500/10">
                          <Crown className="h-3 w-3" /> Owner
                        </Badge>
                      ) : isEditing ? (
                        <div className="flex items-center gap-1">
                          <Select value={editRole} onValueChange={(v) => setEditRole(v as ProjectRole)}>
                            <SelectTrigger className="h-8 text-xs w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRoleSave(share!.id)}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {ROLE_LABELS[role]}
                          </Badge>
                          {canManage && !isOwner && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditingId(share!.id); setEditRole(role); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemove(share!.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {pending.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pending invitations</h4>
                <div className="space-y-2">
                  {pending.map((share) => (
                    <Card key={share.id} className="overflow-hidden opacity-70">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{share.email}</div>
                          <div className="text-xs text-muted-foreground">Invited as {ROLE_LABELS[share.role]}</div>
                        </div>
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemove(share.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && pending.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No members found.
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
