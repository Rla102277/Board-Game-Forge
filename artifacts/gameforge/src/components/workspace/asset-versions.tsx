import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Eye, RotateCcw, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

interface AssetVersion {
  id: number;
  version: string;
  url: string;
  thumbnail?: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
  isCurrent: boolean;
}

interface AssetVersionsProps {
  assetId: number;
  versions: AssetVersion[];
  onRestore: (versionId: number) => void;
  onDelete: (versionId: number) => void;
  onDownload: (versionId: number) => void;
}

export function AssetVersions({ assetId, versions, onRestore, onDelete, onDownload }: AssetVersionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (versions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Version History ({versions.length})
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-3 border rounded-lg ${version.isCurrent ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {version.thumbnail && (
                      <img src={version.thumbnail} alt="" className="h-12 w-12 rounded object-cover" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.version}</span>
                        {version.isCurrent && (
                          <Badge variant="default" className="text-[10px]">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(version.createdAt), "MMM d, yyyy h:mm a")} by {version.createdBy}
                      </p>
                      {version.notes && (
                        <p className="text-sm mt-2">{version.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onDownload(version.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!version.isCurrent && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onRestore(version.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(version.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface VersionComparisonProps {
  version1: AssetVersion;
  version2: AssetVersion;
}

export function VersionComparison({ version1, version2 }: VersionComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{version1.version}</p>
            <img src={version1.url} alt="" className="w-full rounded border" />
            <p className="text-xs text-muted-foreground">
              {format(new Date(version1.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{version2.version}</p>
            <img src={version2.url} alt="" className="w-full rounded border" />
            <p className="text-xs text-muted-foreground">
              {format(new Date(version2.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
