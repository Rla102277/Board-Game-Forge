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

interface VersionBranchesProps {
  branches: Branch[];
  currentBranch: string;
  onCreateBranch: (name: string) => void;
  onSwitchBranch: (branchId: string) => void;
  onMergeBranch: (fromBranchId: string, toBranchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
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
