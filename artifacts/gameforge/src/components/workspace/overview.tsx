import { useEffect, useRef, useState } from "react";
import { useGetProject, useUpdateProject, useGetProjectStats, getGetProjectStatsQueryKey, useCreateEntity, getListEntitiesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { AiEditTextarea } from "@/components/workspace/ai-edit-textarea";
import { ProjectVersions } from "@/components/workspace/project-versions";
import { ComplexityScore } from "@/components/workspace/complexity-score";
import { CollaborationDashboard } from "@/components/workspace/collaboration-dashboard";
import {
  LayoutDashboard, Activity, Users, FileText, CheckSquare, MessageSquare,
  Sparkles, Settings, Flag, BookOpen, Trophy, Swords, Plus, X, Target, Layers, Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface OverviewProps {
  projectId: number;
  onPromptSend: (prompt: string) => void;
}

const DESIGN_PHASES = [
  { value: "concept",   label: "Concept",   desc: "Idea stage — exploring what the game could be",        color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  { value: "prototype", label: "Prototype", desc: "First playable — rough rules and components",           color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { value: "alpha",     label: "Alpha",     desc: "Core loop works — iterating on rules and balance",      color: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  { value: "beta",      label: "Beta",      desc: "Feature complete — polishing and blind playtesting",    color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { value: "rc",        label: "Release Candidate", desc: "Print-ready — final checks before manufacturing", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
] as const;

const PHASE_INDEX: Record<string, number> = { concept: 0, prototype: 1, alpha: 2, beta: 3, rc: 4 };

function parseTurnPhases(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map((s) => s.trim()).filter(Boolean); }
}

export function Overview({ projectId, onPromptSend }: OverviewProps) {
  const queryClient = useQueryClient();
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats, isLoading: statsLoading } = useGetProjectStats(projectId);
  const updateProject = useUpdateProject();

  const [formData, setFormData] = useState({
    name: "", description: "", gameType: "", genre: "", playerCount: "", targetDuration: "",
    winCondition: "", eliminationRule: "", designPhase: "concept",
  });
  const [turnPhaseInput, setTurnPhaseInput] = useState("");
  const [turnPhases, setTurnPhases] = useState<string[]>([]);
  const createEntity = useCreateEntity();

  const debouncedName = useDebounce(formData.name, 1000);
  const debouncedDesc = useDebounce(formData.description, 1000);
  const debouncedType = useDebounce(formData.gameType, 1000);
  const debouncedGenre = useDebounce(formData.genre, 1000);
  const debouncedPlayers = useDebounce(formData.playerCount, 1000);
  const debouncedDuration = useDebounce(formData.targetDuration, 1000);
  const debouncedWin = useDebounce(formData.winCondition, 1200);
  const debouncedElim = useDebounce(formData.eliminationRule, 1200);

  const initRef = useRef(false);
  const lastSavedRef = useRef({ ...formData, turnPhases: "[]" });

  useEffect(() => {
    if (project && !initRef.current) {
      const phases = parseTurnPhases(project.turnPhases);
      const d = {
        name: project.name || "",
        description: project.description || "",
        gameType: project.gameType || "",
        genre: project.genre || "",
        playerCount: project.playerCount || "",
        targetDuration: project.targetDuration || "",
        winCondition: project.winCondition || "",
        eliminationRule: project.eliminationRule || "",
        designPhase: project.designPhase || "concept",
      };
      setFormData(d);
      setTurnPhases(phases);
      lastSavedRef.current = { ...d, turnPhases: JSON.stringify(phases) };
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
    if (changed && data.name) {
      save(data);
      Object.assign(lastSavedRef.current, data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, debouncedDesc, debouncedType, debouncedGenre, debouncedPlayers, debouncedDuration, debouncedWin, debouncedElim]);

  const saveTurnPhases = (phases: string[]) => {
    setTurnPhases(phases);
    save({ turnPhases: JSON.stringify(phases) });
  };

  const saveDesignPhase = (phase: string) => {
    setFormData((f) => ({ ...f, designPhase: phase }));
    save({ designPhase: phase });
  };

  if (projectLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const currentPhaseIdx = PHASE_INDEX[formData.designPhase] ?? 0;
  const currentPhase = DESIGN_PHASES[currentPhaseIdx];

  const STATS = [
    { label: "Entities", count: stats?.entityCount, icon: LayoutDashboard, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Rules", count: stats?.ruleCount, icon: Activity, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Players", count: stats?.playerCount, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Notes", count: stats?.noteCount, icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Tasks", count: stats?.taskCount, icon: CheckSquare, color: "text-rose-400", bg: "bg-rose-500/10" },
    { label: "Messages", count: stats?.chatMessageCount, icon: MessageSquare, color: "text-sky-400", bg: "bg-sky-500/10" },
  ];

  return (
    <div className="space-y-8 pb-8">

      {/* ── Design Phase tracker ─────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="border-b border-border py-4 px-5 flex-row items-center gap-2">
          <Flag className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">Design Phase</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Track where you are in the design process — the AI adapts its suggestions to your phase.</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${currentPhase?.color}`}>
            {currentPhase?.label}
          </span>
        </CardHeader>
        <CardContent className="px-5 py-4 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {DESIGN_PHASES.map((p, i) => (
              <button
                key={p.value}
                onClick={() => saveDesignPhase(p.value)}
                className={`flex-1 min-w-[80px] text-center px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  formData.designPhase === p.value
                    ? `${p.color} ring-1 ring-current`
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="block font-semibold">{p.label}</span>
              </button>
            ))}
          </div>
          {/* Phase progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${((currentPhaseIdx + 1) / DESIGN_PHASES.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{currentPhase?.desc}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats grid ───────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Project at a glance</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATS.map((stat, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <div className={`h-8 w-8 rounded-md ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                {statsLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold leading-none">{stat.count || 0}</div>}
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* ── Project metadata ───────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Settings className="h-4 w-4 text-primary" /> Project metadata</CardTitle>
              <CardDescription>Changes save automatically — these fields seed every AI prompt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <AiEditTextarea projectId={projectId} value={formData.description} onChange={(next) => setFormData((p) => ({ ...p, description: next }))} placeholder="A one-paragraph elevator pitch for your game…" rows={4} className="min-h-[100px]" contextLabel="project description" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gameType">Game type</Label>
                  <Input id="gameType" placeholder="e.g. Strategy, Party, Worker placement" value={formData.gameType} onChange={(e) => setFormData((p) => ({ ...p, gameType: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input id="genre" placeholder="e.g. Fantasy, Sci-fi, Historical" value={formData.genre} onChange={(e) => setFormData((p) => ({ ...p, genre: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerCount">Player count</Label>
                  <Input id="playerCount" placeholder="e.g. 2-5" value={formData.playerCount} onChange={(e) => setFormData((p) => ({ ...p, playerCount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDuration">Target duration</Label>
                  <Input id="targetDuration" placeholder="e.g. 45–90 min" value={formData.targetDuration} onChange={(e) => setFormData((p) => ({ ...p, targetDuration: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Core game loop ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-4 w-4 text-primary" /> Core game loop</CardTitle>
              <CardDescription>The AI uses these to anchor rule suggestions, conflict checks, and balance analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Win condition */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-400" /> Win condition</Label>
                <Textarea
                  placeholder="e.g. First player to collect 10 Victory Points wins. On a tie, the player with the most Gold wins."
                  rows={2}
                  value={formData.winCondition}
                  onChange={(e) => setFormData((p) => ({ ...p, winCondition: e.target.value }))}
                  className="resize-none"
                />
              </div>

              {/* Elimination rule */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 text-red-400" /> Elimination / losing condition</Label>
                <Input
                  placeholder="e.g. Players eliminated when Health reaches 0. Last player standing wins."
                  value={formData.eliminationRule}
                  onChange={(e) => setFormData((p) => ({ ...p, eliminationRule: e.target.value }))}
                />
              </div>

              {/* Turn phases */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-blue-400" /> Turn phases</Label>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && turnPhaseInput.trim()) {
                        saveTurnPhases([...turnPhases, turnPhaseInput.trim()]);
                        setTurnPhaseInput("");
                      }
                    }}
                  />
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => { if (turnPhaseInput.trim()) { saveTurnPhases([...turnPhases, turnPhaseInput.trim()]); setTurnPhaseInput(""); } }}
                    disabled={!turnPhaseInput.trim()}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Press Enter or click Add. Drag to reorder coming soon.</p>
              </div>
            </CardContent>
          </Card>

          <ProjectVersions projectId={projectId} />
        </div>

        {/* ── Right column ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Complexity score */}
          {stats && (
            <ComplexityScore
              ruleCount={(stats as any).ruleCount ?? 0}
              entityCount={(stats as any).entityCount ?? 0}
              playerCount={formData.playerCount}
              playtestCount={(stats as any).playtestCount ?? 0}
            />
          )}

          {/* Collaboration dashboard widgets */}
          <CollaborationDashboard projectId={projectId} />

        </div>
      </div>
    </div>
  );
}
