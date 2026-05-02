import { type Entity } from "@workspace/api-client-react";
import { Map } from "lucide-react";
import { GenericComponentStudio, type ExtraColumn } from "./generic-component-studio";

interface TileStudioProps {
  projectId: number;
  parentEntity?: Entity;
  entities: Entity[];
  onRefresh: () => void;
}

const TERRAIN_PALETTE = [
  { label: "Forest",   color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { label: "Mountain", color: "bg-stone-500/20 text-stone-300 border-stone-500/40" },
  { label: "Desert",   color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { label: "Water",    color: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  { label: "Plains",   color: "bg-lime-500/20 text-lime-300 border-lime-500/40" },
  { label: "Swamp",    color: "bg-teal-500/20 text-teal-300 border-teal-500/40" },
  { label: "Cavern",   color: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  { label: "Ruins",    color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
];

function terrainBadge(subtype: string | null | undefined) {
  const t = TERRAIN_PALETTE.find(p => p.label.toLowerCase() === (subtype ?? "").toLowerCase());
  if (!t) return null;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${t.color}`}>{t.label}</span>;
}

export function TileStudio({ projectId, parentEntity, entities, onRefresh }: TileStudioProps) {
  // Tile-specific columns: terrain badge (subtype) + adjacency hint (relatedTo)
  const extraColumns: ExtraColumn[] = [
    {
      header: "Terrain",
      width: "100px",
      render: e => terrainBadge(e.subtype) ?? <span className="text-xs text-muted-foreground/40 italic px-2">—</span>,
    },
    {
      header: "Adjacent to",
      width: "140px",
      editable: { field: "relatedTo", placeholder: "neighboring tiles" },
      render: e => <span className="text-xs text-muted-foreground px-2 truncate">{e.relatedTo || "—"}</span>,
    },
  ];

  const aiPromptSeeds = [
    "varied terrain tiles: forest, mountain, desert, water, plains",
    "dungeon room tiles with traps, treasure, and combat encounters",
    "hex map tiles for an overland exploration game",
    "starting tiles + 6 expansion tiles per terrain type",
    "modular tiles with 2-3 connecting edges each",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Map className="w-3.5 h-3.5 text-emerald-400" />
          Tiles — modular map, dungeon, or terrain pieces.
        </p>
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground/70 mr-1 self-center">Terrain palette:</span>
          {TERRAIN_PALETTE.map(t => (
            <span key={t.label} className={`text-[10px] px-1.5 py-0.5 rounded border ${t.color}`}>{t.label}</span>
          ))}
        </div>
      </div>
      <GenericComponentStudio
        projectId={projectId}
        type="Tile"
        parentEntity={parentEntity}
        entities={entities}
        onRefresh={onRefresh}
        extraColumns={extraColumns}
        aiPromptSeeds={aiPromptSeeds}
        buildAiPrompt={(prompt, count) =>
          `Generate ${count} map / dungeon tiles for ${parentEntity?.name ?? "the game"}. ${prompt}. Each tile should be type "Tile" with a name, a subtype matching its terrain (Forest, Mountain, Desert, Water, Plains, Swamp, Cavern, or Ruins), a 1-sentence description of features and effects, and an "adjacency" hint (which tile types it borders well).`}
      />
    </div>
  );
}
