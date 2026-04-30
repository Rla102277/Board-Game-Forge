import { useState, useMemo, useCallback } from "react";
import {
  BookOpen, Plus, Trash2, ChevronDown, ChevronRight, Lightbulb,
  FileText, ArrowUp, ArrowDown, Languages, RefreshCw, Sparkles,
  ExternalLink, Copy, Check, Layers, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetProject,
  useListRules,
  useListEntities,
  useListPlayers,
  useListResearch,
  useGenerateExport,
} from "@workspace/api-client-react";

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
  { id: crypto.randomUUID(), type: "setup",      title: "Setup",       content: "", order: 0, required: true,  tips: ["List components", "Starting positions", "Deal hands"] },
  { id: crypto.randomUUID(), type: "objective",  title: "Objective",   content: "", order: 1, required: true,  tips: ["Win condition", "Tiebreakers"] },
  { id: crypto.randomUUID(), type: "turn-order", title: "Turn Order",  content: "", order: 2, required: true,  tips: ["Who goes first", "Clockwise or simultaneous"] },
  { id: crypto.randomUUID(), type: "actions",    title: "Actions",     content: "", order: 3, required: true,  tips: ["Available actions", "Costs and limits"] },
  { id: crypto.randomUUID(), type: "scoring",    title: "Scoring",     content: "", order: 4, required: true,  tips: ["Points earned", "End-game scoring"] },
  { id: crypto.randomUUID(), type: "faq",        title: "FAQ",         content: "", order: 5, required: false, tips: ["Edge cases", "Timing conflicts"] },
];

const META: Record<string, { color: string; borderColor: string }> = {
  setup:      { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",  borderColor: "border-l-emerald-500/60" },
  objective:  { color: "bg-amber-500/20 text-amber-400 border-amber-500/30",        borderColor: "border-l-amber-500/60"   },
  "turn-order":{ color: "bg-blue-500/20 text-blue-400 border-blue-500/30",          borderColor: "border-l-blue-500/60"    },
  actions:    { color: "bg-violet-500/20 text-violet-400 border-violet-500/30",     borderColor: "border-l-violet-500/60"  },
  scoring:    { color: "bg-rose-500/20 text-rose-400 border-rose-500/30",           borderColor: "border-l-rose-500/60"    },
  faq:        { color: "bg-orange-500/20 text-orange-400 border-orange-500/30",     borderColor: "border-l-orange-500/60"  },
  custom:     { color: "bg-muted text-muted-foreground",                            borderColor: "border-l-border"         },
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
  const stop = new Set(["The","And","For","But","Not","Are","With","From","This","That","Have","They","Will","Would","Should","Could","Each","Every","Some","Many","Most","More","Less","Very","Just","Only","Also","Even","Such","Than","Then","When","Where","What","Which","While","After","Before","During","Above","Below","Under","Over","Into","Upon","Within","Without","Through","Across","Around","Behind","Beside","Beyond","Inside","Outside","Toward","Towards"]);
  raw.forEach(t => { if (t.length <= 3 || stop.has(t)) return; m.set(t, (m.get(t) || 0) + 1); });
  return m;
}

function GammaModal({ open, content, gammaUrl, onClose }: {
  open: boolean;
  content: string;
  gammaUrl?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border flex-row items-start justify-between space-y-0">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Gamma Document Ready
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Copy this content into <strong>Gamma.app</strong> to generate a professional presentation or document.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}><X className="h-4 w-4"/></Button>
        </DialogHeader>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/20">
          <Button size="sm" onClick={copy} className="gap-1.5 shrink-0">
            {copied ? <Check className="h-3.5 w-3.5"/> : <Copy className="h-3.5 w-3.5"/>}
            {copied ? "Copied!" : "Copy document"}
          </Button>
          {gammaUrl ? (
            <Button size="sm" variant="outline" asChild className="gap-1.5 shrink-0">
              <a href={gammaUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5"/> Open Gamma
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild className="gap-1.5 shrink-0">
              <a href="https://gamma.app/create" target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5"/> Open Gamma.app
              </a>
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">
            In Gamma: New → Paste text → Generate
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 rounded-lg p-4 leading-relaxed">
            {content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RulebookEditor({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [state, setState] = useState<RulebookState>(() => load(projectId));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"outline" | "glossary" | "preview">("outline");
  const [syncing, setSyncing] = useState(false);
  const [gammaModal, setGammaModal] = useState<{ open: boolean; content: string; gammaUrl?: string }>({ open: false, content: "" });

  const persist = (next: RulebookState) => { setState(next); save(projectId, next); };

  const { data: project } = useGetProject(projectId);
  const { data: rules }   = useListRules(projectId);
  const { data: entities } = useListEntities(projectId);
  const { data: players }  = useListPlayers(projectId);
  const { data: research } = useListResearch(projectId);

  const generateExport = useGenerateExport();

  // ── Auto-sync from project data ──────────────────────────────────────────
  const syncFromProject = useCallback(async () => {
    setSyncing(true);
    try {
      const next = { ...state };

      // Title from project
      if (project?.name) next.title = project.name;

      const update = (type: string, content: string) => {
        const idx = next.sections.findIndex(s => s.type === type);
        if (idx >= 0) {
          next.sections = [...next.sections];
          next.sections[idx] = { ...next.sections[idx], content };
        }
      };

      // Setup — list components grouped by type
      if (entities && entities.length > 0) {
        const byType: Record<string, typeof entities> = {};
        for (const e of entities) { (byType[e.type] = byType[e.type] ?? []).push(e); }
        const lines: string[] = ["**Components:**\n"];
        for (const [type, list] of Object.entries(byType)) {
          lines.push(`**${type}s** (${list.length}):`);
          for (const e of list.slice(0, 12)) {
            lines.push(`- ${e.name}${e.description ? ` — ${e.description}` : ""}`);
          }
          if (list.length > 12) lines.push(`- …and ${list.length - 12} more`);
          lines.push("");
        }
        const zones = entities.filter(e => e.type === "Zone" || e.type === "Board");
        if (zones.length > 0) {
          lines.push("\n**Setup steps:**");
          lines.push(`1. Place the ${zones.map(z => z.name).slice(0, 3).join(", ")} in the center of the table.`);
          lines.push(`2. Shuffle any decks and deal starting hands.`);
          lines.push(`3. Each player chooses a starting position or faction.`);
          lines.push(`4. Choose the first player and begin.`);
        }
        update("setup", lines.join("\n"));
      }

      // Objective — from project description + player victory conditions
      if (project?.description || players?.length) {
        const lines: string[] = [];
        if (project?.description) lines.push(project.description, "");
        if (players && players.length > 0) {
          const withVC = players.filter(p => p.victoryCondition);
          if (withVC.length > 0) {
            lines.push("**Win conditions by archetype:**");
            for (const p of withVC) lines.push(`- **${p.name}**: ${p.victoryCondition}`);
          } else {
            lines.push(`Race to be the first player to meet the end-game trigger with ${project?.playerCount ?? "multiple"} players.`);
          }
        }
        update("objective", lines.join("\n"));
      }

      // Actions — from rules
      if (rules && rules.length > 0) {
        const actionRules = rules
          .filter(r => !r.category || ["Actions","Action","Turn","Gameplay","Core","Main"].some(k => r.category?.includes(k)));
        const allRules = actionRules.length > 0 ? actionRules : rules;
        const lines: string[] = ["On your turn you may perform the following actions:\n"];
        for (const r of allRules.slice(0, 10)) {
          lines.push(`**${r.title}**`);
          lines.push(r.content);
          if (r.edgeCases) lines.push(`> Edge case: ${r.edgeCases}`);
          lines.push("");
        }
        if (rules.length > 10) lines.push(`_…and ${rules.length - 10} more rules defined in the Rules tab._`);
        update("actions", lines.join("\n"));
      }

      // Turn order — from project + player archetypes
      if (players && players.length > 0) {
        const lines: string[] = [];
        lines.push(`Players take turns in clockwise order. ${project?.playerCount ? `Supports ${project.playerCount} players.` : ""}`);
        if (players.some(p => p.archetype)) {
          lines.push("\n**Player archetypes:**");
          for (const p of players) {
            lines.push(`- **${p.name}**${p.archetype ? ` (${p.archetype})` : ""}${p.playstyle ? ` — ${p.playstyle}` : ""}`);
          }
        }
        update("turn-order", lines.join("\n"));
      }

      // FAQ — research references as "Similar to" context
      if (research && research.length > 0) {
        const refs = research.slice(0, 5);
        const lines = [
          "**Design references:**",
          ...refs.map(r => `- **${r.title}**${r.content ? ` — ${r.content.slice(0, 120)}` : ""}`),
        ];
        const faqIdx = next.sections.findIndex(s => s.type === "faq");
        if (faqIdx >= 0 && !next.sections[faqIdx].content.trim()) {
          next.sections = [...next.sections];
          next.sections[faqIdx] = { ...next.sections[faqIdx], content: lines.join("\n") };
        }
      }

      persist(next);
      toast({ title: "Synced from project", description: "All sections updated from your current project data." });
    } finally {
      setSyncing(false);
    }
  }, [project, rules, entities, players, research, state]);

  // ── Gamma export ─────────────────────────────────────────────────────────
  const publishToGamma = useCallback(async () => {
    try {
      const result = await generateExport.mutateAsync({ projectId, kind: "gamma-doc" });
      setGammaModal({ open: true, content: result.content });
    } catch {
      // Fall back to compiling from local state
      const content = buildGammaDoc();
      setGammaModal({ open: true, content });
    }
  }, [generateExport, projectId, state]);

  const buildGammaDoc = () => {
    let md = `# ${state.title}\n\n`;
    if (state.notes) md += `> ${state.notes}\n\n`;
    if (project) {
      md += `**Type:** ${project.gameType ?? "—"} · **Genre:** ${project.genre ?? "—"} · **Players:** ${project.playerCount ?? "—"} · **Duration:** ${project.targetDuration ?? "—"}\n\n---\n\n`;
    }
    for (const s of state.sections) {
      if (!s.content.trim()) continue;
      md += `## ${s.title}\n\n${s.content}\n\n`;
    }
    const defined = buildSyncedGlossary().filter(g => g.definition.trim());
    if (defined.length > 0) {
      md += `---\n\n## Glossary\n\n`;
      for (const g of defined) md += `**${g.term}** — ${g.definition}  \n`;
    }
    md += `\n---\n*Created with GameForge · ${new Date().toLocaleDateString()}*`;
    return md;
  };

  // ── Glossary ─────────────────────────────────────────────────────────────
  const allText = useMemo(() => state.sections.map(s => s.content).join(" "), [state.sections]);
  const detected = useMemo(() => detectTerms(allText), [allText]);

  const buildSyncedGlossary = () => {
    const existing = new Map(state.glossary.map(g => [g.term, g]));
    const merged: GlossaryEntry[] = [];
    detected.forEach((count, term) => {
      const e = existing.get(term);
      if (e) { merged.push({ ...e, occurrences: count }); existing.delete(term); }
      else merged.push({ term, definition: "", autoDetected: true, occurrences: count });
    });
    existing.forEach(v => merged.push(v));
    return merged.sort((a, b) => b.occurrences - a.occurrences);
  };
  const synced = useMemo(buildSyncedGlossary, [detected, state.glossary]);

  const preview = useMemo(() => {
    let md = `# ${state.title}\n\n**Version:** ${state.version}\n\n`;
    if (state.notes) md += `> ${state.notes}\n\n`;
    state.sections.forEach(s => { if (!s.content.trim()) return; md += `## ${s.title}\n\n${s.content}\n\n`; });
    const defined = synced.filter(g => g.definition.trim());
    if (defined.length > 0) { md += `---\n\n## Glossary\n\n`; defined.forEach(g => { md += `**${g.term}** — ${g.definition}  \n`; }); }
    return md;
  }, [state, synced]);

  // ── Section helpers ───────────────────────────────────────────────────────
  const updateSection = (id: string, u: Partial<RulebookSection>) =>
    persist({ ...state, sections: state.sections.map(s => s.id === id ? { ...s, ...u } : s) });

  const moveSection = (id: string, dir: -1 | 1) => {
    const i = state.sections.findIndex(s => s.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= state.sections.length) return;
    const arr = [...state.sections];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    persist({ ...state, sections: arr.map((s, idx) => ({ ...s, order: idx })) });
  };

  const addSection = () => {
    const s: RulebookSection = { id: crypto.randomUUID(), type: "custom", title: "New Section", content: "", order: state.sections.length, required: false, tips: [] };
    persist({ ...state, sections: [...state.sections, s] });
    setExpanded(s.id);
  };

  const removeSection = (id: string) => {
    persist({ ...state, sections: state.sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })) });
    if (expanded === id) setExpanded(null);
  };

  const updateGlossary = (term: string, def: string) => {
    const entries = state.glossary.map(g => g.term === term ? { ...g, definition: def, autoDetected: false } : g);
    if (!entries.find(g => g.term === term)) entries.push({ term, definition: def, autoDetected: false, occurrences: detected.get(term) || 0 });
    persist({ ...state, glossary: entries });
  };

  const sectionsMissing = state.sections.filter(s => s.required && !s.content.trim()).length;
  const sectionsTotal   = state.sections.filter(s => s.content.trim()).length;
  const hasProjectData  = (rules?.length ?? 0) + (entities?.length ?? 0) + (players?.length ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <GammaModal
        open={gammaModal.open}
        content={gammaModal.content}
        gammaUrl={gammaModal.gammaUrl}
        onClose={() => setGammaModal(m => ({ ...m, open: false }))}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Rulebook Editor
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Structured outline · auto-glossary · live sync from all project tabs.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={syncFromProject}
            disabled={syncing || !hasProjectData}
            title={!hasProjectData ? "Add entities, rules, or players first" : undefined}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from project"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
            onClick={publishToGamma}
            disabled={generateExport.isPending}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {generateExport.isPending ? "Building…" : "Publish to Gamma"}
          </Button>
        </div>
      </div>

      {/* Data source badges */}
      {hasProjectData && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Upstream:</span>
          {(entities?.length ?? 0) > 0 && <Badge variant="outline" className="text-xs gap-1"><Layers className="h-3 w-3"/>{entities!.length} components</Badge>}
          {(rules?.length ?? 0) > 0    && <Badge variant="outline" className="text-xs">{rules!.length} rules</Badge>}
          {(players?.length ?? 0) > 0  && <Badge variant="outline" className="text-xs">{players!.length} players</Badge>}
          {(research?.length ?? 0) > 0 && <Badge variant="outline" className="text-xs">{research!.length} research items</Badge>}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline">{sectionsTotal}/{state.sections.length} sections filled</Badge>
        {sectionsMissing > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><Lightbulb className="h-3 w-3"/> {sectionsMissing} required empty</Badge>}
        <Badge variant="outline">{synced.filter(g => g.definition.trim()).length} glossary terms</Badge>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {(["outline","glossary","preview"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium capitalize rounded-t-lg ${tab === t ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "outline" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Title</Label><Input value={state.title} onChange={e => persist({ ...state, title: e.target.value })} placeholder="Rulebook title"/></div>
                <div className="space-y-1"><Label>Version</Label><Input value={state.version} onChange={e => persist({ ...state, version: e.target.value })} placeholder="1.0"/></div>
                <div className="space-y-1"><Label>Designer Notes</Label><Input value={state.notes} onChange={e => persist({ ...state, notes: e.target.value })} placeholder="Internal notes"/></div>
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
              const meta = META[s.type] ?? META.custom;
              return (
                <Card key={s.id} className={`border-l-4 ${meta.borderColor} ${isEx ? "ring-1 ring-primary/30" : ""}`}>
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(isEx ? null : s.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isEx ? <ChevronDown className="h-4 w-4 text-muted-foreground"/> : <ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                        <div className="flex items-center gap-2">
                          <Badge className={`${meta.color} text-xs`}>{s.type.replace("-", " ")}</Badge>
                          <CardTitle className="text-base">{s.title}</CardTitle>
                          {s.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          {s.content.trim() && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">✓</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); moveSection(s.id, -1); }} disabled={idx === 0}><ArrowUp className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); moveSection(s.id, 1); }} disabled={idx === state.sections.length - 1}><ArrowDown className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); removeSection(s.id); }}><Trash2 className="h-3.5 w-3.5"/></Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isEx && (
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1"><Label>Title</Label><Input value={s.title} onChange={e => updateSection(s.id, { title: e.target.value })} className="h-8 text-sm"/></div>
                        <div className="space-y-1"><Label>Type</Label>
                          <Select value={s.type} onValueChange={v => updateSection(s.id, { type: v as RulebookSection["type"] })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                            <SelectContent>{["setup","objective","turn-order","actions","scoring","faq","custom"].map(t => <SelectItem key={t} value={t}>{t.replace("-"," ")}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end pb-1 gap-2"><Switch checked={s.required} onCheckedChange={c => updateSection(s.id, { required: c })}/><span className="text-sm">Required</span></div>
                      </div>
                      <div className="space-y-1">
                        <Label>Content</Label>
                        <Textarea rows={8} value={s.content} onChange={e => updateSection(s.id, { content: e.target.value })} placeholder={`Write the ${s.title.toLowerCase()} section…`} className="text-sm font-mono"/>
                      </div>
                      {s.tips.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {s.tips.map((tip, i) => <Badge key={i} variant="outline" className="gap-1 text-xs"><Lightbulb className="h-3 w-3 text-amber-400"/>{tip}</Badge>)}
                        </div>
                      )}
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
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Languages className="h-4 w-4 text-primary"/> Auto-Glossary</CardTitle>
              <CardDescription>Terms detected from section content. Add definitions to include in the rulebook.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {synced.length === 0 && <div className="text-sm text-muted-foreground">Write content in sections to detect glossary terms automatically.</div>}
              {synced.map(g => (
                <div key={g.term} className={`flex items-start gap-3 p-3 rounded-lg border ${g.definition.trim() ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-transparent"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{g.term}</span>
                      <Badge variant="outline" className="text-xs">{g.occurrences}×</Badge>
                      {g.autoDetected && !g.definition.trim() && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Suggested</Badge>}
                      {g.definition.trim() && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Defined</Badge>}
                    </div>
                    <Input value={g.definition} onChange={e => updateGlossary(g.term, e.target.value)} placeholder="Definition…" className="h-8 text-sm mt-1"/>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "preview" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Markdown Preview</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(preview)} className="gap-1">
                <FileText className="h-3.5 w-3.5"/> Copy MD
              </Button>
              <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={publishToGamma} disabled={generateExport.isPending}>
                <Sparkles className="h-3.5 w-3.5"/> Publish to Gamma
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              {preview}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
