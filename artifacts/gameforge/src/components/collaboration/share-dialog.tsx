import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Share2, Mail, Copy, Check, X, Shield, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProject } from "@workspace/api-client-react";
import { workspacesApi, type WorkspaceMember } from "@/lib/workspaces-api";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
}

interface Member {
  id: number;
  role: string;
  status: string;
  invitedEmail: string | null;
  user: {
    id: number;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | null;
  joinedAt: string | null;
  invitedAt: string;
}

export function ShareDialog({ open, onOpenChange, projectId, projectName }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: project } = useGetProject(projectId);

  useEffect(() => {
    if (open) {
      loadWorkspaceAndMembers();
    }
  }, [open, project]);

  const loadWorkspaceAndMembers = async () => {
    try {
      setLoading(true);
      // Get all workspaces to find the one containing this project
      const workspaces = await workspacesApi.list();
      
      // Check each workspace's projects to find which one contains our project
      let foundWorkspaceSlug: string | null = null;
      let foundMembers: WorkspaceMember[] = [];
      
      for (const workspace of workspaces) {
        try {
          const detail = await workspacesApi.detail(workspace.slug);
          const projectInWorkspace = detail.projects.find(p => p.id === projectId);
          if (projectInWorkspace) {
            foundWorkspaceSlug = workspace.slug;
            foundMembers = detail.members;
            break;
          }
        } catch (e) {
          // Skip workspaces we can't access
          continue;
        }
      }
      
      if (!foundWorkspaceSlug) {
        console.error("Workspace not found for project");
        setMembers([]);
        return;
      }

      setWorkspaceSlug(foundWorkspaceSlug);
      setMembers(foundMembers);
    } catch (err) {
      console.error("Failed to load members:", err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !workspaceSlug) return;

    try {
      setInviting(true);
      await workspacesApi.invite(workspaceSlug, email.trim(), role);
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email}`,
      });
      setEmail("");
      await loadWorkspaceAndMembers();
    } catch (err) {
      toast({
        title: "Failed to invite",
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
      toast({
        title: "Member removed",
        description: "Member has been removed from the workspace",
      });
      await loadWorkspaceAndMembers();
    } catch (err) {
      toast({
        title: "Failed to remove",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/workspace/${projectId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    });
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

        <div className="space-y-6 py-4">
          {/* Share Link */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/workspace/${projectId}`}
                readOnly
                className="flex-1 text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Invite Form */}
          <div className="space-y-2">
            <Label>Invite by Email</Label>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!email.trim() || inviting} className="shrink-0">
                {inviting ? "Sending..." : <Mail className="h-4 w-4" />}
              </Button>
            </form>
          </div>

          {/* Members List */}
          <div className="space-y-3">
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
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {member.user?.imageUrl ? (
                          <AvatarImage src={member.user.imageUrl} alt="" />
                        ) : (
                          <AvatarFallback>
                            {member.user?.firstName?.[0] || member.user?.lastName?.[0] || "?"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {member.user
                            ? `${member.user.firstName} ${member.user.lastName}`
                            : member.invitedEmail}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{member.role}</span>
                          {member.status === "pending" && (
                            <span className="text-orange-500">• Pending</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {member.role !== "owner" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
