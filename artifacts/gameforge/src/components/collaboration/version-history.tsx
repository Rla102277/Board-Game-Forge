import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

interface VersionHistoryProps {
  projectId: number;
}

export function VersionHistory(_props: VersionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-4 w-4" /> Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground text-center py-8">
          Version history is coming soon. Use the Snapshots panel to save and
          restore versions.
        </div>
      </CardContent>
    </Card>
  );
}
