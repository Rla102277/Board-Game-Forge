import { useState, useMemo } from "react";
import {
  useListEntities, useCreateEntity, useAiGenerateEntities,
  getListEntitiesQueryKey, type Entity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Layers, Plus, Sparkles, Loader2, X, ArrowRight, Activity,
  CheckCircle2, AlertCircle, FileEdit, Award,
} from "lucide-react";
import {
  PHYSICAL_TYPES, WORLD_TYPES, ALL_COMPONENT_TYPES, COMPONENT_META,
  COMPONENT_SUBTYPES, STATUS_OPTIONS, type ComponentType,
} from "@/lib/game-component-types";
import { GenericComponentStudio } from "./generic-component-studio";
import { TokenStudio } from "./token-studio";
import { TileStudio } from "./tile-studio";
import { BoardStudio } from "./board-studio";

interface GamePiecesOverviewProps {
  projectId: number;
  onChatPrompt?: (prompt: string) => void;
  onNavigate?: (sectionId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function groupByType(entities: Entity[]): Record<ComponentType, Entity[]> {
  const groups = {} as Record<ComponentType, Entity[]>;
  for (const t of ALL_COMPONENT_TYPES) groups[t] = [];
  for (const e of entities) {
    if ((ALL_COMPONENT_TYPES as readonly string[]).includes(e.type)) {
      groups[e.type as ComponentType].push(e);
    }
  }
  return groups;
}

function statusCounts(items: Entity[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of items) {
    const s = e.status || "draft";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Type-card component ────────────────────────────────────────────────────

function TypeCard({
  type, items, onOpen,
}: {
  type: ComponentType;
  items: Entity[];
  onOpen: () => void;
}) {
  const meta = COMPONENT_META[type];
  const counts = statusCounts(items);
  const total = items.length;

  return (
    <button
      onClick={onOpen}
      className={`group relative text-left rounded-lg border border-border/40 ${meta.bg} hover:border-primary/40 hover:bg-card/60 transition-all p-3 flex flex-col gap-2 min-h-[120px]`}
      data-testid={`type-card-${type.toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xl shrink-0">{meta.icon}</span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${meta.color} truncate`}>{type}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate" title={meta.desc}>{meta.desc}</p>
          </div>
        </div>
        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${meta.badge} shrink-0`}>{total}</span>
      </div>
      {/* Status mini-bar */}
      {total > 0 ? (
        <div className="flex h-1 rounded-full overflow-hidden bg-muted/30">
          {STATUS_OPTIONS.map(s => {
            const c = counts[s.value] ?? 0;
            if (c === 0) return null;
            const w = (c / total) * 100;
            const bg = s.value === "approved" ? "bg-blue-400"
              : s.value === "ready" ? "bg-emerald-400"
              : s.value === "needs-art" ? "bg-amber-400"
              : "bg-slate-400";
            return <div key={s.value} className={bg} style={{ width: `${w}%` }} title={`${c} ${s.label}`} />;
          })}
        </div>
      ) : (
        <div className="h-1 rounded-full bg-muted/20" />
      )}
      <div className="flex items-center justify-between text-[10px] mt-auto">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.filter(s => counts[s.value]).slice(0, 3).map(s => (
            <span key={s.value} className={`px-1 py-px rounded border ${s.color}`}>
              {counts[s.value]} {s.label}
            </span>
          ))}
        </div>
        <span className="text-muted-foreground group-hover:text-primary inline-flex items-center gap-0.5 transition-colors">
          {total === 0 ? "Start" : "Open"} <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

// ── Main overview ──────────────────────────────────────────────────────────

export function GamePiecesOverview({ projectId, onChatPrompt, onNavigate }: GamePiecesOverviewProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: entities = [], refetch } = useListEntities(projectId);
  const createEntity = useCreateEntity();
  const aiGenerate = useAiGenerateEntities();

  const [openStudio, setOpenStudio] = useState<ComponentType | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState<ComponentType>("Card");
  const [quickSubtype, setQuickSubtype] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(8);
  const [generating, setGenerating] = useState(false);

  const groups = useMemo(() => groupByType(entities), [entities]);

  // Production health
  const allCounts = useMemo(() => statusCounts(entities), [entities]);
  const total = entities.length;
  const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 100);

  // Recent activity (last 14 days, top 8)
  const recent = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
    return [...entities]
      .filter(e => new Date(e.updatedAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [entities]);

  // AI suggestions: nudges based on what's missing
  const suggestions = useMemo(() => {
    const out: { icon: string; text: string; action?: () => void }[] = [];
    if (groups.Card.length > 0 && groups.Deck.length === 0) {
      out.push({ icon: "📦", text: `You have ${groups.Card.length} cards but no Deck container. Group them into a deck to organize playtesting and printing.` });
    }
    if (groups.Token.length === 0 && entities.length > 0) {
      out.push({ icon: "🪙", text: "No tokens yet. Most games need at least currency, health, or victory point markers." });
    }
    if (groups.Board.length === 0 && entities.length > 5) {
      out.push({ icon: "📋", text: "No board defined. Add a main board, player mats, or a reference sheet." });
    }
    const missingArt = entities.filter(e => e.status === "needs-art").length;
    if (missingArt >= 5) {
      out.push({ icon: "🎨", text: `${missingArt} components are flagged "needs art". Consider a focused art sprint.` });
    }
    if (entities.length === 0) {
      out.push({ icon: "✨", text: "Brand new project — try AI Generate to scaffold a starting set of components in seconds." });
    }
    return out.slice(0, 3);
  }, [groups, entities]);

  const handleQuickAdd = async () => {
    if (!quickName.trim()) return;
    try {
      await createEntity.mutateAsync({
        projectId,
        data: { name: quickName.trim(), type: quickType, subtype: quickSubtype || undefined },
      });
      setQuickName("");
      setQuickSubtype("");
      setShowQuickAdd(false);
      refetch();
      toast({ title: `${quickType} added` });
    } catch (err) {
      toast({ title: "Could not add component", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    setGenerating(true);
    try {
      await aiGenerate.mutateAsync({
        projectId,
        data: {
          prompt: `Generate ${aiCount} game components for this game. ${aiPrompt}. Mix the types — include some Cards, Tokens, Tiles, Meeples, Locations, Factions, or Resources as appropriate. Each should have a clear name, a valid type from [${ALL_COMPONENT_TYPES.join(", ")}], a sensible subtype, and a 1-2 sentence description.`,
          count: aiCount,
        },
      });
      qc.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
      setAiPrompt("");
      setShowAI(false);
      toast({ title: `${aiCount} components generated` });
    } catch (err) {
      toast({ title: "AI generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const renderStudio = () => {
    if (!openStudio) return null;
    const items = groups[openStudio];
    const meta = COMPONENT_META[openStudio];
    const refresh = () => refetch();
    let body;
    switch (openStudio) {
      case "Token": body = <TokenStudio projectId={projectId} entities={items} onRefresh={refresh} />; break;
      case "Tile":  body = <TileStudio  projectId={projectId} entities={items} onRefresh={refresh} />; break;
      case "Board": body = <BoardStudio projectId={projectId} entities={items} onRefresh={refresh} />; break;
      default:
        body = <GenericComponentStudio projectId={projectId} type={openStudio} entities={items} onRefresh={refresh} />;
    }
    return (
      <Sheet open={!!openStudio} onOpenChange={v => !v && setOpenStudio(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto p-0">
          <SheetHeader className="px-5 py-4 border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10">
            <SheetTitle className={`flex items-center gap-2 ${meta.color}`}>
              <span className="text-2xl">{meta.icon}</span>
              <span>{openStudio} Studio</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-border/40 text-muted-foreground bg-muted/20">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </SheetTitle>
            <SheetDescription className="text-xs">{meta.desc}</SheetDescription>
          </SheetHeader>
          <div className="p-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" data-testid="game-pieces-overview">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Game Pieces</h1>
            <p className="text-xs text-muted-foreground">Every component in your game — cards, tokens, boards, factions, and more — at a glance.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { setShowAI(v => !v); setShowQuickAdd(false); }}>
            <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Generate
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { setShowQuickAdd(v => !v); setShowAI(false); }}>
            <Plus className="w-3.5 h-3.5" /> Add component
          </Button>
        </div>
      </div>

      {/* Quick Add */}
      {showQuickAdd && (
        <div className="border border-border/40 rounded-lg p-3 bg-card/40 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white">Add a component</p>
            <button onClick={() => setShowQuickAdd(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" /></button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Name</Label>
              <Input
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); }}
                placeholder="e.g. Spell Card, Health Token…"
                className="h-8 text-xs bg-input"
                autoFocus
              />
            </div>
            <div className="w-32">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Type</Label>
              <Select value={quickType} onValueChange={v => { setQuickType(v as ComponentType); setQuickSubtype(""); }}>
                <SelectTrigger className="h-8 text-xs bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_COMPONENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{COMPONENT_META[t].icon} {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Subtype</Label>
              <Select value={quickSubtype} onValueChange={setQuickSubtype}>
                <SelectTrigger className="h-8 text-xs bg-input"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {(COMPONENT_SUBTYPES[quickType] ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button size="sm" className="h-8 gap-1" onClick={handleQuickAdd} disabled={!quickName.trim() || createEntity.isPending}>
                {createEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate */}
      {showAI && (
        <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI Generate Mixed Components</p>
            <button onClick={() => setShowAI(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" /></button>
          </div>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAIGenerate(); }}
              placeholder='e.g. "starter set for a fantasy dungeon-crawler"…'
              className="h-8 text-xs bg-input flex-1"
            />
            <Select value={aiCount.toString()} onValueChange={v => setAiCount(parseInt(v))}>
              <SelectTrigger className="h-8 w-16 text-xs bg-input"><SelectValue /></SelectTrigger>
              <SelectContent>{[5, 8, 12, 20, 30].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={handleAIGenerate} disabled={!aiPrompt || generating} className="h-8 text-xs gap-1.5 shrink-0">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Generate {aiCount}
            </Button>
          </div>
        </div>
      )}

      {/* Production health */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HealthCard icon={<Layers className="w-3.5 h-3.5 text-primary" />} label="Total" value={total} sublabel="components" />
        <HealthCard icon={<Award className="w-3.5 h-3.5 text-blue-400" />}    label="Approved"  value={allCounts.approved ?? 0}   sublabel={`${pct(allCounts.approved ?? 0)}%`}  bar={pct(allCounts.approved ?? 0)}  barColor="bg-blue-400" />
        <HealthCard icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />} label="Ready"     value={allCounts.ready ?? 0}      sublabel={`${pct(allCounts.ready ?? 0)}%`}     bar={pct(allCounts.ready ?? 0)}     barColor="bg-emerald-400" />
        <HealthCard icon={<AlertCircle className="w-3.5 h-3.5 text-amber-400" />}    label="Needs Art" value={allCounts["needs-art"] ?? 0} sublabel={`${pct(allCounts["needs-art"] ?? 0)}%`} bar={pct(allCounts["needs-art"] ?? 0)} barColor="bg-amber-400" />
      </div>

      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <div className="border border-primary/20 rounded-lg p-3 bg-primary/[0.03] space-y-2">
          <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Suggestions
          </p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-base leading-none">{s.icon}</span>
              <span className="flex-1">{s.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* PHYSICAL types grid */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <span>Physical Components</span>
          <span className="text-muted-foreground/40">{PHYSICAL_TYPES.reduce((s, t) => s + groups[t].length, 0)} total</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {PHYSICAL_TYPES.map(type => (
            <TypeCard
              key={type}
              type={type}
              items={groups[type]}
              onOpen={() => {
                // For Cards, send users to the existing rich Card Studio surface in Components List
                if (type === "Card" && onNavigate) {
                  onNavigate("assets-entities");
                  return;
                }
                setOpenStudio(type);
              }}
            />
          ))}
        </div>
      </div>

      {/* WORLD types grid */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <span>World &amp; Concept</span>
          <span className="text-muted-foreground/40">{WORLD_TYPES.reduce((s, t) => s + groups[t].length, 0)} total</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {WORLD_TYPES.map(type => (
            <TypeCard
              key={type}
              type={type}
              items={groups[type]}
              onOpen={() => setOpenStudio(type)}
            />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="border border-border/40 rounded-lg p-3 bg-card/30 space-y-2">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3 h-3" /> Recent Activity
        </h2>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 italic">No recent changes. Add or edit components to see activity here.</p>
        ) : (
          <div className="divide-y divide-border/30">
            {recent.map(e => {
              const m = COMPONENT_META[e.type as ComponentType] ?? { icon: "🔷", color: "text-muted-foreground" };
              return (
                <button
                  key={e.id}
                  onClick={() => {
                    if (e.type === "Card" && onNavigate) onNavigate("assets-entities");
                    else if ((ALL_COMPONENT_TYPES as readonly string[]).includes(e.type)) setOpenStudio(e.type as ComponentType);
                  }}
                  className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-muted/10 px-1 rounded"
                >
                  <span className="text-base shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">
                      <span className="font-medium">{e.name}</span>
                      <span className={`ml-1.5 text-[10px] ${m.color}`}>{e.type}</span>
                      {e.subtype && <span className="ml-1 text-[10px] text-muted-foreground/60">· {e.subtype}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      <FileEdit className="w-2.5 h-2.5 inline mr-0.5" />
                      {relativeTime(e.updatedAt)}
                    </p>
                  </div>
                  <span className="text-muted-foreground/40 group-hover:text-primary"><ArrowRight className="w-3 h-3" /></span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint to deeper tools */}
      {onChatPrompt && total > 0 && (
        <div className="text-center pt-2">
          <button
            onClick={() => onChatPrompt(`Audit my game components — flag any imbalances, missing types, or production gaps across the ${total} components I've built.`)}
            className="text-[11px] text-primary hover:underline"
          >
            Ask the AI to audit your component set →
          </button>
        </div>
      )}

      {renderStudio()}
    </div>
  );
}

// ── Health card sub-component ──────────────────────────────────────────────

function HealthCard({
  icon, label, value, sublabel, bar, barColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sublabel: string;
  bar?: number;
  barColor?: string;
}) {
  return (
    <div className="border border-border/40 rounded-lg p-3 bg-card/40 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">{icon} {label}</span>
        <span className="text-[10px] text-muted-foreground/60">{sublabel}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {bar !== undefined && (
        <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
          <div className={`h-full rounded-full ${barColor ?? "bg-primary"}`} style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
