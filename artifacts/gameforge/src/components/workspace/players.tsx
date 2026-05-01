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
import {
  Plus, Trash2, Sparkles, Loader2, X, ChevronDown, ChevronRight,
  Shield, MessageCircle, Zap, Star, Leaf, Heart,
  Search, GripVertical, Users, UserPlus, List, GitGraph,
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

function getMeta(type: string) {
  return TYPE_META[type as PlayerType] ?? TYPE_META.Character;
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
  faction: string;
  motivation: string;
  flaw: string;
  arc: string;
  description: string;
  riskTolerance: number;
  aggression: number;
  decisionStyle: string;
  relationships: Relationship[];
}

function emptySheet(type?: PlayerType): SheetState {
  return {
    name: "", playerType: type ?? "Character", role: "", faction: "",
    motivation: "", flaw: "", arc: "", description: "",
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
    faction: p.faction ?? "",
    motivation: p.motivation ?? "",
    flaw: p.flaw ?? "",
    arc: p.arc ?? "",
    description: p.description ?? "",
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
    faction: s.faction || undefined,
    motivation: s.motivation || undefined,
    flaw: s.flaw || undefined,
    arc: s.arc || undefined,
    description: s.description || undefined,
    behaviorProfile: { riskTolerance: s.riskTolerance, aggression: s.aggression, decisionStyle: s.decisionStyle },
    relationships: s.relationships,
  };
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
  const [search, setSearch] = useState("");
  const [factionFilter, setFactionFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<PlayerType | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<PlayerType>>(new Set());
  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [narrativeEnhancedIds, setNarrativeEnhancedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [addingType, setAddingType] = useState<PlayerType | null>(null);
  const [newName, setNewName] = useState("");

  // ── Sheet local state
  const [sheet, setSheet] = useState<SheetState>(emptySheet());
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null);

  // ── Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  // dropTargetId + insertBefore: where the insertion line should appear
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [insertBefore, setInsertBefore] = useState<boolean>(true);

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
      setSheet(playerToSheet(selectedPlayer));
      setSheetPlayerId(selectedPlayer.id);
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

  const handleCreate = async (type: PlayerType, name: string) => {
    if (!name.trim()) return;
    const existingCount = (grouped.get(type) ?? []).length;
    try {
      const row = await createPlayer.mutateAsync({
        projectId,
        data: { name: name.trim(), playerType: type, displayOrder: existingCount },
      });
      refresh();
      setSelectedId(row.id);
      setAddingType(null);
      setNewName("");
    } catch (err) {
      toast({ title: "Create failed", description: String(err), variant: "destructive" });
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
          : "AI has enriched the character.",
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
  const handleDragStart = (id: number) => { setDraggedId(id); document.body.style.cursor = "grabbing"; };
  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    setDragOverId(id);
    setDropTargetId(id);
    // Determine whether to insert before or after based on cursor position in the row
    const rect = e.currentTarget.getBoundingClientRect();
    setInsertBefore(e.clientY < rect.top + rect.height / 2);
  };
  const clearDragState = () => { setDraggedId(null); setDragOverId(null); setDropTargetId(null); setInsertBefore(true); };
  const handleDrop = (targetId: number, type: PlayerType) => {
    document.body.style.cursor = "";
    if (!draggedId || draggedId === targetId) { clearDragState(); return; }
    // Use unfiltered group so filtering doesn't break displayOrder assignments (#35)
    const group = unfilteredGrouped.get(type) ?? [];
    const fromIdx = group.findIndex((p) => p.id === draggedId);
    let toIdx = group.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { clearDragState(); return; }
    // Adjust insertion index based on whether we're inserting before or after the target
    if (!insertBefore && toIdx < group.length - 1) toIdx += 1;
    const reordered = [...group];
    const [moved] = reordered.splice(fromIdx, 1);
    // Recalculate toIdx after removing the dragged item
    const adjustedTo = Math.min(insertBefore ? toIdx : toIdx - 1, reordered.length);
    reordered.splice(Math.max(0, adjustedTo), 0, moved);
    clearDragState();

    // Optimistic update — immediately reflect the new order in the cache
    const queryKey = getListPlayersQueryKey(projectId);
    const previous = qc.getQueryData<Player[]>(queryKey);
    if (previous) {
      const idSet = new Set(reordered.map((p) => p.id));
      const updated = previous
        .filter((p) => !idSet.has(p.id))
        .concat(reordered.map((p, idx) => ({ ...p, displayOrder: idx })));
      qc.setQueryData(queryKey, updated);
    }

    // Single round-trip to the dedicated reorder endpoint
    reorderPlayers.mutate(
      { projectId, data: { playerIds: reordered.map((p) => p.id) } },
      {
        onSuccess: (rows) => {
          qc.setQueryData(getListPlayersQueryKey(projectId), rows);
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
                <p className="text-xs text-muted-foreground">No characters yet</p>
              </div>
            ) : totalFiltered === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-4">No matches</p>
            ) : (
              PLAYER_TYPES.map((type) => {
                const group = grouped.get(type) ?? [];
                if (group.length === 0 && !addingType) return null;
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
                      <button
                        onClick={(e) => { e.stopPropagation(); setAddingType(type); setNewName(""); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground ml-1"
                        aria-label={`Add ${type}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Inline quick-add */}
                    {!collapsed && addingType === type && (
                      <div className="px-3 pb-2 flex gap-1">
                        <Input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreate(type, newName);
                            if (e.key === "Escape") { setAddingType(null); setNewName(""); }
                          }}
                          placeholder={`New ${type}…`}
                          className="h-7 text-xs flex-1"
                        />
                        <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCreate(type, newName)} disabled={!newName.trim()}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setAddingType(null); setNewName(""); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Roster rows */}
                    {!collapsed && group.map((p) => {
                      const isSelected = p.id === selectedId;
                      const isActive = dropTargetId === p.id && draggedId !== null && draggedId !== p.id;
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
                            onDragStart={() => handleDragStart(p.id)}
                            onDragOver={(e) => handleDragOver(e, p.id)}
                            onDrop={() => handleDrop(p.id, type)}
                            onDragEnd={() => { document.body.style.cursor = ""; clearDragState(); }}
                            onClick={() => setSelectedId(isSelected ? null : p.id)}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-l-2 ${isSelected ? "bg-primary/10 border-l-primary" : "border-l-transparent hover:bg-muted/20"} ${draggedId === p.id ? "opacity-40 cursor-grabbing" : ""}`}
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                            <m.Icon className={`h-3.5 w-3.5 shrink-0 ${m.color}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                <span className={m.color}>{p.playerType}</span>
                                {p.role ? ` · ${p.role}` : ""}
                                {p.faction ? ` · ${p.faction}` : ""}
                              </p>
                            </div>
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
            onClick={() => { setAddingType("Character"); setNewName(""); setViewMode("list"); }}
            data-testid="add-player-button"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Character
          </Button>
        </div>
      </div>

      {/* ── RIGHT PANE ── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {noPlayers ? (
          <EmptyCastState onCreate={handleCreate} />
        ) : !selectedPlayer ? (
          <NoSelectionState players={players ?? []} onSelect={setSelectedId} />
        ) : (
          <CharacterSheet
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
  );
}

// ─── Empty "Cast your game" state ──────────────────────────────────────────────

function EmptyCastState({ onCreate }: { onCreate: (type: PlayerType, name: string) => Promise<void> }) {
  const [creating, setCreating] = useState<PlayerType | null>(null);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold">Cast your game</h3>
        <p className="text-sm text-muted-foreground mt-1">Every great game has memorable characters. Start with a hero, villain, or supporting NPC.</p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        {(["Character", "Enemy", "NPC"] as PlayerType[]).map((type) => {
          const m = getMeta(type);
          const isCreating = creating === type;
          return (
            <button
              key={type}
              disabled={creating !== null}
              onClick={async () => {
                setCreating(type);
                await onCreate(type, m.quickRole);
                setCreating(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border border-border ${m.bg} hover:border-primary/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isCreating
                ? <Loader2 className={`h-5 w-5 ${m.color} animate-spin`} />
                : <m.Icon className={`h-5 w-5 ${m.color}`} />}
              <div className="text-left">
                <p className="text-sm font-medium">+ {m.quickRole}</p>
                <p className="text-[10px] text-muted-foreground">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Or use the list on the left to add any character type.</p>
    </div>
  );
}

// ─── No selection state ────────────────────────────────────────────────────────

function NoSelectionState({ players, onSelect }: { players: Player[]; onSelect: (id: number) => void }) {
  const recent = [...players].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">Select a character to view their profile</p>
      </div>
      {recent.length > 0 && (
        <div className="space-y-1 w-full max-w-xs">
          <p className="text-xs text-muted-foreground text-center mb-2">Recent</p>
          {recent.map((p) => {
            const m = getMeta(p.playerType ?? "Character");
            return (
              <button key={p.id} onClick={() => onSelect(p.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/20 transition-colors text-left">
                <m.Icon className={`h-4 w-4 shrink-0 ${m.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.playerType}{p.faction ? ` · ${p.faction}` : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Character Sheet ───────────────────────────────────────────────────────────

interface SheetProps {
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

function CharacterSheet({
  player, sheet, setSheet,
  allPlayers,
  addingRelType, setAddingRelType, addingRelTarget, setAddingRelTarget,
  onAddRelationship, onRemoveRelationship,
  onEnhance, enhancing, isNarrativeEnhanced,
  onDelete, deleteConfirm, onDeleteConfirm, onDeleteCancel,
}: SheetProps) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-start gap-3">
        {/* Avatar placeholder with initials */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className={`w-14 h-14 rounded-xl ${m.bg} border border-border flex items-center justify-center relative group cursor-default select-none`}
               title="Character avatar">
            <span className={`text-lg font-bold ${m.color}`}>{initials}</span>
            <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" aria-label="Generate avatar via AI Enhance" />
            </div>
          </div>
          <span className="text-[9px] text-muted-foreground">avatar</span>
        </div>
        <div className="flex-1 min-w-0">
          <Input
            value={sheet.name}
            onChange={(e) => set("name", e.target.value)}
            className="text-lg font-bold bg-transparent border-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Character name…"
          />
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${m.badge}`}>{sheet.playerType}</Badge>
            {sheet.role && <span className="text-xs text-muted-foreground">{sheet.role}</span>}
            {sheet.faction && <span className="text-xs text-muted-foreground">· {sheet.faction}</span>}
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
        </div>
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

      {/* ── SECTION: Identity ── */}
      <Section title="Identity">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={sheet.playerType} onValueChange={(v) => set("playerType", v as PlayerType)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
          </Field>
          <Field label="Role / Title">
            <Input value={sheet.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Tank, Quest Giver…" className="h-8 text-sm" />
          </Field>
          <Field label="Faction" className="col-span-2">
            <Input value={sheet.faction} onChange={(e) => set("faction", e.target.value)} placeholder="e.g. The Iron Guild, Unaffiliated…" className="h-8 text-sm" />
          </Field>
        </div>
      </Section>

      {/* ── SECTION: Motivation & Arc ── */}
      <Section title="Motivation & Arc">
        <div className="space-y-3">
          <Field label="What they want (goal)">
            <Textarea
              value={sheet.motivation}
              onChange={(e) => set("motivation", e.target.value)}
              placeholder="What drives this character above all else?"
              className="text-sm min-h-[60px] resize-none"
            />
          </Field>
          <Field label="What they fear (flaw / obstacle)">
            <Textarea
              value={sheet.flaw}
              onChange={(e) => set("flaw", e.target.value)}
              placeholder="Their weakness, fear, or greatest obstacle…"
              className="text-sm min-h-[60px] resize-none"
            />
          </Field>
          <Field label="How they change (story arc)">
            <Textarea
              value={sheet.arc}
              onChange={(e) => set("arc", e.target.value)}
              placeholder="Their journey or transformation — or 'N/A' for non-narrative types."
              className="text-sm min-h-[60px] resize-none"
            />
          </Field>
        </div>
      </Section>

      {/* ── SECTION: Behavioral Profile ── */}
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

      {/* ── SECTION: Relationships ── */}
      <Section title="Faction & Relationships">
        <div className="space-y-3">
          {sheet.relationships.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sheet.relationships.map((rel) => {
                const target = relPlayerMap.get(rel.targetPlayerId);
                const tm = target ? getMeta(target.playerType ?? "Character") : null;
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
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Select character…" /></SelectTrigger>
                <SelectContent>
                  {allPlayers
                    .filter((p) => !sheet.relationships.some((r) => r.targetPlayerId === p.id))
                    .map((p) => {
                      const pm = getMeta(p.playerType ?? "Character");
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
            <p className="text-xs text-muted-foreground italic">Add more characters to create relationships.</p>
          )}
        </div>
      </Section>

      {/* ── SECTION: Design Notes ── */}
      <Section title="Design Notes">
        <Textarea
          value={sheet.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Designer scratchpad — mechanics, open questions, balance notes…"
          className="text-sm min-h-[100px] resize-none"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Auto-saves as you type. Use AI Enhance to populate Motivation & Arc with richer context.</p>
      </Section>

      <div className="h-8" />
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
