import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProject, useUpdateProject, useGetProjectStats,
  useListEntities, useListRules, useListPlayers, useListNotes,
  useGetBalanceReport,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { AiEditTextarea } from "@/components/workspace/ai-edit-textarea";
import { ProjectVersions } from "@/components/workspace/project-versions";
import { ComplexityScore } from "@/components/workspace/complexity-score";
import { CollaborationDashboard } from "@/components/workspace/collaboration-dashboard";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import {
  Activity, Users, FileText, CheckSquare, MessageSquare,
  Flag, Trophy, Swords, Plus, X, Target, Layers, Clock,
  ImageIcon, AlertTriangle, AlertCircle, Eye, Send, Calendar, UserPlus,
  Settings, LayoutDashboard, Pencil, Loader2, Check,
  Gauge, TrendingUp, ArrowRight, FlaskConical, ShieldAlert,
} from "lucide-react";

interface OverviewProps {
  projectId: number;
  onPromptSend: (prompt: string) => void;
  /** "dashboard" → Game Dashboard tab; "identity" → Game Identity tab */
  view?: "dashboard" | "identity";
}

interface GameIdentityProps {
  projectId: number;
  onPromptSend: (prompt: string) => void;
}

/* ── Typed shapes for each jsonb column ───────────────────────────── */
interface DesignProblem {
  id: string;
  text: string;
  severity: "blocker" | "concern" | "watch";
  resolved?: boolean;
}
interface NextPlaytest {
  date?: string;
  attendees?: string[];
  focus?: string;
}
interface DecisionEntry {
  id: string;
  text: string;
  createdAt: string;
}
interface MechanicFingerprint {
  luck: number;
  strategy: number;
  interaction: number;
  complexity: number;
  replayability: number;
}
/* overviewMeta is kept only for hero-level fields without dedicated columns */
interface HeroMeta {
  elevatorPitch?: string;
  playsLike?: string;
  ageRange?: string;
  complexityTier?: string;
  theme?: string;
  mechanicTypes?: string[];
  targetAudience?: string;
  designerName?: string;
  publisherNotes?: string;
}

const COMPLEXITY_TIERS = [
  { value: "filler",  label: "Filler",  desc: "≤ 15 min, minimal rules" },
  { value: "light",   label: "Light",   desc: "30-60 min, easy to learn" },
  { value: "medium",  label: "Medium",  desc: "60-120 min, moderate depth" },
  { value: "heavy",   label: "Heavy",   desc: "2+ hrs, complex systems" },
  { value: "expert",  label: "Expert",  desc: "Highly complex, long learning curve" },
] as const;

const GAME_THEMES = [
  "Fantasy", "Sci-Fi", "Historical", "Modern", "Mythological",
  "Abstract", "Horror", "Adventure", "Western", "Cyberpunk",
] as const;

const MECHANIC_TYPES = [
  "Deck Building", "Worker Placement", "Area Control", "Drafting",
  "Auction / Bidding", "Engine Building", "Push Your Luck", "Cooperative",
  "Hidden Role", "Legacy / Campaign", "Hand Management", "Tile Placement",
] as const;

const AUDIENCE_TAGS = [
  "Kids", "Family", "Gateway", "Casual", "Strategy", "Expert", "Party",
] as const;

const DESIGN_PHASES = [
  { value: "concept",   label: "Concept",   desc: "Exploring what the game could be",             color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  { value: "prototype", label: "Prototype", desc: "First playable — rough rules and components",   color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { value: "alpha",     label: "Alpha",     desc: "Core loop works — iterating rules and balance", color: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  { value: "beta",      label: "Beta",      desc: "Feature complete — polishing and blind testing", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { value: "rc",        label: "Release Candidate", desc: "Print-ready — final checks",           color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
] as const;
const PHASE_INDEX: Record<string, number> = { concept: 0, prototype: 1, alpha: 2, beta: 3, rc: 4 };

const SEVERITY = {
  blocker: { label: "Blockers",  Icon: AlertTriangle, color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/30",   header: "border-b border-red-500/30"  },
  concern:  { label: "Concerns", Icon: AlertCircle,   color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", header: "border-b border-amber-500/30" },
  watch:    { label: "Watch",    Icon: Eye,            color: "text-blue-400",  bg: "bg-blue-500/10",  border: "border-blue-500/30",  header: "border-b border-blue-500/30"  },
} as const;

const FINGERPRINT_AXES = ["luck", "strategy", "interaction", "complexity", "replayability"] as const;

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
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function parseTurnPhases(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map((s) => s.trim()).filter(Boolean); }
}

function castHeroMeta(raw: Record<string, unknown> | null | undefined): HeroMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as HeroMeta;
}
function castProblems(raw: Record<string, unknown>[] | null | undefined): DesignProblem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => {
      if (p === null || typeof p !== "object") return false;
      const x = p as Record<string, unknown>;
      return typeof x["id"] === "string" && typeof x["text"] === "string" &&
        ["blocker", "concern", "watch"].includes(x["severity"] as string);
    })
    .map((p) => p as unknown as DesignProblem);
}
function castNextPlaytest(raw: Record<string, unknown> | null | undefined): NextPlaytest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as NextPlaytest;
}
function castDecisionLog(raw: Record<string, unknown>[] | null | undefined): DecisionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => {
      if (e === null || typeof e !== "object") return false;
      const x = e as Record<string, unknown>;
      return typeof x["id"] === "string" && typeof x["text"] === "string" && typeof x["createdAt"] === "string";
    })
    .map((e) => e as unknown as DecisionEntry);
}
function castFingerprint(raw: Record<string, unknown> | null | undefined): MechanicFingerprint {
  const defaults: MechanicFingerprint = { luck: 3, strategy: 3, interaction: 3, complexity: 3, replayability: 3 };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const clamp = (v: unknown, fallback: number) =>
    typeof v === "number" && v >= 1 && v <= 5 ? v : fallback;
  const fp = raw as Record<string, unknown>;
  return {
    luck:          clamp(fp["luck"],          3),
    strategy:      clamp(fp["strategy"],      3),
    interaction:   clamp(fp["interaction"],   3),
    complexity:    clamp(fp["complexity"],    3),
    replayability: clamp(fp["replayability"], 3),
  };
}

type SaveStatus = "idle" | "saving" | "saved";
type SectionKey = "hero" | "fingerprint" | "problems" | "decisions" | "playtest" | "bible" | "phase";

function SaveIndicator({ status }: { status: SaveStatus | undefined }) {
  const visible = status && status !== "idle";
  return (
    <span
      className="flex items-center gap-1 text-[10px] shrink-0 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {status === "saving" ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </span>
      ) : status === "saved" ? (
        <span className="flex items-center gap-1 text-green-500">
          <Check className="h-3 w-3" /> Saved
        </span>
      ) : null}
    </span>
  );
}

export function Overview({ projectId, onPromptSend: _onPromptSend, view = "dashboard" }: OverviewProps) {
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats, isLoading: statsLoading } = useGetProjectStats(projectId);
  const updateProject = useUpdateProject();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: entities } = useListEntities(projectId);
  const { data: rules }    = useListRules(projectId);
  const { data: players }  = useListPlayers(projectId);
  const { data: notes }    = useListNotes(projectId);
  const { data: balanceReport } = useGetBalanceReport(projectId);

  /* ── Base project fields ───────────────────────────────────────── */
  const [form, setForm] = useState({
    name: "", description: "", gameType: "", genre: "",
    playerCount: "", targetDuration: "", winCondition: "",
    eliminationRule: "", designPhase: "concept",
  });
  const [turnPhaseInput, setTurnPhaseInput] = useState("");
  const [turnPhases, setTurnPhases] = useState<string[]>([]);
  const [narrative, setNarrative] = useState("");
  const [narrativeSaveStatus, setNarrativeSaveStatus] = useState<SaveStatus>("idle");
  const narrativeSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrativeSaveSeqRef = useRef(0);
  /* Per-section save statuses */
  const [sectionSaveStatus, setSectionSaveStatus] = useState<Record<SectionKey, SaveStatus>>({
    hero: "idle", fingerprint: "idle", problems: "idle",
    decisions: "idle", playtest: "idle", bible: "idle", phase: "idle",
  });
  const sectionTimers = useRef<Partial<Record<SectionKey, ReturnType<typeof setTimeout>>>>({});
  const sectionSaveSeqRef = useRef<Record<SectionKey, number>>({
    hero: 0, fingerprint: 0, problems: 0,
    decisions: 0, playtest: 0, bible: 0, phase: 0,
  });

  /* ── Per-column jsonb state ────────────────────────────────────── */
  const [heroMeta,     setHeroMeta]     = useState<HeroMeta>({});
  const [problems,     setProblems]     = useState<DesignProblem[]>([]);
  const [nextPlaytest, setNextPlaytest] = useState<NextPlaytest>({});
  const [decisionLog,  setDecisionLog]  = useState<DecisionEntry[]>([]);
  const [fingerprint,  setFingerprint]  = useState<MechanicFingerprint>({ luck: 3, strategy: 3, interaction: 3, complexity: 3, replayability: 3 });

  /* ── UI state ──────────────────────────────────────────────────── */
  const [newProblemText,     setNewProblemText]     = useState("");
  const [newProblemSeverity, setNewProblemSeverity] = useState<DesignProblem["severity"]>("concern");
  const [newLogEntry,        setNewLogEntry]        = useState("");
  const [newAttendee,        setNewAttendee]        = useState("");

  const initRef = useRef(false);
  const playtestCardRef = useRef<HTMLDivElement>(null);
  const savedHeroFormRef    = useRef("");
  const savedBibleFormRef   = useRef("");
  const savedHeroMetaRef    = useRef("");
  const savedProblemsRef    = useRef("");
  const savedPlaytestRef    = useRef("");
  const savedDecisionRef    = useRef("");
  const savedFingerprintRef = useRef("");
  const savedNarrativeRef   = useRef("");

  useEffect(() => {
    if (!project || initRef.current) return;
    const phases = parseTurnPhases(project.turnPhases);
    const f = {
      name: project.name || "", description: project.description || "",
      gameType: project.gameType || "", genre: project.genre || "",
      playerCount: project.playerCount || "", targetDuration: project.targetDuration || "",
      winCondition: project.winCondition || "", eliminationRule: project.eliminationRule || "",
      designPhase: project.designPhase || "concept",
    };
    setForm(f);
    savedHeroFormRef.current = JSON.stringify({ playerCount: f.playerCount, targetDuration: f.targetDuration });
    savedBibleFormRef.current = JSON.stringify({ name: f.name, description: f.description, gameType: f.gameType, genre: f.genre, winCondition: f.winCondition, eliminationRule: f.eliminationRule });
    setTurnPhases(phases);
    const narr = project.narrative ?? "";
    setNarrative(narr); savedNarrativeRef.current = narr;
    const hm = castHeroMeta(project.overviewMeta);
    setHeroMeta(hm); savedHeroMetaRef.current = JSON.stringify(hm);
    const pr = castProblems(project.designProblems);
    setProblems(pr); savedProblemsRef.current = JSON.stringify(pr);
    const np = castNextPlaytest(project.nextPlaytest);
    setNextPlaytest(np); savedPlaytestRef.current = JSON.stringify(np);
    const dl = castDecisionLog(project.decisionLog);
    setDecisionLog(dl); savedDecisionRef.current = JSON.stringify(dl);
    const fp = castFingerprint(project.mechanicFingerprint);
    setFingerprint(fp); savedFingerprintRef.current = JSON.stringify(fp);
    initRef.current = true;
  }, [project]);

  const save = (patch: Parameters<typeof updateProject.mutate>[0]["data"], section: SectionKey) => {
    setSectionSaveStatus((s) => ({ ...s, [section]: "saving" }));
    if (sectionTimers.current[section]) clearTimeout(sectionTimers.current[section]);
    const seq = ++sectionSaveSeqRef.current[section];
    updateProject.mutate(
      { projectId, data: patch },
      {
        onSettled: () => {
          if (seq !== sectionSaveSeqRef.current[section]) return;
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        },
        onSuccess: () => {
          if (seq !== sectionSaveSeqRef.current[section]) return;
          setSectionSaveStatus((s) => ({ ...s, [section]: "saved" }));
          sectionTimers.current[section] = setTimeout(
            () => setSectionSaveStatus((s) => ({ ...s, [section]: "idle" })),
            2000,
          );
        },
        onError: (err) => {
          if (seq !== sectionSaveSeqRef.current[section]) return;
          setSectionSaveStatus((s) => ({ ...s, [section]: "idle" }));
          toast({ title: "Section save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
        },
      },
    );
  };

  /* Debounce base form */
  const db = {
    name: useDebounce(form.name, 1000),
    description: useDebounce(form.description, 1000),
    gameType: useDebounce(form.gameType, 1000),
    genre: useDebounce(form.genre, 1000),
    playerCount: useDebounce(form.playerCount, 1000),
    targetDuration: useDebounce(form.targetDuration, 1000),
    winCondition: useDebounce(form.winCondition, 1200),
    eliminationRule: useDebounce(form.eliminationRule, 1200),
  };
  const dbNarrative   = useDebounce(narrative, 1000);
  const dbHeroMeta    = useDebounce(heroMeta, 1500);
  const dbProblems    = useDebounce(problems, 1500);
  const dbPlaytest    = useDebounce(nextPlaytest, 1500);
  const dbDecision    = useDebounce(decisionLog, 1500);
  const dbFingerprint = useDebounce(fingerprint, 1500);

  /* hero card: playerCount + targetDuration */
  useEffect(() => {
    if (!initRef.current) return;
    const s = JSON.stringify({ playerCount: db.playerCount, targetDuration: db.targetDuration });
    if (s !== savedHeroFormRef.current) {
      save({ playerCount: db.playerCount, targetDuration: db.targetDuration }, "hero");
      savedHeroFormRef.current = s;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.playerCount, db.targetDuration]);

  /* game bible: name, description, gameType, genre, winCondition, eliminationRule */
  useEffect(() => {
    if (!initRef.current) return;
    const s = JSON.stringify({ name: db.name, description: db.description, gameType: db.gameType, genre: db.genre, winCondition: db.winCondition, eliminationRule: db.eliminationRule });
    if (s !== savedBibleFormRef.current && db.name) {
      save({ name: db.name, description: db.description, gameType: db.gameType, genre: db.genre, winCondition: db.winCondition, eliminationRule: db.eliminationRule }, "bible");
      savedBibleFormRef.current = s;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.name, db.description, db.gameType, db.genre, db.winCondition, db.eliminationRule]);

  useEffect(() => {
    if (!initRef.current) return;
    if (narrativeSaveTimerRef.current) clearTimeout(narrativeSaveTimerRef.current);
    if (narrative !== savedNarrativeRef.current) {
      setNarrativeSaveStatus("saving");
    } else {
      setNarrativeSaveStatus("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrative]);

  useEffect(() => {
    if (!initRef.current) return;
    if (dbNarrative !== savedNarrativeRef.current) {
      const valueToSave = dbNarrative;
      const seq = ++narrativeSaveSeqRef.current;
      setNarrativeSaveStatus("saving");
      updateProject.mutate(
        { projectId, data: { narrative: valueToSave } },
        {
          onSuccess: () => {
            if (seq !== narrativeSaveSeqRef.current) return;
            savedNarrativeRef.current = valueToSave;
            qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
            if (narrativeSaveTimerRef.current) clearTimeout(narrativeSaveTimerRef.current);
            setNarrativeSaveStatus("saved");
            narrativeSaveTimerRef.current = setTimeout(() => setNarrativeSaveStatus("idle"), 2000);
          },
          onError: (err) => {
            if (seq !== narrativeSaveSeqRef.current) return;
            if (narrativeSaveTimerRef.current) clearTimeout(narrativeSaveTimerRef.current);
            setNarrativeSaveStatus("idle");
            toast({ title: "Narrative save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
          },
        },
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbNarrative]);

  useEffect(() => {
    return () => {
      if (narrativeSaveTimerRef.current) clearTimeout(narrativeSaveTimerRef.current);
      Object.values(sectionTimers.current).forEach((t) => { if (t) clearTimeout(t); });
    };
  }, []);

  useEffect(() => {
    if (!initRef.current) return;
    const s = JSON.stringify(dbHeroMeta);
    if (s !== savedHeroMetaRef.current) { save({ overviewMeta: dbHeroMeta as Record<string, unknown> }, "hero"); savedHeroMetaRef.current = s; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbHeroMeta]);

  useEffect(() => {
    if (!initRef.current) return;
    const s = JSON.stringify(dbProblems);
    if (s !== savedProblemsRef.current) { save({ designProblems: dbProblems as unknown as Record<string, unknown>[] }, "problems"); savedProblemsRef.current = s; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbProblems]);

  useEffect(() => {
    if (!initRef.current) return;
    const s = JSON.stringify(dbPlaytest);
    if (s !== savedPlaytestRef.current) { save({ nextPlaytest: dbPlaytest as Record<string, unknown> }, "playtest"); savedPlaytestRef.current = s; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbPlaytest]);

  useEffect(() => {
    if (!initRef.current) return;
    const s = JSON.stringify(dbDecision);
    if (s !== savedDecisionRef.current) { save({ decisionLog: dbDecision as unknown as Record<string, unknown>[] }, "decisions"); savedDecisionRef.current = s; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbDecision]);

  useEffect(() => {
    if (!initRef.current) return;
    const s = JSON.stringify(dbFingerprint);
    if (s !== savedFingerprintRef.current) { save({ mechanicFingerprint: dbFingerprint as unknown as Record<string, unknown> }, "fingerprint"); savedFingerprintRef.current = s; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbFingerprint]);

  /* ── Helpers ───────────────────────────────────────────────────── */
  const saveTurnPhases  = (phases: string[]) => { setTurnPhases(phases); save({ turnPhases: JSON.stringify(phases) }, "bible"); };
  const saveDesignPhase = (phase: string)    => { setForm((f) => ({ ...f, designPhase: phase })); save({ designPhase: phase }, "phase"); };

  const addProblem = () => {
    if (!newProblemText.trim()) return;
    setProblems((p) => [{ id: Date.now().toString(), text: newProblemText.trim(), severity: newProblemSeverity }, ...p]);
    setNewProblemText("");
  };
  const resolveProblem = (id: string) => setProblems((p) => p.map((x) => x.id === id ? { ...x, resolved: !x.resolved } : x));
  const removeProblem  = (id: string) => setProblems((p) => p.filter((x) => x.id !== id));

  const addLogEntry = () => {
    if (!newLogEntry.trim() || newLogEntry.length > 280) return;
    setDecisionLog((d) => [{ id: Date.now().toString(), text: newLogEntry.trim(), createdAt: new Date().toISOString() }, ...d].slice(0, 100));
    setNewLogEntry("");
  };

  const addAttendee    = () => { if (!newAttendee.trim()) return; setNextPlaytest((p) => ({ ...p, attendees: [...(p.attendees || []), newAttendee.trim()] })); setNewAttendee(""); };
  const removeAttendee = (i: number) => setNextPlaytest((p) => ({ ...p, attendees: (p.attendees || []).filter((_, idx) => idx !== i) }));

  const setFp = (axis: typeof FINGERPRINT_AXES[number], val: number) => setFingerprint((f) => ({ ...f, [axis]: val }));

  /* ── Derived ───────────────────────────────────────────────────── */
  const recentItems = useMemo(() => {
    type Item = { id: string; name: string; section: string; Icon: React.ElementType; updatedAt: string };
    const all: Item[] = [
      ...(entities || []).map((e) => ({ id: `e-${e.id}`, name: e.name,  section: "Components", Icon: ImageIcon,    updatedAt: e.updatedAt })),
      ...(rules    || []).map((r) => ({ id: `r-${r.id}`, name: r.title, section: "Rules",      Icon: Activity,     updatedAt: r.updatedAt })),
      ...(players  || []).map((p) => ({ id: `p-${p.id}`, name: p.name,  section: "Players",    Icon: Users,        updatedAt: p.updatedAt })),
      ...(notes    || []).map((n) => ({ id: `n-${n.id}`, name: n.title || "Untitled note", section: "Notes", Icon: FileText, updatedAt: n.updatedAt })),
    ];
    return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  }, [entities, rules, players, notes]);

  const activeByCol = useMemo(() => ({
    blocker: problems.filter((p) => !p.resolved && p.severity === "blocker"),
    concern: problems.filter((p) => !p.resolved && p.severity === "concern"),
    watch:   problems.filter((p) => !p.resolved && p.severity === "watch"),
  }), [problems]);

  const totalActive   = activeByCol.blocker.length + activeByCol.concern.length + activeByCol.watch.length;
  const resolvedCount = problems.filter((p) => p.resolved).length;

  const visibleStats = [
    { label: "Components", count: stats?.entityCount,      Icon: LayoutDashboard, color: "text-blue-400",    bg: "bg-blue-500/10"    },
    { label: "Rules",      count: stats?.ruleCount,        Icon: Activity,        color: "text-violet-400",  bg: "bg-violet-500/10"  },
    { label: "Players",    count: stats?.playerCount,      Icon: Users,           color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Notes",      count: stats?.noteCount,        Icon: FileText,        color: "text-amber-400",   bg: "bg-amber-500/10"   },
    { label: "Tasks",      count: stats?.taskCount,        Icon: CheckSquare,     color: "text-rose-400",    bg: "bg-rose-500/10"    },
    { label: "Messages",   count: stats?.chatMessageCount, Icon: MessageSquare,   color: "text-sky-400",     bg: "bg-sky-500/10"     },
  ].filter((s) => (s.count ?? 0) > 0);

  const radarData = FINGERPRINT_AXES.map((ax) => ({
    subject: ax.charAt(0).toUpperCase() + ax.slice(1),
    value: fingerprint[ax],
  }));

  const currentPhaseIdx = PHASE_INDEX[form.designPhase] ?? 0;
  const currentPhase    = DESIGN_PHASES[currentPhaseIdx];
  const playtestDate    = nextPlaytest.date;
  const daysAway        = playtestDate ? daysUntil(playtestDate) : null;

  if (projectLoading) {
    return <div className="space-y-4 pb-8"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ═══════════════════════════════════════════════════════════════
          GAME IDENTITY VIEW — hero card + Game Bible (own tab)
          ═══════════════════════════════════════════════════════════════ */}
      {view === "identity" && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="py-3 px-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Game Identity</CardTitle>
              <SaveIndicator status={sectionSaveStatus.hero} />
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Elevator pitch</Label>
                <Textarea
                  placeholder="In one or two sentences, what's the core experience of your game?"
                  rows={2}
                  className="resize-none text-sm bg-background/60"
                  value={heroMeta.elevatorPitch || ""}
                  onChange={(e) => setHeroMeta((m) => ({ ...m, elevatorPitch: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Narrative seed</Label>
                <Textarea
                  placeholder="Describe the world, theme, or story that drives your game's atmosphere and components…"
                  rows={3}
                  className="resize-none text-sm bg-background/60"
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-muted-foreground">
                    This seed is shared across the studio — it guides AI generation for components, rules, and players.
                  </p>
                  <SaveIndicator status={narrativeSaveStatus} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Player count</Label>
                  <Input placeholder="e.g. 2–5" className="h-8 text-sm bg-background/60"
                    value={form.playerCount} onChange={(e) => setForm((f) => ({ ...f, playerCount: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Play time</Label>
                  <Input placeholder="e.g. 45–90 min" className="h-8 text-sm bg-background/60"
                    value={form.targetDuration} onChange={(e) => setForm((f) => ({ ...f, targetDuration: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Age range</Label>
                  <Input placeholder="e.g. 12+" className="h-8 text-sm bg-background/60"
                    value={heroMeta.ageRange || ""} onChange={(e) => setHeroMeta((m) => ({ ...m, ageRange: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Plays like</Label>
                  <Input placeholder="e.g. Catan meets Dominion" className="h-8 text-sm bg-background/60"
                    value={heroMeta.playsLike || ""} onChange={(e) => setHeroMeta((m) => ({ ...m, playsLike: e.target.value }))} />
                </div>
              </div>

              {/* Complexity tier selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Complexity tier</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COMPLEXITY_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      onClick={() => setHeroMeta((m) => ({ ...m, complexityTier: tier.value }))}
                      title={tier.desc}
                      className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                        heroMeta.complexityTier === tier.value
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {tier.label}
                      <span className="ml-1 hidden sm:inline opacity-60 font-normal">— {tier.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Theme</Label>
                <div className="flex flex-wrap gap-1.5">
                  {GAME_THEMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setHeroMeta((m) => ({ ...m, theme: m.theme === t ? undefined : t }))}
                      className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                        heroMeta.theme === t
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mechanic types */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Mechanic types</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MECHANIC_TYPES.map((m) => {
                    const active = (heroMeta.mechanicTypes ?? []).includes(m);
                    return (
                      <button
                        key={m}
                        onClick={() => setHeroMeta((meta) => {
                          const cur = meta.mechanicTypes ?? [];
                          return {
                            ...meta,
                            mechanicTypes: active ? cur.filter((x) => x !== m) : [...cur, m],
                          };
                        })}
                        className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                          active
                            ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                            : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target audience */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Target audience</Label>
                <div className="flex flex-wrap gap-1.5">
                  {AUDIENCE_TAGS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setHeroMeta((m) => ({ ...m, targetAudience: m.targetAudience === a ? undefined : a }))}
                      className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                        heroMeta.targetAudience === a
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Designer & publisher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Designer name</Label>
                  <Input
                    placeholder="e.g. Jane Smith"
                    className="h-8 text-sm bg-background/60"
                    value={heroMeta.designerName ?? ""}
                    onChange={(e) => setHeroMeta((m) => ({ ...m, designerName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Publisher / Studio</Label>
                  <Input
                    placeholder="e.g. Indie / Unpublished"
                    className="h-8 text-sm bg-background/60"
                    value={heroMeta.publisherNotes ?? ""}
                    onChange={(e) => setHeroMeta((m) => ({ ...m, publisherNotes: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          GAME DASHBOARD VIEW — phase / glance / recent / fingerprint / complexity
          ═══════════════════════════════════════════════════════════════ */}
      {view === "dashboard" && (
        <>
          {/* Row 1: Design Phase (left) | Project at a Glance (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Design Phase tracker */}
            <Card>
              <CardHeader className="border-b border-border py-3 px-4 flex-row items-center gap-2">
                <Flag className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold">Design Phase</CardTitle>
                </div>
                <SaveIndicator status={sectionSaveStatus.phase} />
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${currentPhase?.color}`}>
                  {currentPhase?.label}
                </span>
              </CardHeader>
              <CardContent className="px-4 py-3 space-y-2">
                <div className="flex flex-col gap-1">
                  {DESIGN_PHASES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => saveDesignPhase(p.value)}
                      className={`text-left px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                        form.designPhase === p.value
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
                  <div className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${((currentPhaseIdx + 1) / DESIGN_PHASES.length) * 100}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Project at a Glance */}
            <Card>
              <CardHeader className="border-b border-border py-3 px-4 flex-row items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold">Project at a Glance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3">
                {visibleStats.length > 0 ? (
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
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">
                    Add components, rules, or players to see project stats here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Where you left off (full width) */}
          {recentItems.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">Where you left off</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

          {/* Row 3: Mechanic Fingerprint (left) | Design Complexity (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Mechanic Fingerprint */}
            <Card>
              <CardHeader className="py-3 px-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Mechanic Fingerprint</CardTitle>
                  <SaveIndicator status={sectionSaveStatus.fingerprint} />
                </div>
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
                          <button key={v} onClick={() => setFp(ax, v)}
                            className={`h-4 w-4 rounded-sm text-[9px] font-bold transition-all ${
                              fingerprint[ax] >= v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >{v}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Design Complexity */}
            <ComplexityScore
              projectId={projectId}
              playtestCount={(stats as any)?.playtestCount ?? 0}
            />
          </div>

          {/* Secondary sections — Design Problems / Decision Log / Next Playtest */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT — problems + decisions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Design Problems — Kanban 3-column */}
              <Card>
                <CardHeader className="py-4 px-5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Design Problems
                      {totalActive > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{totalActive} open</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {resolvedCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">{resolvedCount} resolved</span>
                      )}
                      <SaveIndicator status={sectionSaveStatus.problems} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 py-4 space-y-3">
                  {/* Add problem bar */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe a design tension…"
                      className="h-8 text-sm flex-1"
                      value={newProblemText}
                      onChange={(e) => setNewProblemText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addProblem()}
                    />
                    <div className="flex gap-1">
                      {(["blocker", "concern", "watch"] as const).map((sev) => {
                        const cfg = SEVERITY[sev];
                        const Icon = cfg.Icon;
                        return (
                          <button
                            key={sev}
                            onClick={() => setNewProblemSeverity(sev)}
                            title={cfg.label}
                            className={`h-8 w-8 rounded flex items-center justify-center border transition-all ${
                              newProblemSeverity === sev ? `${cfg.bg} ${cfg.border}` : "border-transparent hover:border-border"
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

                  {/* Kanban board — 3 columns */}
                  <div className="grid grid-cols-3 gap-3">
                    {(["blocker", "concern", "watch"] as const).map((sev) => {
                      const cfg = SEVERITY[sev];
                      const Icon = cfg.Icon;
                      const col  = activeByCol[sev];
                      return (
                        <div key={sev} className={`rounded-lg border ${cfg.border} ${cfg.bg} flex flex-col`}>
                          <div className={`flex items-center gap-1.5 px-3 py-2 ${cfg.header}`}>
                            <Icon className={`h-3 w-3 ${cfg.color}`} />
                            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{col.length}</span>
                          </div>
                          <div className="flex flex-col gap-1.5 p-2 min-h-[60px]">
                            {col.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground text-center py-2 italic">None</p>
                            ) : (
                              col.map((p) => (
                                <div key={p.id} className="bg-background/60 rounded-md px-2 py-1.5 group relative">
                                  <p className="text-xs leading-snug pr-8">{p.text}</p>
                                  <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => resolveProblem(p.id)} className="text-[9px] text-muted-foreground hover:text-emerald-400 px-0.5" title="Resolve">✓</button>
                                    <button onClick={() => removeProblem(p.id)} className="text-muted-foreground hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Decision Log */}
              <Card>
                <CardHeader className="py-4 px-5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-primary" />
                      Decision Log
                      <span className="text-xs font-normal text-muted-foreground ml-1">Why did you make this choice?</span>
                    </CardTitle>
                    <SaveIndicator status={sectionSaveStatus.decisions} />
                  </div>
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
                  {decisionLog.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No decisions logged yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {decisionLog.map((entry) => (
                        <div key={entry.id} className="flex gap-2 text-sm">
                          <div className="w-1 shrink-0 bg-primary/30 rounded-full mt-0.5" />
                          <div className="flex-1">
                            <p className="leading-snug">{entry.text}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(entry.createdAt)}</p>
                          </div>
                          <button onClick={() => setDecisionLog((d) => d.filter((e) => e.id !== entry.id))} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT — Next Playtest */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="py-3 px-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Next Playtest
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {daysAway !== null && (
                        <span className={`text-xs font-semibold ${daysAway <= 1 ? "text-red-400" : daysAway <= 3 ? "text-amber-400" : "text-emerald-400"}`}>
                          {daysAway === 0 ? "Today!" : daysAway < 0 ? "Past" : `${daysAway}d away`}
                        </span>
                      )}
                      <SaveIndicator status={sectionSaveStatus.playtest} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-3 space-y-3">
                  <Input type="date" className="h-8 text-sm"
                    value={nextPlaytest.date || ""}
                    onChange={(e) => setNextPlaytest((p) => ({ ...p, date: e.target.value }))} />
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Attending</Label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {(nextPlaytest.attendees || []).map((a, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-secondary rounded px-2 py-0.5">
                          {a}<button onClick={() => removeAttendee(i)}><X className="h-2.5 w-2.5" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Input placeholder="Add person…" className="h-7 text-xs"
                        value={newAttendee} onChange={(e) => setNewAttendee(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addAttendee()} />
                      <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={addAttendee}>
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">What to test</Label>
                    <Textarea placeholder="e.g. Test new scoring rule, check 4-player balance…" rows={2}
                      className="resize-none text-xs"
                      value={nextPlaytest.focus || ""}
                      onChange={(e) => setNextPlaytest((p) => ({ ...p, focus: e.target.value }))} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Collaboration */}
          <CollaborationDashboard projectId={projectId} />
        </>
      )}

      {/* ── Game Bible — only on identity tab, expanded inline ─────────────── */}
      {view === "identity" && (
        <Card className="overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border bg-card">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm font-semibold">Game Bible</CardTitle>
              <span className="text-xs font-normal text-muted-foreground">Metadata, core loop, turn phases, versions</span>
              <div className="ml-auto"><SaveIndicator status={sectionSaveStatus.bible} /></div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5 bg-background/60 space-y-6">

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Project metadata</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Project name</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-xs">Description</Label>
                  <AiEditTextarea projectId={projectId} value={form.description} onChange={(next) => setForm((f) => ({ ...f, description: next }))} placeholder="A longer description of your game…" rows={3} className="min-h-[80px]" contextLabel="project description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gameType" className="text-xs">Game type</Label>
                    <Input id="gameType" placeholder="e.g. Strategy, Party, Worker placement"
                      value={form.gameType} onChange={(e) => setForm((f) => ({ ...f, gameType: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="genre" className="text-xs">Genre</Label>
                    <Input id="genre" placeholder="e.g. Fantasy, Sci-fi, Historical"
                      value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Core game loop</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Trophy className="w-3 h-3 text-amber-400" /> Win condition</Label>
                  <Textarea placeholder="e.g. First player to collect 10 Victory Points wins…" rows={2}
                    value={form.winCondition} onChange={(e) => setForm((f) => ({ ...f, winCondition: e.target.value }))} className="resize-none" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Swords className="w-3 h-3 text-red-400" /> Elimination / losing</Label>
                  <Input placeholder="e.g. Last player standing wins…"
                    value={form.eliminationRule} onChange={(e) => setForm((f) => ({ ...f, eliminationRule: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Layers className="w-3 h-3 text-blue-400" /> Turn phases</Label>
                  {turnPhases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {turnPhases.map((phase, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary/10 border border-primary/25 text-primary rounded px-2 py-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono mr-0.5">{i + 1}.</span>
                          {phase}
                          <button onClick={() => saveTurnPhases(turnPhases.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive ml-0.5">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Draw Phase, Action Phase, Cleanup…"
                      value={turnPhaseInput} onChange={(e) => setTurnPhaseInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && turnPhaseInput.trim()) { saveTurnPhases([...turnPhases, turnPhaseInput.trim()]); setTurnPhaseInput(""); } }} />
                    <Button type="button" size="sm" variant="outline"
                      onClick={() => { if (turnPhaseInput.trim()) { saveTurnPhases([...turnPhases, turnPhaseInput.trim()]); setTurnPhaseInput(""); } }}
                      disabled={!turnPhaseInput.trim()}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <ProjectVersions projectId={projectId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function GameIdentity(props: GameIdentityProps) {
  return <Overview {...props} view="identity" />;
}
