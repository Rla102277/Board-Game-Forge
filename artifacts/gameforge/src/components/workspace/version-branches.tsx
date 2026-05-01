import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GitBranch, GitMerge, Plus, Trash2, Code, Check } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  isMain: boolean;
  createdAt: string;
  createdBy: string;
  lastCommit?: string;
}

import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { GitBranch, GitMerge, GitCommit, Plus, Trash2, Check, X } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { GitBranch, GitMerge, GitCommit, Plus, Trash2, Check, X } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface VersionBranchesProps {
  branches: Branch[];
  currentBranch: string;
  onCreateBranch: (name: string) => void;
  onSwitchBranch: (branchId: string) => void;
  onMergeBranch: (fromBranchId: string, toBranchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  lastCommit: Date;
  commitCount?: number;
  aheadBy?: number;
  behindBy?: number;
}

export function VersionBranches({
  branches,
  currentBranch,
  onCreateBranch,
  onSwitchBranch,
  onMergeBranch,
  onDeleteBranch,
}: VersionBranchesProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    onCreateBranch(newBranchName);
    setNewBranchName("");
    setShowCreateDialog(false);
    toast({
      title: "Branch created",
      description: `Branch "${newBranchName}" has been created`,
    });
  };

  const handleSwitchBranch = (branchId: string) => {
    onSwitchBranch(branchId);
    toast({
      title: "Branch switched",
      description: `Switched to branch "${branches.find((b) => b.id === branchId)?.name}"`,
    });
  };

  const handleMerge = () => {
    if (!mergeSource || !mergeTarget) return;
    onMergeBranch(mergeSource, mergeTarget);
    setMergeSource(null);
    setMergeTarget(null);
    toast({
      title: "Branch merged",
      description: `"${branches.find((b) => b.id === mergeSource)?.name}" merged into "${branches.find((b) => b.id === mergeTarget)?.name}"`,
    });
  };

  const handleDelete = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (branch?.isDefault) {
      toast({
        title: "Cannot delete default branch",
        description: "The default branch cannot be deleted",
        variant: "destructive",
      });
      return;
    }
    onDeleteBranch(branchId);
    toast({
      title: "Branch deleted",
      description: `Branch "${branch?.name}" has been deleted`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Branches</h3>
          <Badge variant="secondary" className="text-xs">
            {branches.length} branches
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Branch
        </Button>
      </div>

      {/* Branch list */}
      <ScrollArea className="h-[350px] pr-4">
        <div className="space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`p-3 rounded-lg border ${
                branch.name === currentBranch
                  ? "border-primary bg-primary/5"
                  : "bg-card hover:bg-accent/50"
              } transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className={`h-4 w-4 ${
                    branch.name === currentBranch
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{branch.name}</span>
                      {branch.isDefault && (
                        <Badge variant="outline" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                      {branch.name === currentBranch && (
                        <Badge className="text-[10px]">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <GitCommit className="h-3 w-3" />
                      <span>
                        {branch.commitCount || 0} commits
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(branch.lastCommit), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {(branch.aheadBy !== undefined || branch.behindBy !== undefined) && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        {branch.aheadBy !== undefined && branch.aheadBy > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            {branch.aheadBy} ahead
                          </span>
                        )}
                        {branch.behindBy !== undefined && branch.behindBy > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {branch.behindBy} behind
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {branch.name !== currentBranch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSwitchBranch(branch.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Switch
                    </Button>
                  )}
                  {!branch.isDefault && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMergeSource(branch.id);
                          setMergeTarget(currentBranch);
                        }}
                      >
                        <GitMerge className="h-4 w-4 mr-1" />
                        Merge
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(branch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Create branch dialog */}
      {showCreateDialog && (
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
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBranch}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge dialog */}
      {mergeSource && mergeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-[400px] shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Merge Branch</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {branches.find((b) => b.id === mergeSource)?.name}
                </Badge>
                <span>→</span>
                <Badge variant="secondary">
                  {branches.find((b) => b.id === mergeTarget)?.name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                This will merge changes from the source branch into the target branch.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMergeSource(null);
                    setMergeTarget(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleMerge}>Merge</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  lastCommit: Date;
  commitCount?: number;
  aheadBy?: number;
  behindBy?: number;
}

export function VersionBranches({
  branches,
  currentBranch,
  onCreateBranch,
  onSwitchBranch,
  onMergeBranch,
  onDeleteBranch,
}: VersionBranchesProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    onCreateBranch(newBranchName);
    setNewBranchName("");
    setShowCreateDialog(false);
    toast({
      title: "Branch created",
      description: `Branch "${newBranchName}" has been created`,
    });
  };

  const handleSwitchBranch = (branchId: string) => {
    onSwitchBranch(branchId);
    toast({
      title: "Branch switched",
      description: `Switched to branch "${branches.find((b) => b.id === branchId)?.name}"`,
    });
  };

  const handleMerge = () => {
    if (!mergeSource || !mergeTarget) return;
    onMergeBranch(mergeSource, mergeTarget);
    setMergeSource(null);
    setMergeTarget(null);
    toast({
      title: "Branch merged",
      description: `"${branches.find((b) => b.id === mergeSource)?.name}" merged into "${branches.find((b) => b.id === mergeTarget)?.name}"`,
    });
  };

  const handleDelete = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (branch?.isDefault) {
      toast({
        title: "Cannot delete default branch",
        description: "The default branch cannot be deleted",
        variant: "destructive",
      });
      return;
    }
    onDeleteBranch(branchId);
    toast({
      title: "Branch deleted",
      description: `Branch "${branch?.name}" has been deleted`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Branches</h3>
          <Badge variant="secondary" className="text-xs">
            {branches.length} branches
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Branch
        </Button>
      </div>

      {/* Branch list */}
      <ScrollArea className="h-[350px] pr-4">
        <div className="space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`p-3 rounded-lg border ${
                branch.name === currentBranch
                  ? "border-primary bg-primary/5"
                  : "bg-card hover:bg-accent/50"
              } transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className={`h-4 w-4 ${
                    branch.name === currentBranch
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{branch.name}</span>
                      {branch.isDefault && (
                        <Badge variant="outline" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                      {branch.name === currentBranch && (
                        <Badge className="text-[10px]">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <GitCommit className="h-3 w-3" />
                      <span>
                        {branch.commitCount || 0} commits
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(branch.lastCommit), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {(branch.aheadBy !== undefined || branch.behindBy !== undefined) && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        {branch.aheadBy !== undefined && branch.aheadBy > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            {branch.aheadBy} ahead
                          </span>
                        )}
                        {branch.behindBy !== undefined && branch.behindBy > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {branch.behindBy} behind
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {branch.name !== currentBranch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSwitchBranch(branch.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Switch
                    </Button>
                  )}
                  {!branch.isDefault && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMergeSource(branch.id);
                          setMergeTarget(currentBranch);
                        }}
                      >
                        <GitMerge className="h-4 w-4 mr-1" />
                        Merge
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(branch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Create branch dialog */}
      {showCreateDialog && (
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
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBranch}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge dialog */}
      {mergeSource && mergeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-[400px] shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Merge Branch</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {branches.find((b) => b.id === mergeSource)?.name}
                </Badge>
                <span>→</span>
                <Badge variant="secondary">
                  {branches.find((b) => b.id === mergeTarget)?.name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                This will merge changes from the source branch into the target branch.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMergeSource(null);
                    setMergeTarget(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleMerge}>Merge</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function VersionBranches({ 
  branches, 
  currentBranch, 
  onCreateBranch, 
  onSwitchBranch, 
  onMergeBranch, 
  onDeleteBranch 
}: VersionBranchesProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [mergeSource, setMergeSource] = useState<string | null>(null);

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      onCreateBranch(newBranchName.trim());
      setNewBranchName("");
      setShowCreate(false);
    }
  };

  const handleMerge = (sourceId: string) => {
    if (confirm(`Merge ${branches.find(b => b.id === sourceId)?.name} into main?`)) {
      onMergeBranch(sourceId, branches.find(b => b.isMain)?.id || "");
      setMergeSource(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Version Branches
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-2" />
            New Branch
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Branch name"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
            />
            <Button onClick={handleCreateBranch}>Create</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        )}

        <div className="space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`p-3 border rounded-lg flex items-center justify-between ${
                branch.id === currentBranch ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <Code className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{branch.name}</span>
                    {branch.isMain && <Badge variant="secondary" className="text-[10px]">main</Badge>}
                    {branch.id === currentBranch && <Badge variant="default" className="text-[10px]">current</Badge>}
                  </div>
                  {branch.lastCommit && (
                    <p className="text-xs text-muted-foreground mt-1">{branch.lastCommit}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!branch.isMain && branch.id !== currentBranch && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSwitchBranch(branch.id)}
                    >
                      Switch
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setMergeSource(mergeSource === branch.id ? null : branch.id)}
                    >
                      <GitMerge className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => onDeleteBranch(branch.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {mergeSource && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Merge into main</p>
            <div className="flex gap-2">
              <Button onClick={() => handleMerge(mergeSource)}>
                <GitMerge className="h-4 w-4 mr-2" />
                Confirm Merge
              </Button>
              <Button variant="outline" onClick={() => setMergeSource(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
