import { useState, useMemo } from "react";
import {
  useListPlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer,
  useAiEnhancePlayer, getListPlayersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Users, Sparkles, Loader2, X, ChevronDown, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type Player } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

// ─── Player type system ───────────────────────────────────────────────────────

const PLAYER_TYPES = ["Character", "NPC", "Enemy", "Boss", "Creature", "Ally"] as const;
type PlayerType = typeof PLAYER_TYPES[number];

const PLAYER_TYPE_META: Record<PlayerType, { icon: string; label: string; color: string; badge: string; desc: string }> = {
  Character: { icon: "👤", label: "Player Characters", color: "text-blue-400",   badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",   desc: "Playable heroes, protagonists, roles" },
  NPC:       { icon: "🧑", label: "NPCs",              color: "text-green-400",  badge: "bg-green-500/20 text-green-400 border-green-500/30",  desc: "Allies, merchants, quest givers" },
  Enemy:     { icon: "👹", label: "Enemies",            color: "text-red-400",    badge: "bg-red-500/20 text-red-400 border-red-500/30",        desc: "Opponents, monsters, minions" },
  Boss:      { icon: "💀", label: "Bosses",             color: "text-orange-400", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30", desc: "Elite enemies, final bosses" },
  Creature:  { icon: "🐉", label: "Creatures",          color: "text-purple-400", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", desc: "Animals, beasts, summons" },
  Ally:      { icon: "🤝", label: "Allies",             color: "text-cyan-400",   badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",    desc: "Companions, helpers, followers" },
};

function getTypeMeta(type: string) {
  return PLAYER_TYPE_META[type as PlayerType] ?? PLAYER_TYPE_META.Character;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PlayersProps {
  projectId: number;
}

export function Players({ projectId }: PlayersProps) {
  const queryClient = useQueryClient();
  const { data: players, isLoading } = useListPlayers(projectId);
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const enhancePlayer = useAiEnhancePlayer();
  const { toast } = useToast();

  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editPlayerId, setEditPlayerId] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<PlayerType>>(new Set());
  const [filterType, setFilterType] = useState<PlayerType | "all">("all");

  const [formData, setFormData] = useState({
    name: "", playerType: "Character" as PlayerType, role: "", description: "", strategy: "",
  });

  const isFormOpen = showAdd || editPlayerId !== null;
  const isEditing = editPlayerId !== null;

  const closeForm = () => {
    setShowAdd(false);
    setEditPlayerId(null);
    setFormData({ name: "", playerType: "Character", role: "", description: "", strategy: "" });
  };

  const handleCreate = async () => {
    if (!formData.name) return;
    try {
      await createPlayer.mutateAsync({ projectId, data: formData });
      closeForm();
      queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
    } catch (err) {
      toast({ title: "Could not create", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editPlayerId || !formData.name) return;
    try {
      await updatePlayer.mutateAsync({ projectId, playerId: editPlayerId, data: formData });
      closeForm();
      queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
    } catch (err) {
      toast({ title: "Could not update", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    await deletePlayer.mutateAsync({ projectId, playerId: id });
    queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
  };

  const handleEnhance = async (playerId: number) => {
    setEnhancingId(playerId);
    try {
      await enhancePlayer.mutateAsync({ projectId, playerId });
      queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
      toast({ title: "Profile enhanced" });
    } catch (err) {
      toast({ title: "Enhance failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setEnhancingId(null);
    }
  };

  const openAdd = (defaultType?: PlayerType) => {
    setEditPlayerId(null);
    setFormData({ name: "", playerType: defaultType ?? "Character", role: "", description: "", strategy: "" });
    setShowAdd(true);
  };

  const openEdit = (player: Player) => {
    setShowAdd(false);
    setFormData({
      name: player.name,
      playerType: (player.playerType as PlayerType) ?? "Character",
      role: player.role || "",
      description: player.description || "",
      strategy: player.strategy || "",
    });
    setEditPlayerId(player.id);
  };

  const toggleGroup = (type: PlayerType) =>
    setCollapsedGroups((prev) => { const s = new Set(prev); s.has(type) ? s.delete(type) : s.add(type); return s; });

  // Group players by type
  const grouped = useMemo(() => {
    const map = new Map<PlayerType, Player[]>();
    PLAYER_TYPES.forEach((t) => map.set(t, []));
    (players ?? []).forEach((p) => {
      const t = (p.playerType as PlayerType) ?? "Character";
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(p);
    });
    return map;
  }, [players]);

  const typeCounts = useMemo(() => {
    const out: Partial<Record<PlayerType, number>> = {};
    (players ?? []).forEach((p) => {
      const t = (p.playerType as PlayerType) ?? "Character";
      out[t] = (out[t] ?? 0) + 1;
    });
    return out;
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (filterType === "all") return players ?? [];
    return (players ?? []).filter((p) => (p.playerType ?? "Character") === filterType);
  }, [players, filterType]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Characters &amp; Personas
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {players?.length ?? 0} profiles — player characters, NPCs, enemies, bosses, creatures, and allies
          </p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => openAdd()} data-testid="add-player-button">
            <Plus className="h-4 w-4 mr-2" /> Add Profile
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {isFormOpen && (
        <Card className="bg-card border-primary/40" data-testid="player-form-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{isEditing ? "Edit Profile" : "New Profile"}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name + Type */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label>Name / Persona *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. The Warrior, Village Elder, Goblin Scout…" autoFocus />
              </div>
              <div className="w-44 space-y-2 shrink-0">
                <Label>Type</Label>
                <Select value={formData.playerType} onValueChange={(v) => setFormData({ ...formData, playerType: v as PlayerType })}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {PLAYER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder={
                  formData.playerType === "Character" ? "e.g. Tank, Support, Damage" :
                  formData.playerType === "NPC"       ? "e.g. Merchant, Quest Giver, Guide" :
                  formData.playerType === "Enemy"     ? "e.g. Minion, Elite, Ranged" :
                  formData.playerType === "Boss"      ? "e.g. Final Boss, Mini-boss, Arena Champion" :
                  formData.playerType === "Creature"  ? "e.g. Mount, Summon, Wild Animal" :
                  "e.g. Healer, Scout, Tank"
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Who are they and what makes them unique?" />
            </div>
            <div className="space-y-2">
              <Label>
                {formData.playerType === "Character" ? "Typical Strategy" :
                 formData.playerType === "Enemy" || formData.playerType === "Boss" ? "Tactics / Behavior" :
                 "Notes / Behavior"}
              </Label>
              <Textarea value={formData.strategy} onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                placeholder={
                  formData.playerType === "Character" ? "How does a player optimally play this character?" :
                  formData.playerType === "Enemy" || formData.playerType === "Boss" ? "How does this enemy act in combat or encounters?" :
                  "Any notable behavior or design notes."
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button onClick={isEditing ? handleUpdate : handleCreate} disabled={!formData.name || createPlayer.isPending || updatePlayer.isPending}>
                {(createPlayer.isPending || updatePlayer.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter pills */}
      {players && players.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterType("all")}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"}`}
          >
            All ({players.length})
          </button>
          {PLAYER_TYPES.map((t) => {
            const count = typeCounts[t];
            if (!count) return null;
            const m = getTypeMeta(t);
            return (
              <button key={t} onClick={() => setFilterType(filterType === t ? "all" : t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filterType === t ? m.badge : "text-muted-foreground border-border hover:text-white"}`}
              >
                <span>{m.icon}</span> {t} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Player list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : !players || players.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No profiles yet</h3>
          <p className="text-muted-foreground mt-1">Add player characters, NPCs, enemies, bosses, creatures, and allies.</p>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            {PLAYER_TYPES.map((t) => {
              const m = getTypeMeta(t);
              return (
                <Button key={t} variant="outline" size="sm" onClick={() => openAdd(t)}>
                  {m.icon} {t}
                </Button>
              );
            })}
          </div>
        </div>
      ) : filterType !== "all" ? (
        // Single-type filtered grid
        <PlayerGrid
          players={filteredPlayers}
          onEdit={openEdit}
          onDelete={handleDelete}
          onEnhance={handleEnhance}
          enhancingId={enhancingId}
        />
      ) : (
        // Grouped view by type
        <div className="space-y-4">
          {PLAYER_TYPES.map((type) => {
            const group = grouped.get(type) ?? [];
            if (group.length === 0) return null;
            const m = getTypeMeta(type);
            const isCollapsed = collapsedGroups.has(type);
            return (
              <div key={type} className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => toggleGroup(type)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-muted/20 hover:bg-muted/30 transition-colors text-left"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="text-base">{m.icon}</span>
                  <span className={`text-sm font-semibold ${m.color}`}>{m.label}</span>
                  <Badge variant="outline" className={`text-[10px] ml-1 ${m.badge}`}>{group.length}</Badge>
                  <span className="text-xs text-muted-foreground ml-1 hidden sm:block">{m.desc}</span>
                  <Button
                    variant="ghost" size="sm"
                    className="ml-auto h-6 px-2 text-xs text-muted-foreground hover:text-white"
                    onClick={(e) => { e.stopPropagation(); openAdd(type); }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </button>
                {!isCollapsed && (
                  <div className="p-4">
                    <PlayerGrid
                      players={group}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onEnhance={handleEnhance}
                      enhancingId={enhancingId}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Player card grid ─────────────────────────────────────────────────────────

function PlayerGrid({
  players, onEdit, onDelete, onEnhance, enhancingId,
}: {
  players: Player[];
  onEdit: (p: Player) => void;
  onDelete: (id: number) => void;
  onEnhance: (id: number) => void;
  enhancingId: number | null;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {players.map((player) => {
        const m = getTypeMeta((player.playerType as PlayerType) ?? "Character");
        return (
          <Card key={player.id} className="bg-card border-border overflow-hidden relative group">
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 hover:bg-background"
                onClick={() => onEnhance(player.id)} disabled={enhancingId === player.id}
                title="AI Enhance" data-testid={`enhance-player-${player.id}`}
              >
                {enhancingId === player.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 hover:bg-background" onClick={() => onEdit(player)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 hover:bg-background hover:text-destructive" onClick={() => onDelete(player.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-start gap-2 pr-20">
                <span className="text-xl shrink-0 mt-0.5">{m.icon}</span>
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">{player.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${m.badge}`}>{player.playerType ?? "Character"}</Badge>
                    {player.role && (
                      <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded border border-primary/20">{player.role}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pb-4 px-4">
              {player.description && (
                <div className="text-sm text-muted-foreground line-clamp-2">{player.description}</div>
              )}
              {player.strategy && (
                <div className="space-y-1">
                  <div className={`text-xs font-semibold uppercase tracking-wider ${m.color}`}>
                    {(player.playerType === "Enemy" || player.playerType === "Boss") ? "Tactics" : "Strategy"}
                  </div>
                  <div className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-1 bg-primary/5 rounded-r line-clamp-2">
                    {player.strategy}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
