import { useGetBalanceReport } from "@workspace/api-client-react";
import { Scale, AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function Balance({ projectId }: { projectId: number }) {
  const { data: report, isLoading } = useGetBalanceReport(projectId);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /> Balance</h2>
        <p className="text-muted-foreground text-sm mt-1">AI-driven analysis of stats, balance, and design conflicts.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>
      ) : !report ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No balance data yet. Add entities and rules first.</CardContent></Card>
      ) : (
        <>
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
                  const max = Math.max(...s.entries.map(e => e.value), 1);
                  return (
                    <div key={s.statName}>
                      <div className="text-sm font-semibold mb-2">{s.statName}</div>
                      <div className="space-y-1.5">
                        {s.entries.map(e => (
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
        </>
      )}
    </div>
  );
}
