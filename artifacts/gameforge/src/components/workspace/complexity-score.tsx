import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useComputeComplexity } from "@workspace/api-client-react";

interface ComplexityScoreProps {
  projectId: number;
  playtestCount?: number;
}

const LABELS  = ["", "Light", "Medium-Light", "Medium", "Medium-Heavy", "Heavy"];
const COLORS  = ["", "text-emerald-400", "text-lime-400", "text-yellow-400", "text-orange-400", "text-red-400"];
const REFS    = [
  "",
  "Azul, Ticket to Ride, Codenames",
  "Catan, Pandemic, Dominion",
  "Agricola, Power Grid, Scythe",
  "Gloomhaven, Terraforming Mars",
  "Arkham Horror, Twilight Imperium",
];

export function ComplexityScore({ projectId, playtestCount }: ComplexityScoreProps) {
  const compute = useComputeComplexity();
  const mutate = compute.mutate;

  useEffect(() => {
    mutate({ projectId });
  }, [projectId, mutate]);

  if (compute.isPending || !compute.data) {
    return (
      <Card>
        <CardHeader className="py-3 px-4 border-b border-border">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Design Complexity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-6">
          <p className="text-xs text-muted-foreground text-center italic">
            {compute.isError ? "Could not compute complexity." : "Computing complexity score…"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Server returns score on a 0-100 scale; map to 1-5 tier.
  const overall100 = compute.data.score;
  const overall = Math.max(1, Math.min(5, 1 + (overall100 / 100) * 4));
  const tier  = Math.round(overall);
  const label = LABELS[tier]  ?? "—";
  const color = COLORS[tier]  ?? "text-white";
  const refs  = REFS[tier]    ?? "";
  const pct   = Math.round(((overall - 1) / 4) * 100);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" /> Design Complexity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{overall.toFixed(1)}</p>
            <p className={`text-sm font-semibold ${color}`}>{label}</p>
          </div>
          <p className="text-[10px] text-muted-foreground text-right leading-relaxed max-w-[150px]">
            Similar weight to:<br />
            <span className="italic">{refs}</span>
          </p>
        </div>

        <div>
          <div className="h-2 w-full rounded-full overflow-hidden bg-gradient-to-r from-emerald-900 via-yellow-900 to-red-900">
            <div
              className="h-full rounded-full bg-white/30 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>Light</span><span>Medium</span><span>Heavy</span>
          </div>
        </div>

        <div className="space-y-2">
          {compute.data.breakdown.map(b => {
            const factorScore = Math.max(1, Math.min(5, Math.round(1 + (b.value / 100) * 4)));
            return (
              <div key={b.factor} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0 capitalize">{b.factor}</span>
                <div className="flex gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span
                      key={n}
                      className={`h-1.5 w-5 rounded-sm transition-colors ${n <= factorScore ? "bg-primary" : "bg-border"}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground truncate">{b.value.toFixed(0)}</span>
              </div>
            );
          })}
        </div>

        {playtestCount !== undefined && playtestCount > 0 && (
          <p className="text-[10px] text-emerald-400/80">
            ✓ {playtestCount} playtest session{playtestCount !== 1 ? "s" : ""} logged
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/60 italic">
          Server-computed estimate based on your project's rules, components, and player range.
        </p>
      </CardContent>
    </Card>
  );
}
