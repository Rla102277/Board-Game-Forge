import { useState, useMemo } from "react";
import { TrendingUp, AlertTriangle, Plus, Trash2, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TurnScore { turn: number; scores: number[]; }
interface Session { id: string; date: string; playerCount: number; scoresByTurn: TurnScore[]; }
interface State { sessions: Session[]; threshold: number; }

const STORAGE = (pid: number) => `gameforge.scoring-curve.${pid}`;
const load = (pid: number): State => { try { const r = localStorage.getItem(STORAGE(pid)); if (r) return JSON.parse(r); } catch {} return { sessions: [], threshold: 15 }; };
const save = (pid: number, s: State) => { try { localStorage.setItem(STORAGE(pid), JSON.stringify(s)); } catch {} };

function compute(session: Session) {
  if (session.scoresByTurn.length < 2) return { avg: 0, max: 0, runaway: false, pred: false, lead: 0 };
  let td = 0, c = 0, md = 0, lw = 0;
  for (let i = 1; i < session.scoresByTurn.length; i++) {
    const p = session.scoresByTurn[i - 1].scores, cur = session.scoresByTurn[i].scores;
    const pi = p.indexOf(Math.max(...p)), ci = cur.indexOf(Math.max(...cur));
    if (pi === ci) lw++;
    for (let j = 0; j < (session.playerCount || 2); j++) { const d = Math.abs((cur[j] || 0) - (p[j] || 0)); td += d; c++; md = Math.max(md, d); }
  }
  const avg = c > 0 ? +(td / c).toFixed(1) : 0;
  const lead = session.scoresByTurn.length > 1 ? +(lw / (session.scoresByTurn.length - 1)).toFixed(2) : 0;
  return { avg, max: md, runaway: avg > 8, pred: lead > 0.75 && session.scoresByTurn.length >= 4, lead };
}

export function ScoringCurve({ projectId }: { projectId: number }) {
  const [state, setState] = useState<State>(() => load(projectId));
  const [ex, setEx] = useState<string | null>(null);
  const persist = (n: State) => { setState(n); save(projectId, n); };

  const addS = () => { const s: Session = { id: crypto.randomUUID(), date: new Date().toISOString().split("T")[0], playerCount: 3, scoresByTurn: [] }; persist({ ...state, sessions: [...state.sessions, s] }); setEx(s.id); };
  const delS = (id: string) => { persist({ ...state, sessions: state.sessions.filter(s => s.id !== id) }); if (ex === id) setEx(null); };
  const updS = (id: string, u: Partial<Session>) => persist({ ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, ...u } : s) });
  const addT = (sid: string) => { const s = state.sessions.find(x => x.id === sid); if (!s) return; const nt = (s.scoresByTurn[s.scoresByTurn.length - 1]?.turn || 0) + 1; const prev = s.scoresByTurn[s.scoresByTurn.length - 1]?.scores || Array.from({ length: s.playerCount }, () => 0); const next = prev.map(v => Math.max(0, v + Math.floor(Math.random() * 8) - 1)); updS(sid, { scoresByTurn: [...s.scoresByTurn, { turn: nt, scores: next }] }); };
  const mock = (sid: string) => { const s = state.sessions.find(x => x.id === sid); if (!s) return; const arr: TurnScore[] = []; let sc = Array.from({ length: s.playerCount }, () => Math.floor(Math.random() * 10)); for (let t = 0; t < 8; t++) { sc = sc.map(v => v + Math.floor(Math.random() * 8) - 1); arr.push({ turn: t + 1, scores: [...sc] }); } updS(sid, { scoresByTurn: arr }); };
  const updScore = (sid: string, ti: number, pi: number, val: number) => { const s = state.sessions.find(x => x.id === sid); if (!s) return; updS(sid, { scoresByTurn: s.scoresByTurn.map((t, i) => i === ti ? { ...t, scores: t.scores.map((v, j) => j === pi ? val : v) } : t) }); };

  const ov = useMemo(() => { if (!state.sessions.length) return null; const d = state.sessions.map(compute); const a = +(d.reduce((x, y) => x + y.avg, 0) / d.length).toFixed(1); return { a, rp: Math.round(d.filter(x => x.runaway).length / d.length * 100), pp: Math.round(d.filter(x => x.pred).length / d.length * 100), t: state.sessions.length }; }, [state.sessions]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h2 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> Scoring Curve</h2><p className="text-muted-foreground text-sm mt-1">Track scores per turn. Flags runaway leaders and predetermined games.</p></div>
      {ov && (<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sessions</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{ov.t}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Delta</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{ov.a}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Runaway</CardTitle></CardHeader><CardContent><div className={`text-3xl font-bold ${ov.rp>30?"text-red-400":ov.rp>10?"text-amber-400":"text-emerald-400"}`}>{ov.rp}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Predetermined</CardTitle></CardHeader><CardContent><div className={`text-3xl font-bold ${ov.pp>30?"text-red-400":ov.pp>10?"text-amber-400":"text-emerald-400"}`}>{ov.pp}%</div></CardContent></Card>
      </div>)}
      <div className="flex items-center gap-3"><Label>Flag Threshold</Label><Input type="number" className="h-8 w-24 text-sm" value={state.threshold} onChange={e => persist({ ...state, threshold: parseInt(e.target.value) || 10 })}/><span className="text-xs text-muted-foreground">Delta above this flags runaway.</span></div>
      <div className="flex items-center justify-between"><h3 className="font-semibold">Sessions</h3><Button size="sm" onClick={addS} className="gap-1"><Plus className="h-4 w-4"/> Session</Button></div>
      <div className="space-y-3">
        {state.sessions.map(s => { const isEx = ex === s.id; const st = compute(s); return (
          <Card key={s.id} className={isEx?"border-primary/50":""}>
            <CardHeader className="pb-2 cursor-pointer" onClick={()=>setEx(isEx?null:s.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">{isEx?<ChevronDown className="h-4 w-4 text-muted-foreground"/>:<ChevronRight className="h-4 w-4 text-muted-foreground"/>}<div><CardTitle className="text-sm">{s.date} — {s.playerCount}P</CardTitle><CardDescription>{s.scoresByTurn.length} turns</CardDescription></div></div>
                <div className="flex items-center gap-2">{st.pred&&<Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><AlertTriangle className="h-3 w-3"/> Pred</Badge>}{st.runaway&&<Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><TrendingUp className="h-3 w-3"/> Runaway</Badge>}<Button size="sm" variant="outline" onClick={e=>{e.stopPropagation();mock(s.id);}} className="h-7 gap-1"><Zap className="h-3 w-3"/> Mock</Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e=>{e.stopPropagation();delS(s.id);}}><Trash2 className="h-3.5 w-3.5"/></Button></div>
              </div>
            </CardHeader>
            {isEx && (
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-3"><Label className="text-xs">Players</Label><Input type="number" min={2} value={s.playerCount} onChange={e=>updS(s.id,{playerCount:parseInt(e.target.value)||2})} className="h-8 text-sm w-20"/></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><h4 className="text-sm font-medium">Turn Scores</h4><Button size="sm" variant="outline" onClick={()=>addT(s.id)} className="h-7 gap-1"><Plus className="h-3 w-3"/> Turn</Button></div>
                  {s.scoresByTurn.length === 0 && <div className="text-sm text-muted-foreground">No turns. Add manually or generate mock data.</div>}
                  <div className="space-y-2">
                    {s.scoresByTurn.map((t, ti) => (
                      <div key={t.turn} className="flex items-center gap-3">
                        <span className="text-xs font-mono w-8">T{t.turn}</span>
                        <div className="flex gap-2 flex-1">
                          {t.scores.map((v, pi) => (
                            <Input key={pi} type="number" value={v} onChange={e=>updScore(s.id,ti,pi,parseInt(e.target.value)||0)} className="h-8 text-sm w-20"/>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground w-16 text-right">Δ {ti>0?(Math.max(...t.scores)-Math.max(...s.scoresByTurn[ti-1].scores)):0}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {s.scoresByTurn.length > 0 && (
                  <div className="bg-muted/30 rounded p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Avg delta</span><span>{st.avg}</span></div>
                    <div className="flex justify-between"><span>Leader consistency</span><span>{Math.round(st.lead*100)}%</span></div>
                    <div className="flex justify-between"><span>Max single delta</span><span>{st.max}</span></div>
                    {st.pred && <div className="text-red-400 flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3"/> Leader rarely changes — game may feel predetermined.</div>}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ); })}
      </div>
    </div>
  );
}
