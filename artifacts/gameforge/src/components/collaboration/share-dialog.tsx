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
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/project/${projectId}`
      : `/project/${projectId}`;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Share {projectName ? `"${projectName}"` : "project"}
          </DialogTitle>
          <DialogDescription>
            Anyone with the link who has access to your workspace can open this
            project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="share-url">Project link</Label>
          <div className="flex gap-2">
            <Input id="share-url" readOnly value={shareUrl} />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Inviting collaborators is coming soon.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
