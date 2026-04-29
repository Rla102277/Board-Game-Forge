import { useState, useMemo } from "react";
import {
  useListEntities, useCreateEntity, useUpdateEntity, useDeleteEntity,
  useAiGenerateEntities, useAiEnhanceEntity,
  useListEntityProperties, useCreateEntityProperty, useUpdateEntityProperty, useDeleteEntityProperty,
  getListEntitiesQueryKey, getListEntityPropertiesQueryKey,
  type Entity, type EntityProperty,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Settings,
  Sparkles, Loader2, Check, Wand2, X, Pencil, Copy, Layers,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ─── Component type system ───────────────────────────────────────────────────

const PHYSICAL_TYPES = ["Card", "Deck", "Token", "Die", "Tile", "Meeple", "Board"] as const;
const WORLD_TYPES    = ["Location", "Faction", "Event", "Resource", "Ability"] as const;
const ALL_COMPONENT_TYPES = [...PHYSICAL_TYPES, ...WORLD_TYPES] as const;
type ComponentType = typeof ALL_COMPONENT_TYPES[number];

const COMPONENT_META: Record<ComponentType, { icon: string; color: string; bg: string; badge: string; desc: string }> = {
  // Physical
  Card:     { icon: "🃏", color: "text-violet-400",  bg: "bg-violet-500/5",  badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",  desc: "Action, item, spell, event, treasure cards" },
  Deck:     { icon: "📦", color: "text-indigo-400",  bg: "bg-indigo-500/5",  badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",  desc: "Collection of cards (container)" },
  Token:    { icon: "🪙", color: "text-amber-400",   bg: "bg-amber-500/5",   badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",     desc: "Resource, currency, health, status markers" },
  Die:      { icon: "🎲", color: "text-red-400",     bg: "bg-red-500/5",     badge: "bg-red-500/20 text-red-400 border-red-500/30",           desc: "Custom die type or face set" },
  Tile:     { icon: "🗺️", color: "text-emerald-400", bg: "bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", desc: "Map, dungeon, terrain, hex, room tiles" },
  Meeple:   { icon: "🧩", color: "text-blue-400",    bg: "bg-blue-500/5",    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",        desc: "Pawn, figure, standee, miniature, ship" },
  Board:    { icon: "📋", color: "text-slate-400",   bg: "bg-slate-500/5",   badge: "bg-slate-500/20 text-slate-400 border-slate-500/30",     desc: "Game board, player mat, reference sheet" },
  // World / narrative
  Location: { icon: "📍", color: "text-cyan-400",    bg: "bg-cyan-500/5",    badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",        desc: "City, dungeon, region, landmark, lair" },
  Faction:  { icon: "⚔️", color: "text-purple-400",  bg: "bg-purple-500/5",  badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",  desc: "Guild, tribe, nation, team, house" },
  Event:    { icon: "⚡", color: "text-orange-400",  bg: "bg-orange-500/5",  badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",  desc: "Random event, scenario, story beat, trigger" },
  Resource: { icon: "💎", color: "text-teal-400",    bg: "bg-teal-500/5",    badge: "bg-teal-500/20 text-teal-400 border-teal-500/30",        desc: "Material, food, energy, mana, influence" },
  Ability:  { icon: "✨", color: "text-pink-400",    bg: "bg-pink-500/5",    badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",        desc: "Passive, active, triggered, ultimate, reaction" },
};

const COMPONENT_SUBTYPES: Record<ComponentType, string[]> = {
  Card:     ["Action", "Item", "Spell", "Event", "Quest", "Encounter", "Treasure", "Attack", "Defense"],
  Deck:     ["Item Deck", "Event Deck", "Encounter Deck", "Spell Deck", "Quest Deck", "Custom"],
  Token:    ["Resource", "Currency", "Health", "Status", "Marker", "Victory Point", "Damage"],
  Die:      ["Action Die", "Combat Die", "Event Die", "Skill Die", "Custom"],
  Tile:     ["Map Tile", "Dungeon Tile", "Terrain", "Room", "Hex", "Starting Tile"],
  Meeple:   ["Pawn", "Figure", "Standee", "Miniature", "Marker", "Ship", "Vehicle"],
  Board:    ["Main Board", "Player Board", "Map", "Reference Sheet", "Expansion Board"],
  Location: ["City", "Dungeon", "Region", "Shop", "Quest Site", "Landmark", "Lair"],
  Faction:  ["Guild", "Tribe", "Nation", "Team", "House", "Order", "Corporation"],
  Event:    ["Random Event", "Scenario", "Story Beat", "Encounter", "World Event", "Trigger"],
  Resource: ["Currency", "Material", "Food", "Energy", "Mana", "Influence", "Faith"],
  Ability:  ["Passive", "Active", "Triggered", "Ultimate", "Reaction", "Aura"],
};

function getMeta(type: string) {
  return COMPONENT_META[type as ComponentType] ?? {
    icon: "🔷", color: "text-gray-400", bg: "bg-gray-500/5",
    badge: "bg-gray-500/20 text-gray-400 border-gray-500/30", desc: "",
  };
}

type AIEnhance = {
  description: string;
  lore?: string;
  designNotes?: string;
  suggestedProperties: { name: string; dataType: string; defaultValue?: string; reason: string }[];
};

interface EntitiesProps {
  projectId: number;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Entities({ projectId }: EntitiesProps) {
  const queryClient = useQueryClient();
  const { data: entities, isLoading } = useListEntities(projectId);
  const createEntity = useCreateEntity();
  const deleteEntity = useDeleteEntity();
  const aiGenerate = useAiGenerateEntities();
  const { toast } = useToast();

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [newEntity, setNewEntity] = useState<{
    name: string; type: ComponentType; subtype: string; description: string; parentEntityId?: number;
  }>({ name: "", type: "Card", subtype: "", description: "" });
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    try {
      await aiGenerate.mutateAsync({ projectId, data: { prompt: aiPrompt, count: aiCount } });
      setAiPrompt(""); setShowAIPanel(false); refresh();
      toast({ title: "Components generated" });
    } catch (err) {
      toast({ title: "AI generate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleAddEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.name) return;
    try {
      await createEntity.mutateAsync({
        projectId,
        data: {
          name: newEntity.name,
          type: newEntity.type,
          subtype: newEntity.subtype || undefined,
          description: newEntity.description || undefined,
          parentEntityId: newEntity.parentEntityId || undefined,
        },
      });
      setNewEntity({ name: "", type: "Card", subtype: "", description: "" });
      setShowAddForm(false);
      refresh();
    } catch (err) {
      toast({ title: "Could not create component", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will also delete all of its properties.`)) return;
    try {
      await deleteEntity.mutateAsync({ projectId, entityId: id });
      refresh();
    } catch (err) {
      toast({ title: "Delete failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const toggleExpand = (id: number) =>
    setExpandedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleGroup = (type: string) =>
    setCollapsedGroups((prev) => { const s = new Set(prev); s.has(type) ? s.delete(type) : s.add(type); return s; });

  // Build type counts (top-level only for the filter pills)
  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    (entities ?? []).forEach((e) => { out[e.type] = (out[e.type] || 0) + 1; });
    return out;
  }, [entities]);

  // Split into deck containers and their children, plus non-deck top-level entities
  const { topLevel, childrenByParent, decks } = useMemo(() => {
    const all = entities ?? [];
    const childrenByParent: Record<number, Entity[]> = {};
    const childIds = new Set<number>();

    all.forEach((e) => {
      if (e.parentEntityId) {
        childIds.add(e.id);
        if (!childrenByParent[e.parentEntityId]) childrenByParent[e.parentEntityId] = [];
        childrenByParent[e.parentEntityId].push(e);
      }
    });

    const topLevel = all.filter((e) => !childIds.has(e.id));
    const decks = new Set(all.filter((e) => e.type === "Deck").map((e) => e.id));
    return { topLevel, childrenByParent, decks };
  }, [entities]);

  const filtered = useMemo(() => {
    if (filterType === "all") return topLevel;
    return topLevel.filter((e) => e.type === filterType);
  }, [topLevel, filterType]);

  // Group by type when showing all
  const grouped = useMemo(() => {
    if (filterType !== "all") return null;
    const map = new Map<string, Entity[]>();
    filtered.forEach((e) => {
      if (!map.has(e.type)) map.set(e.type, []);
      map.get(e.type)!.push(e);
    });
    return map;
  }, [filtered, filterType]);

  // Deck options for parent selector
  const deckOptions = useMemo(() =>
    (entities ?? []).filter((e) => e.type === "Deck"),
  [entities]);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Game Components
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entities?.length ?? 0} components · physical pieces, world elements, and collections
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            onClick={() => { setShowAIPanel(!showAIPanel); setShowAddForm(false); }}
            variant="outline" size="sm"
            className="border-primary/30 text-primary hover:bg-primary/10 h-8"
            data-testid="entities-ai-toggle"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" /> AI Generate
          </Button>
          <Button
            onClick={() => { setShowAddForm(!showAddForm); setShowAIPanel(false); }}
            size="sm" className="bg-primary text-primary-foreground h-8"
            data-testid="entities-add-toggle"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Component
          </Button>
        </div>
      </div>

      {/* Type filter — Physical row + World row */}
      {entities && entities.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType("all")}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterType === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"
              }`}
              data-testid="filter-entities-all"
            >
              All ({topLevel.length})
            </button>
            {PHYSICAL_TYPES.map((t) => {
              const count = typeCounts[t];
              if (!count) return null;
              const m = getMeta(t);
              return (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    filterType === t ? m.badge : "text-muted-foreground border-border hover:text-white"
                  }`}
                  data-testid={`filter-entities-${t.toLowerCase()}`}
                >
                  <span>{m.icon}</span> {t} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {WORLD_TYPES.map((t) => {
              const count = typeCounts[t];
              if (!count) return null;
              const m = getMeta(t);
              return (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    filterType === t ? m.badge : "text-muted-foreground border-border hover:text-white"
                  }`}
                  data-testid={`filter-entities-${t.toLowerCase()}`}
                >
                  <span>{m.icon}</span> {t} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AI generate panel */}
      {showAIPanel && (
        <Card className="p-4 bg-card border-primary/30 border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Component Generator</p>
            <button onClick={() => setShowAIPanel(false)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. 5 item cards and a matching deck for a fantasy dungeon crawler…"
              className="bg-input h-14 resize-none text-xs flex-1"
              data-testid="entities-ai-prompt"
            />
            <div className="w-16 shrink-0 space-y-1">
              <Label className="text-xs">Count</Label>
              <Select value={aiCount.toString()} onValueChange={(v) => setAiCount(parseInt(v))}>
                <SelectTrigger className="h-8 bg-input text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{[3, 5, 8].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAiGenerate} disabled={!aiPrompt || aiGenerate.isPending}
            size="sm" className="w-full bg-primary text-primary-foreground" data-testid="entities-ai-generate"
          >
            {aiGenerate.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generating…</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</>}
          </Button>
        </Card>
      )}

      {/* Add component form */}
      {showAddForm && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-primary" /> New Component</p>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <form onSubmit={handleAddEntity} className="space-y-3">
            {/* Name + Type */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={newEntity.name} onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                  className="h-8 bg-input" autoFocus placeholder="e.g. Iron Sword, Event Deck, Dragon Tile…" />
              </div>
              <div className="w-44 space-y-1 shrink-0">
                <Label className="text-xs">Type</Label>
                <Select value={newEntity.type}
                  onValueChange={(v) => setNewEntity({ ...newEntity, type: v as ComponentType, subtype: "", parentEntityId: undefined })}
                >
                  <SelectTrigger className="h-8 bg-input text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] text-muted-foreground">Physical</SelectLabel>
                      {PHYSICAL_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] text-muted-foreground">World</SelectLabel>
                      {WORLD_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subtype */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Subtype</Label>
                <Select value={newEntity.subtype || "__none__"}
                  onValueChange={(v) => setNewEntity({ ...newEntity, subtype: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="h-8 bg-input text-xs"><SelectValue placeholder="Select subtype…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {COMPONENT_SUBTYPES[newEntity.type].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent deck selector — only shown for Cards */}
              {newEntity.type === "Card" && deckOptions.length > 0 && (
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Add to Deck</Label>
                  <Select
                    value={newEntity.parentEntityId ? String(newEntity.parentEntityId) : "__none__"}
                    onValueChange={(v) => setNewEntity({ ...newEntity, parentEntityId: v === "__none__" ? undefined : parseInt(v) })}
                  >
                    <SelectTrigger className="h-8 bg-input text-xs"><SelectValue placeholder="No deck…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No deck —</SelectItem>
                      {deckOptions.map((d) => <SelectItem key={d.id} value={String(d.id)}>📦 {d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={newEntity.description}
                onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })}
                className="h-16 resize-none bg-input"
                placeholder={getMeta(newEntity.type).desc}
              />
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={createEntity.isPending}>
              {createEntity.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Add {newEntity.type}
            </Button>
          </form>
        </Card>
      )}

      {/* Entity list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !entities || entities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No components yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate with AI or add manually — cards, decks, tokens, tiles, meeples, and more.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
          <p className="text-muted-foreground text-sm">No {filterType} components yet.</p>
        </div>
      ) : grouped ? (
        // Grouped view — show collapsible type sections
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([type, items]) => {
            const m = getMeta(type);
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
                  <span className={`text-sm font-semibold ${m.color}`}>{type}s</span>
                  <Badge variant="outline" className={`text-[10px] ml-1 ${m.badge}`}>{items.length}</Badge>
                  <span className="text-xs text-muted-foreground ml-1 hidden sm:block">{m.desc}</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-border/50">
                    {items.map((entity) => (
                      <EntityCard
                        key={entity.id}
                        entity={entity}
                        projectId={projectId}
                        isExpanded={expandedIds.has(entity.id)}
                        onToggle={() => toggleExpand(entity.id)}
                        onDelete={() => handleDelete(entity.id, entity.name)}
                        onUpdated={refresh}
                        childEntities={childrenByParent[entity.id]}
                        isDeck={decks.has(entity.id)}
                        deckOptions={deckOptions}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Filtered single-type view
        <div className="space-y-2">
          {filtered.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              projectId={projectId}
              isExpanded={expandedIds.has(entity.id)}
              onToggle={() => toggleExpand(entity.id)}
              onDelete={() => handleDelete(entity.id, entity.name)}
              onUpdated={refresh}
              childEntities={childrenByParent[entity.id]}
              isDeck={decks.has(entity.id)}
              deckOptions={deckOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Entity Card ──────────────────────────────────────────────────────────────

function EntityCard({
  entity, projectId, isExpanded, onToggle, onDelete, onUpdated,
  childEntities, isDeck, deckOptions,
}: {
  entity: Entity;
  projectId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdated: () => void;
  childEntities?: Entity[];
  isDeck?: boolean;
  deckOptions?: Entity[];
}) {
  const queryClient = useQueryClient();
  const updateEntity = useUpdateEntity();
  const createEntity = useCreateEntity();
  const enhanceEntity = useAiEnhanceEntity();
  const { toast } = useToast();

  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhance, setEnhance] = useState<AIEnhance | null>(null);
  const [selectedProps, setSelectedProps] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: entity.name,
    type: entity.type,
    subtype: entity.subtype ?? "",
    description: entity.description ?? "",
    parentEntityId: entity.parentEntityId ?? undefined as number | undefined,
  });

  const createProperty = useCreateEntityProperty();
  const meta = getMeta(entity.type);
  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const handleSaveEdit = async () => {
    try {
      await updateEntity.mutateAsync({
        projectId, entityId: entity.id,
        data: {
          name: editForm.name,
          type: editForm.type,
          subtype: editForm.subtype || undefined,
          description: editForm.description,
          parentEntityId: editForm.parentEntityId ?? null,
        },
      });
      setIsEditing(false);
      onUpdated();
      toast({ title: "Component updated" });
    } catch (err) {
      toast({ title: "Update failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    try {
      await createEntity.mutateAsync({
        projectId,
        data: { name: `${entity.name} (Copy)`, type: entity.type, description: entity.description ?? "" },
      });
      onUpdated();
      toast({ title: "Component duplicated" });
    } catch (err) {
      toast({ title: "Duplicate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true); setEnhance(null); setShowEnhance(true);
    try {
      const raw = await enhanceEntity.mutateAsync({ projectId, entityId: entity.id });
      const safeProps = Array.isArray(raw?.suggestedProperties)
        ? raw.suggestedProperties.filter((p): p is AIEnhance["suggestedProperties"][number] =>
            !!p && typeof p === "object" && typeof p.name === "string")
        : [];
      const data: AIEnhance = {
        description: typeof raw?.description === "string" ? raw.description : "",
        lore: typeof raw?.lore === "string" ? raw.lore : undefined,
        designNotes: typeof raw?.designNotes === "string" ? raw.designNotes : undefined,
        suggestedProperties: safeProps,
      };
      if (!data.description && data.suggestedProperties.length === 0) {
        toast({ title: "AI returned no usable suggestions", variant: "destructive" });
        setShowEnhance(false);
      } else {
        setEnhance(data);
        setSelectedProps(new Set(data.suggestedProperties.map((_, i) => i)));
      }
    } catch (err) {
      toast({ title: "AI enhance failed", description: errMsg(err), variant: "destructive" });
      setShowEnhance(false);
    } finally {
      setIsEnhancing(false);
    }
  };

  const buildPropertyPayload = (p: { name: string; dataType: string; defaultValue?: string }) => {
    const payload: { name: string; dataType: string; defaultValue?: number; textValue?: string } =
      { name: p.name, dataType: p.dataType };
    if (p.defaultValue != null && p.defaultValue !== "") {
      const numeric = Number(p.defaultValue);
      if (Number.isFinite(numeric) && p.defaultValue.trim() !== "") payload.defaultValue = numeric;
      else payload.textValue = p.defaultValue;
    }
    return payload;
  };

  const handleApply = async () => {
    if (!enhance) return;
    setApplying(true);
    try {
      await updateEntity.mutateAsync({
        projectId, entityId: entity.id,
        data: {
          description: enhance.description,
          ...(enhance.lore ? { lore: enhance.lore } : {}),
          ...(enhance.designNotes ? { designNotes: enhance.designNotes } : {}),
        },
      });
      const propsToAdd = enhance.suggestedProperties.filter((_, i) => selectedProps.has(i));
      for (const prop of propsToAdd) {
        await createProperty.mutateAsync({ projectId, entityId: entity.id, data: buildPropertyPayload(prop) });
      }
      queryClient.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entity.id) });
      onUpdated();
      setApplied(true);
      toast({ title: "Applied!", description: `Description updated${propsToAdd.length ? ` + ${propsToAdd.length} propert${propsToAdd.length === 1 ? "y" : "ies"} added.` : "."}` });
      setTimeout(() => { setShowEnhance(false); setApplied(false); setEnhance(null); }, 1500);
    } catch (err) {
      toast({ title: "Apply failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden transition-shadow hover:shadow-md hover:shadow-black/20 rounded-none border-0 border-b last:border-b-0">
      {/* Header or inline edit */}
      {isEditing ? (
        <div className="px-4 py-3 space-y-3 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-input h-8 text-sm font-semibold flex-1 min-w-[140px]" autoFocus />
            <Select value={editForm.type}
              onValueChange={(v) => setEditForm((f) => ({ ...f, type: v, subtype: "" }))}
            >
              <SelectTrigger className="bg-input h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-[10px]">Physical</SelectLabel>
                  {PHYSICAL_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-[10px]">World</SelectLabel>
                  {WORLD_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={editForm.subtype || "__none__"}
              onValueChange={(v) => setEditForm((f) => ({ ...f, subtype: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger className="bg-input h-8 text-xs w-36"><SelectValue placeholder="Subtype…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {COMPONENT_SUBTYPES[editForm.type as ComponentType]?.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editForm.type === "Card" && deckOptions && deckOptions.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Deck</Label>
              <Select
                value={editForm.parentEntityId ? String(editForm.parentEntityId) : "__none__"}
                onValueChange={(v) => setEditForm((f) => ({ ...f, parentEntityId: v === "__none__" ? undefined : parseInt(v) }))}
              >
                <SelectTrigger className="h-8 bg-input text-xs w-56"><SelectValue placeholder="No deck…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No deck —</SelectItem>
                  {deckOptions.map((d) => <SelectItem key={d.id} value={String(d.id)}>📦 {d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Textarea value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description…" className="bg-input text-sm resize-none h-16" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs bg-primary text-primary-foreground gap-1" disabled={updateEntity.isPending}>
              {updateEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save
            </Button>
            <Button size="sm" variant="ghost"
              onClick={() => { setEditForm({ name: entity.name, type: entity.type, subtype: entity.subtype ?? "", description: entity.description ?? "", parentEntityId: entity.parentEntityId ?? undefined }); setIsEditing(false); }}
              className="h-7 text-xs text-muted-foreground hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/10 transition-colors"
          onClick={onToggle} data-testid={`entity-row-${entity.id}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isExpanded
              ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className="text-sm shrink-0">{meta.icon}</span>
            <span className={`text-base font-semibold truncate ${meta.color}`}>{entity.name}</span>
            {entity.subtype && (
              <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.badge}`}>{entity.subtype}</Badge>
            )}
            {/* Deck child count badge */}
            {isDeck && childEntities && childEntities.length > 0 && (
              <Badge variant="outline" className="text-[10px] shrink-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                {childEntities.length} card{childEntities.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {entity.description && (
              <span className="text-xs text-muted-foreground truncate hidden md:block">{entity.description}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm"
              className={`text-xs h-7 px-2 gap-1 ${showEnhance ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
              onClick={() => { setShowEnhance(!showEnhance); if (!showEnhance && !enhance) handleEnhance(); }}
              data-testid={`enhance-entity-${entity.id}`}
            >
              <Wand2 className="w-3.5 h-3.5" /> AI
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-muted/20"
              onClick={() => { setEditForm({ name: entity.name, type: entity.type, subtype: entity.subtype ?? "", description: entity.description ?? "", parentEntityId: entity.parentEntityId ?? undefined }); setIsEditing(true); }}
              data-testid={`edit-entity-${entity.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-muted/20"
              onClick={handleDuplicate} data-testid={`duplicate-entity-${entity.id}`}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete} data-testid={`delete-entity-${entity.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* AI Enhance Panel */}
      {showEnhance && (
        <div className={`border-t border-border ${meta.bg} px-5 py-4`}>
          {isEnhancing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Analyzing and generating improvements…
            </div>
          )}
          {enhance && !isEnhancing && (
            <div className="space-y-4" data-testid={`enhance-panel-${entity.id}`}>
              <div className="space-y-1.5">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${meta.color}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Enhanced Description
                </div>
                <p className="text-sm text-white leading-relaxed bg-background/50 border border-border rounded-md p-3">{enhance.description}</p>
              </div>
              {(enhance.lore || enhance.designNotes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {enhance.lore && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flavor / Lore</p>
                      <p className="text-xs text-muted-foreground italic leading-relaxed bg-background/40 border border-border/50 rounded p-2.5">"{enhance.lore}"</p>
                    </div>
                  )}
                  {enhance.designNotes && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Designer's Notes</p>
                      <p className="text-xs text-muted-foreground leading-relaxed bg-background/40 border border-border/50 rounded p-2.5">{enhance.designNotes}</p>
                    </div>
                  )}
                </div>
              )}
              {enhance.suggestedProperties.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
                      Suggested Properties ({enhance.suggestedProperties.length})
                    </p>
                    <div className="flex gap-2 text-xs">
                      <button className="text-primary hover:underline" onClick={() => setSelectedProps(new Set(enhance.suggestedProperties.map((_, i) => i)))}>All</button>
                      <button className="text-muted-foreground hover:underline" onClick={() => setSelectedProps(new Set())}>None</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {enhance.suggestedProperties.map((prop, i) => {
                      const isSel = selectedProps.has(i);
                      return (
                        <div key={i}
                          className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${isSel ? "border-primary/40 bg-primary/5" : "border-border bg-muted/10"}`}
                          onClick={() => setSelectedProps((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSel ? "border-primary bg-primary" : "border-border"}`}>
                            {isSel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <code className="text-white text-xs font-mono">{prop.name}</code>
                              <Badge variant="outline" className="text-[10px] font-mono bg-secondary/30">{prop.dataType}</Badge>
                              {prop.defaultValue != null && prop.defaultValue !== "" && (
                                <span className="text-xs text-muted-foreground font-mono">= {prop.defaultValue}</span>
                              )}
                            </div>
                            {prop.reason && <p className="text-xs text-muted-foreground mt-0.5">{prop.reason}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button onClick={handleApply} disabled={applying || applied} size="sm" className="bg-primary text-primary-foreground" data-testid={`apply-enhance-${entity.id}`}>
                  {applied ? <><Check className="w-3.5 h-3.5 mr-1.5" />Applied!</>
                    : applying ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Applying…</>
                    : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Apply{selectedProps.size > 0 ? ` + ${selectedProps.size} Props` : ""}</>}
                </Button>
                <Button onClick={handleEnhance} disabled={isEnhancing} size="sm" variant="outline" className="text-muted-foreground border-border hover:text-white">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />Regenerate
                </Button>
                <Button onClick={() => setShowEnhance(false)} size="sm" variant="ghost" className="text-muted-foreground hover:text-white ml-auto">Dismiss</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded panel — lore / notes / deck children / properties */}
      {isExpanded && (
        <div className="px-5 py-4 border-t border-border bg-muted/5 space-y-4">
          {(entity.lore || entity.designNotes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid={`entity-meta-${entity.id}`}>
              {entity.lore && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Flavor / Lore</p>
                  <p className="text-xs text-muted-foreground italic leading-relaxed bg-background/40 border border-border/50 rounded p-2.5 whitespace-pre-wrap" data-testid={`entity-lore-${entity.id}`}>"{entity.lore}"</p>
                </div>
              )}
              {entity.designNotes && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Designer's Notes</p>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background/40 border border-border/50 rounded p-2.5 whitespace-pre-wrap" data-testid={`entity-design-notes-${entity.id}`}>{entity.designNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Deck children list */}
          {isDeck && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span>🃏</span> Cards in this deck ({childEntities?.length ?? 0})
              </p>
              {!childEntities || childEntities.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">No cards yet. Create a Card and assign it to this deck.</p>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border/50">
                  {childEntities.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="text-base">{getMeta(child.type).icon}</span>
                      <span className="font-medium text-white truncate">{child.name}</span>
                      {child.subtype && (
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${getMeta(child.type).badge}`}>{child.subtype}</Badge>
                      )}
                      {child.description && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:block">{child.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <EntityProperties projectId={projectId} entityId={entity.id} />
        </div>
      )}
    </Card>
  );
}

// ─── Entity Properties ────────────────────────────────────────────────────────

const PROP_TYPES = ["number", "string", "boolean", "enum"] as const;

function EntityProperties({ projectId, entityId }: { projectId: number; entityId: number }) {
  const queryClient = useQueryClient();
  const { data: properties, isLoading } = useListEntityProperties(projectId, entityId);
  const createProperty = useCreateEntityProperty();
  const updateProperty = useUpdateEntityProperty();
  const deleteProperty = useDeleteEntityProperty();
  const { toast } = useToast();

  const [newProp, setNewProp] = useState({ name: "", dataType: "number", defaultValue: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editProp, setEditProp] = useState({ name: "", dataType: "number", defaultValue: "" });

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entityId) });

  const valueToPayload = (val: string): { defaultValue?: number; textValue?: string } => {
    if (val === "") return { textValue: "" };
    const num = Number(val);
    if (Number.isFinite(num) && val.trim() !== "") return { defaultValue: num, textValue: "" };
    return { textValue: val, defaultValue: undefined };
  };

  const displayValue = (p: EntityProperty): string => {
    if (p.defaultValue != null) return String(p.defaultValue);
    if (p.textValue) return p.textValue;
    if (p.value != null) return String(p.value);
    return "—";
  };

  const handleAddProp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.name) return;
    try {
      await createProperty.mutateAsync({ projectId, entityId, data: { name: newProp.name, dataType: newProp.dataType, ...valueToPayload(newProp.defaultValue) } });
      setNewProp({ name: "", dataType: "number", defaultValue: "" });
      refresh();
    } catch (err) {
      toast({ title: "Could not add property", description: errMsg(err), variant: "destructive" });
    }
  };

  const startEdit = (prop: EntityProperty) => {
    setEditingId(prop.id);
    setEditProp({ name: prop.name, dataType: prop.dataType, defaultValue: displayValue(prop) === "—" ? "" : displayValue(prop) });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateProperty.mutateAsync({ projectId, entityId, propertyId: editingId, data: { name: editProp.name, dataType: editProp.dataType, ...valueToPayload(editProp.defaultValue) } });
      setEditingId(null); refresh();
    } catch (err) {
      toast({ title: "Could not update property", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProperty.mutateAsync({ projectId, entityId, propertyId: id }); refresh();
    } catch (err) {
      toast({ title: "Could not delete property", description: errMsg(err), variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-1">Loading properties…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Settings className="w-3.5 h-3.5" /> Properties
        {properties && properties.length > 0 && (
          <span className="text-muted-foreground/50 font-normal normal-case tracking-normal ml-1">— click row to edit</span>
        )}
      </div>
      {properties && properties.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20 border-b border-border">
            <div className="col-span-4">Name</div><div className="col-span-3">Type</div><div className="col-span-3">Default</div><div className="col-span-2" />
          </div>
          {properties.map((prop) => (
            <div key={prop.id} className="border-b border-border/40 last:border-0">
              {editingId === prop.id ? (
                <div className="grid grid-cols-12 gap-2 px-3 py-2 items-center bg-primary/5 border-l-2 border-primary">
                  <div className="col-span-4"><Input value={editProp.name} onChange={(e) => setEditProp((p) => ({ ...p, name: e.target.value }))} className="h-7 text-xs bg-input font-mono" autoFocus /></div>
                  <div className="col-span-3">
                    <Select value={editProp.dataType} onValueChange={(v) => setEditProp((p) => ({ ...p, dataType: v }))}>
                      <SelectTrigger className="h-7 text-xs bg-input"><SelectValue /></SelectTrigger>
                      <SelectContent>{PROP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3"><Input value={editProp.defaultValue} onChange={(e) => setEditProp((p) => ({ ...p, defaultValue: e.target.value }))} className="h-7 text-xs bg-input font-mono" placeholder="default" /></div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button onClick={saveEdit} disabled={updateProperty.isPending} className="text-primary hover:text-primary/80 transition-colors p-1 disabled:opacity-50">
                      {updateProperty.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-white transition-colors p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-3 px-3 py-2 items-center text-sm hover:bg-muted/10 cursor-pointer group" onClick={() => startEdit(prop)} data-testid={`prop-row-${prop.id}`}>
                  <div className="col-span-4 font-mono text-xs text-white truncate">{prop.name}</div>
                  <div className="col-span-3"><Badge variant="secondary" className="bg-secondary/40 font-mono text-[10px]">{prop.dataType}</Badge></div>
                  <div className="col-span-3 text-muted-foreground font-mono text-xs truncate">{displayValue(prop)}</div>
                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(prop); }} className="text-muted-foreground hover:text-white transition-colors p-0.5"><Pencil className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-0.5"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {(!properties || properties.length === 0) && (
        <p className="text-xs text-muted-foreground/60 py-1">No properties yet. Add one below or use AI to get suggestions.</p>
      )}
      <form onSubmit={handleAddProp} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Property Name</Label>
          <Input className="h-8 text-xs bg-input font-mono" placeholder="property_name" value={newProp.name} onChange={(e) => setNewProp({ ...newProp, name: e.target.value })} data-testid={`prop-input-name-${entityId}`} />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</Label>
          <Select value={newProp.dataType} onValueChange={(v) => setNewProp({ ...newProp, dataType: v })}>
            <SelectTrigger className="h-8 text-xs bg-input"><SelectValue /></SelectTrigger>
            <SelectContent>{PROP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Default</Label>
          <Input className="h-8 text-xs bg-input font-mono" placeholder="0" value={newProp.defaultValue} onChange={(e) => setNewProp({ ...newProp, defaultValue: e.target.value })} />
        </div>
        <Button size="sm" className="h-8 shrink-0" type="submit" disabled={createProperty.isPending || !newProp.name}>
          {createProperty.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}Add
        </Button>
      </form>
    </div>
  );
}
