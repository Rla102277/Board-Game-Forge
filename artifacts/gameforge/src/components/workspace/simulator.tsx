import { useState, useRef, useEffect } from "react";
import { Play, Square, Sparkles, Activity, Dice5 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

function apiBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/$/, "");
  }
  return "";
}

interface TurnPoint { turn: number; p10: number; p50: number; p90: number; }
interface SimulatorResult {
  healthScore: number;
  verdict: string;
  meanFinal: number;
  bankruptRate: number;
  turns: TurnPoint[];
}

export function Simulator({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [iterations, setIterations] = useState(1000);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulatorResult | null>(null);

  const [scenario, setScenario] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runMonteCarlo = async () => {
    setRunning(true); setResult(null);
    try {
      const base = apiBase();
      const res = await fetch(`${base}/api/projects/${projectId}/simulator/run`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ iterations, turns: 20 }),
      });
      if (!res.ok) throw new Error("simulation failed");
      const data: SimulatorResult = await res.json();
      setResult(data);
      toast({ title: "Simulation complete", description: `${iterations} iterations.` });
    } catch { toast({ title: "Simulation failed", variant: "destructive" }); }
    finally { setRunning(false); }
  };

  const runPlaythrough = async () => {
    if (abortRef.current) abortRef.current.abort();
    setLogs([]); setStreaming(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const base = apiBase();
      const res = await fetch(`${base}/api/projects/${projectId}/simulator/playthrough`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ focus: scenario || undefined }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error("stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const ev of events) {
          const dataLine = ev.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine.slice(6));
            if (payload.done) { setStreaming(false); return; }
            if (payload.error) { setLogs(l => [...l, `ERROR: ${payload.error}`]); setStreaming(false); return; }
            if (payload.content) {
              acc += payload.content;
              setLogs([acc]);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast({ title: "Playthrough failed", variant: "destructive" });
      }
    } finally { setStreaming(false); }
  };

  const stopPlaythrough = () => { abortRef.current?.abort(); setStreaming(false); };

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Dice5 className="h-6 w-6 text-primary" /> Simulator</h2>
        <p className="text-muted-foreground text-sm mt-1">Stress-test your design with Monte Carlo runs and AI playthroughs.</p>
      </div>

      <Tabs defaultValue="montecarlo">
        <TabsList>
          <TabsTrigger value="montecarlo" className="gap-2"><Activity className="h-4 w-4" /> Monte Carlo</TabsTrigger>
          <TabsTrigger value="playthrough" className="gap-2"><Sparkles className="h-4 w-4" /> AI Playthrough</TabsTrigger>
        </TabsList>

        <TabsContent value="montecarlo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Run a Monte Carlo simulation</CardTitle>
              <CardDescription>Replays many random games to estimate health, balance, and bankruptcy risk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="space-y-2 max-w-[180px]">
                  <Label>Iterations</Label>
                  <Input type="number" min={100} max={10000} step={100} value={iterations} onChange={e => setIterations(parseInt(e.target.value) || 1000)} />
                </div>
                <Button onClick={runMonteCarlo} disabled={running} className="gap-2">
                  <Play className="h-4 w-4" /> {running ? "Running..." : "Run"}
                </Button>
              </div>
              {result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Health" value={`${result.healthScore.toFixed(1)}/100`} />
                    <Stat label="Mean final" value={result.meanFinal.toFixed(2)} />
                    <Stat label="Bankrupt rate" value={`${(result.bankruptRate * 100).toFixed(1)}%`} />
                    <Stat label="Turns sampled" value={String(result.turns.length)} />
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="text-sm font-medium">Verdict</div>
                    <div className="text-sm text-muted-foreground mt-1">{result.verdict}</div>
                  </div>
                  {result.turns.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Turn-by-turn (P10 / P50 / P90)</div>
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                        {result.turns.map(t => (
                          <div key={t.turn} className="grid grid-cols-4 gap-2 text-xs font-mono items-center">
                            <div className="text-muted-foreground">Turn {t.turn}</div>
                            <div>P10: {t.p10}</div>
                            <div>P50: <span className="font-bold">{t.p50}</span></div>
                            <div>P90: {t.p90}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playthrough" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI playthrough</CardTitle>
              <CardDescription>Stream a turn-by-turn dramatized walkthrough of one game.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Optional focus</Label>
                <Textarea rows={2} value={scenario} onChange={e => setScenario(e.target.value)} placeholder="aggressive playstyle, edge cases..." />
              </div>
              <div className="flex gap-2">
                {!streaming ? (
                  <Button onClick={runPlaythrough} className="gap-2"><Play className="h-4 w-4" /> Start playthrough</Button>
                ) : (
                  <Button onClick={stopPlaythrough} variant="destructive" className="gap-2"><Square className="h-4 w-4" /> Stop</Button>
                )}
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-4 max-h-[500px] overflow-y-auto text-sm">
                {logs.length === 0 && !streaming && <div className="text-muted-foreground italic">No playthrough yet.</div>}
                {logs.map((l, i) => <div key={i} className="whitespace-pre-wrap">{l}</div>)}
                {streaming && <div className="text-primary animate-pulse mt-2">▍</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
