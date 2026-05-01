import { useEffect, useRef, useState } from "react";
import {
  useListResearch, useCreateResearch, useUpdateResearch, useDeleteResearch,
  useAiEnhanceResearch, getListResearchQueryKey,
  useGetProject, useUpdateProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Trash2, ExternalLink, Edit2, Tag, Sparkles, Loader2, X,
  BookOpen, Lightbulb, Compass, StickyNote, Star, TrendingUp, MessageCircle,
  Zap, ChevronRight, Heart, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GAME_TEMPLATES, type GameTemplate } from "@/lib/game-templates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ── types ───────────────────────────────────────────────────────────── */

type RefGame = { name: string; borrowing: string; avoiding: string };

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
  try { return JSON.parse(raw); } catch { return []; }
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

/* ── sub-components ──────────────────────────────────────────────────── */

function InspirationShelf({ projectId }: { projectId: number }) {
  const { data: project } = useGetProject(projectId);
  const updateProject = useUpdateProject();
  const [refGames, setRefGames] = useState<RefGame[]>([]);
  const [draft, setDraft] = useState<RefGame>({ name: "", borrowing: "", avoiding: "" });
  const [showForm, setShowForm] = useState(false);
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
    persist([...refGames, { ...draft }]);
    setDraft({ name: "", borrowing: "", avoiding: "" });
    setShowForm(false);
  };

  const removeGame = (i: number) => persist(refGames.filter((_, j) => j !== i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-400" /> Games that shaped your vision
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            What are you drawing from — and what are you doing differently?
          </p>
        </div>
        {!showForm && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Add a game
          </Button>
        )}
      </div>

      {refGames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {refGames.map((rg, i) => (
            <div key={i} className="group rounded-xl border border-border bg-card p-4 relative">
              <button
                onClick={() => removeGame(i)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="font-semibold text-sm mb-2">{rg.name}</p>
              {rg.borrowing && (
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <ChevronRight className="h-3 w-3" /> Stealing the best part:
                  </span>{" "}
                  {rg.borrowing}
                </p>
              )}
              {rg.avoiding && (
                <p className="text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                    <AlertCircle className="h-3 w-3" /> Doing it differently:
                  </span>{" "}
                  {rg.avoiding}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <Input
            placeholder="Game name (e.g. Wingspan, Catan…)"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            autoFocus
          />
          <Input
            placeholder="What's the best part you want to borrow?"
            value={draft.borrowing}
            onChange={(e) => setDraft((d) => ({ ...d, borrowing: e.target.value }))}
          />
          <Input
            placeholder="What would you do differently?"
            value={draft.avoiding}
            onChange={(e) => setDraft((d) => ({ ...d, avoiding: e.target.value }))}
          />
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={addGame} disabled={!draft.name.trim()}>Add game</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

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
    </div>
  );
}

function GamesToKnow({ projectId }: { projectId: number }) {
  const [games, setGames] = useState<CompGame[]>(() => loadComp(projectId));

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
          <div key={g.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
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
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => del(g.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
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
}

export function Research({ projectId, onPromptSend = () => {} }: ResearchProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListResearch(projectId);
  const createItem = useCreateResearch();
  const updateItem = useUpdateResearch();
  const deleteItem = useDeleteResearch();
  const enhanceItem = useAiEnhanceResearch();
  const [enhancingId, setEnhancingId] = useState<number | null>(null);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      if (editing) {
        await updateItem.mutateAsync({ projectId, researchId: editing, data: form });
      } else {
        await createItem.mutateAsync({ projectId, data: form });
      }
      closeForm();
      refresh();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const removeItem = async (id: number) => {
    try { await deleteItem.mutateAsync({ projectId, researchId: id }); refresh(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const handleEnhance = async (researchId: number) => {
    setEnhancingId(researchId);
    try {
      await enhanceItem.mutateAsync({ projectId, researchId });
      qc.invalidateQueries({ queryKey: getListResearchQueryKey(projectId) });
      toast({ title: "Note polished", description: "AI improved the summary." });
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
          <InspirationShelf projectId={projectId} />
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
                <form onSubmit={submit} className="space-y-4">
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
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
    </div>
  );
}
