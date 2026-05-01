import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface CommentsPanelProps {
  projectId: number;
  entityType?: string;
  entityId?: number | null;
}

export function CommentsPanel(_props: CommentsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Comments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground text-center py-8">
          Comments are coming soon.
        </div>
      </CardContent>
    </Card>
  );
}
