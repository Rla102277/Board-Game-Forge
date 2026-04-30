import { useMemo } from "react";
import { useListEntities, useListAssets } from "@workspace/api-client-react";
import { Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MFG_TIER } from "@/lib/game-component-types";

const CONCEPTUAL_TYPES = new Set(["Location", "Faction", "Event", "Resource", "Ability"]);

function exportBOMCSV(
  rows: { name: string; type: string; subtype: string; qty: number; tier: string }[],
  projectName: string,
) {
  const headers = ["Component", "Type", "Subtype", "Quantity", "Material / Tier"];
  const csv = [headers, ...rows.map(r => [r.name, r.type, r.subtype, r.qty, r.tier])]
    .map(r => r.map(v => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(projectName || "game").replace(/\W+/g, "_")}_BOM.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface BOMRow {
  name: string;
  type: string;
  subtype: string;
  qty: number;
  tier: string;
  tierColor: string;
  conceptual: boolean;
}

function BOMTable({ title, rows, dimmed }: { title: string; rows: BOMRow[]; dimmed?: boolean }) {
  const total = rows.reduce((sum, r) => sum + r.qty, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span className="text-xs text-muted-foreground">{total} total units</span>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/20 border-b border-border">
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Component</th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Type</th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Subtype</th>
              <th className="text-right px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[60px]">Qty</th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Material</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row, i) => (
              <tr key={i} className={dimmed ? "opacity-50" : ""}>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{row.type}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{row.subtype || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{row.qty}</td>
                <td className={`px-3 py-2 text-xs font-medium ${row.tierColor}`}>{row.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ComponentBOM({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { data: entities, isLoading: entLoading } = useListEntities(projectId);
  const { data: assets, isLoading: assetLoading } = useListAssets(projectId);

  const { physical, conceptual, assetRows, totalPhysical } = useMemo(() => {
    const childIds = new Set((entities ?? []).filter(e => e.parentEntityId).map(e => e.id));

    const makeRow = (name: string, type: string, subtype: string, qty: number): BOMRow => {
      const meta = MFG_TIER[type] ?? { tier: "Unknown", color: "text-muted-foreground" };
      return { name, type, subtype, qty, tier: meta.tier, tierColor: meta.color, conceptual: CONCEPTUAL_TYPES.has(type) };
    };

    const allRows: BOMRow[] = [
      ...(entities ?? [])
        .filter(e => !childIds.has(e.id))
        .map(e => makeRow(e.name, e.type, e.subtype ?? "", 1)),
      ...(assets ?? []).map(a => makeRow(a.name, "Asset", a.kind ?? "", a.quantity ?? 1)),
    ];

    const phys = allRows.filter(r => !r.conceptual && r.type !== "Asset");
    const conc = allRows.filter(r => r.conceptual);
    const asst = allRows.filter(r => r.type === "Asset");

    return {
      physical: phys,
      conceptual: conc,
      assetRows: asst,
      totalPhysical: phys.reduce((s, r) => s + r.qty, 0),
    };
  }, [entities, assets]);

  if (entLoading || assetLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  const allRows = [...physical, ...conceptual, ...assetRows];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Component Bill of Materials
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalPhysical} physical components · {conceptual.length} conceptual · {assetRows.length} digital assets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportBOMCSV(allRows, projectName)}
          disabled={allRows.length === 0}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      {allRows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Physical components", value: physical.length, sub: `${totalPhysical} total units` },
            { label: "Cards (all types)", value: (entities ?? []).filter(e => e.type === "Card").length, sub: "individual cards" },
            { label: "Unique component types", value: new Set((entities ?? []).map(e => e.type)).size, sub: "different types" },
            { label: "Digital assets", value: assetRows.length, sub: "images & mockups" },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card/50 px-4 py-3">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs font-medium text-foreground/80 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {physical.length > 0 && <BOMTable title="Physical Components" rows={physical} />}
      {conceptual.length > 0 && <BOMTable title="Game Concepts (no physical component)" rows={conceptual} dimmed />}
      {assetRows.length > 0 && <BOMTable title="Digital Assets" rows={assetRows} />}

      {allRows.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No components yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Add components in the Components tab to see your BOM here.</p>
        </div>
      )}
    </div>
  );
}
