import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertCircle,
  Check,
  Copy,
  Link2,
  Mail,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { workspacesApi, type WorkspaceMember } from "@/lib/workspaces-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  members: WorkspaceMember[];
  canManage: boolean;
  onChanged: () => void;
}

export function MembersDialog({
  open,
  onOpenChange,
  workspaceSlug,
  members,
  canManage,
  onChanged,
}: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPending, setCopiedPending] = useState<number | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (open && canManage) {
      workspacesApi
        .getInviteCode(workspaceSlug)
        .then((r) => setJoinUrl(r.joinUrl))
        .catch(() => {
          /* non-fatal */
        });
    }
    if (!open) setLastInvitedEmail(null);
  }, [open, canManage, workspaceSlug]);

  const copyLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshLink = async () => {
    setBusy(true);
    try {
      const r = await workspacesApi.refreshInviteCode(workspaceSlug);
      setJoinUrl(r.joinUrl);
      toast({
        title: "Invite link refreshed",
        description: "The old link is now invalid.",
      });
    } catch (err) {
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const copyForPending = async (memberId: number) => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopiedPending(memberId);
    setTimeout(() => setCopiedPending(null), 2000);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const invitedEmail = email.trim();
    setBusy(true);
    try {
      await workspacesApi.invite(workspaceSlug, invitedEmail);
      setEmail("");
      setLastInvitedEmail(invitedEmail);
      onChanged();
    } catch (err) {
      toast({
        title: "Invite failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (memberId: number) => {
    setBusy(true);
    try {
      await workspacesApi.removeMember(workspaceSlug, memberId);
      toast({ title: "Member removed" });
      onChanged();
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Workspace members
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {canManage && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4 text-primary" /> Invite link
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can join this workspace as a member.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={joinUrl ?? "Generating…"}
                    className="text-xs font-mono bg-background"
                    onClick={(e) =>
                      (e.target as HTMLInputElement).select()
                    }
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyLink}
                    disabled={!joinUrl}
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={refreshLink}
                    disabled={busy}
                    title="Reset link"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <form onSubmit={invite} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-email">
                    Or reserve a spot by email
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <Button type="submit" disabled={busy || !email.trim()}>
                  Add
                </Button>
              </form>

              {lastInvitedEmail && joinUrl && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{lastInvitedEmail}</span>{" "}
                      was added but no email was sent. Send them the invite
                      link so they can join.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={joinUrl}
                      className="text-xs font-mono bg-background"
                      onClick={(e) =>
                        (e.target as HTMLInputElement).select()
                      }
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyLink}
                      title="Copy link"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="border rounded-md divide-y">
            {members.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No members yet.
              </div>
            )}
            {members.map((m) => {
              const display = m.user
                ? [m.user.firstName, m.user.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  m.user.email ||
                  "Member"
                : (m.invitedEmail ?? "Pending");
              const initial = (display[0] || "?").toUpperCase();
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3"
                  data-testid={`member-row-${m.id}`}
                >
                  <Avatar className="h-9 w-9">
                    {m.user?.imageUrl && (
                      <AvatarImage src={m.user.imageUrl} alt="" />
                    )}
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {display}
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {m.user?.email ?? m.invitedEmail}
                      {m.status === "pending" && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                          <Mail className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mr-1">
                    {m.role}
                  </div>
                  {canManage && m.status === "pending" && joinUrl && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground"
                      title="Copy invite link to send to this person"
                      onClick={() => copyForPending(m.id)}
                      disabled={busy}
                    >
                      {copiedPending === m.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  {canManage && m.role !== "owner" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m.id)}
                      disabled={busy}
                      data-testid={`member-remove-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
