import { useState } from "react";
import { useCreateEntity, type Entity } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Coins, Loader2 } from "lucide-react";
import { GenericComponentStudio, type ExtraColumn } from "./generic-component-studio";

interface TokenStudioProps {
  projectId: number;
  parentEntity?: Entity;
  entities: Entity[];
  onRefresh: () => void;
}

const DENOMINATION_LADDER = [
  { name: "$1",   subtype: "Currency", description: "Smallest denomination — basic transaction unit." },
  { name: "$5",   subtype: "Currency", description: "Common denomination for small purchases." },
  { name: "$10",  subtype: "Currency", description: "Standard denomination for medium transactions." },
  { name: "$20",  subtype: "Currency", description: "Larger denomination — purchases or change." },
  { name: "$50",  subtype: "Currency", description: "High-value denomination for major purchases." },
  { name: "$100", subtype: "Currency", description: "Premium denomination for end-game scoring or property." },
];

export function TokenStudio({ projectId, parentEntity, entities, onRefresh }: TokenStudioProps) {
  const { toast } = useToast();
  const createEntity = useCreateEntity();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDenominations = async () => {
    if (!confirm("Add the standard 6-denomination currency ladder ($1 → $100)?")) return;
    setSeeding(true);
    try {
      const results = await Promise.allSettled(DENOMINATION_LADDER.map(d =>
        createEntity.mutateAsync({
          projectId,
          data: {
            name: d.name,
            type: "Token",
            subtype: d.subtype,
            description: d.description,
            ...(parentEntity ? { parentEntityId: parentEntity.id } : {}),
          },
        })
      ));
      const ok = results.filter(r => r.status === "fulfilled").length;
      onRefresh();
      toast({ title: `${ok}/${DENOMINATION_LADDER.length} denominations added` });
    } catch (err) {
      toast({ title: "Seed failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  // Token-specific column: stats field stores quantity
  const extraColumns: ExtraColumn[] = [
    {
      header: "Quantity",
      width: "80px",
      editable: { field: "stats", placeholder: "qty" },
      render: e => <span className="text-xs font-mono text-amber-300 px-2">{e.stats || "—"}</span>,
    },
  ];

  const aiPromptSeeds = [
    "currency tokens with values 1, 5, 10, 25, 50, 100",
    "health and damage trackers in different colors",
    "victory point tokens worth 1, 3, 5",
    "status markers (poisoned, blessed, stunned, hidden)",
    "resource tokens (wood, stone, food, gold)",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          Tokens — currency, resources, status markers, and trackers.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          onClick={handleSeedDenominations}
          disabled={seeding}
          data-testid="seed-denominations"
        >
          {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Coins className="w-3 h-3" />}
          Seed currency ladder
        </Button>
      </div>
      <GenericComponentStudio
        projectId={projectId}
        type="Token"
        parentEntity={parentEntity}
        entities={entities}
        onRefresh={onRefresh}
        extraColumns={extraColumns}
        aiPromptSeeds={aiPromptSeeds}
        buildAiPrompt={(prompt, count) =>
          `Generate ${count} game tokens for ${parentEntity?.name ?? "the game"}. ${prompt}. Each token should be type "Token" with a name (e.g. "$5 coin", "Health -1", "Wood"), a subtype (Resource, Currency, Health, Status, Marker, Victory Point, or Damage), and a 1-sentence description of what it tracks. Tokens should be small, physical pieces players move or stack.`}
      />
    </div>
  );
}
