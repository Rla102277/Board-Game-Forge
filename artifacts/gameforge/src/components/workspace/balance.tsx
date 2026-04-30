import { useMemo, useState } from "react";
import { useGetBalanceReport, useListEntities, useListEntityProperties } from "@workspace/api-client-react";
import { Scale, AlertTriangle, BarChart3, CheckCircle2, ChartScatter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ScatterChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Scatter as ScatterSeries, Cell,
} from "recharts";

// ── Stat Explorer ─────────────────────────────────────────────────────────────

function StatExplorer({ projectId }: { projectId: number }) {
  const { data: entities } = useListEntities(projectId);
  const [filterType, setFilterType] = useState("all");
  const [xProp, setXProp] = useState("");
  const [yProp, setYProp] = useState("");

  const entityTypes = useMemo(() => {
    const types = new Set((entities ?? []).map((e) => e.type));
    return Array.from(types).sort();
  }, [entities]);

  const filtered = useMemo(
    () => (filterType === "all" ? entities ?? [] : (entities ?? []).filter((e) => e.type === filterType)),
    [entities, filterType],
  );

  // Collect all numeric property names that appear in the filtered entities
  const { data: allEntityProperties } = useListEntityProperties(projectId, 0);

  // We need per-entity properties. Use a combined aggregated view from the balance report
  // For the scatter, we parse entity.stats field which is a short free-text "ATK 3 / DEF 1 / Cost 2"
  const statNames = useMemo(() => {
    const names = new Set<string>();
    filtered.forEach((e) => {
      if (!e.stats) return;
      // parse "KEY val / KEY val" format
      e.stats.split("/").forEach((seg) => {
        const m = seg.trim().match(/^([A-Za-z_][A-Za-z0-9_ ]+?)\s+[\d.]+/);
        if (m) names.add(m[1].trim());
      });
    });
    return Array.from(names).sort();
  }, [filtered]);

  function parseStat(statsStr: string | null | undefined, key: string): number | null {
    if (!statsStr) return null;
    const segs = statsStr.split("/");
    for (const seg of segs) {
      const m = seg.trim().match(new RegExp(`^${key}\\s+([\\d.]+)`, "i"));
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  const scatterData = useMemo(() => {
    if (!xProp || !yProp) return [];
    return filtered
      .map((e) => {
        const x = parseStat(e.stats, xProp);
        const y = parseStat(e.stats, yProp);
        if (x == null || y == null) return null;
        return { x, y, name: e.name, type: e.type, color: e.color ?? "#7c3aed" };
      })
      .filter(Boolean) as { x: number; y: number; name: string; type: string; color: string }[];
  }, [filtered, xProp, yProp]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ChartScatter className="h-4 w-4 text-primary" /> Stat Explorer</CardTitle>
        <CardDescription>Plot any two stat dimensions across your entities to spot outliers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Filter type</p>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {entityTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">X axis (stat)</p>
            <Select value={xProp} onValueChange={setXProp}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Pick stat…" /></SelectTrigger>
              <SelectContent>
                {statNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Y axis (stat)</p>
            <Select value={yProp} onValueChange={setYProp}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Pick stat…" /></SelectTrigger>
              <SelectContent>
                {statNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!xProp || !yProp ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            Select two stats above to plot. Stats come from entity stat lines (e.g. "ATK 3 / DEF 1 / Cost 2").
          </div>
        ) : scatterData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No entities have both <span className="font-mono mx-1 text-white">{xProp}</span> and <span className="font-mono mx-1 text-white">{yProp}</span> in their stat line.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="x" name={xProp} type="number" label={{ value: xProp, position: "insideBottom", offset: -2, fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="y" name={yProp} type="number" label={{ value: yProp, angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    const d = payload?.[0]?.payload as typeof scatterData[number] | undefined;
                    if (!d) return null;
                    return (
                      <div className="bg-card border border-border rounded-md p-2 text-xs shadow-lg">
                        <p className="font-semibold text-white mb-1">{d.name}</p>
                        <p className="text-muted-foreground">{xProp}: <span className="text-white font-mono">{d.x}</span></p>
                        <p className="text-muted-foreground">{yProp}: <span className="text-white font-mono">{d.y}</span></p>
                      </div>
                    );
                  }}
                />
                <ScatterSeries data={scatterData} fill="#7c3aed">
                  {scatterData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                </ScatterSeries>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2">
              {scatterData.map((d) => (
                <span key={d.name} className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.x}, {d.y})
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Balance page ──────────────────────────────────────────────────────────────

export function Balance({ projectId }: { projectId: number }) {
  const { data: report, isLoading } = useGetBalanceReport(projectId);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /> Balance</h2>
        <p className="text-muted-foreground text-sm mt-1">AI-driven analysis of stats, balance, and design conflicts.</p>
      </div>

      <Tabs defaultValue="report">
        <TabsList className="mb-4">
          <TabsTrigger value="report">AI Report</TabsTrigger>
          <TabsTrigger value="explorer">Stat Explorer</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          {isLoading ? (
            <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>
          ) : !report ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No balance data yet. Add entities and rules first.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Balance score</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{report.balanceScore?.toFixed(0) ?? "—"}<span className="text-base text-muted-foreground">/100</span></div>
                    <div className="mt-2 h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, report.balanceScore || 0))}%` }} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Conflicts</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-500">{report.conflictCount ?? 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Detected in rules</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Stat dimensions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{report.statSeries?.length ?? 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Tracked stats</p>
                  </CardContent>
                </Card>
              </div>

              {report.verdict && (
                <Card>
                  <CardHeader><CardTitle>Verdict</CardTitle></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{report.verdict}</p></CardContent>
                </Card>
              )}

              {report.statSeries && report.statSeries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Stat distribution</CardTitle>
                    <CardDescription>Compare entity stats side-by-side.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {report.statSeries.map((s) => {
                      const max = Math.max(...s.entries.map((e) => e.value), 1);
                      return (
                        <div key={s.statName}>
                          <div className="text-sm font-semibold mb-2">{s.statName}</div>
                          <div className="space-y-1.5">
                            {s.entries.map((e) => (
                              <div key={e.entityId} className="flex items-center gap-3 text-xs">
                                <div className="w-32 truncate text-muted-foreground">{e.entityName}</div>
                                <div className="flex-1 h-5 bg-muted rounded overflow-hidden relative">
                                  <div className="h-full bg-primary/70" style={{ width: `${(e.value / max) * 100}%` }} />
                                  <span className="absolute inset-0 flex items-center px-2 font-mono">{e.value}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="explorer">
          <StatExplorer projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
