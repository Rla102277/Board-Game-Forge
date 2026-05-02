import { useState, useMemo, useRef, useEffect } from "react";
import {
  useListEntities, useCreateEntity, useUpdateEntity, useDeleteEntity,
  useAiGenerateEntities, useAiEnhanceEntity,
  useListEntityProperties, useCreateEntityProperty, useUpdateEntityProperty, useDeleteEntityProperty,
  getListEntitiesQueryKey, getListEntityPropertiesQueryKey,
  type Entity, type EntityProperty,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Loader2, Check,
  Wand2, X, Pencil, Copy, Layers, LayoutGrid, List, Search,
  Tag, Link2, Zap, Palette,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  PHYSICAL_TYPES, WORLD_TYPES, COMPONENT_SUBTYPES, getMeta, getStatusMeta, STATUS_OPTIONS,
  type ComponentType,
} from "@/lib/game-component-types";

// ─── Color picker presets (#53) ─────────────────────────────────────────────

const CARD_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#64748b",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseStats(raw: string | null | undefined): { key: string; val: string }[] {
  if (!raw) return [];
  return raw
    .split(/[/\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^([^:=0-9]+?)\s*[:=]?\s*(\S+)\s*$/);
      if (m) return { key: m[1].trim(), val: m[2] };
      const n = s.match(/^([\D]+?)\s*(\d[\d.]*)\s*$/);
      if (n) return { key: n[1].trim(), val: n[2] };
      return { key: s, val: "" };
    });
}

function serializeStats(pairs: { key: string; val: string }[]): string {
  return pairs
    .filter((p) => p.key.trim())
    .map((p) => (p.val ? `${p.key} ${p.val}` : p.key))
    .join(" / ");
}

function parseRelatedTo(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
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

// ─── Main component ────────────────────────────────────────────────────────────

export function Entities({ projectId }: EntitiesProps) {
  const queryClient = useQueryClient();
  const { data: entities, isLoading } = useListEntities(projectId);
  const createEntity = useCreateEntity();
  const aiGenerate = useAiGenerateEntities();
  const { toast } = useToast();

  // Quick-add bar
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState<ComponentType>("Card");
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Full add form / AI panel
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [newEntity, setNewEntity] = useState<{
    name: string; type: ComponentType; subtype: string; description: string;
    stats: string; relatedTo: string; parentEntityId?: number;
  }>({ name: "", type: "Card", subtype: "", description: "", stats: "", relatedTo: "" });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);

  // View / filter — persisted (#45)
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    () => (localStorage.getItem("gameforge:entities:viewMode") as "grid" | "list" | null) ?? "grid"
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSubtype, setFilterSubtype] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showHierarchy, setShowHierarchy] = useState(false);

  // Drag-to-reorder state (local session order, no server persistence)
  const [draggedEntityId, setDraggedEntityId] = useState<number | null>(null);
  const [localEntityOrder, setLocalEntityOrder] = useState<number[]>([]);
  const dragOverEntityIdRef = useRef<number | null>(null);

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });

  // Persist viewMode
  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("gameforge:entities:viewMode", mode);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    try {
      await createEntity.mutateAsync({ projectId, data: { name: quickName.trim(), type: quickType } });
      setQuickName("");
      refresh();
      quickInputRef.current?.focus();
    } catch (err) {
      toast({ title: "Could not create component", description: errMsg(err), variant: "destructive" });
    }
  };

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
          name: newEntity.name, type: newEntity.type,
          subtype: newEntity.subtype || undefined,
          description: newEntity.description || undefined,
          stats: newEntity.stats || undefined,
          relatedTo: newEntity.relatedTo || undefined,
          parentEntityId: newEntity.parentEntityId || undefined,
        },
      });
      setNewEntity({ name: "", type: "Card", subtype: "", description: "", stats: "", relatedTo: "" });
      setShowAddForm(false);
      refresh();
    } catch (err) {
      toast({ title: "Could not create component", description: errMsg(err), variant: "destructive" });
    }
  };

  const toggleExpand = (id: number) =>
    setExpandedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleGroup = (type: string) =>
    setCollapsedGroups((prev) => { const s = new Set(prev); s.has(type) ? s.delete(type) : s.add(type); return s; });

  // Derived data
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
    return {
      topLevel: all.filter((e) => !childIds.has(e.id)),
      childrenByParent,
      decks: new Set(all.filter((e) => e.type === "Deck").map((e) => e.id)),
    };
  }, [entities]);

  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    topLevel.forEach((e) => { out[e.type] = (out[e.type] || 0) + 1; });
    return out;
  }, [topLevel]);

  const statusCounts = useMemo(() => {
    const out: Record<string, number> = {};
    topLevel.forEach((e) => { const s = e.status ?? "draft"; out[s] = (out[s] || 0) + 1; });
    return out;
  }, [topLevel]);

  // Available subtypes for the current type filter
  const availableSubtypes = useMemo(() => {
    if (filterType === "all") return [];
    const subs = new Set<string>();
    topLevel.filter((e) => e.type === filterType && e.subtype).forEach((e) => subs.add(e.subtype!));
    return Array.from(subs);
  }, [topLevel, filterType]);

  const filtered = useMemo(() => {
    let arr = topLevel;
    if (filterType !== "all") arr = arr.filter((e) => e.type === filterType);
    if (filterStatus !== "all") arr = arr.filter((e) => (e.status ?? "draft") === filterStatus);
    if (filterSubtype !== "all") arr = arr.filter((e) => e.subtype === filterSubtype);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.subtype?.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [topLevel, filterType, filterStatus, filterSubtype, search]);

  const grouped = useMemo(() => {
    if (filterType !== "all") return null;
    const map = new Map<string, Entity[]>();
    filtered.forEach((e) => {
      if (!map.has(e.type)) map.set(e.type, []);
      map.get(e.type)!.push(e);
    });
    return map;
  }, [filtered, filterType]);

  // Sync local order from filtered when not dragging
  useEffect(() => {
    if (draggedEntityId === null) {
      setLocalEntityOrder(filtered.map((e) => e.id));
    }
  }, [filtered, draggedEntityId]);

  // Apply local drag order to filtered list
  const orderedFiltered = useMemo(() => {
    if (localEntityOrder.length === 0) return filtered;
    const orderMap = new Map(localEntityOrder.map((id, i) => [id, i]));
    return [...filtered].sort((a, b) => {
      const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
      const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
      return ia - ib;
    });
  }, [filtered, localEntityOrder]);

  const handleEntityDragStart = (id: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedEntityId(id);
    dragOverEntityIdRef.current = null;
    document.body.style.cursor = "grabbing";
  };

  const handleEntityDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedEntityId === null || draggedEntityId === targetId) return;
    if (dragOverEntityIdRef.current === targetId) return;
    dragOverEntityIdRef.current = targetId;
    setLocalEntityOrder((prev) => {
      const from = prev.indexOf(draggedEntityId);
      const to = prev.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedEntityId);
      return next;
    });
  };

  const handleEntityDrop = (e: React.DragEvent) => {
    e.preventDefault();
    document.body.style.cursor = "";
    setDraggedEntityId(null);
    dragOverEntityIdRef.current = null;
  };

  const handleEntityDragEnd = () => {
    document.body.style.cursor = "";
    setDraggedEntityId(null);
    dragOverEntityIdRef.current = null;
  };

  const deckOptions = useMemo(() => (entities ?? []).filter((e) => e.type === "Deck"), [entities]);
  const total = entities?.length ?? 0;

  return (
    <div className="space-y-4 pb-8">

      {/* ── Quick-add bar ───────────────────────────────────────────────── */}
      <form onSubmit={handleQuickAdd} className="flex gap-2 items-center p-3 rounded-lg border border-border bg-card/60">
        <span className="text-sm shrink-0">{getMeta(quickType).icon}</span>
        <Input
          ref={quickInputRef}
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          placeholder={`Quick-add a new ${quickType}…`}
          className="h-8 bg-input flex-1 text-sm"
          data-testid="quick-add-name"
        />
        <Select
          value={quickType}
          onValueChange={(v) => setQuickType(v as ComponentType)}
        >
          <SelectTrigger className="h-8 bg-input text-xs w-36 shrink-0" data-testid="quick-add-type">
            <SelectValue />
          </SelectTrigger>
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
        <Button
          type="submit"
          size="sm"
          className="h-8 shrink-0"
          disabled={!quickName.trim() || createEntity.isPending}
          data-testid="quick-add-submit"
        >
          {createEntity.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Plus className="w-3.5 h-3.5" />}
        </Button>
        <div className="w-px h-5 bg-border shrink-0" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
          onClick={() => { setShowAIPanel(!showAIPanel); setShowAddForm(false); }}
          data-testid="entities-ai-toggle"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" /> AI
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground hover:text-white shrink-0 text-xs"
          onClick={() => { setShowAddForm(!showAddForm); setShowAIPanel(false); }}
          data-testid="entities-add-toggle"
        >
          Full form
        </Button>
      </form>

      {/* ── AI generate panel ─────────────────────────────────────────── */}
      {showAIPanel && (
        <Card className="p-4 bg-card border-primary/30 border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Component Generator
            </p>
            <button onClick={() => setShowAIPanel(false)} className="text-muted-foreground hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
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
                <SelectContent>
                  {[3, 5, 8, 12].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleAiGenerate}
            disabled={!aiPrompt || aiGenerate.isPending}
            size="sm"
            className="w-full bg-primary text-primary-foreground"
            data-testid="entities-ai-generate"
          >
            {aiGenerate.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generating…</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</>}
          </Button>
        </Card>
      )}

      {/* ── Full add form ──────────────────────────────────────────────── */}
      {showAddForm && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" /> New Component
            </p>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form onSubmit={handleAddEntity} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={newEntity.name}
                  onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                  className="h-8 bg-input"
                  autoFocus
                  placeholder="e.g. Iron Sword, Event Deck, Dragon Tile…"
                />
              </div>
              <div className="w-44 space-y-1 shrink-0">
                <Label className="text-xs">Type</Label>
                <Select
                  value={newEntity.type}
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
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Subtype</Label>
                <Select
                  value={newEntity.subtype || "__none__"}
                  onValueChange={(v) => setNewEntity({ ...newEntity, subtype: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="h-8 bg-input text-xs"><SelectValue placeholder="Select subtype…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {(COMPONENT_SUBTYPES[newEntity.type] ?? []).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Textarea
                value={newEntity.description}
                onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })}
                className="h-14 resize-none bg-input text-xs"
                placeholder={getMeta(newEntity.type).desc}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> Stats</Label>
                <Input
                  value={newEntity.stats}
                  onChange={(e) => setNewEntity({ ...newEntity, stats: e.target.value })}
                  className="h-8 bg-input text-xs font-mono"
                  placeholder="ATK 3 / DEF 1 / Cost 2"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Link2 className="w-3 h-3" /> Related to</Label>
                <Input
                  value={newEntity.relatedTo}
                  onChange={(e) => setNewEntity({ ...newEntity, relatedTo: e.target.value })}
                  className="h-8 bg-input text-xs"
                  placeholder="Dragon, Fire Spell, …"
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={createEntity.isPending}>
              {createEntity.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Add {newEntity.type}
            </Button>
          </form>
        </Card>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="space-y-2">
          {/* Header row: search + view mode + hierarchy toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search components…"
                className="h-8 bg-input pl-8 text-xs"
              />
            </div>
            <div className="flex gap-0.5 p-0.5 bg-muted/30 rounded border border-border shrink-0">
              <button
                onClick={() => handleSetViewMode("grid")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                title="Grid view"
              >
                <LayoutGrid className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleSetViewMode("list")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                title="List view"
              >
                <List className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => setShowHierarchy(!showHierarchy)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors shrink-0 ${showHierarchy ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-white"}`}
            >
              <Layers className="w-3 h-3" /> Hierarchy
            </button>
          </div>

          {/* Type filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => { setFilterType("all"); setFilterSubtype("all"); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"}`}
              data-testid="filter-entities-all"
            >
              All ({topLevel.length})
            </button>
            {PHYSICAL_TYPES.map((t) => {
              const count = typeCounts[t];
              if (!count) return null;
              const m = getMeta(t);
              return (
                <button key={t}
                  onClick={() => { setFilterType(t); setFilterSubtype("all"); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filterType === t ? m.badge : "text-muted-foreground border-border hover:text-white"}`}
                  data-testid={`filter-entities-${t.toLowerCase()}`}
                >
                  <span>{m.icon}</span> {t} ({count})
                </button>
              );
            })}
            {WORLD_TYPES.map((t) => {
              const count = typeCounts[t];
              if (!count) return null;
              const m = getMeta(t);
              return (
                <button key={t}
                  onClick={() => { setFilterType(t); setFilterSubtype("all"); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filterType === t ? m.badge : "text-muted-foreground border-border hover:text-white"}`}
                  data-testid={`filter-entities-${t.toLowerCase()}`}
                >
                  <span>{m.icon}</span> {t} ({count})
                </button>
              );
            })}
          </div>

          {/* Status + subtype secondary filters */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Status filter */}
            <div className="flex gap-1.5 items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status:</span>
              <button
                onClick={() => setFilterStatus("all")}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterStatus === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"}`}
              >
                All
              </button>
              {STATUS_OPTIONS.map((s) => {
                const count = statusCounts[s.value];
                if (!count) return null;
                return (
                  <button
                    key={s.value}
                    onClick={() => setFilterStatus(s.value)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterStatus === s.value ? s.color : "text-muted-foreground border-border hover:text-white"}`}
                  >
                    {s.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Subtype filter — only when a type is selected and subtypes exist */}
            {availableSubtypes.length > 0 && (
              <div className="flex gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Subtype:</span>
                <button
                  onClick={() => setFilterSubtype("all")}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterSubtype === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"}`}
                >
                  All
                </button>
                {availableSubtypes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSubtype(s)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterSubtype === s ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Hierarchy view ─────────────────────────────────────────────── */}
      {showHierarchy && total > 0 && (
        <HierarchyView
          entities={entities ?? []}
          childrenByParent={childrenByParent}
          decks={decks}
          projectId={projectId}
          onUpdated={refresh}
        />
      )}

      {/* ── Component grid / list ──────────────────────────────────────── */}
      {!showHierarchy && (
        isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-2"}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={viewMode === "grid" ? "h-48" : "h-14"} />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
            <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No components yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Use the quick-add bar above or generate with AI — cards, decks, tokens, tiles, and more.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
            <p className="text-muted-foreground text-sm">No components match these filters.</p>
            <button
              className="text-xs text-primary hover:underline mt-2"
              onClick={() => { setFilterType("all"); setFilterStatus("all"); setFilterSubtype("all"); setSearch(""); }}
            >
              Clear all filters
            </button>
          </div>
        ) : grouped ? (
          // Grouped by type
          <div className="space-y-4">
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
                    viewMode === "grid" ? (
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map((entity) => (
                          <EntityVisualCard
                            key={entity.id}
                            entity={entity}
                            projectId={projectId}
                            childEntities={childrenByParent[entity.id]}
                            isDeck={decks.has(entity.id)}
                            deckOptions={deckOptions}
                            onUpdated={refresh}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {items.map((entity) => (
                          <EntityListRow
                            key={entity.id}
                            entity={entity}
                            projectId={projectId}
                            isExpanded={expandedIds.has(entity.id)}
                            onToggle={() => toggleExpand(entity.id)}
                            childEntities={childrenByParent[entity.id]}
                            isDeck={decks.has(entity.id)}
                            deckOptions={deckOptions}
                            onUpdated={refresh}
                          />
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Single-type view (drag-to-reorder enabled)
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {orderedFiltered.map((entity) => (
                <div
                  key={entity.id}
                  draggable
                  onDragStart={(e) => handleEntityDragStart(entity.id, e)}
                  onDragOver={(e) => handleEntityDragOver(e, entity.id)}
                  onDrop={handleEntityDrop}
                  onDragEnd={handleEntityDragEnd}
                  className={draggedEntityId === entity.id ? "opacity-40 cursor-grabbing" : "cursor-grab"}
                >
                  <EntityVisualCard
                    entity={entity}
                    projectId={projectId}
                    childEntities={childrenByParent[entity.id]}
                    isDeck={decks.has(entity.id)}
                    deckOptions={deckOptions}
                    onUpdated={refresh}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 rounded-lg border border-border overflow-hidden divide-y divide-border/50">
              {orderedFiltered.map((entity) => (
                <div
                  key={entity.id}
                  draggable
                  onDragStart={(e) => handleEntityDragStart(entity.id, e)}
                  onDragOver={(e) => handleEntityDragOver(e, entity.id)}
                  onDrop={handleEntityDrop}
                  onDragEnd={handleEntityDragEnd}
                  className={draggedEntityId === entity.id ? "opacity-40 cursor-grabbing" : "cursor-grab"}
                >
                  <EntityListRow
                    entity={entity}
                    projectId={projectId}
                    isExpanded={expandedIds.has(entity.id)}
                    onToggle={() => toggleExpand(entity.id)}
                    childEntities={childrenByParent[entity.id]}
                    isDeck={decks.has(entity.id)}
                    deckOptions={deckOptions}
                    onUpdated={refresh}
                  />
                </div>
              ))}
            </div>
          )
        )
      )}
    </div>
  );
}

// ─── Hierarchy View ────────────────────────────────────────────────────────────

function HierarchyView({
  entities, childrenByParent, decks, projectId, onUpdated,
}: {
  entities: Entity[];
  childrenByParent: Record<number, Entity[]>;
  decks: Set<number>;
  projectId: number;
  onUpdated: () => void;
}) {
  const orphansByType = useMemo(() => {
    const all = entities;
    const childIds = new Set(all.filter((e) => e.parentEntityId).map((e) => e.id));
    const orphans = all.filter((e) => !childIds.has(e.id) && !decks.has(e.id));
    const map = new Map<string, Entity[]>();
    orphans.forEach((e) => {
      if (!map.has(e.type)) map.set(e.type, []);
      map.get(e.type)!.push(e);
    });
    return map;
  }, [entities, decks, childrenByParent]);

  const deckList = useMemo(() => entities.filter((e) => decks.has(e.id)), [entities, decks]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card/30 space-y-0">
      <div className="px-4 py-3 bg-muted/20 border-b border-border">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Component Hierarchy
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Decks and their contained cards — then remaining components by type.
        </p>
      </div>
      <div className="p-4 space-y-4">
        {/* Deck containers */}
        {deckList.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Decks &amp; Containers
            </p>
            {deckList.map((deck) => {
              const children = childrenByParent[deck.id] ?? [];
              return (
                <HierarchyNode key={deck.id} entity={deck} children={children} projectId={projectId} onUpdated={onUpdated} />
              );
            })}
          </div>
        )}

        {/* Orphaned entities by type */}
        {orphansByType.size > 0 && (
          <div className="space-y-3">
            {Array.from(orphansByType.entries()).map(([type, items]) => {
              const m = getMeta(type);
              return (
                <div key={type}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${m.color}`}>
                    <span>{m.icon}</span> {type}s ({items.length})
                  </p>
                  <div className="space-y-1 pl-4 border-l-2 border-border">
                    {items.map((e) => (
                      <HierarchyLeaf key={e.id} entity={e} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function HierarchyNode({
  entity, children, projectId, onUpdated,
}: {
  entity: Entity;
  children: Entity[];
  projectId: number;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(true);
  const m = getMeta(entity.type);

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/20 ${m.bg}`}
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="text-sm shrink-0">{m.icon}</span>
        <span className={`text-sm font-semibold ${m.color} truncate flex-1`}>{entity.name}</span>
        {entity.subtype && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${m.badge}`}>{entity.subtype}</Badge>
        )}
        <Badge variant="outline" className="text-[10px] shrink-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
          {children.length} card{children.length !== 1 ? "s" : ""}
        </Badge>
      </button>
      {open && (
        <div className="bg-background/30 divide-y divide-border/40">
          {children.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 px-4 py-2 italic">No cards yet.</p>
          ) : children.map((child) => (
            <HierarchyLeaf key={child.id} entity={child} indent />
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyLeaf({ entity, indent }: { entity: Entity; indent?: boolean }) {
  const m = getMeta(entity.type);
  const related = parseRelatedTo(entity.relatedTo);
  const stats = parseStats(entity.stats);

  return (
    <div className={`flex items-center gap-2 py-2 ${indent ? "pl-6 pr-3" : "px-3"} text-sm`} data-testid={`hierarchy-leaf-${entity.id}`}>
      <span className="text-sm shrink-0">{m.icon}</span>
      <span className="font-medium text-white truncate flex-1">{entity.name}</span>
      {entity.subtype && (
        <Badge variant="outline" className={`text-[10px] shrink-0 ${m.badge}`}>{entity.subtype}</Badge>
      )}
      {entity.status && entity.status !== "draft" && (
        <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusMeta(entity.status).color}`}>
          {getStatusMeta(entity.status).label}
        </Badge>
      )}
      {stats.length > 0 && (
        <span className="text-[10px] font-mono text-muted-foreground hidden md:block">
          {stats.slice(0, 2).map((s) => `${s.key}: ${s.val}`).join(" · ")}
        </span>
      )}
      {related.length > 0 && (
        <span className="text-[10px] text-cyan-400/70 hidden md:flex items-center gap-0.5">
          <Link2 className="w-2.5 h-2.5" /> {related.slice(0, 2).join(", ")}
        </span>
      )}
    </div>
  );
}

// ─── Visual Card (grid mode) ───────────────────────────────────────────────────

function EntityVisualCard({
  entity, projectId, childEntities, isDeck, deckOptions, onUpdated,
}: {
  entity: Entity;
  projectId: number;
  childEntities?: Entity[];
  isDeck?: boolean;
  deckOptions?: Entity[];
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const updateEntity = useUpdateEntity();
  const createEntity = useCreateEntity();
  const deleteEntity = useDeleteEntity();
  const enhanceEntity = useAiEnhanceEntity();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhance, setEnhance] = useState<AIEnhance | null>(null);
  const [selectedProps, setSelectedProps] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsEditing, setStatsEditing] = useState(false);
  const [statPairs, setStatPairs] = useState<{ key: string; val: string }[]>([]);
  const [showChildren, setShowChildren] = useState(false);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hexInput, setHexInput] = useState(entity.color ?? "");
  const lastSubmittedHexRef = useRef<string | null>(null);

  useEffect(() => {
    if (showColorPicker) {
      setHexInput(entity.color ?? "");
      lastSubmittedHexRef.current = null;
    }
  }, [showColorPicker, entity.color]);

  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const previewColor = showColorPicker && isValidHex(hexInput) ? hexInput : (entity.color ?? null);

  const [editForm, setEditForm] = useState({
    name: entity.name,
    type: entity.type,
    subtype: entity.subtype ?? "",
    description: entity.description ?? "",
    stats: entity.stats ?? "",
    relatedTo: entity.relatedTo ?? "",
    status: entity.status ?? "draft",
    parentEntityId: entity.parentEntityId ?? undefined as number | undefined,
  });

  const createProperty = useCreateEntityProperty();
  const meta = getMeta(entity.type);
  const statusMeta = getStatusMeta(entity.status ?? "draft");
  const relatedList = parseRelatedTo(entity.relatedTo);
  const statsList = parseStats(entity.stats);

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
    onUpdated();
  };

  // ── Drag-to-deck (#52) ───────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("cardEntityId", String(entity.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDeck) return;
    const hasCard = e.dataTransfer.types.includes("cardentityid");
    if (!hasCard) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the card entirely (not entering a child element)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragTarget(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragTarget(false);
    if (!isDeck) return;
    const cardId = parseInt(e.dataTransfer.getData("cardEntityId"), 10);
    if (!cardId || cardId === entity.id) return;
    try {
      await updateEntity.mutateAsync({ projectId, entityId: cardId, data: { parentEntityId: entity.id } });
      refresh();
      toast({ title: `Card added to ${entity.name}` });
    } catch (err) {
      toast({ title: "Could not move card to deck", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateEntity.mutateAsync({
        projectId, entityId: entity.id,
        data: {
          name: editForm.name, type: editForm.type,
          subtype: editForm.subtype || undefined,
          description: editForm.description,
          stats: editForm.stats || undefined,
          relatedTo: editForm.relatedTo || undefined,
          status: editForm.status,
          parentEntityId: editForm.parentEntityId ?? null,
        },
      });
      setIsEditing(false);
      refresh();
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
      refresh();
      toast({ title: "Component duplicated" });
    } catch (err) {
      toast({ title: "Duplicate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${entity.name}"? This will also delete all of its properties.`)) return;
    try {
      await deleteEntity.mutateAsync({ projectId, entityId: entity.id });
      refresh();
    } catch (err) {
      toast({ title: "Delete failed", description: errMsg(err), variant: "destructive" });
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

  const handleApplyEnhance = async () => {
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
      refresh();
      setApplied(true);
      toast({ title: "Applied!", description: `Description updated${propsToAdd.length ? ` + ${propsToAdd.length} properties added.` : "."}` });
      setTimeout(() => { setShowEnhance(false); setApplied(false); setEnhance(null); }, 1500);
    } catch (err) {
      toast({ title: "Apply failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const openStatsEditor = () => {
    setStatPairs(statsList.length > 0 ? [...statsList] : [{ key: "", val: "" }]);
    setStatsEditing(true);
    setShowStats(true);
  };

  const saveStats = async () => {
    const serialized = serializeStats(statPairs.filter((p) => p.key.trim()));
    try {
      await updateEntity.mutateAsync({
        projectId, entityId: entity.id,
        data: { stats: serialized || undefined },
      });
      refresh();
      setStatsEditing(false);
      toast({ title: "Stats saved" });
    } catch (err) {
      toast({ title: "Stats save failed", description: errMsg(err), variant: "destructive" });
    }
  };

  // Color accent strip based on type
  const accentColorMap: Record<string, string> = {
    Card: "from-violet-500/30", Deck: "from-indigo-500/30", Token: "from-amber-500/30",
    Die: "from-red-500/30", Tile: "from-emerald-500/30", Meeple: "from-blue-500/30",
    Board: "from-slate-500/30", Zone: "from-lime-500/30", Location: "from-cyan-500/30",
    Faction: "from-purple-500/30", Event: "from-orange-500/30", Resource: "from-teal-500/30",
    Ability: "from-pink-500/30",
  };
  const accentFrom = accentColorMap[entity.type] ?? "from-gray-500/30";

  if (isEditing) {
    return (
      <Card className="bg-card border-border overflow-hidden" data-testid={`entity-card-${entity.id}`}>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 justify-between">
            <p className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5 text-primary" /> Editing
            </p>
            <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-input h-8 text-sm font-semibold flex-1"
              autoFocus
            />
            <Select
              value={editForm.type}
              onValueChange={(v) => setEditForm((f) => ({ ...f, type: v, subtype: "" }))}
            >
              <SelectTrigger className="bg-input h-8 text-xs w-36 shrink-0"><SelectValue /></SelectTrigger>
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={editForm.subtype || "__none__"}
              onValueChange={(v) => setEditForm((f) => ({ ...f, subtype: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger className="bg-input h-8 text-xs"><SelectValue placeholder="Subtype…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {(COMPONENT_SUBTYPES[editForm.type] ?? []).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={editForm.status}
              onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="bg-input h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {editForm.type === "Card" && deckOptions && deckOptions.length > 0 && (
            <Select
              value={editForm.parentEntityId ? String(editForm.parentEntityId) : "__none__"}
              onValueChange={(v) => setEditForm((f) => ({ ...f, parentEntityId: v === "__none__" ? undefined : parseInt(v) }))}
            >
              <SelectTrigger className="h-8 bg-input text-xs"><SelectValue placeholder="No deck…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No deck —</SelectItem>
                {deckOptions.map((d) => <SelectItem key={d.id} value={String(d.id)}>📦 {d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Textarea
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description…"
            className="bg-input text-xs resize-none h-14"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] flex items-center gap-1 text-muted-foreground"><Zap className="w-2.5 h-2.5" /> Stats</Label>
              <Input
                value={editForm.stats}
                onChange={(e) => setEditForm((f) => ({ ...f, stats: e.target.value }))}
                className="h-7 bg-input text-xs font-mono"
                placeholder="ATK 3 / DEF 1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] flex items-center gap-1 text-muted-foreground"><Link2 className="w-2.5 h-2.5" /> Related to</Label>
              <Input
                value={editForm.relatedTo}
                onChange={(e) => setEditForm((f) => ({ ...f, relatedTo: e.target.value }))}
                className="h-7 bg-input text-xs"
                placeholder="Dragon, Spell, …"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs flex-1" disabled={updateEntity.isPending}>
              {updateEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              Save
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => { setEditForm({ name: entity.name, type: entity.type, subtype: entity.subtype ?? "", description: entity.description ?? "", stats: entity.stats ?? "", relatedTo: entity.relatedTo ?? "", status: entity.status ?? "draft", parentEntityId: entity.parentEntityId ?? undefined }); setIsEditing(false); }}
              className="h-7 text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      draggable={entity.type === "Card"}
      onDragStart={entity.type === "Card" ? handleDragStart : undefined}
      onDragOver={isDeck ? handleDragOver : undefined}
      onDragLeave={isDeck ? handleDragLeave : undefined}
      onDrop={isDeck ? handleDrop : undefined}
      className={[
        "relative bg-card border-border overflow-hidden flex flex-col group hover:border-border/80 transition-all hover:shadow-md hover:shadow-black/20",
        entity.type === "Card" ? "cursor-grab active:cursor-grabbing" : "",
        isDragTarget ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-background scale-[1.02] border-indigo-400/50" : "",
      ].join(" ")}
      data-testid={`entity-card-${entity.id}`}
    >
      {/* Color accent header — custom color when set (#53), else type gradient */}
      {previewColor ? (
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${previewColor}55, transparent)` }} />
      ) : (
        <div className={`h-1.5 w-full bg-gradient-to-r ${accentFrom} to-transparent`} />
      )}
      {isDragTarget && (
        <div className="absolute inset-x-0 top-1.5 flex items-center justify-center pointer-events-none z-10">
          <span className="text-[10px] font-semibold bg-indigo-500/90 text-white px-2 py-0.5 rounded-full shadow-sm">
            Drop to add to deck
          </span>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Type + status badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${meta.badge}`}>
            {meta.icon} {entity.type}
          </span>
          {entity.subtype && (
            <Badge variant="outline" className="text-[10px] bg-secondary/20 border-border">
              {entity.subtype}
            </Badge>
          )}
          <Badge variant="outline" className={`text-[10px] ml-auto shrink-0 ${statusMeta.color}`}>
            {statusMeta.label}
          </Badge>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-base text-white leading-tight line-clamp-2">
          {entity.name}
        </h3>

        {/* Description */}
        {entity.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {entity.description}
          </p>
        )}

        {/* Stats inline display + editor */}
        {(statsList.length > 0 || entity.stats) && (
          <div>
            <button
              className={`w-full text-left rounded-md px-2.5 py-1.5 border transition-colors text-xs ${showStats ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20"}`}
              onClick={() => { if (!statsEditing) { setShowStats(!showStats); } }}
              data-testid={`stats-toggle-${entity.id}`}
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-mono text-[10px]">
                  {statsList.length > 0
                    ? statsList.map((s) => `${s.key} ${s.val}`).join(" · ")
                    : entity.stats}
                </span>
              </div>
            </button>

            {showStats && !statsEditing && (
              <div className="mt-1.5 rounded-md border border-border bg-background/30 p-2.5 space-y-1.5">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {statsList.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.key}</span>
                      <span className="font-mono font-semibold text-white">{s.val}</span>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] w-full text-primary hover:bg-primary/10"
                  onClick={openStatsEditor}
                >
                  <Pencil className="w-2.5 h-2.5 mr-1" /> Edit stats
                </Button>
              </div>
            )}

            {statsEditing && showStats && (
              <div className="mt-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5 space-y-2">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Inline Stats Editor</p>
                {statPairs.map((pair, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <Input
                      value={pair.key}
                      onChange={(e) => {
                        const next = [...statPairs];
                        next[i] = { ...pair, key: e.target.value };
                        setStatPairs(next);
                      }}
                      placeholder="Stat name"
                      className="h-6 bg-input text-[10px] flex-1"
                    />
                    <Input
                      value={pair.val}
                      onChange={(e) => {
                        const next = [...statPairs];
                        next[i] = { ...pair, val: e.target.value };
                        setStatPairs(next);
                      }}
                      placeholder="Value"
                      className="h-6 bg-input text-[10px] w-16 font-mono"
                    />
                    <button
                      onClick={() => setStatPairs((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-primary"
                    onClick={() => setStatPairs((p) => [...p, { key: "", val: "" }])}
                  >
                    <Plus className="w-2.5 h-2.5 mr-0.5" /> Add stat
                  </Button>
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" className="h-6 text-[10px] gap-0.5" onClick={saveStats} disabled={updateEntity.isPending}>
                      {updateEntity.isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />} Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setStatsEditing(false); setShowStats(false); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No stats yet — quick add */}
        {statsList.length === 0 && !entity.stats && (
          <button
            onClick={openStatsEditor}
            className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1 text-left"
            data-testid={`stats-add-${entity.id}`}
          >
            <Plus className="w-3 h-3" /> Add stats
          </button>
        )}

        {/* Related to chips */}
        {relatedList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Link2 className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
            {relatedList.map((r, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Deck children count */}
        {isDeck && (
          <button
            onClick={() => setShowChildren(!showChildren)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            data-testid={`deck-children-toggle-${entity.id}`}
          >
            <span className="text-sm">🃏</span>
            {childEntities?.length ?? 0} card{(childEntities?.length ?? 0) !== 1 ? "s" : ""}
            {showChildren
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />}
          </button>
        )}

        {/* Deck children list */}
        {isDeck && showChildren && (
          <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 divide-y divide-indigo-500/10 overflow-hidden">
            {(!childEntities || childEntities.length === 0) ? (
              <p className="text-[10px] text-muted-foreground px-3 py-2 italic">No cards yet.</p>
            ) : childEntities.map((child) => (
              <div key={child.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                <span>{getMeta(child.type).icon}</span>
                <span className="text-white truncate flex-1">{child.name}</span>
                {child.subtype && (
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${getMeta(child.type).badge}`}>{child.subtype}</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Color picker swatches (#53) + hex input (#70) */}
        {showColorPicker && (
          <div className="pt-2 border-t border-border/40 space-y-2" data-color-picker="true">
            <div className="flex items-center gap-1 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  title={c}
                  data-testid={`color-swatch-${entity.id}-${c.slice(1)}`}
                  className="rounded-full transition-transform hover:scale-110 shrink-0"
                  style={{
                    width: 18, height: 18, backgroundColor: c,
                    outline: entity.color === c ? "2px solid white" : "none",
                    outlineOffset: 2,
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await updateEntity.mutateAsync({ projectId, entityId: entity.id, data: { color: c } });
                      refresh();
                    } catch { /* noop */ }
                    setShowColorPicker(false);
                  }}
                />
              ))}
              {entity.color && (
                <button
                  className="text-[9px] text-muted-foreground hover:text-white px-1.5 py-0.5 rounded border border-border/50 hover:border-border transition-colors ml-auto"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await updateEntity.mutateAsync({ projectId, entityId: entity.id, data: { color: "" } });
                      refresh();
                    } catch { /* noop */ }
                    setShowColorPicker(false);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
            {/* Hex input */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div
                className="rounded shrink-0 border border-border/60"
                style={{ width: 18, height: 18, backgroundColor: isValidHex(hexInput) ? hexInput : "transparent" }}
              />
              <input
                data-testid={`hex-input-${entity.id}`}
                type="text"
                maxLength={7}
                placeholder="#rrggbb"
                value={hexInput}
                className="flex-1 min-w-0 bg-background/60 border border-border/60 rounded px-2 py-0.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 font-mono"
                onChange={(e) => {
                  let val = e.target.value.trim().toLowerCase();
                  if (val && !val.startsWith("#")) val = "#" + val;
                  setHexInput(val);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = hexInput.trim().toLowerCase();
                    if (isValidHex(val)) {
                      lastSubmittedHexRef.current = val;
                      try {
                        await updateEntity.mutateAsync({ projectId, entityId: entity.id, data: { color: val } });
                        refresh();
                      } catch { /* noop */ }
                      setShowColorPicker(false);
                    }
                  }
                }}
                onBlur={async (e) => {
                  const related = e.relatedTarget as HTMLElement | null;
                  if (related && related.closest("[data-color-picker]")) return;
                  const val = hexInput.trim().toLowerCase();
                  const currentNorm = (entity.color ?? "").toLowerCase();
                  if (isValidHex(val) && val !== currentNorm && val !== lastSubmittedHexRef.current) {
                    lastSubmittedHexRef.current = val;
                    try {
                      await updateEntity.mutateAsync({ projectId, entityId: entity.id, data: { color: val } });
                      refresh();
                    } catch { /* noop */ }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* AI Enhance panel */}
      {showEnhance && (
        <div className={`border-t border-border ${meta.bg} px-4 py-3`}>
          {isEnhancing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Analyzing…
            </div>
          )}
          {enhance && !isEnhancing && (
            <div className="space-y-3" data-testid={`enhance-panel-${entity.id}`}>
              <div className="space-y-1">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${meta.color} flex items-center gap-1`}>
                  <Sparkles className="w-3 h-3" /> Enhanced Description
                </p>
                <p className="text-xs text-white leading-relaxed bg-background/50 border border-border rounded p-2.5">{enhance.description}</p>
              </div>
              {enhance.suggestedProperties.length > 0 && (
                <div className="space-y-1.5">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
                    Suggested Properties ({enhance.suggestedProperties.length})
                  </p>
                  {enhance.suggestedProperties.map((prop, i) => {
                    const isSel = selectedProps.has(i);
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors text-xs ${isSel ? "border-primary/40 bg-primary/5" : "border-border bg-muted/10"}`}
                        onClick={() => setSelectedProps((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                      >
                        <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSel ? "border-primary bg-primary" : "border-border"}`}>
                          {isSel && <Check className="w-2 h-2 text-primary-foreground" />}
                        </div>
                        <div>
                          <span className="font-mono text-white">{prop.name}</span>
                          <Badge variant="outline" className="text-[9px] ml-1 bg-secondary/30">{prop.dataType}</Badge>
                          {prop.reason && <p className="text-muted-foreground mt-0.5">{prop.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-1.5 flex-wrap">
                <Button onClick={handleApplyEnhance} disabled={applying || applied} size="sm" className="text-xs h-7">
                  {applied ? <><Check className="w-3 h-3 mr-1" />Applied!</>
                    : applying ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Applying…</>
                    : <><Wand2 className="w-3 h-3 mr-1" />Apply</>}
                </Button>
                <Button onClick={handleEnhance} disabled={isEnhancing} size="sm" variant="outline" className="text-xs h-7">
                  <Sparkles className="w-3 h-3 mr-1" />Regen
                </Button>
                <Button onClick={() => setShowEnhance(false)} size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground ml-auto">
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="border-t border-border/50 px-3 py-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost" size="sm"
          className={`h-7 px-2 text-xs gap-1 flex-1 ${showEnhance ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          onClick={() => { setShowEnhance(!showEnhance); if (!showEnhance && !enhance) handleEnhance(); }}
          data-testid={`enhance-entity-${entity.id}`}
        >
          <Wand2 className="w-3 h-3" /> AI
        </Button>
        {/* Color picker toggle (#53) */}
        <Button
          variant="ghost" size="icon"
          className={`h-7 w-7 ${showColorPicker ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
          data-testid={`color-picker-toggle-${entity.id}`}
          title="Card color"
        >
          {entity.color ? (
            <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: entity.color, display: "inline-block" }} />
          ) : (
            <Palette className="w-3 h-3" />
          )}
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-white"
          onClick={() => { setEditForm({ name: entity.name, type: entity.type, subtype: entity.subtype ?? "", description: entity.description ?? "", stats: entity.stats ?? "", relatedTo: entity.relatedTo ?? "", status: entity.status ?? "draft", parentEntityId: entity.parentEntityId ?? undefined }); setIsEditing(true); }}
          data-testid={`edit-entity-${entity.id}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-white"
          onClick={handleDuplicate}
          data-testid={`duplicate-entity-${entity.id}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          data-testid={`delete-entity-${entity.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}

// ─── List Row (list mode) ──────────────────────────────────────────────────────

function EntityListRow({
  entity, projectId, isExpanded, onToggle, childEntities, isDeck, deckOptions, onUpdated,
}: {
  entity: Entity;
  projectId: number;
  isExpanded: boolean;
  onToggle: () => void;
  childEntities?: Entity[];
  isDeck?: boolean;
  deckOptions?: Entity[];
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const updateEntity = useUpdateEntity();
  const createEntity = useCreateEntity();
  const deleteEntity = useDeleteEntity();
  const enhanceEntity = useAiEnhanceEntity();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhance, setEnhance] = useState<AIEnhance | null>(null);
  const [selectedProps, setSelectedProps] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [editForm, setEditForm] = useState({
    name: entity.name, type: entity.type, subtype: entity.subtype ?? "",
    description: entity.description ?? "", stats: entity.stats ?? "",
    relatedTo: entity.relatedTo ?? "", status: entity.status ?? "draft",
    parentEntityId: entity.parentEntityId ?? undefined as number | undefined,
  });
  const createProperty = useCreateEntityProperty();
  const meta = getMeta(entity.type);
  const statusMeta = getStatusMeta(entity.status ?? "draft");
  const relatedList = parseRelatedTo(entity.relatedTo);
  const statsList = parseStats(entity.stats);
  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
    onUpdated();
  };

  const handleSaveEdit = async () => {
    try {
      await updateEntity.mutateAsync({
        projectId, entityId: entity.id,
        data: { name: editForm.name, type: editForm.type, subtype: editForm.subtype || undefined, description: editForm.description, stats: editForm.stats || undefined, relatedTo: editForm.relatedTo || undefined, status: editForm.status, parentEntityId: editForm.parentEntityId ?? null },
      });
      setIsEditing(false); refresh();
      toast({ title: "Component updated" });
    } catch (err) {
      toast({ title: "Update failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    try {
      await createEntity.mutateAsync({ projectId, data: { name: `${entity.name} (Copy)`, type: entity.type, description: entity.description ?? "" } });
      refresh(); toast({ title: "Component duplicated" });
    } catch (err) {
      toast({ title: "Duplicate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${entity.name}"?`)) return;
    try { await deleteEntity.mutateAsync({ projectId, entityId: entity.id }); refresh(); }
    catch (err) { toast({ title: "Delete failed", description: errMsg(err), variant: "destructive" }); }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true); setEnhance(null); setShowEnhance(true);
    try {
      const raw = await enhanceEntity.mutateAsync({ projectId, entityId: entity.id });
      const safeProps = Array.isArray(raw?.suggestedProperties)
        ? raw.suggestedProperties.filter((p): p is AIEnhance["suggestedProperties"][number] =>
            !!p && typeof p === "object" && typeof p.name === "string")
        : [];
      const data: AIEnhance = { description: typeof raw?.description === "string" ? raw.description : "", lore: typeof raw?.lore === "string" ? raw.lore : undefined, designNotes: typeof raw?.designNotes === "string" ? raw.designNotes : undefined, suggestedProperties: safeProps };
      if (!data.description && data.suggestedProperties.length === 0) { toast({ title: "AI returned no usable suggestions", variant: "destructive" }); setShowEnhance(false); }
      else { setEnhance(data); setSelectedProps(new Set(data.suggestedProperties.map((_, i) => i))); }
    } catch (err) { toast({ title: "AI enhance failed", description: errMsg(err), variant: "destructive" }); setShowEnhance(false); }
    finally { setIsEnhancing(false); }
  };

  const buildPropertyPayload = (p: { name: string; dataType: string; defaultValue?: string }) => {
    const payload: { name: string; dataType: string; defaultValue?: number; textValue?: string } = { name: p.name, dataType: p.dataType };
    if (p.defaultValue != null && p.defaultValue !== "") {
      const numeric = Number(p.defaultValue);
      if (Number.isFinite(numeric) && p.defaultValue.trim() !== "") payload.defaultValue = numeric;
      else payload.textValue = p.defaultValue;
    }
    return payload;
  };

  const handleApplyEnhance = async () => {
    if (!enhance) return;
    setApplying(true);
    try {
      await updateEntity.mutateAsync({ projectId, entityId: entity.id, data: { description: enhance.description, ...(enhance.lore ? { lore: enhance.lore } : {}), ...(enhance.designNotes ? { designNotes: enhance.designNotes } : {}) } });
      const propsToAdd = enhance.suggestedProperties.filter((_, i) => selectedProps.has(i));
      for (const prop of propsToAdd) await createProperty.mutateAsync({ projectId, entityId: entity.id, data: buildPropertyPayload(prop) });
      queryClient.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entity.id) });
      refresh(); setApplied(true);
      toast({ title: "Applied!" });
      setTimeout(() => { setShowEnhance(false); setApplied(false); setEnhance(null); }, 1500);
    } catch (err) { toast({ title: "Apply failed", description: errMsg(err), variant: "destructive" }); }
    finally { setApplying(false); }
  };

  if (isEditing) {
    return (
      <div className="px-4 py-3 space-y-3 bg-muted/10" data-testid={`entity-row-${entity.id}`}>
        <div className="flex gap-2 flex-wrap">
          <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="bg-input h-8 text-sm font-semibold flex-1 min-w-[140px]" autoFocus />
          <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v, subtype: "" }))}>
            <SelectTrigger className="bg-input h-8 text-xs w-36 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup><SelectLabel className="text-[10px]">Physical</SelectLabel>{PHYSICAL_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}</SelectGroup>
              <SelectGroup><SelectLabel className="text-[10px]">World</SelectLabel>{WORLD_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}</SelectGroup>
            </SelectContent>
          </Select>
          <Select value={editForm.subtype || "__none__"} onValueChange={(v) => setEditForm((f) => ({ ...f, subtype: v === "__none__" ? "" : v }))}>
            <SelectTrigger className="bg-input h-8 text-xs w-32"><SelectValue placeholder="Subtype…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {(COMPONENT_SUBTYPES[editForm.type] ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="bg-input h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={editForm.stats} onChange={(e) => setEditForm((f) => ({ ...f, stats: e.target.value }))} placeholder="Stats: ATK 3 / DEF 1" className="h-7 bg-input text-xs font-mono" />
          <Input value={editForm.relatedTo} onChange={(e) => setEditForm((f) => ({ ...f, relatedTo: e.target.value }))} placeholder="Related to: Dragon, Spell…" className="h-7 bg-input text-xs" />
        </div>
        <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description…" className="bg-input text-xs resize-none h-12" />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs" disabled={updateEntity.isPending}>
            {updateEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 text-xs text-muted-foreground">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors"
        data-testid={`entity-row-${entity.id}`}
      >
        <div
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          onClick={onToggle}
        >
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          {entity.color && (
            <span
              className="shrink-0 rounded-full w-2.5 h-2.5 ring-1 ring-white/20"
              style={{ backgroundColor: entity.color }}
              title={`Custom color: ${entity.color}`}
            />
          )}
          <span className="text-sm shrink-0">{meta.icon}</span>
          <span className={`text-sm font-semibold truncate ${meta.color}`}>{entity.name}</span>
          {entity.subtype && (
            <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.badge}`}>{entity.subtype}</Badge>
          )}
          <Badge variant="outline" className={`text-[10px] shrink-0 ${statusMeta.color}`}>{statusMeta.label}</Badge>
          {isDeck && childEntities && childEntities.length > 0 && (
            <Badge variant="outline" className="text-[10px] shrink-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              {childEntities.length} card{childEntities.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {/* Stat chips */}
          {statsList.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 ml-1">
              {statsList.slice(0, 3).map((s, i) => (
                <span key={i} className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  {s.key}: {s.val}
                </span>
              ))}
            </div>
          )}
          {/* Related chips */}
          {relatedList.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 ml-1">
              <Link2 className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
              {relatedList.slice(0, 2).map((r, i) => (
                <span key={i} className="text-[10px] text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">{r}</span>
              ))}
            </div>
          )}
          {entity.description && (
            <span className="text-xs text-muted-foreground truncate hidden xl:block">{entity.description}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="sm"
            className={`text-xs h-7 px-2 gap-1 ${showEnhance ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
            onClick={() => { setShowEnhance(!showEnhance); if (!showEnhance && !enhance) handleEnhance(); }}
            data-testid={`enhance-entity-${entity.id}`}
          >
            <Wand2 className="w-3.5 h-3.5" /> AI
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white"
            onClick={() => { setEditForm({ name: entity.name, type: entity.type, subtype: entity.subtype ?? "", description: entity.description ?? "", stats: entity.stats ?? "", relatedTo: entity.relatedTo ?? "", status: entity.status ?? "draft", parentEntityId: entity.parentEntityId ?? undefined }); setIsEditing(true); }}
            data-testid={`edit-entity-${entity.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={handleDuplicate} data-testid={`duplicate-entity-${entity.id}`}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} data-testid={`delete-entity-${entity.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* AI Enhance panel */}
      {showEnhance && (
        <div className={`border-t border-border ${meta.bg} px-5 py-4`}>
          {isEnhancing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Analyzing and generating improvements…
            </div>
          )}
          {enhance && !isEnhancing && (
            <div className="space-y-3" data-testid={`enhance-panel-${entity.id}`}>
              <div className="space-y-1">
                <p className={`text-xs font-semibold ${meta.color} flex items-center gap-1.5`}><Sparkles className="w-3.5 h-3.5" /> Enhanced Description</p>
                <p className="text-sm text-white leading-relaxed bg-background/50 border border-border rounded-md p-3">{enhance.description}</p>
              </div>
              {enhance.suggestedProperties.length > 0 && (
                <div className="space-y-1.5">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>Suggested Properties ({enhance.suggestedProperties.length})</p>
                  {enhance.suggestedProperties.map((prop, i) => {
                    const isSel = selectedProps.has(i);
                    return (
                      <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${isSel ? "border-primary/40 bg-primary/5" : "border-border bg-muted/10"}`}
                        onClick={() => setSelectedProps((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSel ? "border-primary bg-primary" : "border-border"}`}>
                          {isSel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <code className="text-white text-xs font-mono">{prop.name}</code>
                            <Badge variant="outline" className="text-[10px] font-mono bg-secondary/30">{prop.dataType}</Badge>
                          </div>
                          {prop.reason && <p className="text-xs text-muted-foreground mt-0.5">{prop.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleApplyEnhance} disabled={applying || applied} size="sm" className="bg-primary text-primary-foreground" data-testid={`apply-enhance-${entity.id}`}>
                  {applied ? <><Check className="w-3.5 h-3.5 mr-1" />Applied!</>
                    : applying ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Applying…</>
                    : <><Wand2 className="w-3.5 h-3.5 mr-1" />Apply</>}
                </Button>
                <Button onClick={handleEnhance} disabled={isEnhancing} size="sm" variant="outline" className="text-muted-foreground border-border hover:text-white"><Sparkles className="w-3.5 h-3.5 mr-1" />Regen</Button>
                <Button onClick={() => setShowEnhance(false)} size="sm" variant="ghost" className="text-muted-foreground hover:text-white ml-auto">Dismiss</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded: lore / notes / deck children / properties */}
      {isExpanded && (
        <div className="px-5 py-4 border-t border-border bg-muted/5 space-y-4">
          {/* Stats inline editor */}
          {(entity.stats || statsList.length > 0) && (
            <EntityStatsEditor projectId={projectId} entity={entity} onUpdated={onUpdated} />
          )}

          {/* Related to chips (editable) */}
          {relatedList.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3 h-3" /> Related to
              </p>
              <div className="flex flex-wrap gap-1.5">
                {relatedList.map((r, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(entity.lore || entity.designNotes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entity.lore && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Flavor / Lore</p>
                  <p className="text-xs text-muted-foreground italic leading-relaxed bg-background/40 border border-border/50 rounded p-2.5">"{entity.lore}"</p>
                </div>
              )}
              {entity.designNotes && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Designer's Notes</p>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background/40 border border-border/50 rounded p-2.5">{entity.designNotes}</p>
                </div>
              )}
            </div>
          )}

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
                      <span>{getMeta(child.type).icon}</span>
                      <span className="font-medium text-white truncate">{child.name}</span>
                      {child.subtype && (
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${getMeta(child.type).badge}`}>{child.subtype}</Badge>
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
    </>
  );
}

// ─── Stats Editor (inline in expanded list row) ────────────────────────────────

function EntityStatsEditor({ projectId, entity, onUpdated }: { projectId: number; entity: Entity; onUpdated: () => void }) {
  const queryClient = useQueryClient();
  const updateEntity = useUpdateEntity();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [pairs, setPairs] = useState<{ key: string; val: string }[]>([]);

  const statsList = parseStats(entity.stats);

  const open = () => {
    setPairs(statsList.length > 0 ? [...statsList] : [{ key: "", val: "" }]);
    setEditing(true);
  };

  const save = async () => {
    const serialized = serializeStats(pairs.filter((p) => p.key.trim()));
    try {
      await updateEntity.mutateAsync({ projectId, entityId: entity.id, data: { stats: serialized || undefined } });
      queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
      onUpdated();
      setEditing(false);
      toast({ title: "Stats saved" });
    } catch (err) {
      toast({ title: "Stats save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  if (!editing) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" /> Stats
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {statsList.map((s, i) => (
            <span key={i} className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              {s.key}: {s.val}
            </span>
          ))}
          <button className="text-[10px] text-primary hover:underline" onClick={open}>Edit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
        <Zap className="w-3 h-3" /> Stats Editor
      </p>
      {pairs.map((pair, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input value={pair.key} onChange={(e) => { const n = [...pairs]; n[i] = { ...pair, key: e.target.value }; setPairs(n); }} placeholder="Stat name" className="h-7 bg-input text-xs flex-1" />
          <Input value={pair.val} onChange={(e) => { const n = [...pairs]; n[i] = { ...pair, val: e.target.value }; setPairs(n); }} placeholder="Value" className="h-7 bg-input text-xs w-20 font-mono" />
          <button onClick={() => setPairs((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-400" onClick={() => setPairs((p) => [...p, { key: "", val: "" }])}>
          <Plus className="w-2.5 h-2.5 mr-0.5" /> Add stat
        </Button>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" className="h-6 text-xs" onClick={save} disabled={updateEntity.isPending}>
            {updateEntity.isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-0.5" /> : <Check className="w-2.5 h-2.5 mr-0.5" />} Save
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Entity Properties ─────────────────────────────────────────────────────────

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
      setNewProp({ name: "", dataType: "number", defaultValue: "" }); refresh();
    } catch (err) { toast({ title: "Could not add property", description: errMsg(err), variant: "destructive" }); }
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
    } catch (err) { toast({ title: "Update failed", description: errMsg(err), variant: "destructive" }); }
  };

  const handleDeleteProp = async (propId: number) => {
    try { await deleteProperty.mutateAsync({ projectId, entityId, propertyId: propId }); refresh(); }
    catch (err) { toast({ title: "Delete failed", description: errMsg(err), variant: "destructive" }); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <Tag className="w-3 h-3 inline mr-1" />
          Properties {properties && properties.length > 0 ? `(${properties.length})` : ""}
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : properties && properties.length > 0 ? (
        <div className="rounded-md border border-border divide-y divide-border/50 overflow-hidden">
          {properties.map((prop) => (
            editingId === prop.id ? (
              <div key={prop.id} className="flex gap-2 items-center px-3 py-2 bg-muted/10">
                <Input value={editProp.name} onChange={(e) => setEditProp({ ...editProp, name: e.target.value })} className="h-6 bg-input text-xs flex-1" autoFocus />
                <Select value={editProp.dataType} onValueChange={(v) => setEditProp({ ...editProp, dataType: v })}>
                  <SelectTrigger className="h-6 bg-input text-xs w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["number", "string", "boolean", "enum"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={editProp.defaultValue} onChange={(e) => setEditProp({ ...editProp, defaultValue: e.target.value })} className="h-6 bg-input text-xs font-mono w-20" placeholder="Value" />
                <Button size="sm" className="h-6 text-xs gap-1" onClick={saveEdit}><Check className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
              </div>
            ) : (
              <div key={prop.id} className="flex items-center gap-2 px-3 py-2 text-xs group/prop">
                <code className="font-mono text-white flex-1 truncate">{prop.name}</code>
                <Badge variant="outline" className="text-[9px] font-mono bg-secondary/30">{prop.dataType}</Badge>
                <span className="font-mono text-muted-foreground w-12 text-right">{displayValue(prop)}</span>
                <button onClick={() => startEdit(prop)} className="text-muted-foreground hover:text-primary opacity-0 group-hover/prop:opacity-100"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => handleDeleteProp(prop.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover/prop:opacity-100"><Trash2 className="w-3 h-3" /></button>
              </div>
            )
          ))}
        </div>
      ) : null}
      {/* Add property */}
      <form onSubmit={handleAddProp} className="flex gap-1.5 items-center">
        <Input
          value={newProp.name}
          onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
          placeholder="Property name…"
          className="h-7 bg-input text-xs flex-1"
        />
        <Select value={newProp.dataType} onValueChange={(v) => setNewProp({ ...newProp, dataType: v })}>
          <SelectTrigger className="h-7 bg-input text-xs w-24 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>{["number", "string", "boolean", "enum"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Input
          value={newProp.defaultValue}
          onChange={(e) => setNewProp({ ...newProp, defaultValue: e.target.value })}
          placeholder="Default"
          className="h-7 bg-input text-xs font-mono w-20 shrink-0"
        />
        <Button type="submit" size="sm" className="h-7 text-xs shrink-0" disabled={!newProp.name || createProperty.isPending}>
          {createProperty.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        </Button>
      </form>
    </div>
  );
}
