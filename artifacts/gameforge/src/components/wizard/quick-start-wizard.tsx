import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateProject, useAiGenerateEntities, useAiGenerateRules, useAiGeneratePlayers,
  useAiGenerateResearch, useUpdateProject, useCreateNote, useCreateTask, useCreateReferenceGame,
  getListProjectsQueryKey, getGetDashboardSummaryQueryKey, getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { workspacesApi } from "@/lib/workspaces-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, ChevronLeft, ChevronRight, Check, Loader2, Wand2,
  Swords, Building2, Rocket, Brain, Ghost, Sparkle as SparkleIcon,
  Feather, Layers, Library,
} from "lucide-react";

interface QuickStartWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * If provided, the new project is created inside this workspace via the
   * workspace-scoped API and navigation lands on /:workspaceSlug/:projectSlug.
   * If omitted, the global useCreateProject hook is used and navigation goes
   * to /p/:id.
   */
  workspaceSlug?: string;
  /** Called after successful project creation (use to invalidate workspace caches). */
  onCreated?: () => void;
}

type Theme = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  flavor: string;
};

const THEMES: Theme[] = [
  { id: "fantasy",   label: "Fantasy adventure",  icon: Swords,    description: "Heroes, magic, monsters", flavor: "high-fantasy adventure with wizards, knights, and ancient magic" },
  { id: "modern",    label: "Modern / contemporary", icon: Building2, description: "Real-world settings", flavor: "modern-day setting with realistic stakes" },
  { id: "scifi",     label: "Sci-fi",              icon: Rocket,    description: "Space, tech, future", flavor: "science-fiction setting with starships, alien worlds, and futuristic tech" },
  { id: "abstract",  label: "Abstract / puzzle",   icon: Brain,     description: "Pure mechanics", flavor: "abstract strategy game with no theme — focused on pure mechanics" },
  { id: "horror",    label: "Horror / mystery",    icon: Ghost,     description: "Tension, dread, secrets", flavor: "horror or mystery setting with tension, hidden information, and atmospheric dread" },
  { id: "other",     label: "Something else",      icon: SparkleIcon, description: "I'll describe it", flavor: "" },
];

type Complexity = {
  id: "light" | "medium" | "heavy";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  examples: string;
  componentCount: number;
  ruleCount: number;
};

const COMPLEXITIES: Complexity[] = [
  { id: "light",  label: "Light",  icon: Feather, blurb: "Family-friendly, easy to teach, 1 core mechanic", examples: "like Sushi Go, Love Letter", componentCount: 4, ruleCount: 3 },
  { id: "medium", label: "Medium", icon: Layers,  blurb: "Strategic depth, 2 interlocking systems",       examples: "like Catan, Ticket to Ride",   componentCount: 6, ruleCount: 5 },
  { id: "heavy",  label: "Heavy",  icon: Library, blurb: "Deep strategy, 3+ systems, longer learning curve", examples: "like Terraforming Mars, Gloomhaven", componentCount: 8, ruleCount: 7 },
];

// ─── Curated reference games per complexity tier ─────────────────────────────
// Used to pre-populate the Research → Reference Games tab so the new project
// has a starting point for inspiration / "borrowing" + "avoiding" notes.
const REFERENCE_GAMES_BY_COMPLEXITY: Record<Complexity["id"], Array<{ name: string; borrowing: string; avoiding: string }>> = {
  light: [
    { name: "Sushi Go!",   borrowing: "Tight 15-minute play time and crystal-clear card iconography.", avoiding: "Limited replayability after a dozen plays — keep variety in mind." },
    { name: "Love Letter", borrowing: "Minimal component count (one deck) with deep deduction.",       avoiding: "Player elimination — consider keeping everyone in the round." },
  ],
  medium: [
    { name: "Catan",            borrowing: "Resource trading creates emergent player interaction.",  avoiding: "Runaway-leader problem — design catch-up mechanics early." },
    { name: "Ticket to Ride",   borrowing: "Clean shared-board route building with hidden objectives.", avoiding: "Limited end-game tension — score reveal can feel anti-climactic." },
  ],
  heavy: [
    { name: "Terraforming Mars", borrowing: "Engine-building with interlocking economy + tableau.",   avoiding: "Steep first-game friction — your teach script must be very tight." },
    { name: "Gloomhaven",        borrowing: "Tactical card-driven combat with persistent legacy state.", avoiding: "3-hour sessions and bookkeeping — scope your game smaller." },
  ],
};

// ─── Starter tasks per complexity tier ───────────────────────────────────────
// Pre-populates the Tasks board so the user has a concrete next-step checklist
// the moment they enter the workspace.
type StarterTask = { title: string; description: string; priority: "low" | "medium" | "high"; category: string };
const STARTER_TASKS_BASE: StarterTask[] = [
  { title: "Define the starting setup",       description: "Document what each player has on turn 1 — components, hand size, starting resources.",         priority: "high",   category: "design" },
  { title: "Write a 5-minute teach script",   description: "Draft the elevator pitch + the first 3 moves a new player should make.",                       priority: "medium", category: "design" },
  { title: "Run a paper prototype playtest",  description: "Build the cheapest possible version (index cards, sticky notes) and play one full game.",      priority: "high",   category: "playtest" },
  { title: "Validate scaling at min and max", description: "Play once at the lowest player count and once at the highest — note where pacing breaks.",     priority: "medium", category: "playtest" },
];
const STARTER_TASKS_BY_COMPLEXITY: Record<Complexity["id"], StarterTask[]> = {
  light:  STARTER_TASKS_BASE,
  medium: [...STARTER_TASKS_BASE, { title: "Outline the rulebook structure",  description: "Decide section order: setup → turn structure → win condition → edge cases.", priority: "low", category: "rulebook" }],
  heavy:  [
    ...STARTER_TASKS_BASE,
    { title: "Outline the rulebook structure", description: "Decide section order: setup → turn structure → win condition → edge cases.",                priority: "low",    category: "rulebook" },
    { title: "Draft a balance tracking sheet", description: "Spreadsheet columns: component, cost, expected value, observed win rate.",                  priority: "medium", category: "balance" },
  ],
};

// Default turn phases per complexity (used to seed the Game Identity tab).
const TURN_PHASES_BY_COMPLEXITY: Record<Complexity["id"], string> = {
  light:  "Draw → Play one card → End",
  medium: "Refresh → Action → Resolve → Cleanup",
  heavy:  "Upkeep → Income → Action (×2) → Combat → Cleanup",
};

type WizardAnswers = {
  theme: string;
  themeFlavor: string;
  customTheme: string;
  playerCount: number;
  playTime: number;
  complexity: "light" | "medium" | "heavy";
  pitch: string;
};

const STORAGE_KEY = "gameforge:quick-start-wizard-draft";

const STEPS = [
  { id: "theme",      title: "What's your game about?",   subtitle: "Pick a vibe — you can change it later." },
  { id: "players",    title: "How many players?",         subtitle: "Don't overthink it. You can adjust later." },
  { id: "time",       title: "How long does it play?",    subtitle: "Average length of one full game." },
  { id: "complexity", title: "How complex?",              subtitle: "Affects how many components and rules we generate." },
  { id: "pitch",      title: "One sentence (optional)",   subtitle: "A pitch helps the AI personalize your game." },
] as const;

type GenStatus = "pending" | "running" | "done" | "failed";
type GenStage = { id: string; label: string; status: GenStatus };

export function QuickStartWizard({ open, onOpenChange, workspaceSlug, onCreated }: QuickStartWizardProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const aiGenerateEntities = useAiGenerateEntities();
  const aiGenerateRules = useAiGenerateRules();
  const aiGeneratePlayers = useAiGeneratePlayers();
  const aiGenerateResearch = useAiGenerateResearch();
  const createNote = useCreateNote();
  const createTask = useCreateTask();
  const createReferenceGame = useCreateReferenceGame();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<WizardAnswers>({
    theme: "",
    themeFlavor: "",
    customTheme: "",
    playerCount: 4,
    playTime: 60,
    complexity: "medium",
    pitch: "",
  });
  const [generating, setGenerating] = useState(false);
  const [stages, setStages] = useState<GenStage[]>([]);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Cancel any pending navigation timer on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
        navigateTimeoutRef.current = null;
      }
    };
  }, []);

  // Helper to safely schedule the post-generation navigation (cancellable)
  const scheduleNavigate = (to: string) => {
    if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    navigateTimeoutRef.current = setTimeout(() => {
      navigateTimeoutRef.current = null;
      if (!isMountedRef.current) return;
      onOpenChange(false);
      setLocation(to);
    }, 800);
  };

  // Restore draft on mount (with type-guarded validation so a corrupt session
  // entry can never poison the wizard state)
  useEffect(() => {
    if (!open) return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const d = parsed as Record<string, unknown>;
      const validComplexity = (v: unknown): v is "light" | "medium" | "heavy" =>
        v === "light" || v === "medium" || v === "heavy";
      const safe: Partial<WizardAnswers> = {};
      if (typeof d.theme === "string") safe.theme = d.theme;
      if (typeof d.themeFlavor === "string") safe.themeFlavor = d.themeFlavor;
      if (typeof d.customTheme === "string") safe.customTheme = d.customTheme;
      if (typeof d.playerCount === "number" && d.playerCount >= 1 && d.playerCount <= 8) {
        safe.playerCount = d.playerCount;
      }
      if (typeof d.playTime === "number" && d.playTime >= 15 && d.playTime <= 120) {
        safe.playTime = d.playTime;
      }
      if (validComplexity(d.complexity)) safe.complexity = d.complexity;
      if (typeof d.pitch === "string") safe.pitch = d.pitch;
      setAnswers(prev => ({ ...prev, ...safe }));
    } catch { /* ignore */ }
  }, [open]);

  // Save draft on change
  useEffect(() => {
    if (!open || generating) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch { /* ignore */ }
  }, [answers, open, generating]);

  // Reset step when reopened
  useEffect(() => {
    if (open) {
      setStep(0);
      setDirection(1);
      setStages([]);
      setGenerating(false);
    }
  }, [open]);

  const isLast = step === STEPS.length - 1;
  const currentStep = STEPS[step]!;
  const progress = ((step + 1) / STEPS.length) * 100;

  const canAdvance = useMemo(() => {
    if (step === 0) {
      if (!answers.theme) return false;
      if (answers.theme === "other" && !answers.customTheme.trim()) return false;
      return true;
    }
    return true;
  }, [step, answers]);

  const goNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      void handleCreate();
      return;
    }
    setDirection(1);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  };

  const playerCountString = (n: number) => n === 1 ? "1 (solo)" : `${n} players`;
  const playTimeString = (mins: number) => mins >= 60
    ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`
    : `${mins} min`;

  const themeForPrompt = answers.theme === "other"
    ? answers.customTheme.trim()
    : answers.themeFlavor;

  const updateStage = (id: string, status: GenStatus) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleCreate = async () => {
    setGenerating(true);
    const complexity = COMPLEXITIES.find(c => c.id === answers.complexity)!;
    const themeLabel = answers.theme === "other"
      ? answers.customTheme.trim()
      : THEMES.find(t => t.id === answers.theme)?.label ?? "custom";
    const projectName = answers.pitch.trim()
      ? answers.pitch.trim().slice(0, 60)
      : `My ${themeLabel} game`;

    const referenceGames = REFERENCE_GAMES_BY_COMPLEXITY[answers.complexity];
    const starterTasks = STARTER_TASKS_BY_COMPLEXITY[answers.complexity];

    const initialStages: GenStage[] = [
      { id: "project",    label: "Creating your project...",                                     status: "running" },
      { id: "identity",   label: "Setting game identity & turn structure...",                    status: "pending" },
      { id: "entities",   label: `Designing ${complexity.componentCount} components...`,         status: "pending" },
      { id: "players",    label: "Setting up player roles...",                                   status: "pending" },
      { id: "rules",      label: `Drafting ${complexity.ruleCount} starter rules...`,            status: "pending" },
      { id: "research",   label: "Researching theme & inspiration...",                           status: "pending" },
      { id: "references", label: `Adding ${referenceGames.length} reference games...`,           status: "pending" },
      { id: "tasks",      label: `Creating ${starterTasks.length} starter tasks...`,             status: "pending" },
      { id: "notes",      label: "Saving your design pitch as a note...",                        status: "pending" },
    ];
    setStages(initialStages);

    let projectId: number | null = null;
    let navigateTo = "";

    const projectBody = {
      name: projectName,
      description: answers.pitch.trim() || `A ${complexity.label.toLowerCase()} ${themeLabel.toLowerCase()} game for ${playerCountString(answers.playerCount)}.`,
      gameType: complexity.label,
      genre: themeLabel,
      playerCount: String(answers.playerCount),
      targetDuration: playTimeString(answers.playTime),
    };

    try {
      // Step 1: Create the project (workspace-scoped if a slug was provided)
      if (workspaceSlug) {
        const out = await workspacesApi.createProject(workspaceSlug, projectBody);
        projectId = out.project.id;
        navigateTo = `/${out.workspaceSlug}/${out.project.slug ?? out.project.id}`;
      } else {
        const proj = await createProject.mutateAsync({ data: projectBody });
        projectId = proj.id;
        navigateTo = `/p/${proj.id}`;
      }
      updateStage("project", "done");

      // Step 2: Generate components, players, rules in parallel
      const contextSummary = [
        themeForPrompt,
        `for ${playerCountString(answers.playerCount)}`,
        `~${playTimeString(answers.playTime)}`,
        `${complexity.label.toLowerCase()} complexity`,
        answers.pitch.trim() ? `Pitch: ${answers.pitch.trim()}` : "",
      ].filter(Boolean).join(", ");

      const entitiesPrompt =
        `Generate ${complexity.componentCount} starter game components for a ${contextSummary}. ` +
        `Mix component types (cards, tokens, boards, dice, tiles) appropriate for the theme. ` +
        `Each should have a clear name, type, and 1-sentence description.`;

      const playersPrompt =
        `Generate 2 distinct player roles or archetypes for a ${contextSummary}. ` +
        `Each role should have a name, a clear strategic identity, and a short description of how they play differently.`;

      const rulesPrompt =
        `Generate ${complexity.ruleCount} starter rules for a ${contextSummary}. ` +
        `Include: a basic win condition, a turn-structure rule, and ${complexity.ruleCount - 2} core mechanic rules. ` +
        `Each rule should have a clear title and 1-2 sentence content.`;

      // Stage prompt for Research (uses the same AiGenerateBody contract)
      const researchPrompt =
        `Generate 3 short market-research notes for a ${contextSummary}. ` +
        `Each note should cover one of: target audience, comparable published games, or a design risk to watch for. ` +
        `Each note has a clear topic and 2-3 sentence content.`;

      // Game-Identity payload — all client-derived, no AI call needed
      const complexityScore = complexity.id === "light" ? 3 : complexity.id === "medium" ? 6 : 9;
      const identityBody = {
        narrative: answers.pitch.trim() ||
          `A ${complexity.label.toLowerCase()} ${themeLabel.toLowerCase()} game for ${playerCountString(answers.playerCount)}, around ${playTimeString(answers.playTime)} per session.`,
        winCondition: "Placeholder — first player to reach the target victory condition wins. Refine this once the core loop is playtested.",
        turnPhases: TURN_PHASES_BY_COMPLEXITY[answers.complexity],
        complexityScore,
        referenceGames: referenceGames.map(r => r.name).join(", "),
        designPhase: "concept",
      };

      // Pitch note content (client-derived)
      const pitchNoteContent =
        `## Quick Start summary\n\n` +
        `- **Theme:** ${themeLabel}\n` +
        `- **Players:** ${playerCountString(answers.playerCount)}\n` +
        `- **Play time:** ${playTimeString(answers.playTime)}\n` +
        `- **Complexity:** ${complexity.label} (${complexity.blurb})\n\n` +
        (answers.pitch.trim() ? `## Pitch\n\n${answers.pitch.trim()}\n` : `## Pitch\n\n_Add your one-line pitch here._\n`);

      // Capture projectId as a non-null const for use inside the parallel
      // closures below (eliminates `projectId!` and closure-narrowing noise).
      const createdProjectId: number = projectId;

      // Mark all parallel stages as running
      updateStage("identity",   "running");
      updateStage("entities",   "running");
      updateStage("players",    "running");
      updateStage("rules",      "running");
      updateStage("research",   "running");
      updateStage("references", "running");
      updateStage("tasks",      "running");
      updateStage("notes",      "running");

      // Fan out 8 operations in parallel. allSettled tolerates per-stage failure;
      // we still navigate as long as the project itself was created.
      const [
        identityRes, entitiesRes, playersRes, rulesRes,
        researchRes, referencesRes, tasksRes, notesRes,
      ] = await Promise.allSettled([
        updateProject.mutateAsync({ projectId, data: identityBody })
          .then(r => { updateStage("identity", "done"); return r; })
          .catch(e => { updateStage("identity", "failed"); throw e; }),
        aiGenerateEntities.mutateAsync({ projectId, data: { prompt: entitiesPrompt, count: complexity.componentCount } })
          .then(r => { updateStage("entities", "done"); return r; })
          .catch(e => { updateStage("entities", "failed"); throw e; }),
        aiGeneratePlayers.mutateAsync({ projectId, data: { prompt: playersPrompt, count: 2 } })
          .then(r => { updateStage("players", "done"); return r; })
          .catch(e => { updateStage("players", "failed"); throw e; }),
        aiGenerateRules.mutateAsync({ projectId, data: { prompt: rulesPrompt, count: complexity.ruleCount } })
          .then(r => { updateStage("rules", "done"); return r; })
          .catch(e => { updateStage("rules", "failed"); throw e; }),
        aiGenerateResearch.mutateAsync({ projectId, data: { prompt: researchPrompt, count: 3 } })
          .then(r => { updateStage("research", "done"); return r; })
          .catch(e => { updateStage("research", "failed"); throw e; }),
        // References: create N reference games in parallel — succeed if at least one lands
        Promise.allSettled(
          referenceGames.map((rg, i) =>
            createReferenceGame.mutateAsync({ projectId: createdProjectId, data: { ...rg, position: i } })
          )
        ).then(results => {
          const ok = results.some(r => r.status === "fulfilled");
          updateStage("references", ok ? "done" : "failed");
          if (!ok) throw new Error("All reference-game creates failed");
          return results;
        }),
        // Tasks: create N starter tasks in parallel — succeed if at least one lands
        Promise.allSettled(
          starterTasks.map(t =>
            createTask.mutateAsync({ projectId: createdProjectId, data: { ...t, status: "todo" } })
          )
        ).then(results => {
          const ok = results.some(r => r.status === "fulfilled");
          updateStage("tasks", ok ? "done" : "failed");
          if (!ok) throw new Error("All task creates failed");
          return results;
        }),
        createNote.mutateAsync({ projectId, data: { title: "Quick Start pitch", topic: "concept", content: pitchNoteContent, pinned: true } })
          .then(r => { updateStage("notes", "done"); return r; })
          .catch(e => { updateStage("notes", "failed"); throw e; }),
      ]);

      const allResults = [identityRes, entitiesRes, playersRes, rulesRes, researchRes, referencesRes, tasksRes, notesRes];
      const totalCount = allResults.length;
      const failedCount = allResults.filter(r => r.status === "rejected").length;

      if (failedCount === totalCount) {
        toast({
          title: "Setup partially failed",
          description: "Your project was created, but no content was generated. You can add content manually.",
          variant: "destructive",
        });
      } else if (failedCount > 0) {
        toast({
          title: `Project created with ${totalCount - failedCount} of ${totalCount} sections`,
          description: "Some setup steps failed. You can retry them inside the workspace.",
        });
      } else {
        toast({ title: "Game ready!", description: "Your full starter project is set up — let's play." });
      }

      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }

      // Invalidate caches so the new project shows up
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      onCreated?.();

      // Tiny delay so the user can see all green checks
      scheduleNavigate(navigateTo);
    } catch (err) {
      // Project creation itself failed
      if (!projectId) {
        updateStage("project", "failed");
        toast({
          title: "Couldn't create project",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
        if (isMountedRef.current) setGenerating(false);
      } else {
        // Project exists, AI failed — still navigate
        scheduleNavigate(navigateTo);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!generating) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Wand2 className="w-6 h-6 text-primary" />
            Quick Start Wizard
          </DialogTitle>
          <DialogDescription>
            {generating
              ? "Hang tight — building your starter game..."
              : "Welcome! Let's design your first game in 5 minutes."}
          </DialogDescription>
          {!generating && (
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Step {step + 1} of {STEPS.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </DialogHeader>

        <div className="px-6 py-6 min-h-[380px]">
          {generating ? (
            <GenerationStatus stages={stages} />
          ) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-1 mb-5">
                  <h3 className="text-xl font-semibold text-foreground">{currentStep.title}</h3>
                  <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
                </div>

                {currentStep.id === "theme" && (
                  <ThemeStep
                    selectedId={answers.theme}
                    customTheme={answers.customTheme}
                    onSelect={(theme) => setAnswers(a => ({ ...a, theme: theme.id, themeFlavor: theme.flavor }))}
                    onCustomChange={(v) => setAnswers(a => ({ ...a, customTheme: v }))}
                  />
                )}

                {currentStep.id === "players" && (
                  <SliderStep
                    value={answers.playerCount}
                    min={1}
                    max={8}
                    step={1}
                    display={playerCountString(answers.playerCount)}
                    bigDisplay={String(answers.playerCount)}
                    bigSubtitle={answers.playerCount === 1 ? "solo" : answers.playerCount <= 2 ? "duel / 2P" : answers.playerCount <= 4 ? "small group" : "party"}
                    onChange={(v) => setAnswers(a => ({ ...a, playerCount: v }))}
                  />
                )}

                {currentStep.id === "time" && (
                  <SliderStep
                    value={answers.playTime}
                    min={15}
                    max={120}
                    step={15}
                    display={playTimeString(answers.playTime)}
                    bigDisplay={playTimeString(answers.playTime)}
                    bigSubtitle={answers.playTime <= 30 ? "quick play" : answers.playTime <= 60 ? "casual session" : answers.playTime <= 90 ? "main event" : "epic"}
                    onChange={(v) => setAnswers(a => ({ ...a, playTime: v }))}
                  />
                )}

                {currentStep.id === "complexity" && (
                  <ComplexityStep
                    selectedId={answers.complexity}
                    onSelect={(id) => setAnswers(a => ({ ...a, complexity: id }))}
                  />
                )}

                {currentStep.id === "pitch" && (
                  <PitchStep
                    value={answers.pitch}
                    onChange={(v) => setAnswers(a => ({ ...a, pitch: v }))}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {!generating && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!canAdvance}
              className="gap-1"
              data-testid="wizard-next"
            >
              {isLast ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create my game
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function ThemeStep({
  selectedId, customTheme, onSelect, onCustomChange,
}: {
  selectedId: string;
  customTheme: string;
  onSelect: (theme: Theme) => void;
  onCustomChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {THEMES.map((theme) => {
          const Icon = theme.icon;
          const isSelected = selectedId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme)}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/20"
              }`}
              data-testid={`theme-${theme.id}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <div className="space-y-0.5 min-w-0">
                <div className="text-sm font-medium text-foreground">{theme.label}</div>
                <div className="text-xs text-muted-foreground">{theme.description}</div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-auto" />}
            </button>
          );
        })}
      </div>
      {selectedId === "other" && (
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="custom-theme" className="text-xs">Describe your setting</Label>
          <Input
            id="custom-theme"
            value={customTheme}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="e.g. cyberpunk noir, post-apocalyptic farming, etc."
            autoFocus
            data-testid="custom-theme-input"
          />
        </div>
      )}
    </div>
  );
}

function SliderStep({
  value, min, max, step, display, bigDisplay, bigSubtitle, onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  bigDisplay: string;
  bigSubtitle: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6 pt-2">
      <div className="text-center space-y-1">
        <div className="text-5xl font-bold text-primary tabular-nums">{bigDisplay}</div>
        <div className="text-sm text-muted-foreground">{bigSubtitle}</div>
      </div>
      <div className="space-y-2 px-2">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(vs) => onChange(vs[0] ?? min)}
          className="w-full"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span className="font-medium text-foreground">{display}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

function ComplexityStep({
  selectedId, onSelect,
}: {
  selectedId: "light" | "medium" | "heavy";
  onSelect: (id: "light" | "medium" | "heavy") => void;
}) {
  return (
    <div className="space-y-2.5">
      {COMPLEXITIES.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/20"
            }`}
            data-testid={`complexity-${c.id}`}
          >
            <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">{c.label}</span>
                {isSelected && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div className="text-sm text-muted-foreground">{c.blurb}</div>
              <div className="text-xs text-muted-foreground/70 italic">{c.examples}</div>
              <div className="text-xs text-muted-foreground/80 pt-1">
                Generates ~{c.componentCount} components, {c.ruleCount} rules
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PitchStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="wizard-pitch" className="text-xs">One-line pitch (optional)</Label>
        <Input
          id="wizard-pitch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='e.g. "a deck-builder where you sabotage your rivals"'
          maxLength={140}
          autoFocus
          data-testid="pitch-input"
        />
        <p className="text-xs text-muted-foreground">
          Skip this if you just want a generic starter — your wizard answers are enough.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-border p-3 bg-muted/10">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">When you click "Create my game" we'll:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✓ Create a new project with your settings</li>
          <li>✓ Generate starter components matched to your theme</li>
          <li>✓ Set up player roles</li>
          <li>✓ Draft a starter ruleset with a win condition</li>
        </ul>
      </div>
    </div>
  );
}

function GenerationStatus({ stages }: { stages: GenStage[] }) {
  return (
    <div className="space-y-3 py-4" role="status" aria-live="polite">
      <div className="flex items-center justify-center mb-2">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md border ${
              stage.status === "done" ? "border-green-500/30 bg-green-500/5"
                : stage.status === "running" ? "border-primary/30 bg-primary/5"
                : stage.status === "failed" ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-muted/10"
            }`}
          >
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              {stage.status === "done" && <Check className="w-4 h-4 text-green-500" />}
              {stage.status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {stage.status === "failed" && <span className="text-destructive text-sm">×</span>}
              {stage.status === "pending" && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
            </div>
            <span className={`text-sm ${
              stage.status === "done" ? "text-foreground"
                : stage.status === "running" ? "text-foreground font-medium"
                : stage.status === "failed" ? "text-destructive"
                : "text-muted-foreground"
            }`}>
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
