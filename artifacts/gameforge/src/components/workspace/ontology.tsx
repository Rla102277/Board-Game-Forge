import { useEffect } from "react";
import { Network } from "lucide-react";

export function Ontology({
  projectId, onJump,
}: {
  projectId: number;
  onJump?: (tab: string) => void;
}) {
  useEffect(() => {
    onJump?.("assets-entities");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <Network className="h-12 w-12 text-muted-foreground/40" />
      <p className="text-muted-foreground font-medium">Ontology has moved</p>
      <p className="text-sm text-muted-foreground/60 max-w-xs">
        Component graph, coverage analysis, and the component library are now in the <strong>Workshop</strong> tab under <strong>Graph</strong> and <strong>Library</strong>.
      </p>
      <button
        onClick={() => onJump?.("assets-entities")}
        className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        Go to Workshop
      </button>
    </div>
  );
}
