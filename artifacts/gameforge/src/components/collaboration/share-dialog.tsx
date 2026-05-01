import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Check,
  Link2,
  Globe,
  Mail,
  UserPlus,
  Trash2,
  Shield,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useListShares, useCreateShare, useUpdateShare, useRemoveShare } from "@/hooks/use-collaboration";
import { ROLE_LABELS, type ProjectRole } from "@/lib/collaboration-types";
import { Switch } from "@/components/ui/switch";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName?: string;
  canManage?: boolean;
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  canManage = true,
}: ShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("viewer");
  const [publicLinkEnabled, setPublicLinkEnabled] = useState(false);
  const [publicRole, setPublicRole] = useState<ProjectRole>("viewer");

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/project/${projectId}`
      : `/project/${projectId}`;

  const { data: shares, isLoading } = useListShares(projectId);
  const createShare = useCreateShare();
  const updateShare = useUpdateShare();
  const removeShare = useRemoveShare();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

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

  const handleRoleChange = async (shareId: number, role: ProjectRole) => {
    try {
      await updateShare.mutateAsync({ projectId, shareId, role });
      toast({ title: "Permission updated" });
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleRemove = async (shareId: number) => {
    try {
      await removeShare.mutateAsync({ projectId, shareId });
      toast({ title: "Access removed" });
    } catch (err) {
      toast({ title: "Remove failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const roleOptions: ProjectRole[] = ["admin", "editor", "commenter", "viewer"];

  const members = useMemo(() => shares?.filter((s) => s.user) ?? [], [shares]);
  const pending = useMemo(() => shares?.filter((s) => !s.user && s.email) ?? [], [shares]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShareIcon className="h-5 w-5" />
            Share {projectName ? `"${projectName}"` : "project"}
          </DialogTitle>
          <DialogDescription>
            Manage who can access this project and what they can do.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-hidden">
          {canManage && (
            <>
              <form onSubmit={handleInvite} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Invite by email
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={createShare.isPending}
                  />
                </div>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectRole)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={!inviteEmail.trim() || createShare.isPending}>
                  {createShare.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </form>

              <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" /> Public link
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Allow anyone with the link to access</Label>
                    <p className="text-[10px] text-muted-foreground">No sign-in required</p>
                  </div>
                  <Switch checked={publicLinkEnabled} onCheckedChange={setPublicLinkEnabled} />
                </div>
                {publicLinkEnabled && (
                  <>
                    <Select value={publicRole} onValueChange={(v) => setPublicRole(v as ProjectRole)}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Permission level" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={shareUrl} className="text-xs font-mono bg-background" />
                      <Button size="icon" variant="outline" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2 min-h-0 flex flex-col">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              People with access
            </Label>
            <ScrollArea className="flex-1 -mx-1 px-1">
              {isLoading ? (
                <div className="space-y-2 py-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted" />
                      <div className="flex-1 h-4 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  {members.map((share) => {
                    const display = [share.user!.firstName, share.user!.lastName].filter(Boolean).join(" ") || share.user!.email || "User";
                    const initial = (display[0] ?? "?").toUpperCase();
                    const isOwner = share.role === "owner";
                    return (
                      <div key={share.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                        <Avatar className="h-8 w-8">
                          {share.user!.imageUrl && <AvatarImage src={share.user!.imageUrl} alt="" />}
                          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{display}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{share.user!.email}</div>
                        </div>
                        {isOwner ? (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Owner
                          </span>
                        ) : canManage ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={share.role}
                              onValueChange={(v) => handleRoleChange(share.id, v as ProjectRole)}
                            >
                              <SelectTrigger className="h-7 text-[10px] w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((r) => (
                                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemove(share.id)}
                              disabled={removeShare.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{ROLE_LABELS[share.role]}</span>
                        )}
                      </div>
                    );
                  })}
                  {pending.map((share) => (
                    <div key={share.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors opacity-70">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{share.email}</div>
                        <div className="text-[10px] text-muted-foreground">Pending invitation</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{ROLE_LABELS[share.role]}</span>
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
                    </div>
                  ))}
                  {members.length === 0 && pending.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No one has access yet.</div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
