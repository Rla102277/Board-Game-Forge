import { useState, useMemo } from "react";
import { useGetProject } from "@workspace/api-client-react";
import { EyeOff, Plus, Trash2, CheckCircle2, XCircle, Clock, BookOpen, AlertTriangle, BarChart3, ChevronDown, ChevronRight, Play, HelpCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Question { id: string; question: string; correctAnswer: string; section: string; }
interface Friction { id: string; timestamp: string; section: string; description: string; severity: "low"|"medium"|"high"; resolved: boolean; }
interface Session {
  id: string; date: string; playerCount: number; setupTimeMinutes: number; firstRoundTimeMinutes: number;
  completedGame: boolean; winnerUnderstoodRules: boolean; questions: { questionId: string; correct: boolean; playerAnswer: string }[];
  frictionLogs: Friction[]; overallNotes: string; rulebookClarityRating: 1|2|3|4|5; wouldPlayAgain: boolean;
}
interface State { protocolEnabled: boolean; rulebookVersion: string; rulebookUrl: string; protocolNotes: string; questions: Question[]; sessions: Session[]; }

const STORAGE = (pid: number) => `gameforge.blind-playtest.${pid}`;
const load = (pid: number): State => { try { const r = localStorage.getItem(STORAGE(pid)); if (r) return JSON.parse(r); } catch {} return { protocolEnabled: false, rulebookVersion: "1.0", rulebookUrl: "", protocolNotes: "", questions: [ { id: crypto.randomUUID(), question: "What is the win condition?", correctAnswer: "", section: "objective" }, { id: crypto.randomUUID(), question: "How do you set up the board?", correctAnswer: "", section: "setup" } ], sessions: [] }; };
const save = (pid: number, s: State) => { try { localStorage.setItem(STORAGE(pid), JSON.stringify(s)); } catch {} };
const calcScore = (s: Session) => s.questions.length ? Math.round(s.questions.filter(q => q.correct).length / s.questions.length * 100) : 0;
const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

export function BlindPlaytestFramework({ projectId }: { projectId: number }) {
  const { data: project } = useGetProject(projectId);
  const [state, setState] = useState<State>(() => load(projectId));
  const [tab, setTab] = useState<"protocol" | "sessions" | "analysis">("protocol");
  const [expanded, setExpanded] = useState<string | null>(null);
  const persist = (next: State) => { setState(next); save(projectId, next); };
  const addQ = () => persist({ ...state, questions: [...state.questions, { id: crypto.randomUUID(), question: "", correctAnswer: "", section: "other" }] });
  const updQ = (id: string, u: Partial<Question>) => persist({ ...state, questions: state.questions.map(q => q.id === id ? { ...q, ...u } : q) });
  const delQ = (id: string) => persist({ ...state, questions: state.questions.filter(q => q.id !== id) });
  const addS = () => { const s: Session = { id: crypto.randomUUID(), date: new Date().toISOString().split("T")[0], playerCount: 3, setupTimeMinutes: 0, firstRoundTimeMinutes: 0, completedGame: false, winnerUnderstoodRules: false, questions: state.questions.map(q => ({ questionId: q.id, correct: false, playerAnswer: "" })), frictionLogs: [], overallNotes: "", rulebookClarityRating: 3, wouldPlayAgain: false }; persist({ ...state, sessions: [...state.sessions, s] }); setExpanded(s.id); setTab("sessions"); };
  const updS = (id: string, u: Partial<Session>) => persist({ ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, ...u } : s) });
  const delS = (id: string) => { persist({ ...state, sessions: state.sessions.filter(s => s.id !== id) }); if (expanded === id) setExpanded(null); };
  const addF = (sid: string) => { const s = state.sessions.find(x => x.id === sid); if (!s) return; updS(sid, { frictionLogs: [...s.frictionLogs, { id: crypto.randomUUID(), timestamp: "0:00", section: "other", description: "", severity: "medium", resolved: false }] }); };
  const scores = useMemo(() => state.sessions.map(calcScore), [state.sessions]);
  const avgScore = avg(scores);
  const avgClarity = state.sessions.length ? +(state.sessions.reduce((a, s) => a + s.rulebookClarityRating, 0) / state.sessions.length).toFixed(1) : 0;
  const completion = state.sessions.length ? Math.round(state.sessions.filter(s => s.completedGame).length / state.sessions.length * 100) : 0;
  const again = state.sessions.length ? Math.round(state.sessions.filter(s => s.wouldPlayAgain).length / state.sessions.length * 100) : 0;
  const avgSetup = avg(state.sessions.map(s => s.setupTimeMinutes));
  const frictionMap = useMemo(() => {
    const m = new Map<string, { count: number; high: number }>();
    state.sessions.forEach(s => s.frictionLogs.forEach(f => { const c = m.get(f.section) || { count: 0, high: 0 }; c.count++; if (f.severity === "high") c.high++; m.set(f.section, c); }));
    return m;
  }, [state.sessions]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h2 className="text-2xl font-bold flex items-center gap-2"><EyeOff className="h-6 w-6 text-primary" /> Blind Playtest Framework</h2><p className="text-muted-foreground text-sm mt-1">Structured protocol for testing rulebook clarity without designer intervention.</p></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sessions</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{state.sessions.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Comp</CardTitle></CardHeader><CardContent><div className={`text-3xl font-bold ${avgScore>=80?"text-emerald-400":avgScore>=50?"text-amber-400":"text-red-400"}`}>{avgScore}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Completion</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{completion}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Clarity</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{avgClarity}/5</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Setup</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{avgSetup}m</div></CardContent></Card>
      </div>
      <div className="flex gap-2 border-b border-border pb-1">
        {(["protocol","sessions","analysis"] as const).map(t => <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 text-sm font-medium capitalize rounded-t-lg ${tab===t?"bg-sidebar-primary text-sidebar-primary-foreground":"text-muted-foreground hover:text-foreground"}`}>{t}</button>)}
      </div>

      {tab === "protocol" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Protocol Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4"><Switch checked={state.protocolEnabled} onCheckedChange={c => persist({...state,protocolEnabled:c})}/><div><Label>Enable Blind Protocol</Label><p className="text-xs text-muted-foreground">Designer must not intervene during play.</p></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Rulebook Version</Label><Input value={state.rulebookVersion} onChange={e=>persist({...state,rulebookVersion:e.target.value})}/></div><div className="space-y-2"><Label>Rulebook URL</Label><Input value={state.rulebookUrl||""} onChange={e=>persist({...state,rulebookUrl:e.target.value})} placeholder="Link to tested version"/></div></div>
              <div className="space-y-2"><Label>Protocol Notes</Label><Textarea rows={3} value={state.protocolNotes} onChange={e=>persist({...state,protocolNotes:e.target.value})} placeholder="Special instructions for facilitators..."/></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex items-center justify-between"><div><CardTitle className="text-base">Comprehension Questions</CardTitle><CardDescription>Players answer these after reading the rulebook but before playing.</CardDescription></div><Button size="sm" onClick={addQ} className="gap-1"><Plus className="h-4 w-4"/> Add</Button></CardHeader>
            <CardContent className="space-y-3">
              {state.questions.map(q => (
                <div key={q.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input value={q.question} onChange={e=>updQ(q.id,{question:e.target.value})} placeholder="Question text" className="h-8 text-sm"/>
                    <div className="flex gap-2">
                      <Input value={q.correctAnswer} onChange={e=>updQ(q.id,{correctAnswer:e.target.value})} placeholder="Correct answer" className="h-8 text-sm"/>
                      <Select value={q.section} onValueChange={v=>updQ(q.id,{section:v})}><SelectTrigger className="h-8 text-xs w-32"><SelectValue/></SelectTrigger><SelectContent>{["setup","objective","turns","actions","scoring","other"].map(s=><SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent></Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={()=>delQ(q.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-semibold">Sessions</h3><Button size="sm" onClick={addS} className="gap-2"><Plus className="h-4 w-4"/> New Session</Button></div>
          {state.sessions.map(s => {
            const isEx = expanded === s.id; const sc = calcScore(s);
            return (
              <Card key={s.id} className={isEx?"border-primary/50":""}>
                <CardHeader className="pb-2 cursor-pointer" onClick={()=>setExpanded(isEx?null:s.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isEx?<ChevronDown className="h-4 w-4 text-muted-foreground"/>:<ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                      <div><CardTitle className="text-sm">Session {state.sessions.indexOf(s)+1} — {s.date}</CardTitle><CardDescription>{s.playerCount}p • Setup {s.setupTimeMinutes}m • {s.completedGame?"Completed":"Incomplete"}</CardDescription></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={sc>=80?"bg-emerald-500/20 text-emerald-400":sc>=50?"bg-amber-500/20 text-amber-400":"bg-red-500/20 text-red-400"}>{sc}%</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e=>{e.stopPropagation();delS(s.id);}}><Trash2 className="h-3.5 w-3.5"/></Button>
                    </div>
                  </div>
                </CardHeader>
                {isEx && (
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={s.date} onChange={e=>updS(s.id,{date:e.target.value})} className="h-8 text-sm"/></div>
                      <div className="space-y-1"><Label className="text-xs">Players</Label><Input type="number" min={1} value={s.playerCount} onChange={e=>updS(s.id,{playerCount:parseInt(e.target.value)||1})} className="h-8 text-sm"/></div>
                      <div className="space-y-1"><Label className="text-xs">Setup (min)</Label><Input type="number" min={0} value={s.setupTimeMinutes} onChange={e=>updS(s.id,{setupTimeMinutes:parseInt(e.target.value)||0})} className="h-8 text-sm"/></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1"><Label className="text-xs">First Round (min)</Label><Input type="number" min={0} value={s.firstRoundTimeMinutes} onChange={e=>updS(s.id,{firstRoundTimeMinutes:parseInt(e.target.value)||0})} className="h-8 text-sm"/></div>
                      <div className="space-y-1"><Label className="text-xs">Clarity</Label><Select value={String(s.rulebookClarityRating)} onValueChange={v=>updS(s.id,{rulebookClarityRating:parseInt(v) as 1|2|3|4|5})}><SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4,5].map(i=><SelectItem key={i} value={String(i)}>{i} — {i<=2?"Poor":i<=3?"OK":i<=4?"Good":"Excellent"}</SelectItem>)}</SelectContent></Select></div>
                      <div className="flex items-end gap-3 pb-0.5"><div className="flex items-center gap-2"><Switch checked={s.completedGame} onCheckedChange={v=>updS(s.id,{completedGame:v})}/><span className="text-xs">Completed</span></div><div className="flex items-center gap-2"><Switch checked={s.wouldPlayAgain} onCheckedChange={v=>updS(s.id,{wouldPlayAgain:v})}/><span className="text-xs">Play Again</span></div></div>
                    </div>
                    <div className="space-y-2"><h4 className="text-sm font-medium">Comprehension Check</h4>{state.questions.map(q => { const ans = s.questions.find(a => a.questionId === q.id); if (!ans) return null; return (<div key={q.id} className="flex items-start gap-2 bg-muted/30 rounded p-2"><div className="flex-1 min-w-0"><div className="text-xs font-medium">{q.question || "(no question)"}</div><div className="text-xs text-muted-foreground">Expected: {q.correctAnswer || "—"}</div></div><Input value={ans.playerAnswer} onChange={e=>updS(s.id,{questions:s.questions.map(a=>a.questionId===q.id?{...a,playerAnswer:e.target.value,correct:e.target.value.trim().toLowerCase()===q.correctAnswer.trim().toLowerCase()}:a)})} placeholder="Player answer" className="h-7 text-xs max-w-[200px]"/>{ans.correct?<CheckCircle2 className="h-4 w-4 text-emerald-400 mt-1"/>:<XCircle className="h-4 w-4 text-red-400 mt-1"/>}</div>); })}</div>
                    <div className="space-y-2"><div className="flex items-center justify-between"><h4 className="text-sm font-medium">Friction Log</h4><Button size="sm" variant="outline" onClick={()=>addF(s.id)} className="h-7 gap-1"><Plus className="h-3 w-3"/> Log</Button></div>{s.frictionLogs.map(f => (<div key={f.id} className="grid grid-cols-[80px_1fr_100px_40px_40px] gap-2 items-center bg-muted/30 rounded p-2"><Input value={f.timestamp} onChange={e=>updS(s.id,{frictionLogs:s.frictionLogs.map(x=>x.id===f.id?{...x,timestamp:e.target.value}:x)})} placeholder="0:00" className="h-7 text-xs"/><Input value={f.description} onChange={e=>updS(s.id,{frictionLogs:s.frictionLogs.map(x=>x.id===f.id?{...x,description:e.target.value}:x)})} placeholder="What confused them?" className="h-7 text-xs"/><Select value={f.severity} onValueChange={v=>updS(s.id,{frictionLogs:s.frictionLogs.map(x=>x.id===f.id?{...x,severity:v as "low"|"medium"|"high"}:x)})}><SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select><Switch checked={f.resolved} onCheckedChange={v=>updS(s.id,{frictionLogs:s.frictionLogs.map(x=>x.id===f.id?{...x,resolved:v}:x)})}/><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>updS(s.id,{frictionLogs:s.frictionLogs.filter(x=>x.id!==f.id)})}><Trash2 className="h-3 w-3"/></Button></div>))}{s.frictionLogs.length===0&&<div className="text-xs text-muted-foreground italic">No friction logged.</div>}</div>
                    <div className="space-y-1"><Label className="text-xs">Overall Notes</Label><Textarea rows={2} value={s.overallNotes} onChange={e=>updS(s.id,{overallNotes:e.target.value})} className="text-sm"/></div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "analysis" && (
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/> Aggregate Metrics</CardTitle></CardHeader><CardContent className="space-y-4">
            {state.sessions.length === 0 ? <div className="text-sm text-muted-foreground">No sessions to analyze yet.</div> : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4"><div className="bg-muted/30 rounded p-3"><div className="text-xs text-muted-foreground">Avg Comprehension</div><div className={`text-2xl font-bold ${avgScore>=80?"text-emerald-400":avgScore>=50?"text-amber-400":"text-red-400"}`}>{avgScore}%</div></div><div className="bg-muted/30 rounded p-3"><div className="text-xs text-muted-foreground">Completion Rate</div><div className="text-2xl font-bold">{completion}%</div></div><div className="bg-muted/30 rounded p-3"><div className="text-xs text-muted-foreground">Would Play Again</div><div className="text-2xl font-bold">{again}%</div></div><div className="bg-muted/30 rounded p-3"><div className="text-xs text-muted-foreground">Avg Rulebook Clarity</div><div className="text-2xl font-bold">{avgClarity}/5</div></div></div>
                <div className="space-y-2"><h4 className="text-sm font-medium">Friction by Section</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{Array.from(frictionMap.entries()).map(([sec, data]) => (<div key={sec} className="flex items-center justify-between bg-muted/30 rounded p-2"><span className="text-sm capitalize">{sec}</span><div className="flex items-center gap-2"><Badge variant="outline">{data.count} logs</Badge>{data.high>0&&<Badge className="bg-red-500/20 text-red-400 border-red-500/30">{data.high} high</Badge>}</div></div>))}{frictionMap.size===0&&<div className="text-sm text-muted-foreground">No friction data yet.</div>}</div></div>
                {avgScore < 60 && <div className="flex items-start gap-2 text-amber-400 bg-amber-500/10 rounded p-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5"/><span>Comprehension scores are low. Consider simplifying rulebook language or adding visual aids.</span></div>}
                {avgSetup > 20 && <div className="flex items-start gap-2 text-amber-400 bg-amber-500/10 rounded p-3 text-sm"><Clock className="h-4 w-4 shrink-0 mt-0.5"/><span>Average setup time is high ({avgSetup}m). Consider component bagging or quick-start guide.</span></div>}
                {completion < 70 && <div className="flex items-start gap-2 text-red-400 bg-red-500/10 rounded p-3 text-sm"><XCircle className="h-4 w-4 shrink-0 mt-0.5"/><span>Completion rate is below 70%. Investigate why players abandon games.</span></div>}
              </div>
            )}
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
