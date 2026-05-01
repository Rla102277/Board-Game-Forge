import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetProject, useUpdateProject, useGetProjectStats,
  useListEntities, useListRules, useListPlayers, useListNotes,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDebounce } from "@/hooks/use-debounce";
import { AiEditTextarea } from "@/components/workspace/ai-edit-textarea";
import { ProjectVersions } from "@/components/workspace/project-versions";
import { ComplexityScore } from "@/components/workspace/complexity-score";
import { CollaborationDashboard } from "@/components/workspace/collaboration-dashboard";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Activity, Users, FileText, CheckSquare, MessageSquare,
  Flag, BookOpen, Trophy, Swords, Plus, X, Target, Layers, Clock,
  ImageIcon, AlertTriangle, AlertCircle, Eye, Send, Calendar, UserPlus,
  Settings, ChevronDown, ChevronUp, Pencil,
} from "lucide-react";

interface OverviewProps {
  projectId: number;
  onPromptSend: (prompt: string) => void;
}

interface DesignProblem {
  id: string;
  text: string;
  severity: "blocker" | "concern" | "watch";
  resolved?: boolean;
}
interface DecisionEntry {
  id: string;
  text: string;
  createdAt: string;
}
interface NextPlaytest {
  date?: string;
  attendees?: string[];
  focus?: string;
}
interface MechanicFingerprint {
  luck: number;
  strategy: number;
  interaction: number;
  complexity: number;
  replayability: number;
}
interface OverviewMeta {
  elevatorPitch?: string;
  playsLike?: string;
  ageRange?: string;
  designProblems?: DesignProblem[];
  nextPlaytest?: NextPlaytest;
  decisionLog?: DecisionEntry[];
  mechanicFingerprint?: MechanicFingerprint;
}

const DESIGN_PHASES = [
  { value: "concept",   label: "Concept",   desc: "Exploring what the game could be",              color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  { value: "prototype", label: "Prototype", desc: "First playable — rough rules and components",    color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { value: "alpha",     label: "Alpha",     desc: "Core loop works — iterating rules and balance",  color: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  { value: "beta",      label: "Beta",      desc: "Feature complete — polishing and blind testing", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { value: "rc",        label: "Release Candidate", desc: "Print-ready — final checks",            color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
] as const;
const PHASE_INDEX: Record<string, number> = { concept: 0, prototype: 1, alpha: 2, beta: 3, rc: 4 };

const SEVERITY_CONFIG = {
  blocker: { label: "Blocker", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  concern:  { label: "Concern", icon: AlertCircle,  color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  watch:    { label: "Watch",   icon: Eye,           color: "text-blue-400",  bg: "bg-blue-500/10 border-blue-500/30"  },
};

const FINGERPRINT_AXES = ["luck", "strategy", "interaction", "complexity", "replayability"] as const;

function parseTurnPhases(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map((s) => s.trim()).filter(Boolean); }
}

function parseOverviewMeta(raw: Record<string, unknown> | null | undefined): OverviewMeta {
  if (!raw) return {};
  return raw as OverviewMeta;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function Overview({ projectId, onPromptSend }: OverviewProps) {
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats, isLoading: statsLoading } = useGetProjectStats(projectId);
  const updateProject = useUpdateProject();

  const { data: entities } = useListEntities(projectId);
  const { data: rules } = useListRules(projectId);
  const { data: players } = useListPlayers(projectId);
  const { data: notes } = useListNotes(projectId);

  const [formData, setFormData] = useState({
    name: "", description: "", gameType: "", genre: "", playerCount: "", targetDuration: "",
    winCondition: "", eliminationRule: "", designPhase: "concept",
  });
  const [turnPhaseInput, setTurnPhaseInput] = useState("");
  const [turnPhases, setTurnPhases] = useState<string[]>([]);
  const [meta, setMeta] = useState<OverviewMeta>({});
  const [newProblemText, setNewProblemText] = useState("");
  const [newProblemSeverity, setNewProblemSeverity] = useState<DesignProblem["severity"]>("concern");
  const [newLogEntry, setNewLogEntry] = useState("");
  const [newAttendee, setNewAttendee] = useState("");

  const debouncedName        = useDebounce(formData.name, 1000);
  const debouncedDesc        = useDebounce(formData.description, 1000);
  const debouncedType        = useDebounce(formData.gameType, 1000);
  const debouncedGenre       = useDebounce(formData.genre, 1000);
  const debouncedPlayers     = useDebounce(formData.playerCount, 1000);
  const debouncedDuration    = useDebounce(formData.targetDuration, 1000);
  const debouncedWin         = useDebounce(formData.winCondition, 1200);
  const debouncedElim        = useDebounce(formData.eliminationRule, 1200);
  const debouncedMeta        = useDebounce(meta, 1500);

  const initRef        = useRef(false);
  const lastSavedRef   = useRef({ ...formData, turnPhases: "[]" });
  const lastMetaRef    = useRef<string>("{}");

  useEffect(() => {
    if (project && !initRef.current) {
      const phases = parseTurnPhases(project.turnPhases);
      const d = {
        name: project.name || "", description: project.description || "",
        gameType: project.gameType || "", genre: project.genre || "",
        playerCount: project.playerCount || "", targetDuration: project.targetDuration || "",
        winCondition: project.winCondition || "", eliminationRule: project.eliminationRule || "",
        designPhase: project.designPhase || "concept",
      };
      setFormData(d);
      setTurnPhases(phases);
      lastSavedRef.current = { ...d, turnPhases: JSON.stringify(phases) };
      const parsedMeta = parseOverviewMeta(project.overviewMeta);
      setMeta(parsedMeta);
      lastMetaRef.current = JSON.stringify(parsedMeta);
      initRef.current = true;
    }
  }, [project]);

  const save = (patch: Parameters<typeof updateProject.mutate>[0]["data"]) => {
    updateProject.mutate({ projectId, data: patch });
  };

  useEffect(() => {
    if (!initRef.current) return;
    const data = {
      name: debouncedName, description: debouncedDesc, gameType: debouncedType,
      genre: debouncedGenre, playerCount: debouncedPlayers, targetDuration: debouncedDuration,
      winCondition: debouncedWin, eliminationRule: debouncedElim,
    };
    const changed = Object.keys(data).some((k) => data[k as keyof typeof data] !== (lastSavedRef.current as Record<string, string>)[k]);
    if (changed && data.name) { save(data); Object.assign(lastSavedRef.current, data); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, debouncedDesc, debouncedType, debouncedGenre, debouncedPlayers, debouncedDuration, debouncedWin, debouncedElim]);

  useEffect(() => {
    if (!initRef.current) return;
    const serialized = JSON.stringify(debouncedMeta);
    if (serialized !== lastMetaRef.current) {
      save({ overviewMeta: debouncedMeta as Record<string, unknown> });
      lastMetaRef.current = serialized;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMeta]);

  const updateMeta = (patch: Partial<OverviewMeta>) => setMeta((m) => ({ ...m, ...patch }));

  const saveTurnPhases  = (phases: string[]) => { setTurnPhases(phases); save({ turnPhases: JSON.stringify(phases) }); };
  const saveDesignPhase = (phase: string)    => { setFormData((f) => ({ ...f, designPhase: phase })); save({ designPhase: phase }); };

  const addProblem = () => {
    if (!newProblemText.trim()) return;
    const problem: DesignProblem = {
      id: Date.now().toString(), text: newProblemText.trim(), severity: newProblemSeverity,
    };
    updateMeta({ designProblems: [problem, ...(meta.designProblems || [])] });
    setNewProblemText("");
  };

  const resolveProblem = (id: string) => {
    updateMeta({
      designProblems: (meta.designProblems || []).map((p) =>
        p.id === id ? { ...p, resolved: !p.resolved } : p
      ),
    });
  };

  const removeProblem = (id: string) => {
    updateMeta({ designProblems: (meta.designProblems || []).filter((p) => p.id !== id) });
  };

  const addLogEntry = () => {
    if (!newLogEntry.trim() || newLogEntry.length > 280) return;
    const entry: DecisionEntry = { id: Date.now().toString(), text: newLogEntry.trim(), createdAt: new Date().toISOString() };
    const existing = meta.decisionLog || [];
    updateMeta({ decisionLog: [entry, ...existing].slice(0, 100) });
    setNewLogEntry("");
  };

  const addAttendee = () => {
    if (!newAttendee.trim()) return;
    const current = meta.nextPlaytest?.attendees || [];
    updateMeta({ nextPlaytest: { ...meta.nextPlaytest, attendees: [...current, newAttendee.trim()] } });
    setNewAttendee("");
  };

  const removeAttendee = (idx: number) => {
    const current = meta.nextPlaytest?.attendees || [];
    updateMeta({ nextPlaytest: { ...meta.nextPlaytest, attendees: current.filter((_, i) => i !== idx) } });
  };

  const setFingerprintAxis = (axis: typeof FINGERPRINT_AXES[number], val: number) => {
    updateMeta({ mechanicFingerprint: { luck: 3, strategy: 3, interaction: 3, complexity: 3, replayability: 3, ...(meta.mechanicFingerprint || {}), [axis]: val } });
  };

  const recentItems = useMemo(() => {
    type Item = { id: string; name: string; section: string; Icon: React.ElementType; updatedAt: string };
    const all: Item[] = [
      ...(entities || []).map((e) => ({ id: `e-${e.id}`, name: e.name, section: "Components", Icon: ImageIcon, updatedAt: e.updatedAt })),
      ...(rules || []).map((r) => ({ id: `r-${r.id}`, name: r.title, section: "Rules", Icon: Activity, updatedAt: r.updatedAt })),
      ...(players || []).map((p) => ({ id: `p-${p.id}`, name: p.name, section: "Players", Icon: Users, updatedAt: p.updatedAt })),
      ...(notes || []).map((n) => ({ id: `n-${n.id}`, name: n.title || "Untitled note", section: "Notes", Icon: FileText, updatedAt: n.updatedAt })),
    ];
    return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
  }, [entities, rules, players, notes]);

  if (projectLoading) {
    return <div className="space-y-4 pb-8"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const currentPhaseIdx = PHASE_INDEX[formData.designPhase] ?? 0;
  const currentPhase = DESIGN_PHASES[currentPhaseIdx];

  const fp = meta.mechanicFingerprint || { luck: 3, strategy: 3, interaction: 3, complexity: 3, replayability: 3 };
  const radarData = FINGERPRINT_AXES.map((ax) => ({ subject: ax.charAt(0).toUpperCase() + ax.slice(1), value: fp[ax] }));

  const activeProblems  = (meta.designProblems || []).filter((p) => !p.resolved);
  const resolvedCount   = (meta.designProblems || []).length - activeProblems.length;

  const visibleStats = [
    { label: "Components", count: stats?.entityCount,      Icon: LayoutDashboard, color: "text-blue-400",   bg: "bg-blue-500/10"   },
    { label: "Rules",      count: stats?.ruleCount,        Icon: Activity,        color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Players",    count: stats?.playerCount,      Icon: Users,           color: "text-emerald-400",bg: "bg-emerald-500/10"},
    { label: "Notes",      count: stats?.noteCount,        Icon: FileText,        color: "text-amber-400",  bg: "bg-amber-500/10"  },
    { label: "Tasks",      count: stats?.taskCount,        Icon: CheckSquare,     color: "text-rose-400",   bg: "bg-rose-500/10"   },
    { label: "Messages",   count: stats?.chatMessageCount, Icon: MessageSquare,   color: "text-sky-400",    bg: "bg-sky-500/10"    },
  ].filter((s) => (s.count ?? 0) > 0);

  const nextPlaytest = meta.nextPlaytest;
  const playtestDate = nextPlaytest?.date;
  const daysAway = playtestDate ? daysUntil(playtestDate) : null;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Game Identity Hero ──────────────────────────────────────────── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Elevator pitch</Label>
                <Textarea
                  placeholder="In one or two sentences, what's the core experience of your game?"
                  rows={2}
                  className="resize-none text-sm bg-background/60"
                  value={meta.elevatorPitch || ""}
                  onChange={(e) => updateMeta({ elevatorPitch: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Player count</Label>
                  <Input
                    placeholder="e.g. 2–5"
                    className="h-8 text-sm bg-background/60"
                    value={formData.playerCount}
                    onChange={(e) => setFormData((p) => ({ ...p, playerCount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Play time</Label>
                  <Input
                    placeholder="e.g. 45–90 min"
                    className="h-8 text-sm bg-background/60"
                    value={formData.targetDuration}
                    onChange={(e) => setFormData((p) => ({ ...p, targetDuration: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Age range</Label>
                  <Input
                    placeholder="e.g. 12+"
                    className="h-8 text-sm bg-background/60"
                    value={meta.ageRange || ""}
                    onChange={(e) => updateMeta({ ageRange: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Plays like</Label>
                  <Input
                    placeholder="e.g. Catan meets Dominion"
                    className="h-8 text-sm bg-background/60"
                    value={meta.playsLike || ""}
                    onChange={(e) => updateMeta({ playsLike: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Last Session strip */}
          {recentItems.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">Where you left off</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {recentItems.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <div key={item.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium truncate leading-tight">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.section} · {relativeTime(item.updatedAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Design Problems ────────────────────────────────────────── */}
          <Card>
            <CardHeader className="py-4 px-5 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Design Problems
                  {activeProblems.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{activeProblems.length} open</Badge>
                  )}
                </CardTitle>
                {resolvedCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">{resolvedCount} resolved</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-3">
              {/* Add problem */}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 3-player balance feels off…"
                  className="h-8 text-sm flex-1"
                  value={newProblemText}
                  onChange={(e) => setNewProblemText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProblem()}
                />
                <div className="flex gap-1">
                  {(["blocker", "concern", "watch"] as const).map((sev) => {
                    const cfg = SEVERITY_CONFIG[sev];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={sev}
                        onClick={() => setNewProblemSeverity(sev)}
                        title={cfg.label}
                        className={`h-8 w-8 rounded flex items-center justify-center transition-all border ${
                          newProblemSeverity === sev ? cfg.bg : "border-transparent hover:border-border"
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${newProblemSeverity === sev ? cfg.color : "text-muted-foreground"}`} />
                      </button>
                    );
                  })}
                </div>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={addProblem} disabled={!newProblemText.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Problem list */}
              {activeProblems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No open design problems — great shape!</p>
              ) : (
                <div className="space-y-1.5">
                  {activeProblems.map((p) => {
                    const cfg = SEVERITY_CONFIG[p.severity];
                    const Icon = cfg.icon;
                    return (
                      <div key={p.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color} shrink-0 mt-0.5`} />
                        <p className="text-sm flex-1 leading-snug">{p.text}</p>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => resolveProblem(p.id)}
                            className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors px-1"
                            title="Mark resolved"
                          >
                            ✓
                          </button>
                          <button onClick={() => removeProblem(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Decision Log ───────────────────────────────────────────── */}
          <Card>
            <CardHeader className="py-4 px-5 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                Decision Log
                <span className="text-xs font-normal text-muted-foreground ml-1">Why did you make this choice?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Textarea
                    placeholder="e.g. Removed trading — too much downtime. Replaced with direct exchange…"
                    rows={2}
                    className="resize-none text-sm"
                    value={newLogEntry}
                    onChange={(e) => setNewLogEntry(e.target.value.slice(0, 280))}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addLogEntry(); }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{newLogEntry.length}/280 · Cmd+Enter to save</p>
                </div>
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 mb-5" onClick={addLogEntry} disabled={!newLogEntry.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>

              {(meta.decisionLog || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No decisions logged yet.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(meta.decisionLog || []).map((entry) => (
                    <div key={entry.id} className="flex gap-2 text-sm">
                      <div className="w-1 shrink-0 bg-primary/30 rounded-full mt-0.5" />
                      <div className="flex-1">
                        <p className="leading-snug">{entry.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(entry.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => updateMeta({ decisionLog: (meta.decisionLog || []).filter((e) => e.id !== entry.id) })}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Design Phase tracker */}
          <Card className="border-border">
            <CardHeader className="border-b border-border py-3 px-4 flex-row items-center gap-2">
              <Flag className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold">Design Phase</CardTitle>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${currentPhase?.color}`}>
                {currentPhase?.label}
              </span>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-2">
              <div className="flex flex-col gap-1">
                {DESIGN_PHASES.map((p, i) => (
                  <button
                    key={p.value}
                    onClick={() => saveDesignPhase(p.value)}
                    className={`text-left px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                      formData.designPhase === p.value
                        ? `${p.color} ring-1 ring-current`
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <span className="font-semibold">{p.label}</span>
                    <span className="ml-1 opacity-60 font-normal">{p.desc}</span>
                  </button>
                ))}
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${((currentPhaseIdx + 1) / DESIGN_PHASES.length) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mechanic Fingerprint */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold">Mechanic Fingerprint</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData} margin={{ top: 0, right: 16, bottom: 0, left: 16 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {FINGERPRINT_AXES.map((ax) => (
                  <div key={ax} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20 capitalize">{ax}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() => setFingerprintAxis(ax, v)}
                          className={`h-4 w-4 rounded-sm text-[9px] font-bold transition-all ${
                            fp[ax] >= v
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Playtest */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Next Playtest
                </CardTitle>
                {daysAway !== null && (
                  <span className={`text-xs font-semibold ${daysAway <= 1 ? "text-red-400" : daysAway <= 3 ? "text-amber-400" : "text-emerald-400"}`}>
                    {daysAway === 0 ? "Today!" : daysAway < 0 ? "Past" : `${daysAway}d away`}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-3">
              <Input
                type="date"
                className="h-8 text-sm"
                value={nextPlaytest?.date || ""}
                onChange={(e) => updateMeta({ nextPlaytest: { ...nextPlaytest, date: e.target.value } })}
              />
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Attending</Label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {(nextPlaytest?.attendees || []).map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-secondary rounded px-2 py-0.5">
                      {a}
                      <button onClick={() => removeAttendee(i)}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Add person…"
                    className="h-7 text-xs"
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                  />
                  <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={addAttendee}>
                    <UserPlus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">What to test</Label>
                <Textarea
                  placeholder="e.g. Test the new scoring rule, check 4-player balance…"
                  rows={2}
                  className="resize-none text-xs"
                  value={nextPlaytest?.focus || ""}
                  onChange={(e) => updateMeta({ nextPlaytest: { ...nextPlaytest, focus: e.target.value } })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats — non-zero only */}
          {visibleStats.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Project at a glance</h3>
              <div className="grid grid-cols-3 gap-2">
                {visibleStats.map((stat) => {
                  const Icon = stat.Icon;
                  return (
                    <div key={stat.label} className={`rounded-lg border border-border p-2 ${stat.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${stat.color} mb-1`} />
                      <div className="text-lg font-bold leading-none">{statsLoading ? "·" : stat.count}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Complexity score */}
          {stats && (
            <ComplexityScore
              ruleCount={(stats as any).ruleCount ?? 0}
              entityCount={(stats as any).entityCount ?? 0}
              playerCount={formData.playerCount}
              playtestCount={(stats as any).playtestCount ?? 0}
            />
          )}
        </div>
      </div>

      {/* ── Collaboration widgets ─────────────────────────────────────── */}
      <CollaborationDashboard projectId={projectId} />

      {/* ── Game Bible accordion ─────────────────────────────────────── */}
      <Accordion type="single" collapsible className="border border-border rounded-lg overflow-hidden">
        <AccordionItem value="game-bible" className="border-0">
          <AccordionTrigger className="px-5 py-4 text-sm font-semibold hover:no-underline bg-card">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Game Bible
              <span className="text-xs font-normal text-muted-foreground">Metadata, core loop, turn phases, versions</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 py-5 bg-background/60 space-y-6">

            {/* Project metadata */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Project metadata</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Project name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-xs">Description</Label>
                  <AiEditTextarea projectId={projectId} value={formData.description} onChange={(next) => setFormData((p) => ({ ...p, description: next }))} placeholder="A longer description of your game…" rows={3} className="min-h-[80px]" contextLabel="project description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gameType" className="text-xs">Game type</Label>
                    <Input id="gameType" placeholder="e.g. Strategy, Party, Worker placement" value={formData.gameType} onChange={(e) => setFormData((p) => ({ ...p, gameType: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="genre" className="text-xs">Genre</Label>
                    <Input id="genre" placeholder="e.g. Fantasy, Sci-fi, Historical" value={formData.genre} onChange={(e) => setFormData((p) => ({ ...p, genre: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Core game loop */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Core game loop</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Trophy className="w-3 h-3 text-amber-400" /> Win condition</Label>
                  <Textarea placeholder="e.g. First player to collect 10 Victory Points wins…" rows={2} value={formData.winCondition} onChange={(e) => setFormData((p) => ({ ...p, winCondition: e.target.value }))} className="resize-none" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Swords className="w-3 h-3 text-red-400" /> Elimination / losing</Label>
                  <Input placeholder="e.g. Last player standing wins…" value={formData.eliminationRule} onChange={(e) => setFormData((p) => ({ ...p, eliminationRule: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Layers className="w-3 h-3 text-blue-400" /> Turn phases</Label>
                  {turnPhases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {turnPhases.map((phase, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary/10 border border-primary/25 text-primary rounded px-2 py-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono mr-0.5">{i + 1}.</span>
                          {phase}
                          <button onClick={() => saveTurnPhases(turnPhases.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive ml-0.5">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Draw Phase, Action Phase, Cleanup…"
                      value={turnPhaseInput}
                      onChange={(e) => setTurnPhaseInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && turnPhaseInput.trim()) { saveTurnPhases([...turnPhases, turnPhaseInput.trim()]); setTurnPhaseInput(""); } }}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => { if (turnPhaseInput.trim()) { saveTurnPhases([...turnPhases, turnPhaseInput.trim()]); setTurnPhaseInput(""); } }} disabled={!turnPhaseInput.trim()}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Project versions */}
            <ProjectVersions projectId={projectId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
