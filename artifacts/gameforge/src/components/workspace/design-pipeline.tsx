import { GitBranch } from "lucide-react";

export function DesignPipeline({ projectId }: { projectId: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <GitBranch className="h-12 w-12 text-muted-foreground/40" />
      <p className="text-muted-foreground font-medium">Design Pipeline</p>
      <p className="text-sm text-muted-foreground/60 max-w-xs">
        Track your game from concept through production milestones. Coming soon.
      </p>
    </div>
  );
}
