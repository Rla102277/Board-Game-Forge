import { useState, useMemo } from "react";
import { useGetProject, useListEntities } from "@workspace/api-client-react";
import { Users, Plus, Trash2, Clock, Zap, CheckCircle2, XCircle, Gauge, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PlayerCountConfig {
  count: number; supported: boolean; componentMultiplier: number;
  estimatedDuration: number; interactionDensity: 1|2|3|4|5;
  downtimePerPlayer: number; complexity: 1|2|3|4|5;
  winVariance: "low"|"medium"|"high"; notes: string; recommended: boolean;
}
interface ScalingMatrix { configs: PlayerCountConfig[]; baseComponentCount: number; scalingNotes: string; }

const STORAGE_KEY = (projectId: number) => `gameforge.scaling-matrix.${projectId}`;
const DENSITY: Record<number,string> = {1:"Solitary",2:"Low",3:"Medium",4:"High",5:"Constant"};
const COMPLEXITY: Record<number,string> = {1:"Very Light",2:"Light",3:"Medium",4:"Heavy",5:"Very Heavy"};

function loadMatrix(projectId: number): ScalingMatrix {
  try { const raw = localStorage.getItem(STORAGE_KEY(projectId)); if (raw) return JSON.parse(raw); } catch {}
  return { configs: [2,3,4,5,6].map(count => ({
    count, supported: count <=4, componentMultiplier: count <=4 ? 1 : 1.5,
    estimatedDuration: count*15+30, interactionDensity: (count<=2?2:count<=4?3:4) as 1|2|3|4|5,
    downtimePerPlayer: count<=3?2:4, complexity: 3 as 1|2|3|4|5, winVariance: "medium" as "low"|"medium"|"high", notes:"", recommended: count===3||count===4,
  })), baseComponentCount: 60, scalingNotes: "" };
}
function saveMatrix(projectId: number, matrix: ScalingMatrix) {
  try { localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(matrix)); } catch {}
}
function scoreColor(pct: number) { return pct >= 0.7 ? "text-emerald-400" : pct >= 0.4 ? "text-amber-400" : "text-red-400"; }
function scoreBg(pct: number) { return pct >= 0.7 ? "bg-emerald-500" : pct >= 0.4 ? "bg-amber-500" : "bg-red-500"; }

export function ScalingMatrixVisualizer({ projectId }: { projectId: number }) {
  const { data: project } = useGetProject(projectId);
  const { data: entities } = useListEntities(projectId);
  const [matrix, setMatrix] = useState<ScalingMatrix>(() => loadMatrix(projectId));
  const [sel, setSel] = useState<number|null>(null);

  const persist = (next: ScalingMatrix) => { setMatrix(next); saveMatrix(projectId, next); };
  const update = (count: number, u: Partial<PlayerCountConfig>) =>
    persist({...matrix, configs: matrix.configs.map(c => c.count===count?{...c,...u}:c)});

  const addCount = () => {
    const max = Math.max(...matrix.configs.map(c=>c.count),0)+1;
    persist({...matrix, configs:[...matrix.configs,{count:max,supported:false,componentMultiplier:1,estimatedDuration:max*15+30,interactionDensity:3 as 1|2|3|4|5,downtimePerPlayer:5,complexity:3 as 1|2|3|4|5,winVariance:"medium" as "low"|"medium"|"high",notes:"",recommended:false}].sort((a,b)=>a.count-b.count)});
  };
  const removeCount = (count:number) => { persist({...matrix, configs:matrix.configs.filter(c=>c.count!==count)}); if(sel===count)setSel(null); };

  const supported = useMemo(()=>matrix.configs.filter(c=>c.supported),[matrix.configs]);
  const sweetSpot = useMemo(()=>{
    const cands = supported.filter(c=>c.recommended);
    if(!cands.length) return null;
    return cands.sort((a,b)=> (b.interactionDensity*2-b.downtimePerPlayer-b.complexity*0.5) - (a.interactionDensity*2-a.downtimePerPlayer-a.complexity*0.5))[0];
  },[supported]);
  const cfg = sel ? matrix.configs.find(c=>c.count===sel) : null;
  const totalComp = (c:number) => Math.round(matrix.baseComponentCount * (matrix.configs.find(x=>x.count===c)?.componentMultiplier||1));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Player Count Scaling</h2>
        <p className="text-muted-foreground text-sm mt-1">Analyze how your game behaves across different player counts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400"/> Supported</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{supported.length}</div><p className="text-xs text-muted-foreground mt-1">{supported.map(c=>c.count).join(", ")||"None"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400"/> Sweet Spot</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{sweetSpot?`${sweetSpot.count}P`:"—"}</div><p className="text-xs text-muted-foreground mt-1">{sweetSpot?"Best interaction/downtime balance":"Set recommendations"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-blue-400"/> Duration</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{supported.length?`${Math.min(...supported.map(c=>c.estimatedDuration))}-${Math.max(...supported.map(c=>c.estimatedDuration))}m`:"—"}</div><p className="text-xs text-muted-foreground mt-1">Per game estimate</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Gauge className="h-4 w-4 text-violet-400"/> Components</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{matrix.baseComponentCount}</div><p className="text-xs text-muted-foreground mt-1">Base count (detected: {entities?.length??0} entities)</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Base Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1"><Label>Base Component Count</Label><Input type="number" min={1} value={matrix.baseComponentCount} onChange={e=>persist({...matrix,baseComponentCount:parseInt(e.target.value)||1})}/></div>
            <div className="space-y-2 flex-1"><Label>Project Player Count</Label><Input value={project?.playerCount||"Not set"} disabled className="bg-muted"/></div>
          </div>
          <div className="space-y-2"><Label>Scaling Notes</Label><Textarea rows={2} value={matrix.scalingNotes} onChange={e=>persist({...matrix,scalingNotes:e.target.value})} placeholder="e.g., 'Game breaks at 5+ due to downtime'"/></div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between"><h3 className="font-semibold">Scaling Matrix</h3><Button size="sm" variant="outline" onClick={addCount} className="gap-2"><Plus className="h-4 w-4"/> Add Count</Button></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {matrix.configs.map(c => {
          const isSel = sel===c.count;
          const durPct = Math.min(100,(c.estimatedDuration/180)*100);
          const dtPct = Math.min(100,(c.downtimePerPlayer/15)*100);
          return (
            <Card key={c.count} className={`cursor-pointer transition-all hover:border-primary/50 ${isSel?"border-primary ring-1 ring-primary":""} ${!c.supported?"opacity-60":""}`} onClick={()=>setSel(isSel?null:c.count)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">{c.count} Players {c.recommended&&<Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Best</Badge>}</CardTitle>
                  <Switch checked={c.supported} onCheckedChange={v=>update(c.count,{supported:v})} onClick={e=>e.stopPropagation()}/>
                </div>
                {!c.supported&&<CardDescription className="text-destructive flex items-center gap-1"><XCircle className="h-3 w-3"/> Not supported</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Duration</span><span className={scoreColor(1-c.estimatedDuration/180)}>{c.estimatedDuration}m</span></div><div className="h-1.5 bg-muted rounded overflow-hidden"><div className="h-full bg-primary/60" style={{width:`${durPct}%`}}/></div></div>
                <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Downtime / player</span><span className={scoreColor(1-c.downtimePerPlayer/15)}>{c.downtimePerPlayer}m</span></div><div className="h-1.5 bg-muted rounded overflow-hidden"><div className={`h-full ${scoreBg(1-c.downtimePerPlayer/15)}`} style={{width:`${dtPct}%`}}/></div></div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/30 rounded p-2"><div className="text-muted-foreground mb-0.5">Components</div><div className="font-semibold">{totalComp(c.count)}</div></div>
                  <div className="bg-muted/30 rounded p-2"><div className="text-muted-foreground mb-0.5">Interaction</div><div className="font-semibold">{DENSITY[c.interactionDensity]}</div></div>
                  <div className="bg-muted/30 rounded p-2"><div className="text-muted-foreground mb-0.5">Complexity</div><div className="font-semibold">{COMPLEXITY[c.complexity]}</div></div>
                  <div className="bg-muted/30 rounded p-2"><div className="text-muted-foreground mb-0.5">Variance</div><div className="font-semibold capitalize">{c.winVariance}</div></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {cfg && (
        <Card className="border-primary/40">
          <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">{cfg.count} Player Configuration</CardTitle><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={()=>removeCount(cfg.count)}><Trash2 className="h-4 w-4"/></Button></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="flex items-center gap-2"><Switch checked={cfg.supported} onCheckedChange={v=>update(cfg.count,{supported:v})}/><span>Supported</span></Label><p className="text-xs text-muted-foreground">Officially support this count?</p></div>
              <div className="space-y-2"><Label className="flex items-center gap-2"><Switch checked={cfg.recommended} onCheckedChange={v=>update(cfg.count,{recommended:v})}/><span>Recommended</span></Label><p className="text-xs text-muted-foreground">Mark as ideal player count</p></div>
              <div className="space-y-2"><Label>Component Multiplier</Label><Input type="number" step={0.1} min={0.5} value={cfg.componentMultiplier} onChange={e=>update(cfg.count,{componentMultiplier:parseFloat(e.target.value)||1})}/><p className="text-xs text-muted-foreground">{totalComp(cfg.count)} total components</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min={1} value={cfg.estimatedDuration} onChange={e=>update(cfg.count,{estimatedDuration:parseInt(e.target.value)||1})}/></div>
              <div className="space-y-2"><Label>Downtime / player (min)</Label><Input type="number" min={0} step={0.5} value={cfg.downtimePerPlayer} onChange={e=>update(cfg.count,{downtimePerPlayer:parseFloat(e.target.value)||0})}/></div>
              <div className="space-y-2"><Label>Win Variance</Label><Select value={cfg.winVariance} onValueChange={(v:"low"|"medium"|"high")=>update(cfg.count,{winVariance:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low (tight games)</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High (blowouts)</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Interaction Density</Label><Select value={String(cfg.interactionDensity)} onValueChange={v=>update(cfg.count,{interactionDensity:parseInt(v) as 1|2|3|4|5})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4,5].map(i=><SelectItem key={i} value={String(i)}>{i} — {DENSITY[i]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Complexity</Label><Select value={String(cfg.complexity)} onValueChange={v=>update(cfg.count,{complexity:parseInt(v) as 1|2|3|4|5})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4,5].map(i=><SelectItem key={i} value={String(i)}>{i} — {COMPLEXITY[i]}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={cfg.notes} onChange={e=>update(cfg.count,{notes:e.target.value})} placeholder={`Notes for ${cfg.count} player games...`}/></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
