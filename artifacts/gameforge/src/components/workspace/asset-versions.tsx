import { useState } from "react";
import {
  useListAssetVersions,
  useCreateAssetVersion,
  useRestoreAssetVersion,
  useDeleteAssetVersion,
  getListAssetVersionsQueryKey,
  getListAssetsQueryKey,
  type AssetVersion,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { History, RotateCcw, Trash2, Download, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AssetVersionsProps {
  projectId: number;
  assetId: number;
  currentImageDataUrl: string | null | undefined;
  assetName: string;
}

export function AssetVersions({
  projectId,
  assetId,
  currentImageDataUrl,
  assetName,
}: AssetVersionsProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshotNotes, setSnapshotNotes] = useState("");

  const { data: versions = [] } = useListAssetVersions(projectId, assetId);
  const createVersion = useCreateAssetVersion();
  const restoreVersion = useRestoreAssetVersion();
  const deleteVersion = useDeleteAssetVersion();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListAssetVersionsQueryKey(projectId, assetId) });
    qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
  };

  const onSnapshot = async () => {
    if (!currentImageDataUrl) {
      toast({ title: "No image to snapshot", description: "Generate or upload an image first.", variant: "destructive" });
      return;
    }
    try {
      await createVersion.mutateAsync({
        projectId,
        assetId,
        data: {
          versionLabel: snapshotLabel.trim() || undefined,
          notes: snapshotNotes.trim() || undefined,
        },
      });
      refresh();
      setSnapshotOpen(false);
      setSnapshotLabel("");
      setSnapshotNotes("");
      toast({ title: "Version saved" });
    } catch (err) {
      toast({ title: "Snapshot failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const onRestore = async (v: AssetVersion) => {
    if (!confirm(`Restore version ${v.versionLabel || `#${v.id}`}? This will overwrite the current image.`)) return;
    try {
      await restoreVersion.mutateAsync({ projectId, assetId, versionId: v.id });
      refresh();
      toast({ title: "Version restored" });
    } catch (err) {
      toast({ title: "Restore failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const onDelete = async (v: AssetVersion) => {
    if (!confirm(`Delete version ${v.versionLabel || `#${v.id}`}? This cannot be undone.`)) return;
    try {
      await deleteVersion.mutateAsync({ projectId, assetId, versionId: v.id });
      refresh();
      toast({ title: "Version deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const onDownload = (v: AssetVersion) => {
    if (!v.imageDataUrl) {
      toast({ title: "No image data", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = v.imageDataUrl;
    const safeName = assetName.replace(/[^a-z0-9-_]+/gi, "_");
    const safeLabel = (v.versionLabel || `v${v.id}`).replace(/[^a-z0-9-_]+/gi, "_");
    a.download = `${safeName}_${safeLabel}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isCurrent = (v: AssetVersion) =>
    !!currentImageDataUrl && v.imageDataUrl === currentImageDataUrl;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <History className="h-3 w-3" />
          Version History {versions.length > 0 && <span className="text-foreground/70">({versions.length})</span>}
        </button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setSnapshotOpen(true)}
          disabled={!currentImageDataUrl}
          title={!currentImageDataUrl ? "No current image to snapshot" : "Save current image as a new version"}
        >
          <Save className="h-3 w-3" /> Save as version
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {versions.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-2 py-3 border border-dashed border-border rounded-md text-center">
              No saved versions yet. Click "Save as version" to snapshot the current image.
            </p>
          )}
          {versions.map((v) => {
            const current = isCurrent(v);
            return (
              <div
                key={v.id}
                className={`p-2 border rounded-md flex items-start gap-2 ${current ? "border-primary/40 bg-primary/5" : "border-border"}`}
              >
                {v.imageDataUrl && (
                  <img
                    src={v.imageDataUrl}
                    alt=""
                    className="h-10 w-10 rounded object-cover shrink-0 border border-border"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium truncate">
                      {v.versionLabel || `Version #${v.id}`}
                    </span>
                    {current && <Badge variant="default" className="h-4 text-[9px] px-1">Current</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(v.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                  {v.notes && <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{v.notes}</p>}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {v.imageDataUrl && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDownload(v)} title="Download">
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  {!current && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRestore(v)} title="Restore">
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onDelete(v)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save current image as version</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {currentImageDataUrl && (
              <img
                src={currentImageDataUrl}
                alt="current"
                className="w-full h-32 object-contain bg-muted/30 rounded border border-border"
              />
            )}
            <div className="space-y-1">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="e.g. v1 — first prototype"
                maxLength={80}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                rows={3}
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
                placeholder="What changed in this version?"
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotOpen(false)}>Cancel</Button>
            <Button onClick={onSnapshot} disabled={createVersion.isPending}>
              {createVersion.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
