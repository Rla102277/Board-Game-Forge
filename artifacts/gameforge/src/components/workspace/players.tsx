import { useEffect, useMemo, useRef, useState } from "react";
import {
  useListPlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer,
  useAiEnhancePlayer, useReorderPlayers, getListPlayersQueryKey, type Player,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RTooltip,
} from "recharts";
import {
  Plus, Trash2, Sparkles, Loader2, X, ChevronDown, ChevronRight,
  Shield, MessageCircle, Zap, Star, Leaf, Heart,
  Search, GripVertical, Users, UserPlus, BarChart3, User,
  Target, Sword, Package, Trophy, Wand2, Gamepad2, List, GitGraph, Check,
} from "lucide-react";
import { PlayerRelationshipGraph } from "./player-relationship-graph";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

// ─── Type system ──────────────────────────────────────────────────────────────

const PLAYER_TYPES = ["Character", "NPC", "Enemy", "Boss", "Creature", "Ally"] as const;
type PlayerType = typeof PLAYER_TYPES[number];

const DECISION_STYLES = ["Optimiser", "Roleplayer", "Disruptive", "Cooperative"] as const;
const RELATIONSHIP_TYPES = ["Allied", "Enemy", "Rival", "Mentor", "Dependent", "Neutral"] as const;

const PLAYSTYLE_TAGS = ["Solo", "Team", "Asymmetric", "Cooperative", "Competitive", "Hybrid"] as const;
type PlaystyleTag = typeof PLAYSTYLE_TAGS[number];

const COMMON_ARCHETYPES = ["Hero", "Villain", "Trickster", "Mentor", "Guardian", "Wanderer", "Ruler", "Rebel", "Sage", "Innocent"] as const;

interface BehaviorProfile { riskTolerance: number; aggression: number; decisionStyle: string; }
interface Relationship { targetPlayerId: number; relationshipType: string; }

const TYPE_META: Record<PlayerType, {
  Icon: React.FC<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  badge: string;
  desc: string;
  quickRole: string;
}> = {
  Character: {
    Icon: Shield, label: "Player Characters", color: "text-blue-400",
    bg: "bg-blue-500/10", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    desc: "Playable heroes and protagonists", quickRole: "Hero",
  },
  NPC: {
    Icon: MessageCircle, label: "NPCs", color: "text-green-400",
    bg: "bg-green-500/10", badge: "bg-green-500/20 text-green-400 border-green-500/30",
    desc: "Allies, merchants, quest givers", quickRole: "NPC",
  },
  Enemy: {
    Icon: Zap, label: "Enemies", color: "text-red-400",
    bg: "bg-red-500/10", badge: "bg-red-500/20 text-red-400 border-red-500/30",
    desc: "Opponents, monsters, minions", quickRole: "Villain",
  },
  Boss: {
    Icon: Star, label: "Bosses", color: "text-orange-400",
    bg: "bg-orange-500/10", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    desc: "Elite enemies, final bosses", quickRole: "Boss",
  },
  Creature: {
    Icon: Leaf, label: "Creatures", color: "text-purple-400",
    bg: "bg-purple-500/10", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    desc: "Animals, beasts, summons", quickRole: "Creature",
  },
  Ally: {
    Icon: Heart, label: "Allies", color: "text-cyan-400",
    bg: "bg-cyan-500/10", badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    desc: "Companions, helpers, followers", quickRole: "Ally",
  },
};

function getMeta(type: string | undefined) {
  return TYPE_META[(type ?? "Character") as PlayerType] ?? TYPE_META.Character;
}

// ─── JSONB cast helpers ────────────────────────────────────────────────────────

function castBehavior(raw: Record<string, unknown> | null | undefined): BehaviorProfile {
  const defaults: BehaviorProfile = { riskTolerance: 50, aggression: 50, decisionStyle: "Optimiser" };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const r = raw as Record<string, unknown>;
  return {
    riskTolerance: typeof r["riskTolerance"] === "number" ? Math.max(0, Math.min(100, r["riskTolerance"])) : 50,
    aggression: typeof r["aggression"] === "number" ? Math.max(0, Math.min(100, r["aggression"])) : 50,
    decisionStyle: typeof r["decisionStyle"] === "string" ? r["decisionStyle"] : "Optimiser",
  };
}

function castRelationships(raw: Record<string, unknown>[] | null | undefined): Relationship[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => {
      if (!r || typeof r !== "object") return false;
      const x = r as Record<string, unknown>;
      return typeof x["targetPlayerId"] === "number" && typeof x["relationshipType"] === "string";
    })
    .map((r) => r as unknown as Relationship);
}

// ─── Sheet state ──────────────────────────────────────────────────────────────

interface SheetState {
  name: string;
  playerType: PlayerType;
  role: string;
  archetype: string;
  faction: string;
  motivation: string;
  flaw: string;
  arc: string;
  description: string;
  strategy: string;
  startingResources: string;
  victoryCondition: string;
  specialAbility: string;
  playstyle: string;
  riskTolerance: number;
  aggression: number;
  decisionStyle: string;
  relationships: Relationship[];
}

function emptySheet(type?: PlayerType): SheetState {
  return {
    name: "", playerType: type ?? "Character", role: "", archetype: "",
    faction: "", motivation: "", flaw: "", arc: "", description: "",
    strategy: "", startingResources: "", victoryCondition: "", specialAbility: "", playstyle: "",
    riskTolerance: 50, aggression: 50, decisionStyle: "Optimiser",
    relationships: [],
  };
}

function playerToSheet(p: Player): SheetState {
  const b = castBehavior(p.behaviorProfile as Record<string, unknown> | null | undefined);
  return {
    name: p.name,
    playerType: (p.playerType as PlayerType) ?? "Character",
    role: p.role ?? "",
    archetype: p.archetype ?? "",
    faction: p.faction ?? "",
    motivation: p.motivation ?? "",
    flaw: p.flaw ?? "",
    arc: p.arc ?? "",
    description: p.description ?? "",
    strategy: p.strategy ?? "",
    startingResources: p.startingResources ?? "",
    victoryCondition: p.victoryCondition ?? "",
    specialAbility: p.specialAbility ?? "",
    playstyle: p.playstyle ?? "",
    riskTolerance: b.riskTolerance,
    aggression: b.aggression,
    decisionStyle: b.decisionStyle,
    relationships: castRelationships(p.relationships as Record<string, unknown>[] | null | undefined),
  };
}

function sheetToBody(s: SheetState): Record<string, unknown> {
  return {
    name: s.name,
    playerType: s.playerType,
    role: s.role || undefined,
    archetype: s.archetype || undefined,
    faction: s.faction || undefined,
    motivation: s.motivation || undefined,
    flaw: s.flaw || undefined,
    arc: s.arc || undefined,
    description: s.description || undefined,
    strategy: s.strategy || undefined,
    startingResources: s.startingResources || undefined,
    victoryCondition: s.victoryCondition || undefined,
    specialAbility: s.specialAbility || undefined,
    playstyle: s.playstyle || undefined,
    behaviorProfile: { riskTolerance: s.riskTolerance, aggression: s.aggression, decisionStyle: s.decisionStyle },
    relationships: s.relationships,
  };
}

// ─── Quick-add modal ───────────────────────────────────────────────────────────

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (type: PlayerType, name: string, archetype?: string) => Promise<unknown>;
}

function QuickAddModal({ open, onClose, onCreate }: QuickAddModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PlayerType>("Character");
  const [archetype, setArchetype] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(type, name.trim(), archetype);
      setName(""); setType("Character"); setArchetype("");
      onClose();
    } catch {
      // keep modal open and inputs intact so user can retry
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Add Player Persona
          </DialogTitle>
        </DialogHeader>

        {/* Type tiles */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Player type</Label>
          <div className="grid grid-cols-3 gap-2">
            {PLAYER_TYPES.map((t) => {
              const m = getMeta(t);
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all ${
                    active
                      ? `${m.bg} border-current ${m.color}`
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted/20"
                  }`}
                >
                  <m.Icon className={`h-5 w-5 ${active ? m.color : ""}`} />
                  <span className="text-[11px] font-medium">{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onClose(); }}
            placeholder={`e.g. ${getMeta(type).quickRole}…`}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Archetype (optional)</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_ARCHETYPES.map((a) => (
              <button
                key={a}
                onClick={() => setArchetype(archetype === a ? "" : a)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  archetype === a
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <Input
            value={archetype}
            onChange={(e) => setArchetype(e.target.value)}
            placeholder="Custom archetype…"
            className="h-8 text-sm"
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Balance view ──────────────────────────────────────────────────────────────

const RADAR_COLORS = [
  "#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa", "#22d3ee",
];

interface BalanceViewProps { players: Player[]; }

function BalanceView({ players }: BalanceViewProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(players.slice(0, 4).map((p) => p.id)));

  // Auto-add newly created players to the selection
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      let changed = false;
      players.forEach((p) => {
        if (!next.has(p.id)) { next.add(p.id); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [players]);

  const visiblePlayers = players.filter((p) => selected.has(p.id));

  const radarData = useMemo(() => {
    const axes = ["Risk Tolerance", "Aggression", "Strategy Depth", "Completeness"];
    return axes.map((axis) => {
      const entry: Record<string, string | number> = { axis };
      visiblePlayers.forEach((p, i) => {
        const b = castBehavior(p.behaviorProfile as Record<string, unknown> | null | undefined);
        if (axis === "Risk Tolerance") entry[`p${i}`] = b.riskTolerance;
        else if (axis === "Aggression") entry[`p${i}`] = b.aggression;
        else if (axis === "Strategy Depth") entry[`p${i}`] = p.strategy ? Math.min(100, p.strategy.length * 1.2) : 0;
        else if (axis === "Completeness") {
          const fields = [p.archetype, p.strategy, p.startingResources, p.victoryCondition, p.specialAbility, p.playstyle, p.description, p.motivation];
          entry[`p${i}`] = Math.round((fields.filter(Boolean).length / fields.length) * 100);
        }
      });
      return entry;
    });
  }, [visiblePlayers]);

  const comparisonFields: { label: string; key: keyof Player; icon: React.ElementType }[] = [
    { label: "Archetype", key: "archetype", icon: User },
    { label: "Role", key: "role", icon: Shield },
    { label: "Faction", key: "faction", icon: Users },
    { label: "Starting Resources", key: "startingResources", icon: Package },
    { label: "Victory Condition", key: "victoryCondition", icon: Trophy },
    { label: "Special Ability", key: "specialAbility", icon: Wand2 },
    { label: "Playstyle", key: "playstyle", icon: Gamepad2 },
  ];

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-8">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Add players to compare them in the balance view.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Player selector */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-3">Compare Players</h3>
        <div className="flex flex-wrap gap-2">
          {players.map((p, i) => {
            const m = getMeta(p.playerType);
            const colorIdx = players.indexOf(p) % RADAR_COLORS.length;
            const active = selected.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setSelected((s) => {
                  const n = new Set(s);
                  n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                  return n;
                })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  active ? "border-current" : "border-border text-muted-foreground opacity-50"
                }`}
                style={active ? { color: RADAR_COLORS[colorIdx % RADAR_COLORS.length], borderColor: RADAR_COLORS[colorIdx % RADAR_COLORS.length], backgroundColor: `${RADAR_COLORS[colorIdx % RADAR_COLORS.length]}15` } : {}}
              >
                <m.Icon className="h-3 w-3" />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {visiblePlayers.length > 0 && (
        <>
          {/* Radar chart */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-4">Behavior Radar</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => {
                      const idx = parseInt(name.replace("p", ""), 10);
                      return [`${value}%`, visiblePlayers[idx]?.name ?? name];
                    }}
                  />
                  {visiblePlayers.map((p, i) => {
                    const colorIdx = players.indexOf(p) % RADAR_COLORS.length;
                    return (
                      <Radar
                        key={p.id}
                        name={`p${i}`}
                        dataKey={`p${i}`}
                        stroke={RADAR_COLORS[colorIdx % RADAR_COLORS.length]}
                        fill={RADAR_COLORS[colorIdx % RADAR_COLORS.length]}
                        fillOpacity={0.08}
                        strokeWidth={2}
                      />
                    );
                  })}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {visiblePlayers.map((p) => {
                const colorIdx = players.indexOf(p) % RADAR_COLORS.length;
                return (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RADAR_COLORS[colorIdx % RADAR_COLORS.length] }} />
                    {p.name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-3">Side-by-Side Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium w-36">Attribute</th>
                    {visiblePlayers.map((p) => {
                      const m = getMeta(p.playerType);
                      const colorIdx = players.indexOf(p) % RADAR_COLORS.length;
                      return (
                        <th key={p.id} className="text-left py-2 px-3 font-medium min-w-[140px]" style={{ color: RADAR_COLORS[colorIdx % RADAR_COLORS.length] }}>
                          <div className="flex items-center gap-1.5">
                            <m.Icon className="h-3 w-3" /> {p.name}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/40">
                    <td className="py-2 pr-4 text-muted-foreground">Type</td>
                    {visiblePlayers.map((p) => {
                      const m = getMeta(p.playerType);
                      return (
                        <td key={p.id} className="py-2 px-3">
                          <Badge variant="outline" className={`text-[10px] ${m.badge}`}>{p.playerType}</Badge>
                        </td>
                      );
                    })}
                  </tr>
                  {comparisonFields.map((f) => (
                    <tr key={f.key} className="border-t border-border/40">
                      <td className="py-2 pr-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <f.icon className="h-3 w-3 shrink-0" /> {f.label}
                        </div>
                      </td>
                      {visiblePlayers.map((p) => {
                        const val = p[f.key] as string | undefined;
                        return (
                          <td key={p.id} className="py-2 px-3 text-foreground/80">
                            {val ? (
                              <span className="line-clamp-2">{val}</span>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Behavior sliders comparison */}
                  <tr className="border-t border-border/40">
                    <td className="py-2 pr-4 text-muted-foreground">Risk Tolerance</td>
                    {visiblePlayers.map((p) => {
                      const b = castBehavior(p.behaviorProfile as Record<string, unknown> | null | undefined);
                      return (
                        <td key={p.id} className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-blue-400" style={{ width: `${b.riskTolerance}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 shrink-0">{b.riskTolerance}%</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="py-2 pr-4 text-muted-foreground">Aggression</td>
                    {visiblePlayers.map((p) => {
                      const b = castBehavior(p.behaviorProfile as Record<string, unknown> | null | undefined);
                      return (
                        <td key={p.id} className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-red-400" style={{ width: `${b.aggression}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 shrink-0">{b.aggression}%</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="py-2 pr-4 text-muted-foreground">Decision Style</td>
                    {visiblePlayers.map((p) => {
                      const b = castBehavior(p.behaviorProfile as Record<string, unknown> | null | undefined);
                      return (
                        <td key={p.id} className="py-2 px-3 text-foreground/80">{b.decisionStyle}</td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {visiblePlayers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Select players above to compare them.</p>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface PlayersProps { projectId: number; }

export function Players({ projectId }: PlayersProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: players, isLoading } = useListPlayers(projectId);
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const enhancePlayer = useAiEnhancePlayer();
  const reorderPlayers = useReorderPlayers();

  // ── UI state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "graph">(
    () => (localStorage.getItem("gameforge:players:viewMode") as "list" | "graph" | null) ?? "list"
  );
  const [view, setView] = useState<"persona" | "balance">("persona");
  const [search, setSearch] = useState("");
  const [factionFilter, setFactionFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<PlayerType | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<PlayerType>>(new Set());
  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [narrativeEnhancedIds, setNarrativeEnhancedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // ── Sheet local state
  const [sheet, setSheet] = useState<SheetState>(emptySheet());
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null);

  // ── Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  // dropTargetId + insertBefore: where the insertion line should appear
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [insertBefore, setInsertBefore] = useState<boolean>(true);
  // Saved nudge: briefly shown checkmark + ring after a successful reorder (#68)
  const [savedNudgeId, setSavedNudgeId] = useState<number | null>(null);
  const savedNudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Relationship add UI
  const [addingRelType, setAddingRelType] = useState<string>("Allied");
  const [addingRelTarget, setAddingRelTarget] = useState<string>("");

  // ── Derived
  const selectedPlayer = useMemo(
    () => (players ?? []).find((p) => p.id === selectedId) ?? null,
    [players, selectedId],
  );

  // Sync sheet when a different player is selected
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.id !== sheetPlayerId) {
      const initial = playerToSheet(selectedPlayer);
      setSheet(initial);
      setSheetPlayerId(selectedPlayer.id);
      // Reset lastSavedRef so the debounce won't fire a redundant save immediately
      // after loading — it will only save once the user actually changes something.
      lastSavedRef.current = JSON.stringify(initial);
    }
  }, [selectedPlayer, sheetPlayerId]);

  // Auto-save debounced sheet
  const debouncedSheet = useDebounce(sheet, 700);
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    if (!selectedId || sheetPlayerId !== selectedId) return;
    const serialised = JSON.stringify(debouncedSheet);
    if (serialised === lastSavedRef.current) return;
    lastSavedRef.current = serialised;
    updatePlayer.mutate(
      { projectId, playerId: selectedId, data: sheetToBody(debouncedSheet) as Parameters<typeof updatePlayer.mutate>[0]["data"] },
      { onError: (err) => toast({ title: "Auto-save failed", description: String(err), variant: "destructive" }) },
    );
  }, [debouncedSheet, selectedId, sheetPlayerId, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist viewMode
  useEffect(() => { localStorage.setItem("gameforge:players:viewMode", viewMode); }, [viewMode]);

  // ── Factions
  const factions = useMemo(() => {
    const set = new Set<string>();
    (players ?? []).forEach((p) => { if (p.faction) set.add(p.faction); });
    return Array.from(set).sort();
  }, [players]);

  // ── Filtered + grouped roster
  const grouped = useMemo(() => {
    const map = new Map<PlayerType, Player[]>();
    PLAYER_TYPES.forEach((t) => map.set(t, []));
    let list = players ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.faction ?? "").toLowerCase().includes(q));
    }
    if (factionFilter) list = list.filter((p) => p.faction === factionFilter);
    if (typeFilter) list = list.filter((p) => ((p.playerType as PlayerType) ?? "Character") === typeFilter);
    list.forEach((p) => {
      const t = (p.playerType as PlayerType) ?? "Character";
      map.get(t)?.push(p);
    });
    map.forEach((group) => group.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
    return map;
  }, [players, search, factionFilter, typeFilter]);

  const totalFiltered = useMemo(() => Array.from(grouped.values()).reduce((n, g) => n + g.length, 0), [grouped]);

  // ── Handlers
  const refresh = () => qc.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });

  const handleCreate = async (type: PlayerType, name: string, archetype?: string) => {
    if (!name.trim()) return;
    const existingCount = (grouped.get(type) ?? []).length;
    try {
      const row = await createPlayer.mutateAsync({
        projectId,
        data: { name: name.trim(), playerType: type, archetype: archetype || undefined, displayOrder: existingCount },
      });
      refresh();
      setSelectedId(row.id);
      setView("persona");
      return row;
    } catch (err) {
      toast({ title: "Create failed", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePlayer.mutateAsync({ projectId, playerId: id });
      if (selectedId === id) setSelectedId(null);
      refresh();
    } catch (err) {
      toast({ title: "Delete failed", description: String(err), variant: "destructive" });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleEnhance = async (playerId: number) => {
    setEnhancingId(playerId);
    try {
      const result = await enhancePlayer.mutateAsync({ projectId, playerId });
      refresh();
      if (result.narrativeApplied) {
        setNarrativeEnhancedIds((prev) => new Set([...prev, playerId]));
      }
      toast({
        title: result.narrativeApplied ? "Profile enhanced · Narrative applied" : "Profile enhanced",
        description: result.narrativeApplied
          ? "Character is grounded in your game's narrative."
          : "AI has enriched the player persona.",
      });
    } catch (err) {
      toast({ title: "Enhance failed", description: String(err), variant: "destructive" });
    } finally {
      setEnhancingId(null);
    }
  };

  // ── Unfiltered group for drag-to-reorder (#35 — preserve order across filters)
  const unfilteredGrouped = useMemo(() => {
    const map = new Map<PlayerType, Player[]>();
    PLAYER_TYPES.forEach((t) => map.set(t, []));
    (players ?? []).forEach((p) => {
      const t = (p.playerType as PlayerType) ?? "Character";
      map.get(t)?.push(p);
    });
    map.forEach((group) => group.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
    return map;
  }, [players]);

  // ── Drag-to-reorder (HTML5, within type group)
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number, player: Player) => {
    setDraggedId(id);
    document.body.style.cursor = "grabbing";
    // Required for Firefox: drag-and-drop only fires if dataTransfer has data
    e.dataTransfer.setData("text/plain", String(id));

    // Build a compact card preview that the browser will show under the cursor
    const TYPE_COLORS: Record<string, string> = {
      Character: "#60a5fa",
      NPC: "#4ade80",
      Enemy: "#f87171",
      Boss: "#fb923c",
      Creature: "#c084fc",
      Ally: "#22d3ee",
    };
    const accentColor = TYPE_COLORS[player.playerType ?? "Character"] ?? "#60a5fa";

    const card = document.createElement("div");
    card.style.cssText = [
      "position:fixed",
      "top:-9999px",
      "left:-9999px",
      "width:200px",
      "padding:8px 12px",
      "background:#1c1c22",
      "border:1px solid #2e2e38",
      `border-left:3px solid ${accentColor}`,
      "border-radius:8px",
      "box-shadow:0 8px 24px rgba(0,0,0,0.5),0 2px 8px rgba(0,0,0,0.3)",
      "display:flex",
      "align-items:center",
      "gap:8px",
      "pointer-events:none",
      "z-index:9999",
      "font-family:inherit",
    ].join(";");

    const dot = document.createElement("div");
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${accentColor};flex-shrink:0`;

    const text = document.createElement("div");
    text.style.cssText = "flex:1;min-width:0;overflow:hidden";

    const name = document.createElement("p");
    name.textContent = player.name ?? "Unnamed";
    name.style.cssText = "margin:0;font-size:12px;font-weight:600;color:#e5e5e5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";

    const sub = document.createElement("p");
    sub.textContent = player.archetype ? player.archetype : (player.playerType ?? "Character");
    sub.style.cssText = `margin:0;font-size:10px;color:${accentColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;

    const grip = document.createElement("div");
    grip.style.cssText = "display:flex;flex-direction:column;gap:2px;flex-shrink:0;opacity:0.5";
    for (let i = 0; i < 3; i++) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:2px";
      for (let j = 0; j < 2; j++) {
        const dot2 = document.createElement("div");
        dot2.style.cssText = "width:2px;height:2px;border-radius:50%;background:#888";
        row.appendChild(dot2);
      }
      grip.appendChild(row);
    }

    text.appendChild(name);
    text.appendChild(sub);
    card.appendChild(grip);
    card.appendChild(dot);
    card.appendChild(text);
    document.body.appendChild(card);

    // Position the drag image so the cursor is in the top-left area of the card
    e.dataTransfer.setDragImage(card, 20, card.offsetHeight / 2 || 20);

    // Clean up after the browser has captured the drag image
    setTimeout(() => { card.remove(); }, 0);
  };
  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    setDropTargetId(id);
    // Determine whether to insert before or after based on cursor position in the row
    const rect = e.currentTarget.getBoundingClientRect();
    setInsertBefore(e.clientY < rect.top + rect.height / 2);
  };
  const clearDragState = () => { setDraggedId(null); setDropTargetId(null); setInsertBefore(true); };
  const handleDrop = (targetId: number, type: PlayerType) => {
    document.body.style.cursor = "";
    if (!draggedId || draggedId === targetId) { clearDragState(); return; }
    // Use unfiltered group so filtering doesn't break displayOrder assignments (#35)
    const group = unfilteredGrouped.get(type) ?? [];
    const fromIdx = group.findIndex((p) => p.id === draggedId);
    let toIdx = group.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { clearDragState(); return; }
    const reordered = [...group];
    const [moved] = reordered.splice(fromIdx, 1);
    // After removing fromIdx, all indices > fromIdx shift down by 1
    const adjustedToIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
    // insertBefore → insert at adjustedToIdx; insertAfter → insert after it
    const insertAt = Math.min(insertBefore ? adjustedToIdx : adjustedToIdx + 1, reordered.length);
    reordered.splice(insertAt, 0, moved);
    clearDragState();

    // Optimistic update — update displayOrder in-place so no array-order flicker (#35)
    const queryKey = getListPlayersQueryKey(projectId);
    const previous = qc.getQueryData<Player[]>(queryKey);
    if (previous) {
      const orderMap = new Map(reordered.map((p, idx) => [p.id, idx]));
      const updated = previous.map((p) =>
        orderMap.has(p.id) ? { ...p, displayOrder: orderMap.get(p.id)! } : p
      );
      qc.setQueryData(queryKey, updated);
    }

    // Single round-trip to the dedicated reorder endpoint
    const movedId = moved.id;
    reorderPlayers.mutate(
      { projectId, data: { playerIds: reordered.map((p) => p.id) } },
      {
        onSuccess: (rows) => {
          qc.setQueryData(getListPlayersQueryKey(projectId), rows);
          // Flash "saved" nudge on the moved card (#68)
          if (savedNudgeTimerRef.current) clearTimeout(savedNudgeTimerRef.current);
          setSavedNudgeId(movedId);
          savedNudgeTimerRef.current = setTimeout(() => setSavedNudgeId(null), 2000);
        },
        onError: (err) => {
          // Roll back the optimistic update on failure
          if (previous) qc.setQueryData(queryKey, previous);
          toast({ title: "Reorder failed", description: String(err), variant: "destructive" });
        },
      },
    );
  };

  // ── Relationship helpers
  const addRelationship = () => {
    const targetId = parseInt(addingRelTarget, 10);
    if (!targetId || isNaN(targetId) || targetId === selectedId) return;
    if (sheet.relationships.some((r) => r.targetPlayerId === targetId)) return;
    setSheet((s) => ({
      ...s,
      relationships: [...s.relationships, { targetPlayerId: targetId, relationshipType: addingRelType }],
    }));
    setAddingRelTarget("");
  };

  const removeRelationship = (targetId: number) => {
    setSheet((s) => ({ ...s, relationships: s.relationships.filter((r) => r.targetPlayerId !== targetId) }));
  };

  const allOtherPlayers = useMemo(
    () => (players ?? []).filter((p) => p.id !== selectedId),
    [players, selectedId],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="w-64 shrink-0 space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="flex-1"><Skeleton className="h-full w-full" /></div>
      </div>
    );
  }

  const noPlayers = !players || players.length === 0;

  return (
    <>
      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreate={handleCreate}
      />

      <div className="flex gap-0 h-[calc(100vh-220px)] min-h-[500px]">
        {/* ── LEFT PANE ── */}
        <div className="w-64 shrink-0 flex flex-col border-r border-border bg-card/30">
          {/* Search + view toggle */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 h-8 text-sm bg-background/50"
                />
              </div>
              <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode("list")}
                  title="List view"
                  className={`flex items-center justify-center h-8 w-8 transition-colors ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("graph")}
                  title="Relationship graph"
                  className={`flex items-center justify-center h-8 w-8 transition-colors ${viewMode === "graph" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                >
                  <GitGraph className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "list" && (
            <>
              {/* Type filter chips */}
              {!noPlayers && (
                <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1">
                  {PLAYER_TYPES.filter((t) => (grouped.get(t) ?? []).length > 0 || typeFilter === t).map((type) => {
                    const tm = getMeta(type);
                    const active = typeFilter === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(active ? null : type)}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${active ? `${tm.badge}` : "text-muted-foreground border-border hover:text-foreground"}`}
                      >
                        <tm.Icon className="h-2.5 w-2.5" />
                        {type}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Faction filter chips */}
              {factions.length > 0 && (
                <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1">
                  {factions.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFactionFilter(factionFilter === f ? null : f)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${factionFilter === f ? "bg-primary/20 text-primary border-primary/40" : "text-muted-foreground border-border hover:text-foreground"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Roster (list view) or Graph */}
          {viewMode === "graph" ? (
            <div className="flex-1 overflow-hidden">
              <PlayerRelationshipGraph
                players={players ?? []}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
              />
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto">
            {noPlayers ? (
              <div className="p-4 text-center">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No players yet</p>
              </div>
            ) : totalFiltered === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-4">No matches</p>
            ) : (
              PLAYER_TYPES.map((type) => {
                const group = grouped.get(type) ?? [];
                if (group.length === 0) return null;
                const m = getMeta(type);
                const collapsed = collapsedGroups.has(type);
                return (
                  <div key={type}>
                    {/* Group header — use div+role to avoid nested-button semantic issue */}
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCollapsedGroups((s) => { const n = new Set(s); n.has(type) ? n.delete(type) : n.add(type); return n; }); }}
                      onClick={() => setCollapsedGroups((s) => { const n = new Set(s); n.has(type) ? n.delete(type) : n.add(type); return n; })}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/20 text-left group cursor-pointer select-none"
                    >
                      {collapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                      <m.Icon className={`h-3 w-3 ${m.color}`} />
                      <span className={`text-xs font-medium ${m.color} flex-1`}>{type}</span>
                      <span className="text-[10px] text-muted-foreground">{group.length}</span>
                    </div>


                    {!collapsed && group.map((p) => {
                      const isSelected = p.id === selectedId;
                      const isActive = dropTargetId === p.id && draggedId !== null && draggedId !== p.id;
                      const isSaved = savedNudgeId === p.id;
                      const showLineAbove = isActive && insertBefore;
                      const showLineBelow = isActive && !insertBefore;
                      return (
                        <div key={p.id} className="relative">
                          {/* Insertion line — above */}
                          {showLineAbove && (
                            <div className="absolute top-0 inset-x-2 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
                          )}
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, p.id, p)}
                            onDragOver={(e) => handleDragOver(e, p.id)}
                            onDrop={() => handleDrop(p.id, type)}
                            onDragEnd={() => { document.body.style.cursor = ""; clearDragState(); }}
                            onClick={() => { setSelectedId(isSelected ? null : p.id); setView("persona"); }}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-l-2 ${isSelected ? "bg-primary/10 border-l-primary" : "border-l-transparent hover:bg-muted/20"} ${draggedId === p.id ? "opacity-40 cursor-grabbing" : ""} ${isActive && draggedId !== p.id ? "ring-1 ring-primary/60 ring-inset scale-[1.01] bg-primary/5" : ""} ${isSaved ? "ring-1 ring-green-500/70 ring-inset bg-green-500/5 transition-[box-shadow,background-color]" : ""}`}
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                            <m.Icon className={`h-3.5 w-3.5 shrink-0 ${m.color}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {p.archetype ? p.archetype : <span className={m.color}>{p.playerType}</span>}
                                {p.role ? ` · ${p.role}` : ""}
                                {p.faction ? ` · ${p.faction}` : ""}
                              </p>
                            </div>
                            {savedNudgeId === p.id && (
                              <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 shrink-0 animate-in fade-in slide-in-from-right-2 duration-200" data-testid={`player-saved-nudge-${p.id}`}>
                                <Check className="h-3 w-3" /> saved
                              </span>
                            )}
                            {deleteConfirmId === p.id ? (
                              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDelete(p.id)} className="text-[10px] text-destructive hover:text-destructive/80 font-medium">Del</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] text-muted-foreground">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {/* Insertion line — below */}
                          {showLineBelow && (
                            <div className="absolute bottom-0 inset-x-2 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
          )}

          {/* Add button */}
          <div className="p-3 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => { setQuickAddOpen(true); setViewMode("list"); }}
              data-testid="add-player-button"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Player
            </Button>
          </div>
        </div>

        {/* ── RIGHT PANE ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* View tabs */}
          {!noPlayers && (
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-border shrink-0">
              <button
                onClick={() => setView("persona")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                  view === "persona" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-3.5 w-3.5" /> Persona
              </button>
              <button
                onClick={() => setView("balance")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                  view === "balance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Balance
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {noPlayers ? (
              <EmptyCastState onAdd={() => setQuickAddOpen(true)} />
            ) : view === "balance" ? (
              <BalanceView players={players ?? []} />
            ) : !selectedPlayer ? (
              <NoSelectionState players={players ?? []} onSelect={(id) => { setSelectedId(id); setView("persona"); }} onAdd={() => setQuickAddOpen(true)} />
            ) : (
              <PersonaCard
                player={selectedPlayer}
                sheet={sheet}
                setSheet={setSheet}
                allPlayers={allOtherPlayers}
                addingRelType={addingRelType}
                setAddingRelType={setAddingRelType}
                addingRelTarget={addingRelTarget}
                setAddingRelTarget={setAddingRelTarget}
                onAddRelationship={addRelationship}
                onRemoveRelationship={removeRelationship}
                onEnhance={() => handleEnhance(selectedPlayer.id)}
                enhancing={enhancingId === selectedPlayer.id}
                isNarrativeEnhanced={narrativeEnhancedIds.has(selectedPlayer.id)}
                onDelete={() => setDeleteConfirmId(selectedPlayer.id)}
                deleteConfirm={deleteConfirmId === selectedPlayer.id}
                onDeleteConfirm={() => handleDelete(selectedPlayer.id)}
                onDeleteCancel={() => setDeleteConfirmId(null)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Empty "Cast your game" state ──────────────────────────────────────────────

function EmptyCastState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold">Design your player roster</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Build rich player personas with archetypes, strategies, and victory conditions. Use the Balance view to compare players side-by-side.
        </p>
      </div>
      <Button onClick={onAdd} data-testid="add-player-button">
        <UserPlus className="h-4 w-4 mr-2" /> Add First Player
      </Button>
    </div>
  );
}

// ─── No selection state ────────────────────────────────────────────────────────

function NoSelectionState({ players, onSelect, onAdd }: { players: Player[]; onSelect: (id: number) => void; onAdd: () => void }) {
  const recent = [...players].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">Select a player to view and edit their persona</p>
      </div>
      {recent.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
          {recent.map((p) => {
            const m = getMeta(p.playerType ?? "Character");
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/20 hover:border-primary/30 transition-colors text-left"
              >
                <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                  <m.Icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {p.archetype || p.playerType}{p.role ? ` · ${p.role}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Player
      </Button>
    </div>
  );
}

// ─── Persona Card ──────────────────────────────────────────────────────────────

interface PersonaCardProps {
  player: Player;
  sheet: SheetState;
  setSheet: React.Dispatch<React.SetStateAction<SheetState>>;
  allPlayers: Player[];
  addingRelType: string;
  setAddingRelType: (v: string) => void;
  addingRelTarget: string;
  setAddingRelTarget: (v: string) => void;
  onAddRelationship: () => void;
  onRemoveRelationship: (id: number) => void;
  onEnhance: () => void;
  enhancing: boolean;
  isNarrativeEnhanced?: boolean;
  onDelete: () => void;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function PersonaCard({
  player, sheet, setSheet,
  allPlayers,
  addingRelType, setAddingRelType, addingRelTarget, setAddingRelTarget,
  onAddRelationship, onRemoveRelationship,
  onEnhance, enhancing, isNarrativeEnhanced,
  onDelete, deleteConfirm, onDeleteConfirm, onDeleteCancel,
}: PersonaCardProps) {
  const m = getMeta(sheet.playerType);

  const set = <K extends keyof SheetState>(key: K, val: SheetState[K]) =>
    setSheet((s) => ({ ...s, [key]: val }));

  const relPlayerMap = useMemo(() => {
    const map = new Map<number, Player>();
    allPlayers.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPlayers]);

  const initials = sheet.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

  const activeTags = sheet.playstyle
    ? sheet.playstyle.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const toggleTag = (tag: string) => {
    const has = activeTags.includes(tag);
    const next = has ? activeTags.filter((t) => t !== tag) : [...activeTags, tag];
    set("playstyle", next.join(", "));
  };

  return (
    <div className="p-6 space-y-6">

      {/* ── Hero header ── */}
      <div className={`rounded-2xl border ${m.bg} border-current/10 p-5`}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`shrink-0 w-16 h-16 rounded-2xl ${m.bg} border border-current/20 flex items-center justify-center relative group cursor-default select-none`}>
            <span className={`text-xl font-bold ${m.color}`}>{initials}</span>
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <Input
              value={sheet.name}
              onChange={(e) => set("name", e.target.value)}
              className="text-xl font-bold bg-transparent border-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 mb-1"
              placeholder="Player name…"
            />
            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={sheet.playerType} onValueChange={(v) => set("playerType", v as PlayerType)}>
                <SelectTrigger className={`h-6 text-[11px] border-0 bg-transparent px-0 w-auto gap-1 focus:ring-0 ${m.color} font-medium`}>
                  <Badge variant="outline" className={`text-[10px] ${m.badge} cursor-pointer`}>
                    <m.Icon className="h-3 w-3 mr-1" />{sheet.playerType}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_TYPES.map((t) => {
                    const tm = getMeta(t);
                    return (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <tm.Icon className={`h-3.5 w-3.5 ${tm.color}`} /> {t}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {sheet.archetype && (
                <span className="text-xs text-muted-foreground">· {sheet.archetype}</span>
              )}
              {sheet.faction && (
                <span className="text-xs text-muted-foreground">· {sheet.faction}</span>
              )}
              {isNarrativeEnhanced && (
                <span
                  className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30 flex items-center gap-1"
                  title="This character was enhanced using your game's narrative seed"
                  data-testid={`narrative-badge-player-${player.id}`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  Narrative
                </span>
              )}
            </div>

            {/* Playstyle tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PLAYSTYLE_TAGS.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all font-medium ${
                      active
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onEnhance} disabled={enhancing} title="AI Enhance">
              {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="ml-1.5 hidden sm:inline">Enhance</span>
            </Button>
            {deleteConfirm ? (
              <div className="flex gap-1 items-center">
                <Button size="sm" variant="destructive" onClick={onDeleteConfirm}>Delete</Button>
                <Button size="sm" variant="ghost" onClick={onDeleteCancel}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column persona grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT column ── */}
        <div className="space-y-5">

          {/* Identity */}
          <Section title="Identity">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Archetype">
                  <div className="relative">
                    <Input value={sheet.archetype} onChange={(e) => set("archetype", e.target.value)} placeholder="e.g. Hero, Trickster…" className="h-8 text-sm pr-8" />
                    {!sheet.archetype && (
                      <Select onValueChange={(v) => set("archetype", v)}>
                        <SelectTrigger className="absolute right-1 top-1 h-6 w-6 border-0 bg-transparent p-0 opacity-40 hover:opacity-100" />
                        <SelectContent>
                          {COMMON_ARCHETYPES.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </Field>
                <Field label="Role / Title">
                  <Input value={sheet.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Tank, Scout…" className="h-8 text-sm" />
                </Field>
              </div>
              <Field label="Faction">
                <Input value={sheet.faction} onChange={(e) => set("faction", e.target.value)} placeholder="e.g. The Iron Guild, Unaffiliated…" className="h-8 text-sm" />
              </Field>
              <Field label="Description">
                <Textarea
                  value={sheet.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="A short description of this player's role in the game world…"
                  className="text-sm min-h-[80px] resize-none"
                />
              </Field>
            </div>
          </Section>

          {/* Strategy */}
          <Section title="Strategy & Gameplay">
            <div className="space-y-3">
              <Field label="Strategy">
                <Textarea
                  value={sheet.strategy}
                  onChange={(e) => set("strategy", e.target.value)}
                  placeholder="How does this player win? What's their core game plan?"
                  className="text-sm min-h-[72px] resize-none"
                />
              </Field>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Special Ability">
                  <div className="flex items-start gap-2">
                    <Wand2 className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
                    <Textarea
                      value={sheet.specialAbility}
                      onChange={(e) => set("specialAbility", e.target.value)}
                      placeholder="Unique power or rule exception this player has…"
                      className="text-sm min-h-[60px] resize-none flex-1"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </Section>

          {/* Motivation & Arc */}
          <Section title="Motivation & Arc">
            <div className="space-y-3">
              <Field label="What they want">
                <Textarea
                  value={sheet.motivation}
                  onChange={(e) => set("motivation", e.target.value)}
                  placeholder="What drives this player above all else?"
                  className="text-sm min-h-[60px] resize-none"
                />
              </Field>
              <Field label="Weakness / Flaw">
                <Textarea
                  value={sheet.flaw}
                  onChange={(e) => set("flaw", e.target.value)}
                  placeholder="Their greatest obstacle or vulnerability…"
                  className="text-sm min-h-[60px] resize-none"
                />
              </Field>
              <Field label="Story arc">
                <Textarea
                  value={sheet.arc}
                  onChange={(e) => set("arc", e.target.value)}
                  placeholder="Their journey or transformation through the game…"
                  className="text-sm min-h-[60px] resize-none"
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* ── RIGHT column ── */}
        <div className="space-y-5">

          {/* Game mechanics */}
          <Section title="Game Mechanics">
            <div className="space-y-3">
              <Field label="Starting Resources">
                <div className="flex items-start gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
                  <Textarea
                    value={sheet.startingResources}
                    onChange={(e) => set("startingResources", e.target.value)}
                    placeholder="e.g. 5 gold, 2 action cards, 1 territory…"
                    className="text-sm min-h-[60px] resize-none flex-1"
                  />
                </div>
              </Field>
              <Field label="Victory Condition">
                <div className="flex items-start gap-2">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
                  <Textarea
                    value={sheet.victoryCondition}
                    onChange={(e) => set("victoryCondition", e.target.value)}
                    placeholder="How does this player win the game?"
                    className="text-sm min-h-[60px] resize-none flex-1"
                  />
                </div>
              </Field>
            </div>
          </Section>

          {/* Behavioral profile */}
          <Section title="Behavioral Profile">
            <div className="space-y-4">
              <SliderField
                label="Risk Tolerance"
                leftLabel="Cautious"
                rightLabel="Reckless"
                value={sheet.riskTolerance}
                onChange={(v) => set("riskTolerance", v)}
              />
              <SliderField
                label="Aggression"
                leftLabel="Passive"
                rightLabel="Aggressive"
                value={sheet.aggression}
                onChange={(v) => set("aggression", v)}
              />
              <Field label="Decision Style">
                <Select value={sheet.decisionStyle} onValueChange={(v) => set("decisionStyle", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DECISION_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* Relationships */}
          <Section title="Relationships">
            <div className="space-y-3">
              {sheet.relationships.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sheet.relationships.map((rel) => {
                    const target = relPlayerMap.get(rel.targetPlayerId);
                    const tm = target ? getMeta(target.playerType) : null;
                    return (
                      <div key={rel.targetPlayerId} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/30 text-xs">
                        {tm && <tm.Icon className={`h-3 w-3 ${tm.color}`} />}
                        <span className="text-muted-foreground">{rel.relationshipType}:</span>
                        <span className="font-medium">{target?.name ?? `#${rel.targetPlayerId}`}</span>
                        <button onClick={() => onRemoveRelationship(rel.targetPlayerId)} className="text-muted-foreground hover:text-destructive ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {allPlayers.length > 0 && (
                <div className="flex gap-2">
                  <Select value={addingRelType} onValueChange={setAddingRelType}>
                    <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={addingRelTarget} onValueChange={setAddingRelTarget}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Select player…" /></SelectTrigger>
                    <SelectContent>
                      {allPlayers
                        .filter((p) => !sheet.relationships.some((r) => r.targetPlayerId === p.id))
                        .map((p) => {
                          const pm = getMeta(p.playerType);
                          return (
                            <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                              <span className="flex items-center gap-1.5">
                                <pm.Icon className={`h-3 w-3 ${pm.color}`} /> {p.name}
                              </span>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0" onClick={onAddRelationship} disabled={!addingRelTarget}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {allPlayers.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Add more players to create relationships.</p>
              )}
            </div>
          </Section>

        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-4">
        Auto-saves as you type · Use AI Enhance to fill in persona details
      </p>
    </div>
  );
}

// ─── Small reusable helpers ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SliderField({ label, leftLabel, rightLabel, value, onChange }: {
  label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{value}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">{leftLabel}</span>
        <input
          type="range" min={0} max={100} value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 appearance-none rounded-full bg-muted accent-primary cursor-pointer"
        />
        <span className="text-[10px] text-muted-foreground w-14 shrink-0">{rightLabel}</span>
      </div>
    </div>
  );
}
