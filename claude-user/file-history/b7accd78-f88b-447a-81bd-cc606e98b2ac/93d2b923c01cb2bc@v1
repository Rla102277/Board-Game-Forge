import { useState, useMemo } from "react";
import {
  BookOpen, Plus, Trash2, ChevronDown, ChevronRight, Lightbulb,
  FileText, Sparkles, ArrowUp, ArrowDown, Tag, Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface RulebookSection {
  id: string;
  type: "setup" | "objective" | "turn-order" | "actions" | "scoring" | "faq" | "custom";
  title: string;
  content: string;
  order: number;
  required: boolean;
  tips: string[];
}

interface GlossaryEntry {
  term: string;
  definition: string;
  autoDetected: boolean;
  occurrences: number;
}

interface RulebookState {
  sections: RulebookSection[];
  glossary: GlossaryEntry[];
  title: string;
  version: string;
  notes: string;
}

const STORAGE = (pid: number) => `gameforge.rulebook.${pid}`;

const DEFAULT_SECTIONS = (): RulebookSection[] => [
  { id: crypto.randomUUID(), type: "setup", title: "Setup", content: "", order: 0, required: true, tips: ["List components", "Starting positions", "Deal hands"] },
  { id: crypto.randomUUID(), type: "objective", title: "Objective", content: "", order: 1, required: true, tips: ["Win condition", "Tiebreakers"] },
  { id: crypto.randomUUID(), type: "turn-order", title: "Turn Order", content: "", order: 2, required: true, tips: ["Who goes first", "Clockwise or simultaneous"] },
  { id: crypto.randomUUID(), type: "actions", title: "Actions", content: "", order: 3, required: true, tips: ["Available actions", "Costs and limits"] },
  { id: crypto.randomUUID(), type: "scoring", title: "Scoring", content: "", order: 4, required: true, tips: ["Points earned", "End-game scoring"] },
  { id: crypto.randomUUID(), type: "faq", title: "FAQ", content: "", order: 5, required: false, tips: ["Edge cases", "Timing conflicts"] },
];

const META: Record<string, { color: string }> = {
  setup: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  objective: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  "turn-order": { color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  actions: { color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  scoring: { color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  faq: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  custom: { color: "bg-muted text-muted-foreground" },
};

function load(pid: number): RulebookState {
  try { const r = localStorage.getItem(STORAGE(pid)); if (r) return JSON.parse(r); } catch {}
  return { sections: DEFAULT_SECTIONS(), glossary: [], title: "Rulebook", version: "1.0", notes: "" };
}
function save(pid: number, s: RulebookState) { try { localStorage.setItem(STORAGE(pid), JSON.stringify(s)); } catch {} }

function detectTerms(text: string): Map<string, number> {
  const m = new Map<string, number>();
  const raw = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g);
  if (!raw) return m;
  const stopWords = new Set(["The","And","For","But","Not","Are","With","From","This","That","Have","They","Will","Would","Should","Could","Each","Every","Some","Many","Most","More","Less","Very","Just","Only","Also","Even","Such","Than","Then","When","Where","What","Which","While","After","Before","During","Above","Below","Under","Over","Into","Upon","Within","Without","Through","Across","Around","Behind","Beside","Beyond","Inside","Outside","Toward","Towards"]);
  raw.forEach(t => { if (t.length <= 3 || stopWords.has(t)) return; m.set(t, (m.get(t) || 0) + 1); });
  return m;
}

export function RulebookEditor({ projectId }: { projectId: number }) {
  const [state, setState] = useState<RulebookState>(() => load(projectId));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"outline" | "glossary" | "preview">("outline");
  const persist = (next: RulebookState) => { setState(next); save(projectId, next); };

  const allText = useMemo(() => state.sections.map(s => s.content).join(" "), [state.sections]);
  const detected = useMemo(() => detectTerms(allText), [allText]);

  const synced = useMemo(() => {
    const existing = new Map(state.glossary.map(g => [g.term, g]));
    const merged: GlossaryEntry[] = [];
    detected.forEach((count, term) => { const e = existing.get(term); if (e) { merged.push({ ...e, occurrences: count }); existing.delete(term); } else { merged.push({ term, definition: "", autoDetected: true, occurrences: count }); } });
    existing.forEach(v => merged.push(v));
    return merged.sort((a, b) => b.occurrences - a.occurrences);
  }, [detected, state.glossary]);

  const updateSection = (id: string, u: Partial<RulebookSection>) => persist({ ...state, sections: state.sections.map(s => s.id === id ? { ...s, ...u } : s) });
  const moveSection = (id: string, dir: -1 | 1) => { const i = state.sections.findIndex(s => s.id === id); if (i < 0) return; const j = i + dir; if (j < 0 || j >= state.sections.length) return; const arr = [...state.sections]; [arr[i], arr[j]] = [arr[j], arr[i]]; persist({ ...state, sections: arr.map((s, idx) => ({ ...s, order: idx })) }); };
  const addSection = () => { const s: RulebookSection = { id: crypto.randomUUID(), type: "custom", title: "New Section", content: "", order: state.sections.length, required: false, tips: [] }; persist({ ...state, sections: [...state.sections, s] }); setExpanded(s.id); };
  const removeSection = (id: string) => { persist({ ...state, sections: state.sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })) }); if (expanded === id) setExpanded(null); };

  const updateGlossary = (term: string, def: string) => {
    const entries = state.glossary.map(g => g.term === term ? { ...g, definition: def, autoDetected: false } : g);
    if (!entries.find(g => g.term === term)) entries.push({ term, definition: def, autoDetected: false, occurrences: detected.get(term) || 0 });
    persist({ ...state, glossary: entries });
  };

  const preview = useMemo(() => {
    let md = `# ${state.title}\n\n**Version:** ${state.version}\n\n`;
    if (state.notes) md += `> ${state.notes}\n\n`;
    state.sections.forEach(s => { if (!s.content.trim()) return; md += `## ${s.title}\n\n${s.content}\n\n`; });
    const defined = synced.filter(g => g.definition.trim());
    if (defined.length > 0) { md += `---\n\n## Glossary\n\n`; defined.forEach(g => { md += `**${g.term}** — ${g.definition}  \n`; }); }
    return md;
  }, [state, synced]);

  const sectionsMissing = state.sections.filter(s => s.required && !s.content.trim()).length;
  const sectionsTotal = state.sections.filter(s => s.content.trim()).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Rulebook Editor</h2>
        <p className="text-muted-foreground text-sm mt-1">Structured outline with auto-glossary generation.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline">{sectionsTotal}/{state.sections.length} sections filled</Badge>
        {sectionsMissing > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><Lightbulb className="h-3 w-3"/> {sectionsMissing} required empty</Badge>}
        <Badge variant="outline">{synced.filter(g => g.definition.trim()).length} glossary terms</Badge>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {(["outline","glossary","preview"] as const).map(t => <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 text-sm font-medium capitalize rounded-t-lg ${tab===t?"bg-sidebar-primary text-sidebar-primary-foreground":"text-muted-foreground hover:text-foreground"}`}>{t}</button>)}
      </div>

      {tab === "outline" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Title</Label><Input value={state.title} onChange={e=>persist({...state,title:e.target.value})} placeholder="Rulebook title"/></div>
                <div className="space-y-1"><Label>Version</Label><Input value={state.version} onChange={e=>persist({...state,version:e.target.value})} placeholder="1.0"/></div>
                <div className="space-y-1"><Label>Designer Notes</Label><Input value={state.notes} onChange={e=>persist({...state,notes:e.target.value})} placeholder="Internal notes"/></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Sections</h3>
            <Button size="sm" variant="outline" onClick={addSection} className="gap-1"><Plus className="h-4 w-4"/> Add Section</Button>
          </div>

          <div className="space-y-3">
            {state.sections.map((s, idx) => {
              const isEx = expanded === s.id;
              const meta = META[s.type] || META.custom;
              return (
                <Card key={s.id} className={`border-l-4 ${meta.color.split(" ")[2]||"border-muted"} ${isEx?"border-primary/50":""}`}>
                  <CardHeader className="pb-2 cursor-pointer" onClick={()=>setExpanded(isEx?null:s.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isEx?<ChevronDown className="h-4 w-4 text-muted-foreground"/>:<ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                        <div className="flex items-center gap-2">
                          <Badge className={`${meta.color} text-xs`}>{s.type.replace("-"," ")}</Badge>
                          <CardTitle className="text-base">{s.title}</CardTitle>
                          {s.required&&<Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e=>{e.stopPropagation();moveSection(s.id,-1);}} disabled={idx===0}><ArrowUp className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e=>{e.stopPropagation();moveSection(s.id,1);}} disabled={idx===state.sections.length-1}><ArrowDown className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e=>{e.stopPropagation();removeSection(s.id);}}><Trash2 className="h-3.5 w-3.5"/></Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isEx && (
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1"><Label>Title</Label><Input value={s.title} onChange={e=>updateSection(s.id,{title:e.target.value})} className="h-8 text-sm"/></div>
                        <div className="space-y-1"><Label>Type</Label><Select value={s.type} onValueChange={v=>updateSection(s.id,{type:v as any})}><SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger><SelectContent>{["setup","objective","turn-order","actions","scoring","faq","custom"].map(t=><SelectItem key={t} value={t}>{t.replace("-"," ")}</SelectItem>)}</SelectContent></Select></div>
                        <div className="flex items-end pb-1 gap-2"><Switch checked={s.required} onCheckedChange={c=>updateSection(s.id,{required:c})}/><span className="text-sm">Required</span></div>
                      </div>
                      <div className="space-y-1"><Label>Content</Label><Textarea rows={6} value={s.content} onChange={e=>updateSection(s.id,{content:e.target.value})} placeholder={`Write the ${s.title.toLowerCase()} section...`} className="text-sm font-mono"/></div>
                      {s.tips.length > 0 && <div className="flex flex-wrap gap-2">{s.tips.map((tip,i)=><Badge key={i} variant="outline" className="gap-1 text-xs"><Lightbulb className="h-3 w-3 text-amber-400"/>{tip}</Badge>)}</div>}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "glossary" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Languages className="h-4 w-4 text-primary"/> Auto-Glossary</CardTitle><CardDescription>Terms detected from section content. Add definitions to include in the rulebook.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {synced.length === 0 && <div className="text-sm text-muted-foreground">Write content in sections to detect glossary terms automatically.</div>}
              {synced.map(g => (
                <div key={g.term} className={`flex items-start gap-3 p-3 rounded-lg border ${g.definition.trim()?"bg-emerald-500/5 border-emerald-500/20":"bg-muted/30 border-transparent"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{g.term}</span>
                      <Badge variant="outline" className="text-xs">{g.occurrences}×</Badge>
                      {g.autoDetected && !g.definition.trim() && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Suggested</Badge>}
                      {g.definition.trim() && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Defined</Badge>}
                    </div>
                    <Input value={g.definition} onChange={e=>updateGlossary(g.term,e.target.value)} placeholder="Definition..." className="h-8 text-sm mt-1"/>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "preview" && (
        <Card>
          <CardHeader className="flex items-center justify-between"><CardTitle className="text-base">Markdown Preview</CardTitle><Button size="sm" variant="outline" onClick={()=>navigator.clipboard.writeText(preview)} className="gap-1"><FileText className="h-3.5 w-3.5"/> Copy</Button></CardHeader>
          <CardContent><pre className="text-sm font-mono whitespace-pre-wrap bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">{preview}</pre></CardContent>
        </Card>
      )}
    </div>
  );
}
