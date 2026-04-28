import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSnapshots,
  useCreateSnapshot,
  useDeleteSnapshot,
  useRestoreSnapshot,
  useDuplicateProject,
  useForkSnapshot,
  getListSnapshotsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  History,
  Save,
  RotateCcw,
  Copy,
  GitFork,
  Trash2,
  Sparkles,
} from "lucide-react";

interface ProjectVersionsProps {
  projectId: number;
}

function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ProjectVersions({ projectId }: ProjectVersionsProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: snapshots, isLoading, isError, refetch: refetchSnapshots } =
    useListSnapshots(projectId);
  const createSnapshot = useCreateSnapshot();
  const deleteSnapshot = useDeleteSnapshot();
  const restoreSnapshot = useRestoreSnapshot();
  const duplicateProject = useDuplicateProject();
  const forkSnapshot = useForkSnapshot();

  const [newName, setNewName] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: getListSnapshotsQueryKey(projectId) });

  // Wholesale invalidation after a restore — every part of the project may have changed.
  const invalidateAllProjectData = () => {
    queryClient.invalidateQueries();
  };

  const handleSave = async () => {
    const name = newName.trim();
    if (!name) {
      toast({ title: "Name required", description: "Give this version a short name.", variant: "destructive" });
      return;
    }
    try {
      await createSnapshot.mutateAsync({ projectId, data: { name } });
      setNewName("");
      toast({ title: "Version saved", description: `Saved "${name}".` });
      refreshList();
    } catch (e) {
      toast({
        title: "Could not save version",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    const target = restoreTarget;
    setRestoreTarget(null);
    try {
      await restoreSnapshot.mutateAsync({ projectId, snapshotId: target.id });
      invalidateAllProjectData();
      toast({
        title: "Version restored",
        description: `Restored "${target.name}". The previous state was auto-saved as a version you can return to.`,
      });
    } catch (e) {
      toast({
        title: "Restore failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteSnapshot.mutateAsync({ projectId, snapshotId: target.id });
      refreshList();
      toast({ title: "Version deleted", description: `Removed "${target.name}".` });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const project = await duplicateProject.mutateAsync({ projectId, data: {} });
      toast({
        title: "Project duplicated",
        description: `Opening "${project.name}".`,
      });
      setLocation(`/p/${project.id}`);
    } catch (e) {
      toast({
        title: "Duplicate failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setDuplicating(false);
    }
  };

  const handleFork = async (snapshotId: number, snapshotName: string) => {
    try {
      const project = await forkSnapshot.mutateAsync({ projectId, snapshotId, data: {} });
      toast({
        title: "Forked from version",
        description: `Created a new project from "${snapshotName}". Opening it now.`,
      });
      setLocation(`/p/${project.id}`);
    } catch (e) {
      toast({
        title: "Fork failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const list = snapshots ?? [];
  const isSaving = createSnapshot.isPending;

  return (
    <Card data-testid="project-versions-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-4 w-4 text-primary" /> Versions
        </CardTitle>
        <CardDescription>
          Save named snapshots of your project. Restore anytime — your current state is auto-saved before a restore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Save inline form */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Version name (e.g. 'Pre-playtest v1')"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            disabled={isSaving}
            data-testid="version-name-input"
            maxLength={200}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !newName.trim()}
              data-testid="save-version-button"
            >
              <Save className="h-4 w-4 mr-2" /> Save version
            </Button>
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={duplicating}
              data-testid="duplicate-project-button"
              title="Duplicate this project as a new project"
            >
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </Button>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div
            className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded-md py-4 px-4 flex items-center justify-between gap-3"
            data-testid="versions-error"
          >
            <span>Couldn't load saved versions.</span>
            <Button variant="outline" size="sm" onClick={() => refetchSnapshots()}>
              Retry
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground border border-dashed rounded-md py-6 px-4">
            <Sparkles className="h-4 w-4 mx-auto mb-2 text-muted-foreground" />
            No versions yet. Save one before a big change so you can always come back.
          </div>
        ) : (
          <ul className="divide-y border rounded-md">
            {list.map((snap) => (
              <li
                key={snap.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3"
                data-testid={`version-row-${snap.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{snap.name}</span>
                    {snap.isAutoSnapshot && (
                      <span className="text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(snap.createdAt)}
                    {snap.createdByName ? ` · ${snap.createdByName}` : ""}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRestoreTarget({ id: snap.id, name: snap.name })}
                    disabled={restoreSnapshot.isPending}
                    data-testid={`restore-version-${snap.id}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFork(snap.id, snap.name)}
                    disabled={forkSnapshot.isPending}
                    data-testid={`fork-version-${snap.id}`}
                  >
                    <GitFork className="h-3.5 w-3.5 mr-1.5" /> Fork
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget({ id: snap.id, name: snap.name })}
                    disabled={deleteSnapshot.isPending}
                    data-testid={`delete-version-${snap.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Restore confirmation */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore "{restoreTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces your current entities, rules, players, notes, tasks, research,
              assets, playtests and storyboard with the saved version. Your current state
              will be auto-saved as a new version first, so you can always come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm} data-testid="restore-confirm-button">
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the saved version. Your live project is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-confirm-button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
