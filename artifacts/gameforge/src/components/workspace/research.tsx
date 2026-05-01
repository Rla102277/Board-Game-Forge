import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProject, useUpdateProject, useListResearch, getListResearchQueryKey,
  useCreateResearch, useUpdateResearch, useDeleteResearch, useAiEnhanceResearch,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Heart, Sparkles, Plus, X, Wand2, Loader2, GripVertical, Trash2, Search,
  ExternalLink, Edit2, Tag, Lightbulb, Compass, StickyNote, TrendingUp,
  MessageCircle, Zap, ChevronRight, CheckCircle2, ChevronDown, ChevronUp,
  Users, Clock, BarChart2, FileText, RefreshCw, ArrowRight,
  AlertTriangle, Check,
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { apiBase, workspacesApi } from "@/lib/workspaces-api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { GAME_TEMPLATES, type GameTemplate } from "@/lib/game-templates";

/* ── types ───────────────────────────────────────────────────────────── */

type GameData = {
  overview?: string;
  coreLoop?: string;
  keyMechanics?: string[];
  playerCount?: string;
  playTime?: string;
  complexity?: string;
  designStrengths?: string[];
  designWeaknesses?: string[];
  designLessons?: string;
  tags?: string;
};

type RefGame = {
  id: string;
  name: string;
  borrowing: string;
  avoiding: string;
  researchId?: number;
  gameData?: GameData;
};

interface CompGame {
  id: string;
  game: string;
  players: string;
  duration: string;
  complexity: number; // 1–5
  funFactor: number;  // 1–10
  loveAbout: string;
  wouldDoBetter: string;
  notes: string;
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function parseRefGames(raw: string | null | undefined): RefGame[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((g: RefGame) => ({ ...g, id: g.id ?? crypto.randomUUID() }));
  } catch { return []; }
}

const COMP_KEY = (pid: number) => `gameforge.comp.${pid}`;
function loadComp(pid: number): CompGame[] {
  try { const r = localStorage.getItem(COMP_KEY(pid)); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveComp(pid: number, list: CompGame[]) {
  try { localStorage.setItem(COMP_KEY(pid), JSON.stringify(list)); } catch {}
}

const QUICK_QUESTIONS = [
  "What are the biggest design risks in this game?",
  "How can I make player interaction more exciting?",
  "What rules might conflict with each other?",
  "Suggest a unique mechanic based on my setup",
  "How does the complexity compare to similar games?",
  "What's the most satisfying moment in my game right now?",
];

const QUICK_PROMPTS = [
  "Brainstorm core mechanics for this genre.",
  "Suggest 5 unique player roles.",
  "Draft a quick summary of the rulebook.",
  "What are some interesting twists for the endgame?",
];

const COMPLEXITY_LABELS: Record<number, string> = { 1: "Pick up & play", 2: "Easy", 3: "Medium", 4: "Complex", 5: "Heavy" };

const REVERSE_STAGES = [
  { label: "Analyzing games…", sub: "KIMI is studying your inspirations" },
  { label: "Synthesizing design DNA…", sub: "Finding patterns across your references" },
  { label: "Designing your game…", sub: "Building mechanics, rules, and roles" },
  { label: "Finalizing blueprint…", sub: "Polishing the final design" },
];

/* ── sub-components ──────────────────────────────────────────────────── */

function DraggableGameCard({
  game,
  onRemove,
  onResearch,
  onReResearch,
  onReverseEngineer,
  researching,
  canReverseEngineer,
}: {
  game: RefGame;
  onRemove: () => void;
  onResearch: (depth: string) => void;
  onReResearch: () => void;
  onReverseEngineer: (gameId: string) => void;
  researching: boolean;
  canReverseEngineer: boolean;
}) {
  const controls = useDragControls();
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [researchDepth, setResearchDepth] = useState("comprehensive");
  const hasData = Boolean(game.gameData);

  return (
    <Reorder.Item
      value={game}
      dragListener={false}
      dragControls={controls}
      className="rounded-xl border border-border bg-card overflow-hidden group list-none"
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 50 }}
      layout
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
          {/* Drag handle */}
          <button
            onPointerDown={(e) => controls.start(e)}
            className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <p className="font-bold text-base leading-tight truncate">{game.name}</p>
            {hasData && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="h-2.5 w-2.5" /> Researched
              </span>
            )}
          </div>

          {/* Remove button with inline confirm */}
          {confirmRemove ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-destructive font-medium">Remove?</span>
              <button
                onClick={onRemove}
                className="h-6 w-6 flex items-center justify-center rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                title="Confirm remove"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={() => setConfirmRemove(false)}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors"
                title="Cancel"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRemove(true)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-muted-foreground transition-opacity p-0.5"
              title="Remove this game"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Stats pills */}
        {hasData && game.gameData && (
          <div className="flex flex-wrap gap-2 mb-3 ml-6">
            {game.gameData.playerCount && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                <Users className="h-2.5 w-2.5" /> {game.gameData.playerCount}
              </span>
            )}
            {game.gameData.playTime && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                <Clock className="h-2.5 w-2.5" /> {game.gameData.playTime}
              </span>
            )}
            {game.gameData.complexity && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                <BarChart2 className="h-2.5 w-2.5" /> {game.gameData.complexity}
              </span>
            )}
          </div>
        )}

        {/* Overview snippet */}
        {hasData && game.gameData?.overview && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 ml-6 line-clamp-2">
            {game.gameData.overview}
          </p>
        )}

        {/* Borrowing / avoiding */}
        <div className="space-y-1.5 ml-6">
          {game.borrowing && (
            <p className="text-xs">
              <span className="text-emerald-400 font-semibold">Borrowing: </span>
              <span className="text-muted-foreground">{game.borrowing}</span>
            </p>
          )}
          {game.avoiding && (
            <p className="text-xs">
              <span className="text-amber-400 font-semibold">Doing differently: </span>
              <span className="text-muted-foreground">{game.avoiding}</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {!hasData ? (
          <div className="flex items-center gap-2">
            <select
              value={researchDepth}
              onChange={(e) => setResearchDepth(e.target.value)}
              className="text-[10px] bg-muted border border-border rounded px-2 py-1 text-foreground"
              title="Research depth"
            >
              <option value="basic">Basic</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="exhaustive">Exhaustive</option>
            </select>
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs h-7 border-primary/30 hover:bg-primary/10"
              onClick={() => onResearch(researchDepth)}
              disabled={researching}
            >
              {researching
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Looking it up…</>
                : <><Sparkles className="h-3 w-3 text-primary" /> Research</>}
            </Button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Hide breakdown" : "Full breakdown"}
            </button>

            <button
              onClick={onReResearch}
              disabled={researching}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              title="Refresh AI analysis"
            >
              {researching
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3" />}
              Re-analyze
            </button>

            {canReverseEngineer && (
              <Button
                size="sm" variant="outline"
                className="gap-1.5 text-xs h-7 border-violet-500/30 text-violet-400 hover:bg-violet-500/10 ml-auto"
                onClick={() => onReverseEngineer(game.id)}
              >
                <Wand2 className="h-3 w-3" /> Reverse engineer
              </Button>
            )}
          </>
        )}

        {game.researchId && !hasData && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <FileText className="h-3 w-3" /> In notes
          </span>
        )}
      </div>

      {/* Expanded breakdown */}
      {expanded && hasData && game.gameData && (
        <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-4">
          {game.gameData.overview && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Overview</p>
              <p className="text-sm leading-relaxed">{game.gameData.overview}</p>
            </div>
          )}
          {game.gameData.coreLoop && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">How it plays</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{game.gameData.coreLoop}</p>
            </div>
          )}
          {game.gameData.keyMechanics?.length ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Key mechanics</p>
              <div className="flex flex-wrap gap-1.5">
                {game.gameData.keyMechanics.map((m, mi) => (
                  <span key={mi} className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {game.gameData.designStrengths?.length ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 mb-1.5">What makes it great</p>
                <ul className="space-y-1">
                  {game.gameData.designStrengths.map((s, si) => (
                    <li key={si} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {game.gameData.designWeaknesses?.length ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 mb-1.5">Watch out for</p>
                <ul className="space-y-1">
                  {game.gameData.designWeaknesses.map((w, wi) => (
                    <li key={wi} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-amber-400 shrink-0 mt-0.5">!</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {game.gameData.designLessons && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-1">Designer takeaway</p>
              <p className="text-sm leading-relaxed">{game.gameData.designLessons}</p>
            </div>
          )}
        </div>
      )}
    </Reorder.Item>
  );
}

/* ── ReverseEngineerDialog ───────────────────────────────────────────── */

function ReverseEngineerDialog({
  open,
  onClose,
  researched,
  projectId,
  workspaceSlug,
  preselectedGameId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  researched: RefGame[];
  projectId: number;
  workspaceSlug?: string;
  preselectedGameId: string | null;
  onSuccess: (result: { project: { name: string; slug?: string; id: number }; workspaceSlug?: string; mode: string }) => void;
}) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState("");
  const [reversing, setReversing] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (open) {
      if (preselectedGameId && researched.some((g) => g.id === preselectedGameId)) {
        setSelectedIds(new Set([preselectedGameId]));
      } else {
        setSelectedIds(new Set(researched.map((g) => g.id)));
      }
      setDirection("");
      setStageIdx(0);
    }
  }, [open, researched, preselectedGameId]);

  // Cycle through stage labels while reversing
  useEffect(() => {
    if (!reversing) { setStageIdx(0); return; }
    const interval = setInterval(() => setStageIdx((i) => Math.min(i + 1, REVERSE_STAGES.length - 1)), 3500);
    return () => clearInterval(interval);
  }, [reversing]);

  const toggleAll = () => {
    if (selectedIds.size === researched.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(researched.map((g) => g.id)));
    }
  };

  const toggleGame = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const selectedGames = researched.filter((g) => selectedIds.has(g.id));

  const run = async () => {
    if (selectedGames.length === 0) {
      toast({ title: "Select at least one game", variant: "destructive" });
      return;
    }
    setReversing(true);
    try {
      const res = await fetch(`${apiBase()}/api/projects/${projectId}/reverse-engineer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ games: selectedGames, direction, mode: "new_project", workspaceSlug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Clone failed");
      }
      const result = await res.json();
      onSuccess(result);
      onClose();
    } catch (err) {
      toast({ title: "Clone failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setReversing(false);
    }
  };

  const stage = REVERSE_STAGES[stageIdx]!;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !reversing && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-400" />
            Reverse Engineer
            <span className="ml-auto text-[10px] font-normal bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Powered by AI</span>
          </DialogTitle>
        </DialogHeader>

        {reversing ? (
          /* Progress state */
          <div className="py-10 flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-violet-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin border-t-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-base text-foreground">{stage.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{stage.sub}</p>
            </div>
            <div className="flex gap-1.5">
              {REVERSE_STAGES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-colors ${i <= stageIdx ? "bg-violet-400" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Game selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Clone from</Label>
                <button
                  onClick={toggleAll}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedIds.size === researched.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="rounded-lg border border-border divide-y divide-border">
                {researched.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(g.id)}
                      onCheckedChange={() => toggleGame(g.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      {g.gameData?.keyMechanics?.length ? (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {g.gameData.keyMechanics.slice(0, 3).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>
              {selectedGames.length === 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Select at least one game
                </p>
              )}
            </div>

            {/* Info notice */}
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-violet-200">
              <p className="font-semibold mb-1">Recreates the exact game</p>
              <p className="text-violet-200/70">
                AI will pull comprehensive details from all available sources and recreate the exact game with all its components, rules, mechanics, and structure — not an "inspired by" version.
              </p>
            </div>
          </div>
        )}

        {!reversing && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="gap-2 bg-violet-600 hover:bg-violet-700"
              onClick={run}
              disabled={selectedGames.length === 0}
            >
              <Wand2 className="h-4 w-4" />
              Reverse Engineer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── InspirationShelf ────────────────────────────────────────────────── */

function InspirationShelf({ projectId, workspaceSlug }: { projectId: number; workspaceSlug?: string }) {
  const { data: project } = useGetProject(projectId);
  const updateProject = useUpdateProject();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [refGames, setRefGames] = useState<RefGame[]>([]);
  const [draft, setDraft] = useState({ name: "", borrowing: "", avoiding: "" });
  const [showForm, setShowForm] = useState(false);
  const [lookingUp, setLookingUp] = useState<string | null>(null);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [preselectedGameId, setPreselectedGameId] = useState<string | null>(null);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [similarGames, setSimilarGames] = useState<string[]>([]);
  const [showSimilarDialog, setShowSimilarDialog] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (project && !initRef.current) {
      setRefGames(parseRefGames((project as any).referenceGames));
      initRef.current = true;
    }
  }, [project]);

  const persist = (next: RefGame[]) => {
    setRefGames(next);
    updateProject.mutate({ projectId, data: { referenceGames: JSON.stringify(next) } as any });
  };

  const addGame = () => {
    if (!draft.name.trim()) return;
    persist([...refGames, { id: crypto.randomUUID(), ...draft }]);
    setDraft({ name: "", borrowing: "", avoiding: "" });
    setShowForm(false);
  };

  const removeGame = (id: string) => persist(refGames.filter((g) => g.id !== id));

  const lookUpGame = async (id: string, depth = "comprehensive", clearExisting = false) => {
    const game = refGames.find((g) => g.id === id);
    if (!game) return;
    setLookingUp(id);
    if (clearExisting) {
      persist(refGames.map((g) => g.id === id ? { ...g, gameData: undefined, researchId: undefined } : g));
    }
    try {
      const res = await fetch(`${apiBase()}/api/projects/${projectId}/research/game-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gameName: game.name, borrowing: game.borrowing, avoiding: game.avoiding, depth }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { research, gameData } = await res.json() as { research: { id: number }; gameData: GameData };
      setRefGames((prev) => {
        const next = prev.map((g) => g.id === id ? { ...g, researchId: research.id, gameData } : g);
        updateProject.mutate({ projectId, data: { referenceGames: JSON.stringify(next) } as any });
        return next;
      });
      qc.invalidateQueries({ queryKey: getListResearchQueryKey(projectId) });
      toast({ title: `${game.name} researched`, description: "Full breakdown saved to your notes." });
    } catch (err) {
      toast({ title: "Lookup failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setLookingUp(null);
    }
  };

  const findSimilarGames = async () => {
    if (!project) return;
    setFindingSimilar(true);
    try {
      const res = await fetch(`${apiBase()}/api/projects/${projectId}/research/similar-games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gameName: project.name,
          description: project.description,
          gameType: project.gameType,
          genre: project.genre,
          playerCount: project.playerCount,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { games } = await res.json() as { games: string[] };
      setSimilarGames(games);
      setShowSimilarDialog(true);
      toast({ title: "Similar games found", description: `Found ${games.length} games similar to your project.` });
    } catch (err) {
      toast({ title: "Could not find similar games", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setFindingSimilar(false);
    }
  };

  const addSimilarGame = (gameName: string) => {
    const newGame: RefGame = {
      id: crypto.randomUUID(),
      name: gameName,
      borrowing: "",
      avoiding: "",
    };
    persist([...refGames, newGame]);
    setSimilarGames(similarGames.filter((g) => g !== gameName));
    toast({ title: "Game added", description: `${gameName} added to your research list.` });
  };

  const researched = refGames.filter((g) => g.gameData);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-400" /> Games that shaped your vision
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add a game, hit <span className="text-primary font-medium">Research with AI</span> to pull comprehensive details from all sources, then{" "}
            <span className="text-violet-400 font-medium">Reverse Engineer</span> to recreate the exact game with all components.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10"
            onClick={findSimilarGames}
            disabled={findingSimilar || !project}
          >
            {findingSimilar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Find similar games
          </Button>
          {researched.length >= 1 && workspaceSlug && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
              onClick={() => { setPreselectedGameId(null); setShowReverseDialog(true); }}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Reverse Engineer all
            </Button>
          )}
          {!showForm && (
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Add a game
            </Button>
          )}
        </div>
      </div>

      {/* Add game form */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add a reference game</p>
          <Input
            placeholder="Game name (e.g. Wingspan, Catan, Dominion…)"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && addGame()}
          />
          <Input
            placeholder="What's the best part you want to borrow? (optional)"
            value={draft.borrowing}
            onChange={(e) => setDraft((d) => ({ ...d, borrowing: e.target.value }))}
          />
          <Input
            placeholder="What would you do differently? (optional)"
            value={draft.avoiding}
            onChange={(e) => setDraft((d) => ({ ...d, avoiding: e.target.value }))}
          />
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={addGame} disabled={!draft.name.trim()}>Add game</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Drag-and-drop list */}
      {refGames.length > 0 && (
        <Reorder.Group
          axis="y"
          values={refGames}
          onReorder={persist}
          className="space-y-3"
          as="div"
        >
          {refGames.map((rg) => (
            <DraggableGameCard
              key={rg.id}
              game={rg}
              onRemove={() => removeGame(rg.id)}
              onResearch={(depth) => lookUpGame(rg.id, depth)}
              onReResearch={() => lookUpGame(rg.id, undefined, true)}
              onReverseEngineer={(gid) => { setPreselectedGameId(gid); setShowReverseDialog(true); }}
              researching={lookingUp === rg.id}
              canReverseEngineer={Boolean(workspaceSlug && rg.gameData)}
            />
          ))}
        </Reorder.Group>
      )}

      {/* Empty state */}
      {refGames.length === 0 && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 p-8 text-center text-muted-foreground hover:text-foreground transition-colors group"
        >
          <Heart className="h-8 w-8 mx-auto mb-2 opacity-30 group-hover:opacity-60 transition-opacity" />
          <p className="text-sm">Add the games that inspired you</p>
          <p className="text-xs mt-1 opacity-60">Every great game designer knows their influences</p>
        </button>
      )}

      {/* Full reverse engineer dialog */}
      <ReverseEngineerDialog
        open={showReverseDialog}
        onClose={() => setShowReverseDialog(false)}
        researched={researched}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
        preselectedGameId={preselectedGameId}
        onSuccess={(result) => {
          if (result.workspaceSlug) {
            toast({ title: "Game reverse engineered!", description: `${result.project.name} recreated with all components and rules` });
            setLocation(`/${result.workspaceSlug}/${result.project.slug ?? result.project.id}`);
          } else {
            qc.invalidateQueries();
            toast({ title: "Game reverse engineered!", description: "All components and rules have been recreated." });
          }
        }}
      />

      {/* Similar games dialog */}
      <Dialog open={showSimilarDialog} onOpenChange={setShowSimilarDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Games similar to your project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Based on your project's characteristics, here are similar games you might want to research:
            </p>
            {similarGames.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No similar games found.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {similarGames.map((gameName) => (
                  <div
                    key={gameName}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-card/80 transition-colors"
                  >
                    <span className="text-sm font-medium">{gameName}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-7"
                      onClick={() => addSimilarGame(gameName)}
                    >
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSimilarDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GamesToKnow({ projectId }: { projectId: number }) {
  const [games, setGames] = useState<CompGame[]>(() => loadComp(projectId));
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const persist = (next: CompGame[]) => { setGames(next); saveComp(projectId, next); };

  const add = () => {
    const g: CompGame = {
      id: crypto.randomUUID(), game: "", players: "", duration: "",
      complexity: 3, funFactor: 7, loveAbout: "", wouldDoBetter: "", notes: "",
    };
    persist([...games, g]);
  };

  const upd = (id: string, u: Partial<CompGame>) =>
    persist(games.map((g) => (g.id === id ? { ...g, ...u } : g)));

  const del = (id: string) => persist(games.filter((g) => g.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" /> Games to know
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Study what's already out there — so you can stand apart from it.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add a game
        </Button>
      </div>

      {games.length === 0 && (
        <button
          onClick={add}
          className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 p-8 text-center text-muted-foreground hover:text-foreground transition-colors group"
        >
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30 group-hover:opacity-60 transition-opacity" />
          <p className="text-sm">Track games in your market</p>
          <p className="text-xs mt-1 opacity-60">Know what you're up against</p>
        </button>
      )}

      <div className="space-y-3">
        {games.map((g) => (
          <div key={g.id} className="rounded-xl border border-border bg-card p-4 space-y-3 group">
            <div className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  className="h-8 text-sm font-medium"
                  value={g.game}
                  onChange={(e) => upd(g.id, { game: e.target.value })}
                  placeholder="Game title"
                />
                <Input
                  className="h-8 text-sm"
                  value={g.players}
                  onChange={(e) => upd(g.id, { players: e.target.value })}
                  placeholder="Players (e.g. 2–5)"
                />
                <Input
                  className="h-8 text-sm"
                  value={g.duration}
                  onChange={(e) => upd(g.id, { duration: e.target.value })}
                  placeholder="Play time (e.g. 60 min)"
                />
              </div>
              {confirmDelete === g.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-destructive font-medium whitespace-nowrap">Remove?</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { del(g.id); setConfirmDelete(null); }}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setConfirmDelete(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon" variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setConfirmDelete(g.id)}
                  title="Remove this game"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">How heavy is it?</span>
                  <span className="text-xs font-medium text-foreground">{COMPLEXITY_LABELS[g.complexity] ?? g.complexity}</span>
                </div>
                <input
                  type="range" min={1} max={5} step={1}
                  value={g.complexity}
                  onChange={(e) => upd(g.id, { complexity: parseInt(e.target.value) })}
                  className="w-full accent-primary h-1.5"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fun factor</span>
                  <span className="text-xs font-medium text-foreground">{g.funFactor}/10</span>
                </div>
                <input
                  type="range" min={1} max={10} step={1}
                  value={g.funFactor}
                  onChange={(e) => upd(g.id, { funFactor: parseInt(e.target.value) })}
                  className="w-full accent-primary h-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                className="h-8 text-sm"
                value={g.loveAbout}
                onChange={(e) => upd(g.id, { loveAbout: e.target.value })}
                placeholder="What makes it great?"
              />
              <Input
                className="h-8 text-sm"
                value={g.wouldDoBetter}
                onChange={(e) => upd(g.id, { wouldDoBetter: e.target.value })}
                placeholder="Where could it be better?"
              />
            </div>

            {(g.loveAbout || g.wouldDoBetter || g.notes) && (
              <Textarea
                rows={2}
                className="text-sm resize-none"
                value={g.notes}
                onChange={(e) => upd(g.id, { notes: e.target.value })}
                placeholder="Any other notes..."
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlueprintPicker({ projectId, onPromptSend }: { projectId: number; onPromptSend: (p: string) => void }) {
  const { data: project } = useGetProject(projectId);
  const updateProject = useUpdateProject();
  const [selected, setSelected] = useState<GameTemplate | null>(null);

  const applyTemplate = (t: GameTemplate) => {
    setSelected(t);
    updateProject.mutate({
      projectId,
      data: {
        gameType: t.gameType,
        genre: t.genre,
        playerCount: t.playerCount,
        targetDuration: t.targetDuration,
      },
    });
  };

  const projectName = project?.name ?? "my game";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Compass className="h-4 w-4 text-purple-400" /> Pick your blueprint
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Start with a proven game structure. You'll twist it into something yours.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {GAME_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTemplate(t)}
            className={`text-left rounded-xl border p-3 transition-all text-sm ${
              selected?.id === t.id
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border hover:border-primary/40 hover:bg-card/80 bg-card"
            }`}
          >
            <p className="font-semibold leading-tight">{t.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5 opacity-70">{t.playerCount} · {t.targetDuration}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-purple-300">{selected.name} applied</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selected.description}</p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() =>
                onPromptSend(
                  `Based on the ${selected.name} template, suggest entities, rules, and players for my game "${projectName}".`
                )
              }
            >
              <Zap className="h-3.5 w-3.5" /> Generate ideas
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {selected.suggestedEntities.slice(0, 4).map((e) => (
              <div key={e.name} className="rounded-lg bg-card/60 border border-border px-2.5 py-2">
                <p className="font-medium text-foreground">{e.name}</p>
                <p className="text-muted-foreground line-clamp-1">{e.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoDesignerQuestions({ onPromptSend }: { onPromptSend: (p: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-400" /> Ask your AI co-designer
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tap a question to open it in the chat — the AI knows your game already.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Design gut-checks</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => onPromptSend(q)}
              className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg px-3 py-2 transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Brainstorm starters</p>
        <div className="flex flex-col gap-2">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => onPromptSend(p)}
              className="text-left rounded-lg border border-border hover:border-primary/40 bg-card hover:bg-primary/5 px-3 py-2.5 flex items-center gap-2 transition-colors group"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-sm">{p}</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── main Research component ─────────────────────────────────────────── */

interface ResearchProps {
  projectId: number;
  onPromptSend?: (prompt: string) => void;
  workspaceSlug?: string;
}

export function Research({ projectId, onPromptSend = () => {}, workspaceSlug }: ResearchProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListResearch(projectId);
  const createResearch  = useCreateResearch();
  const updateResearch  = useUpdateResearch();
  const deleteResearch  = useDeleteResearch();
  const enhanceResearch = useAiEnhanceResearch();
  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", source: "", content: "", tags: "" });

  const [showIngest, setShowIngest] = useState(false);
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestText, setIngestText] = useState("");
  const [ingesting, setIngesting] = useState(false);

  const isFormOpen = showAdd || editing !== null;

  const refresh = () => qc.invalidateQueries({ queryKey: getListResearchQueryKey(projectId) });
  const filtered = items?.filter(
    (i) => !search || (i.title + (i.content || "") + (i.tags || "")).toLowerCase().includes(search.toLowerCase())
  );

  const closeForm = () => {
    setShowAdd(false);
    setEditing(null);
    setForm({ title: "", source: "", content: "", tags: "" });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", source: "", content: "", tags: "" });
    setShowIngest(false);
    setShowAdd(true);
  };

  const openEdit = (id: number) => {
    const it = items?.find((i) => i.id === id);
    if (!it) return;
    setShowAdd(false);
    setShowIngest(false);
    setEditing(id);
    setForm({ title: it.title, source: it.source || "", content: it.content || "", tags: it.tags || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing !== null) {
        await updateResearch.mutateAsync({ projectId, researchId: editing, data: { title: form.title, source: form.source || undefined, content: form.content || undefined, tags: form.tags || undefined } });
        toast({ title: "Research updated" });
      } else {
        await createResearch.mutateAsync({ projectId, data: { title: form.title, source: form.source || undefined, content: form.content || undefined, tags: form.tags || undefined } });
        toast({ title: "Research saved" });
      }
      closeForm();
      refresh();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const removeItem = async (id: number) => {
    try {
      await deleteResearch.mutateAsync({ projectId, researchId: id });
      toast({ title: "Research deleted" });
      refresh();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
    finally { setDeleteConfirmId(null); }
  };

  const handleEnhance = async (researchId: number) => {
    setEnhancingId(researchId);
    try {
      await enhanceResearch.mutateAsync({ projectId, researchId });
      qc.invalidateQueries({ queryKey: getListResearchQueryKey(projectId) });
      toast({ title: "Research polished", description: "AI has enhanced your notes." });
    } catch (err) {
      toast({ title: "Polish failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setEnhancingId(null);
    }
  };

  const closeIngest = () => { setShowIngest(false); setIngestUrl(""); setIngestText(""); };

  const ingest = async () => {
    if (!ingestUrl && !ingestText) return;
    setIngesting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const prompt = ingestUrl
        ? `Summarize the source at this URL into a research note: ${ingestUrl}`
        : `Summarize the following text into a single research note:\n\n${ingestText}`;
      const res = await fetch(`${base}/api/projects/${projectId}/research/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, count: 1 }),
      });
      if (!res.ok) throw new Error("ingest failed");
      closeIngest();
      refresh();
      toast({ title: "Source saved", description: "AI summarized and added it to your notes." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-amber-400" /> Design Research
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Your creative foundation — inspiration, influences, and everything worth remembering.
        </p>
      </div>

      <Tabs defaultValue="inspiration" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="inspiration" className="gap-1.5">
            <Heart className="h-3.5 w-3.5" /> Inspiration
          </TabsTrigger>
          <TabsTrigger value="blueprints" className="gap-1.5">
            <Compass className="h-3.5 w-3.5" /> Blueprints
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
        </TabsList>

        {/* ── INSPIRATION ───────────────────────────────────────────── */}
        <TabsContent value="inspiration" className="space-y-8 mt-6">
          <InspirationShelf projectId={projectId} workspaceSlug={workspaceSlug} />
          <div className="border-t border-border pt-8">
            <GamesToKnow projectId={projectId} />
          </div>
        </TabsContent>

        {/* ── BLUEPRINTS ────────────────────────────────────────────── */}
        <TabsContent value="blueprints" className="space-y-8 mt-6">
          <BlueprintPicker projectId={projectId} onPromptSend={onPromptSend} />
          <div className="border-t border-border pt-8">
            <CoDesignerQuestions onPromptSend={onPromptSend} />
          </div>
        </TabsContent>

        {/* ── NOTES ─────────────────────────────────────────────────── */}
        <TabsContent value="notes" className="space-y-5 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-400" /> Your notes & sources
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drop a URL, paste an article, or jot a thought — AI can summarize it for you.
              </p>
            </div>
            <div className="flex gap-2">
              {!showIngest && !isFormOpen && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setShowAdd(false); setEditing(null); setShowIngest(true); }}>
                  <Sparkles className="h-3.5 w-3.5" /> Clip a source
                </Button>
              )}
              {!isFormOpen && !showIngest && (
                <Button size="sm" className="gap-1.5" onClick={openCreate} data-testid="add-research-button">
                  <Plus className="h-3.5 w-3.5" /> Add a note
                </Button>
              )}
            </div>
          </div>

          {/* Add / Edit form */}
          {isFormOpen && (
            <Card className="border-primary/30 bg-primary/5" data-testid="research-form-panel">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{editing ? "Edit note" : "New note"}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source (URL or citation)</Label>
                    <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tags (comma-separated)</Label>
                    <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="combat, economy, theme…" />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                    <Button type="submit">{editing ? "Save" : "Add"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* AI Ingest */}
          {showIngest && (
            <Card className="border-primary/30 bg-primary/5" data-testid="research-ingest-panel">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Clip a source</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Paste a URL or some text — the AI will read it and save the key points.</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeIngest}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label>URL</Label><Input value={ingestUrl} onChange={(e) => setIngestUrl(e.target.value)} placeholder="https://..." autoFocus /></div>
                <div className="text-center text-xs text-muted-foreground">— or paste text —</div>
                <div className="space-y-1.5"><Label>Text</Label><Textarea rows={6} value={ingestText} onChange={(e) => setIngestText(e.target.value)} /></div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={closeIngest}>Cancel</Button>
                  <Button onClick={ingest} disabled={ingesting || (!ingestUrl && !ingestText)} className="gap-2">
                    <Sparkles className="h-4 w-4" /> {ingesting ? "Reading…" : "Save summary"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your notes…" className="pl-9" />
          </div>

          {/* Notes grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>
          ) : !filtered?.length ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
              <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground mb-4">
                {search ? "No matching notes." : "Nothing here yet — start capturing ideas."}
              </p>
              {!search && !isFormOpen && (
                <Button onClick={openCreate} size="sm"><Plus className="mr-2 h-3.5 w-3.5" /> Add a note</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((it) => (
                <Card key={it.id} className="bg-card border-border hover:border-primary/30 transition-colors group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base line-clamp-1">{it.title}</CardTitle>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0">
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7" title="Polish with AI"
                          onClick={() => handleEnhance(it.id)}
                          disabled={enhancingId === it.id}
                          data-testid={`enhance-research-${it.id}`}
                        >
                          {enhancingId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it.id)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmId(it.id)}
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {it.source && (
                      <CardDescription className="flex items-center gap-1 text-xs">
                        {it.source.startsWith("http") ? (
                          <a href={it.source} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 shrink-0" /> {it.source}
                          </a>
                        ) : (
                          <span className="truncate">{it.source}</span>
                        )}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {it.content && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{it.content}</p>}
                    {it.tags && (
                      <div className="flex flex-wrap gap-1">
                        {it.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                          <span key={t} className="text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete note confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId !== null && removeItem(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
