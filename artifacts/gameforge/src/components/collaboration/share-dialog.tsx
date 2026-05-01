import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Share2, Mail, Copy, Check, X, Link2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProject } from "@workspace/api-client-react";
import { workspacesApi, type WorkspaceMember } from "@/lib/workspaces-api";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Copy, Check, X, UserPlus, Globe, Lock } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Copy, Check, X, UserPlus, Globe, Lock } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
}

interface SharePermission {
  userId: string;
  userName: string;
  role: "viewer" | "editor" | "admin";
  avatarUrl?: string;
}

export function ShareDialog({ open, onOpenChange, projectId, projectName }: ShareDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("editor");
  const [permissions, setPermissions] = useState<SharePermission[]>([]);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    if (open) {
      // Generate share link
      const baseUrl = window.location.origin;
      setShareLink(`${baseUrl}/project/${projectId}?share=true`);
      
      // Load existing permissions (mock data for now)
      setPermissions([
        {
          userId: "user1",
          userName: "Alice Johnson",
          role: "admin",
          avatarUrl: "/avatars/user1",
        },
        {
          userId: "user2",
          userName: "Bob Smith",
          role: "editor",
          avatarUrl: "/avatars/user2",
        },
      ]);
    }
  }, [open, projectId]);

  const handleAddPermission = () => {
    if (!email.trim()) return;

    const newPermission: SharePermission = {
      userId: `user-${Date.now()}`,
      userName: email.split("@")[0],
      role,
    };

    setPermissions([...permissions, newPermission]);
    setEmail("");

    toast({
      title: "Permission added",
      description: `${newPermission.userName} has been added as ${role}`,
    });
  };

  const handleRemovePermission = (userId: string) => {
    setPermissions(permissions.filter((p) => p.userId !== userId));
    toast({
      title: "Permission removed",
      description: "User has been removed from this project",
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleChangeRole = (userId: string, newRole: "viewer" | "editor" | "admin") => {
    setPermissions(
      permissions.map((p) => (p.userId === userId ? { ...p, role: newRole } : p))
    );
    toast({
      title: "Role updated",
      description: `User's role has been changed to ${newRole}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Share "{projectName}"
          </DialogTitle>
          <DialogDescription>
            Invite people to collaborate on this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share link section */}
          <div className="space-y-2">
            <Label>Share link</Label>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Add people section */}
          <div className="space-y-2">
            <Label>Invite people</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddPermission();
                  }
                }}
              />
              <Select value={role} onValueChange={(v: "viewer" | "editor" | "admin") => setRole(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddPermission} size="icon">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* People with access */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>People with access</Label>
              <Badge variant="secondary" className="text-xs">
                {permissions.length} people
              </Badge>
            </div>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.userId}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={permission.avatarUrl} />
                        <AvatarFallback>
                          {permission.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{permission.userName}</p>
                        <p className="text-xs text-muted-foreground">{permission.userId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={permission.role}
                        onValueChange={(v: "viewer" | "editor" | "admin") =>
                          handleChangeRole(permission.userId, v)
                        }
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemovePermission(permission.userId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Access level info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Only people with access can view or edit this project
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SharePermission {
  userId: string;
  userName: string;
  role: "viewer" | "editor" | "admin";
  avatarUrl?: string;
}

export function ShareDialog({ open, onOpenChange, projectId, projectName }: ShareDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("editor");
  const [permissions, setPermissions] = useState<SharePermission[]>([]);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    if (open) {
      // Generate share link
      const baseUrl = window.location.origin;
      setShareLink(`${baseUrl}/project/${projectId}?share=true`);
      
      // Load existing permissions (mock data for now)
      setPermissions([
        {
          userId: "user1",
          userName: "Alice Johnson",
          role: "admin",
          avatarUrl: "/avatars/user1",
        },
        {
          userId: "user2",
          userName: "Bob Smith",
          role: "editor",
          avatarUrl: "/avatars/user2",
        },
      ]);
    }
  }, [open, projectId]);

  const handleAddPermission = () => {
    if (!email.trim()) return;

    const newPermission: SharePermission = {
      userId: `user-${Date.now()}`,
      userName: email.split("@")[0],
      role,
    };

    setPermissions([...permissions, newPermission]);
    setEmail("");

    toast({
      title: "Permission added",
      description: `${newPermission.userName} has been added as ${role}`,
    });
  };

  const handleRemovePermission = (userId: string) => {
    setPermissions(permissions.filter((p) => p.userId !== userId));
    toast({
      title: "Permission removed",
      description: "User has been removed from this project",
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleChangeRole = (userId: string, newRole: "viewer" | "editor" | "admin") => {
    setPermissions(
      permissions.map((p) => (p.userId === userId ? { ...p, role: newRole } : p))
    );
    toast({
      title: "Role updated",
      description: `User's role has been changed to ${newRole}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Share "{projectName}"
          </DialogTitle>
          <DialogDescription>
            Invite people to collaborate on this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share link section */}
          <div className="space-y-2">
            <Label>Share link</Label>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Add people section */}
          <div className="space-y-2">
            <Label>Invite people</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddPermission();
                  }
                }}
              />
              <Select value={role} onValueChange={(v: "viewer" | "editor" | "admin") => setRole(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddPermission} size="icon">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* People with access */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>People with access</Label>
              <Badge variant="secondary" className="text-xs">
                {permissions.length} people
              </Badge>
            </div>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.userId}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={permission.avatarUrl} />
                        <AvatarFallback>
                          {permission.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{permission.userName}</p>
                        <p className="text-xs text-muted-foreground">{permission.userId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={permission.role}
                        onValueChange={(v: "viewer" | "editor" | "admin") =>
                          handleChangeRole(permission.userId, v)
                        }
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemovePermission(permission.userId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Access level info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Only people with access can view or edit this project
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ShareDialog({ open, onOpenChange, projectId, projectName }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPending, setCopiedPending] = useState<number | null>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: project } = useGetProject(projectId);

  useEffect(() => {
    if (open) {
      setLastInvitedEmail(null);
      loadWorkspaceAndMembers();
    }
  }, [open, project]);

  const loadWorkspaceAndMembers = async () => {
    try {
      setLoading(true);
      const workspaces = await workspacesApi.list();

      let foundSlug: string | null = null;
      let foundMembers: WorkspaceMember[] = [];

      for (const workspace of workspaces) {
        try {
          const detail = await workspacesApi.detail(workspace.slug);
          if (detail.projects.find((p) => p.id === projectId)) {
            foundSlug = workspace.slug;
            foundMembers = detail.members;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!foundSlug) {
        setMembers([]);
        return;
      }

      setWorkspaceSlug(foundSlug);
      setMembers(foundMembers);

      try {
        const { joinUrl: url } = await workspacesApi.getInviteCode(foundSlug);
        setJoinUrl(url);
      } catch {
        // non-fatal
      }
    } catch (err) {
      console.error("Failed to load members:", err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJoinUrl = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyForPending = async (memberId: number) => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopiedPending(memberId);
    setTimeout(() => setCopiedPending(null), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !workspaceSlug) return;

    const invitedEmail = email.trim();
    try {
      setInviting(true);
      await workspacesApi.invite(workspaceSlug, invitedEmail, "member");
      setEmail("");
      setLastInvitedEmail(invitedEmail);
      await loadWorkspaceAndMembers();
    } catch (err) {
      toast({
        title: "Failed to add invite",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: number) => {
    if (!workspaceSlug) return;
    try {
      await workspacesApi.removeMember(workspaceSlug, memberId);
      toast({ title: "Member removed" });
      await loadWorkspaceAndMembers();
    } catch (err) {
      toast({
        title: "Failed to remove",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{projectName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Join Link */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4 text-primary" />
              Invite link
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can join the workspace and access this project.
            </p>
            <div className="flex gap-2">
              <Input
                value={joinUrl ?? (loading ? "Loading…" : "Unavailable")}
                readOnly
                className="flex-1 text-xs font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyJoinUrl}
                disabled={!joinUrl}
                className="shrink-0"
                title="Copy invite link"
              >
                {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Invite by email */}
          <div className="space-y-2">
            <Label htmlFor="share-email">Invite by email</Label>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                id="share-email"
                type="email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!email.trim() || inviting} className="shrink-0">
                {inviting ? "Adding…" : <Mail className="h-4 w-4" />}
              </Button>
            </form>
          </div>

          {/* Post-invite callout — shown after adding an email invite */}
          {lastInvitedEmail && joinUrl && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">{lastInvitedEmail}</span> was added but no email was sent. Copy the link below and send it to them directly.
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={joinUrl}
                  readOnly
                  className="flex-1 text-xs font-mono bg-background"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button size="icon" variant="outline" onClick={handleCopyJoinUrl} className="shrink-0">
                  {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2">
            <Label>Members</Label>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No members yet. Invite someone to collaborate!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map((member) => {
                  const display = member.user
                    ? [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email || "Member"
                    : member.invitedEmail ?? "Pending";
                  const initial = (display[0] || "?").toUpperCase();

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          {member.user?.imageUrl && <AvatarImage src={member.user.imageUrl} alt="" />}
                          <AvatarFallback>{initial}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{display}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{member.role}</span>
                            {member.status === "pending" && (
                              <span className="text-amber-500">• Awaiting join</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {member.status === "pending" && joinUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            title="Copy invite link to send to this person"
                            onClick={() => handleCopyForPending(member.id)}
                          >
                            {copiedPending === member.id
                              ? <Check className="h-3.5 w-3.5 text-green-500" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {member.role !== "owner" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemove(member.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
