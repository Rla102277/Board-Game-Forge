import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface ActivityFeedProps {
  projectId: number;
  limit?: number;
}

export function ActivityFeed(_props: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-4 w-4" /> Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground text-center py-8">
          Activity tracking is coming soon.
        </div>
      </CardContent>
    </Card>
  );
}
