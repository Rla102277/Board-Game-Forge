import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { History, Clock, RotateCcw, Eye, Trash2, Save } from "lucide-react";
import { collaborationApi, type ProjectVersion } from "@/lib/collaboration";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import * as diff from "diff";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Clock, RotateCcw, GitBranch, GitCommit, GitMerge } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Clock, RotateCcw, GitBranch, GitCommit, GitMerge } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface VersionHistoryProps {
  projectId: number;
}

interface Version {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  branch: string;
  isCurrent: boolean;
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  lastCommit: Date;
}

export function VersionHistory({ projectId }: VersionHistoryProps) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  useEffect(() => {
    // Mock data for demonstration
    setBranches([
      { id: "main", name: "main", isDefault: true, lastCommit: new Date() },
      { id: "feature-1", name: "feature/new-ui", isDefault: false, lastCommit: new Date(Date.now() - 86400000) },
      { id: "feature-2", name: "feature/analytics", isDefault: false, lastCommit: new Date(Date.now() - 172800000) },
    ]);

    setVersions([
      {
        id: 1,
        name: "v1.0.0",
        description: "Initial release",
        createdAt: new Date(Date.now() - 604800000),
        createdBy: "user1",
        createdByName: "Alice Johnson",
        branch: "main",
        isCurrent: true,
      },
      {
        id: 2,
        name: "v1.1.0",
        description: "Added collaboration features",
        createdAt: new Date(Date.now() - 259200000),
        createdBy: "user2",
        createdByName: "Bob Smith",
        branch: "main",
        isCurrent: false,
      },
      {
        id: 3,
        name: "v2.0.0-beta",
        description: "Beta version with new UI",
        createdAt: new Date(Date.now() - 86400000),
        createdBy: "user1",
        createdByName: "Alice Johnson",
        branch: "feature/new-ui",
        isCurrent: false,
      },
    ]);
  }, [projectId]);

  const handleRestore = (versionId: number) => {
    toast({
      title: "Version restored",
      description: `Version ${versionId} has been restored`,
    });
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      isDefault: false,
      lastCommit: new Date(),
    };

    setBranches([...branches, newBranch]);
    setNewBranchName("");
    setShowBranchDialog(false);

    toast({
      title: "Branch created",
      description: `Branch "${newBranchName}" has been created`,
    });
  };

  const handleMergeBranch = (fromBranch: string, toBranch: string) => {
    toast({
      title: "Branch merged",
      description: `"${fromBranch}" has been merged into "${toBranch}"`,
    });
  };

  const handleDeleteBranch = (branchId: string) => {
    setBranches(branches.filter((b) => b.id !== branchId));
    toast({
      title: "Branch deleted",
      description: "Branch has been deleted",
    });
  };

  const filteredVersions = versions.filter((v) => v.branch === selectedBranch);

  return (
    <div className="space-y-6">
      {/* Branch selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.name}>
                {branch.name} {branch.isDefault ? "(default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBranchDialog(true)}
          >
            <GitBranch className="h-4 w-4 mr-1" />
            New Branch
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMergeBranch(selectedBranch, "main")}
          >
            <GitMerge className="h-4 w-4 mr-1" />
            Merge
          </Button>
        </div>
      </div>

      {/* Version list */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No versions in this branch</p>
            </div>
          ) : (
            filteredVersions.map((version) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border ${
                  version.isCurrent
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:bg-accent/50"
                } transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarImage src={`/avatars/${version.createdBy}`} />
                      <AvatarFallback>
                        {version.createdByName?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.name}</span>
                        {version.isCurrent && (
                          <Badge variant="default" className="text-[10px]">
                            Current
                          </Badge>
                        )}
                      </div>
                      {version.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {version.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <span>by {version.createdByName || "Unknown"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!version.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(version.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create branch dialog */}
      {showBranchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-[400px] shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Create New Branch</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Branch name</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/my-new-feature"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateBranch();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBranchDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBranch}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Version {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  branch: string;
  isCurrent: boolean;
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  lastCommit: Date;
}

export function VersionHistory({ projectId }: VersionHistoryProps) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  useEffect(() => {
    // Mock data for demonstration
    setBranches([
      { id: "main", name: "main", isDefault: true, lastCommit: new Date() },
      { id: "feature-1", name: "feature/new-ui", isDefault: false, lastCommit: new Date(Date.now() - 86400000) },
      { id: "feature-2", name: "feature/analytics", isDefault: false, lastCommit: new Date(Date.now() - 172800000) },
    ]);

    setVersions([
      {
        id: 1,
        name: "v1.0.0",
        description: "Initial release",
        createdAt: new Date(Date.now() - 604800000),
        createdBy: "user1",
        createdByName: "Alice Johnson",
        branch: "main",
        isCurrent: true,
      },
      {
        id: 2,
        name: "v1.1.0",
        description: "Added collaboration features",
        createdAt: new Date(Date.now() - 259200000),
        createdBy: "user2",
        createdByName: "Bob Smith",
        branch: "main",
        isCurrent: false,
      },
      {
        id: 3,
        name: "v2.0.0-beta",
        description: "Beta version with new UI",
        createdAt: new Date(Date.now() - 86400000),
        createdBy: "user1",
        createdByName: "Alice Johnson",
        branch: "feature/new-ui",
        isCurrent: false,
      },
    ]);
  }, [projectId]);

  const handleRestore = (versionId: number) => {
    toast({
      title: "Version restored",
      description: `Version ${versionId} has been restored`,
    });
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      isDefault: false,
      lastCommit: new Date(),
    };

    setBranches([...branches, newBranch]);
    setNewBranchName("");
    setShowBranchDialog(false);

    toast({
      title: "Branch created",
      description: `Branch "${newBranchName}" has been created`,
    });
  };

  const handleMergeBranch = (fromBranch: string, toBranch: string) => {
    toast({
      title: "Branch merged",
      description: `"${fromBranch}" has been merged into "${toBranch}"`,
    });
  };

  const handleDeleteBranch = (branchId: string) => {
    setBranches(branches.filter((b) => b.id !== branchId));
    toast({
      title: "Branch deleted",
      description: "Branch has been deleted",
    });
  };

  const filteredVersions = versions.filter((v) => v.branch === selectedBranch);

  return (
    <div className="space-y-6">
      {/* Branch selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.name}>
                {branch.name} {branch.isDefault ? "(default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBranchDialog(true)}
          >
            <GitBranch className="h-4 w-4 mr-1" />
            New Branch
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMergeBranch(selectedBranch, "main")}
          >
            <GitMerge className="h-4 w-4 mr-1" />
            Merge
          </Button>
        </div>
      </div>

      {/* Version list */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No versions in this branch</p>
            </div>
          ) : (
            filteredVersions.map((version) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border ${
                  version.isCurrent
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:bg-accent/50"
                } transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarImage src={`/avatars/${version.createdBy}`} />
                      <AvatarFallback>
                        {version.createdByName?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.name}</span>
                        {version.isCurrent && (
                          <Badge variant="default" className="text-[10px]">
                            Current
                          </Badge>
                        )}
                      </div>
                      {version.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {version.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <span>by {version.createdByName || "Unknown"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!version.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(version.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create branch dialog */}
      {showBranchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-[400px] shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Create New Branch</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Branch name</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/my-new-feature"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateBranch();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBranchDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBranch}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DiffViewProps {
  oldText: string;
  newText: string;
  title: string;
}

function DiffView({ oldText, newText, title }: DiffViewProps) {
  const changes = diff.diffLines(oldText, newText);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="font-mono text-xs bg-muted rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
        {changes.map((change: diff.Change, i: number) => {
          let colorClass = "bg-transparent";
          let prefix = "  ";

          if (change.added) {
            colorClass = "bg-green-500/20";
            prefix = "+ ";
          } else if (change.removed) {
            colorClass = "bg-red-500/20";
            prefix = "- ";
          }

          return (
            <div key={i} className={`${colorClass} whitespace-pre-wrap`}>
              {change.value.split("\n").map((line: string, j: number) => (
                <div key={j}>
                  {prefix}{line}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VersionHistory({ projectId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{ v1: ProjectVersion | null; v2: ProjectVersion | null }>({
    v1: null,
    v2: null,
  });
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await collaborationApi.listVersions(projectId);
      setVersions(data);
    } catch (err) {
      toast({
        title: "Failed to load versions",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim()) return;

    try {
      setCreating(true);
      await collaborationApi.createVersion(projectId, {
        version: version.trim(),
        description: description.trim() || undefined,
      });
      setVersion("");
      setDescription("");
      setCreateDialogOpen(false);
      await loadVersions();
      toast({
        title: "Version created",
        description: `Version ${version} has been saved`,
      });
    } catch (err) {
      toast({
        title: "Failed to create version",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (versionId: number) => {
    if (!confirm("Are you sure you want to restore this version? This will overwrite the current project state.")) {
      return;
    }

    try {
      await collaborationApi.restoreVersion(projectId, versionId);
      toast({
        title: "Version restored",
        description: "Project has been restored to this version",
      });
    } catch (err) {
      toast({
        title: "Failed to restore version",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCompare = async () => {
    if (!selectedVersions.v1 || !selectedVersions.v2) return;

    setDiffDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-4 w-4" /> Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-4 w-4" /> Version History
            </CardTitle>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Save className="h-4 w-4" /> Save Version
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save New Version</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateVersion} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="version">Version Number</Label>
                    <Input
                      id="version"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="e.g. 1.0.0"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What changed in this version?"
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!version.trim() || creating}>
                      {creating ? "Saving..." : "Save Version"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No versions saved yet. Create a version to save a snapshot of your project.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      selectedVersions.v1?.id === v.id || selectedVersions.v2?.id === v.id
                        ? "border-primary bg-primary/5"
                        : "bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{v.version}</span>
                          {v.id === versions[0]?.id && (
                            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">
                              Latest
                            </span>
                          )}
                        </div>
                        {v.description && (
                          <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(v.createdAt), "MMM d, yyyy, h:mm a")}
                          </span>
                          <span>
                            by {v.creator.firstName} {v.creator.lastName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!selectedVersions.v1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVersions({ ...selectedVersions, v1: v })}
                          >
                            Compare from
                          </Button>
                        )}
                        {selectedVersions.v1 && !selectedVersions.v2 && selectedVersions.v1.id !== v.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVersions({ ...selectedVersions, v2: v })}
                          >
                            Compare to
                          </Button>
                        )}
                        {selectedVersions.v2 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedVersions({ v1: null, v2: null })}
                          >
                            Clear
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRestore(v.id)}
                          title="Restore this version"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedVersions.v1 && selectedVersions.v2 && (
                <div className="mt-4 pt-4 border-t">
                  <Button onClick={handleCompare} className="w-full gap-2">
                    <Eye className="h-4 w-4" /> Compare {selectedVersions.v1.version} with {selectedVersions.v2.version}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Diff Dialog */}
      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version Comparison: {selectedVersions.v1?.version} → {selectedVersions.v2?.version}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedVersions.v1?.snapshot && selectedVersions.v2?.snapshot && (
              <>
                <DiffView
                  oldText={JSON.stringify(selectedVersions.v1.snapshot.entities, null, 2)}
                  newText={JSON.stringify(selectedVersions.v2.snapshot.entities, null, 2)}
                  title="Entities"
                />
                <DiffView
                  oldText={JSON.stringify(selectedVersions.v1.snapshot.rules, null, 2)}
                  newText={JSON.stringify(selectedVersions.v2.snapshot.rules, null, 2)}
                  title="Rules"
                />
                <DiffView
                  oldText={JSON.stringify(selectedVersions.v1.snapshot.players, null, 2)}
                  newText={JSON.stringify(selectedVersions.v2.snapshot.players, null, 2)}
                  title="Players"
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
