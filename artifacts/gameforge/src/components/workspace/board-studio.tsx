import { useMemo } from "react";
import { type Entity } from "@workspace/api-client-react";
import { LayoutGrid } from "lucide-react";
import { GenericComponentStudio, type ExtraColumn } from "./generic-component-studio";

interface BoardStudioProps {
  projectId: number;
  parentEntity?: Entity;
  entities: Entity[];
  onRefresh: () => void;
}

/**
 * Boards are usually a small set (1-4 per game): main board, player boards, reference sheets.
 * The "Spaces" column counts the number of distinct spaces declared in either:
 *  - `stats` (e.g. "40 spaces", "9x9 grid")
 *  - `description` (counted by lines starting with "-" or numbers)
 */
function countSpaces(entity: Entity): number | null {
  const haystack = `${entity.stats ?? ""} ${entity.description ?? ""}`;
  // Look for "<N> spaces" or "<N>x<M> grid"
  const spaceMatch = haystack.match(/(\d+)\s*spaces?/i);
  if (spaceMatch) return parseInt(spaceMatch[1], 10);
  const gridMatch = haystack.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (gridMatch) return parseInt(gridMatch[1], 10) * parseInt(gridMatch[2], 10);
  // Count bullet lines in description
  const lines = (entity.description ?? "").split("\n").filter(l => /^[\s-•*]+/.test(l) || /^\d+\./.test(l.trim()));
  return lines.length > 0 ? lines.length : null;
}

export function BoardStudio({ projectId, parentEntity, entities, onRefresh }: BoardStudioProps) {
  const totalSpaces = useMemo(() => {
    return entities.reduce((sum, e) => sum + (countSpaces(e) ?? 0), 0);
  }, [entities]);

  const extraColumns: ExtraColumn[] = [
    {
      header: "Spaces",
      width: "80px",
      editable: { field: "stats", placeholder: "e.g. 40 spaces or 9x9" },
      render: e => {
        const count = countSpaces(e);
        return (
          <span className="text-xs font-mono text-slate-300 px-2">
            {count !== null ? count : <span className="text-muted-foreground/40 italic">—</span>}
          </span>
        );
      },
    },
  ];

  const aiPromptSeeds = [
    "main game board with 40 spaces (corner spaces, properties, chance, tax)",
    "9x9 player board for resource tracking",
    "reference sheet listing all symbols and quick rules",
    "modular expansion board adding a new region",
    "a player mat with engine-builder slots",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
          Boards — main board, player mats, and reference sheets.
        </p>
        {totalSpaces > 0 && (
          <div className="text-[10px] text-muted-foreground bg-slate-500/10 border border-slate-500/30 px-2 py-0.5 rounded">
            <span className="font-mono text-slate-300 font-semibold">{totalSpaces}</span> total spaces across all boards
          </div>
        )}
      </div>
      <GenericComponentStudio
        projectId={projectId}
        type="Board"
        parentEntity={parentEntity}
        entities={entities}
        onRefresh={onRefresh}
        extraColumns={extraColumns}
        aiPromptSeeds={aiPromptSeeds}
        buildAiPrompt={(prompt, count) =>
          `Generate ${count} game boards for ${parentEntity?.name ?? "the game"}. ${prompt}. Each board should be type "Board" with a name, a subtype (Main Board, Player Board, Map, Reference Sheet, or Expansion Board), a 1-2 sentence description listing key spaces / regions and their effects, and a "stats" field summarizing the dimensions (e.g. "40 spaces", "9x9 grid", "20 region cards").`}
      />
    </div>
  );
}
