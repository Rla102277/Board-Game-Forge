import { useState, useMemo, useRef } from "react";
import {
  useCreateEntity, useUpdateEntity, useDeleteEntity, useAiGenerateEntities,
  useListProjectEntityProperties,
  getListEntitiesQueryKey, type Entity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Loader2, Sparkles, X, Download, Hash, BarChart2, Filter } from "lucide-react";

const CARD_SUBTYPES = ["Action", "Item", "Spell", "Event", "Quest", "Encounter", "Treasure", "Attack", "Defense", "Custom"];

// Playtest-specific status values
const PLAYTEST_STATUSES = [
  { value: "untested", label: "Untested", dot: "bg-slate-400",   pill: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  { value: "balanced", label: "Balanced", dot: "bg-emerald-400", pill: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "weak",     label: "Weak",     dot: "bg-amber-400",   pill: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "strong",   label: "Strong",   dot: "bg-orange-400",  pill: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "broken",   label: "Broken",   dot: "bg-red-400",     pill: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "unique",   label: "Unique",   dot: "bg-purple-400",  pill: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
] as const;

type PlaytestStatus = typeof PLAYTEST_STATUSES[number]["value"];

function getStatusMeta(val: string | null | undefined) {
  return PLAYTEST_STATUSES.find(s => s.value === val) ?? PLAYTEST_STATUSES[0];
}

function exportDeckCSV(deckName: string, cards: Entity[]) {
  const headers = ["Name", "Subtype", "Status", "Effect / Rules Text", "Flavor Text", "Designer Notes"];
  const rows = cards.map(c => [
    c.name,
    c.subtype ?? "",
    c.status ?? "untested",
    (c.description ?? "").replace(/"/g, '""'),
    (c.lore ?? "").replace(/"/g, '""'),
    (c.designNotes ?? "").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deckName.replace(/\W+/g, "_")}_cards.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface CardStudioProps {
  projectId: number;
  deck: Entity;
  cards: Entity[];
  onRefresh: () => void;
}

export function CardStudio({ projectId, deck, cards, onRefresh }: CardStudioProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const deleteEntity = useDeleteEntity();
  const aiGenerate = useAiGenerateEntities();

  // Properties for all entities in project — used for stats
  const { data: allProperties } = useListProjectEntityProperties(projectId);
  const propsByCard = useMemo(() => {
    const m = new Map<number, { name: string; value: number | null }[]>();
    for (const p of allProperties ?? []) {
      if (!cards.find(c => c.id === p.entityId)) continue;
      const arr = m.get(p.entityId) ?? [];
      const numVal = typeof p.value === "number" ? p.value : (p.defaultValue != null ? Number(p.defaultValue) : null);
      arr.push({ name: p.name, value: isNaN(numVal as number) ? null : numVal });
      m.set(p.entityId, arr);
    }
    return m;
  }, [allProperties, cards]);

  type EditCell = { cardId: number; field: "name" | "description" | "lore" | "designNotes" };
  const [editingCell, setEditingCell] = useState<EditCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick-add row at bottom of table
  const [quickName, setQuickName] = useState("");
  const [quickSubtype, setQuickSubtype] = useState("");
  const quickRef = useRef<HTMLInputElement>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [subtypeFilter, setSubtypeFilter] = useState<string>("all");

  const startEdit = (cardId: number, field: EditCell["field"], value: string) => {
    setEditingCell({ cardId, field });
    setEditValue(value);
  };

  const commitEdit = async () => {
    if (!editingCell || saving) return;
    setSaving(true);
    try {
      await updateEntity.mutateAsync({
        projectId,
        entityId: editingCell.cardId,
        data: { [editingCell.field]: editValue || undefined } as Parameters<typeof updateEntity.mutateAsync>[0]["data"],
      });
      onRefresh();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickName.trim()) return;
    try {
      await createEntity.mutateAsync({
        projectId,
        data: {
          name: quickName.trim(),
          type: "Card",
          subtype: quickSubtype || undefined,
          parentEntityId: deck.id,
        },
      });
      setQuickName("");
      setQuickSubtype("");
      quickRef.current?.focus();
      onRefresh();
    } catch {
      toast({ title: "Could not add card", variant: "destructive" });
    }
  };

  const handleAddCard = async (data: { name: string; subtype: string; description: string; lore: string }) => {
    if (!data.name.trim()) return;
    try {
      await createEntity.mutateAsync({
        projectId,
        data: {
          name: data.name.trim(),
          type: "Card",
          subtype: data.subtype || undefined,
          description: data.description || undefined,
          lore: data.lore || undefined,
          parentEntityId: deck.id,
        },
      });
      setShowAddForm(false);
      onRefresh();
    } catch {
      toast({ title: "Could not add card", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from deck?`)) return;
    try {
      await deleteEntity.mutateAsync({ projectId, entityId: id });
      onRefresh();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const updateStatus = async (cardId: number, status: string) => {
    try {
      await updateEntity.mutateAsync({ projectId, entityId: cardId, data: { status } });
      onRefresh();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    setGenerating(true);
    const beforeIds = new Set(cards.map(c => c.id));
    try {
      const fullPrompt = `Generate ${aiCount} cards for the deck "${deck.name}" (${deck.subtype ?? "custom deck"}). ${aiPrompt}. Each should be type "Card" with a clear name, subtype, rules-text description, and optional flavor text.`;
      await aiGenerate.mutateAsync({ projectId, data: { prompt: fullPrompt, count: aiCount } });
      qc.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
      await new Promise(r => setTimeout(r, 600));
      const cached = qc.getQueryData<Entity[]>(getListEntitiesQueryKey(projectId)) ?? [];
      const newCards = cached.filter(e => e.type === "Card" && !e.parentEntityId && !beforeIds.has(e.id));
      if (newCards.length > 0) {
        await Promise.all(newCards.map(c =>
          updateEntity.mutateAsync({ projectId, entityId: c.id, data: { parentEntityId: deck.id, status: "untested" } })
        ));
      }
      setAiPrompt("");
      setShowAI(false);
      onRefresh();
      toast({ title: `${aiCount} cards generated and added to deck` });
    } catch (err) {
      toast({ title: "AI generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const CellText = ({ cardId, field, value, placeholder }: { cardId: number; field: EditCell["field"]; value: string; placeholder?: string }) => {
    const isEditing = editingCell?.cardId === cardId && editingCell.field === field;
    if (isEditing) {
      return (
        <Input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
          className="h-7 text-xs bg-input border-primary/40 px-2 w-full"
        />
      );
    }
    return (
      <div
        className="min-h-[28px] px-2 py-1 text-xs cursor-text rounded hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors truncate"
        onClick={() => startEdit(cardId, field, value)}
        title={value || placeholder}
      >
        {value || <span className="text-muted-foreground/30 italic">{placeholder ? `${placeholder}…` : "—"}</span>}
      </div>
    );
  };

  // ── Derived stats ────────────────────────────────────────────────────────────

  const subtypeCounts = useMemo(() => cards.reduce<Record<string, number>>((acc, c) => {
    const k = c.subtype || "Uncategorized";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}), [cards]);

  const statusCounts = useMemo(() => cards.reduce<Record<string, number>>((acc, c) => {
    const k = c.status || "untested";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}), [cards]);

  // Property statistics (cost, power, etc.) for cards in this deck
  const propStats = useMemo(() => {
    const stats: Record<string, { values: number[]; avg: number; min: number; max: number }> = {};
    for (const card of cards) {
      const props = propsByCard.get(card.id) ?? [];
      for (const p of props) {
        if (p.value === null) continue;
        if (!stats[p.name]) stats[p.name] = { values: [], avg: 0, min: Infinity, max: -Infinity };
        stats[p.name].values.push(p.value);
        stats[p.name].min = Math.min(stats[p.name].min, p.value);
        stats[p.name].max = Math.max(stats[p.name].max, p.value);
      }
    }
    for (const key of Object.keys(stats)) {
      const vals = stats[key].values;
      stats[key].avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      if (stats[key].min === Infinity) stats[key].min = 0;
      if (stats[key].max === -Infinity) stats[key].max = 0;
    }
    return stats;
  }, [cards, propsByCard]);

  // Filtered card list
  const filteredCards = useMemo(
    () => subtypeFilter === "all" ? cards : cards.filter(c => (c.subtype || "Uncategorized") === subtypeFilter),
    [cards, subtypeFilter]
  );

  const allSubtypes = useMemo(() => Object.keys(subtypeCounts), [subtypeCounts]);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-background/30">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10 border-b border-border/40 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5 shrink-0">
            <Hash className="w-3.5 h-3.5 text-indigo-400" />
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </span>
          {/* Status breakdown */}
          <div className="flex gap-1 flex-wrap">
            {PLAYTEST_STATUSES.filter(s => statusCounts[s.value]).map(s => (
              <Tooltip key={s.value}>
                <TooltipTrigger asChild>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border cursor-default ${s.pill}`}>
                    {statusCounts[s.value]} {s.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{statusCounts[s.value]} {s.label} cards</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-white" onClick={() => setShowStats(v => !v)}>
            <BarChart2 className="w-3 h-3" /> Stats
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary hover:bg-primary/10" onClick={() => { setShowAI(v => !v); setShowAddForm(false); }}>
            <Sparkles className="w-3 h-3" /> AI Generate
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-white" onClick={() => exportDeckCSV(deck.name, cards)} disabled={cards.length === 0}>
            <Download className="w-3 h-3" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setShowAddForm(v => !v); setShowAI(false); }}>
            <Plus className="w-3 h-3" /> Add card
          </Button>
        </div>
      </div>

      {/* ── Stats panel ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="px-4 py-3 border-b border-border/40 bg-card/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5 text-indigo-400" /> Deck Statistics</p>
            <button onClick={() => setShowStats(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* Subtype breakdown */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Subtypes</p>
              <div className="space-y-1">
                {Object.entries(subtypeCounts).map(([k, count]) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(count / cards.length) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-24 truncate">{k}</span>
                    <span className="text-[10px] text-muted-foreground w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Status breakdown */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Playtest Status</p>
              <div className="space-y-1">
                {PLAYTEST_STATUSES.filter(s => (statusCounts[s.value] ?? 0) > 0).map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div className={`h-full rounded-full ${s.dot}`} style={{ width: `${((statusCounts[s.value] ?? 0) / cards.length) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-16">{s.label}</span>
                    <span className="text-[10px] text-muted-foreground w-4 text-right">{statusCounts[s.value] ?? 0}</span>
                  </div>
                ))}
                {cards.length === 0 && <p className="text-[10px] text-muted-foreground/50 italic">No cards yet</p>}
              </div>
            </div>
            {/* Property stats */}
            {Object.keys(propStats).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Properties</p>
                <div className="space-y-1.5">
                  {Object.entries(propStats).slice(0, 5).map(([name, s]) => (
                    <div key={name} className="flex items-baseline gap-1.5">
                      <span className="text-[10px] text-muted-foreground w-16 truncate">{name}</span>
                      <span className="text-[10px] font-mono text-white">avg {s.avg}</span>
                      <span className="text-[10px] text-muted-foreground/50">({s.min}–{s.max})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI Generate panel ────────────────────────────────────────────────── */}
      {showAI && (
        <div className="px-4 py-3 border-b border-border/40 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" /> Batch Generate Cards</p>
            <button onClick={() => setShowAI(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" /></button>
          </div>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAIGenerate(); }}
              placeholder={`e.g. "mix of attack, spell, and item cards for ${deck.name}"…`}
              className="h-8 text-xs bg-input flex-1"
            />
            <Select value={aiCount.toString()} onValueChange={v => setAiCount(parseInt(v))}>
              <SelectTrigger className="h-8 w-16 text-xs bg-input shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>{[3, 5, 8, 12, 20].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAIGenerate} disabled={!aiPrompt || generating} className="w-full h-7 text-xs gap-1.5">
            {generating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> Generate {aiCount} cards</>}
          </Button>
        </div>
      )}

      {/* ── Full add form ─────────────────────────────────────────────────────── */}
      {showAddForm && (
        <AddCardForm
          onAdd={handleAddCard}
          onCancel={() => setShowAddForm(false)}
          isPending={createEntity.isPending}
        />
      )}

      {/* ── Subtype filter tabs ──────────────────────────────────────────────── */}
      {allSubtypes.length > 1 && (
        <div className="flex gap-0.5 px-3 py-1.5 border-b border-border/40 bg-muted/5 overflow-x-auto">
          <button
            onClick={() => setSubtypeFilter("all")}
            className={`px-2.5 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${subtypeFilter === "all" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
          >
            All ({cards.length})
          </button>
          {allSubtypes.map(st => (
            <button
              key={st}
              onClick={() => setSubtypeFilter(st)}
              className={`px-2.5 py-0.5 rounded text-[11px] flex items-center gap-1 whitespace-nowrap transition-colors ${subtypeFilter === st ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
            >
              <Filter className="w-2.5 h-2.5" />
              {st} ({subtypeCounts[st]})
            </button>
          ))}
        </div>
      )}

      {/* ── Cards table ──────────────────────────────────────────────────────── */}
      {cards.length === 0 && !showAddForm ? (
        <div className="py-10 text-center space-y-2">
          <p className="text-xs text-muted-foreground">No cards yet — add manually or use AI Generate.</p>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddForm(true)}>
            <Plus className="w-3 h-3" /> Add first card
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10">
                <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Status</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Name</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Subtype</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Effect / Rules Text</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Flavor Text</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredCards.map(card => {
                const sm = getStatusMeta(card.status);
                return (
                  <tr key={card.id} className="hover:bg-muted/10 transition-colors group">
                    {/* Status */}
                    <td className="px-1 py-0.5">
                      <Select
                        value={card.status || "untested"}
                        onValueChange={v => updateStatus(card.id, v)}
                      >
                        <SelectTrigger className="h-6 text-[10px] bg-transparent border-transparent hover:border-primary/20 hover:bg-primary/5 w-full gap-1 px-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${sm.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                            {sm.label}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {PLAYTEST_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                                {s.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Name */}
                    <td className="px-1 py-0.5">
                      <CellText cardId={card.id} field="name" value={card.name} placeholder="Card name" />
                    </td>
                    {/* Subtype */}
                    <td className="px-1 py-0.5">
                      <Select
                        value={card.subtype || "__none__"}
                        onValueChange={async v => {
                          try {
                            await updateEntity.mutateAsync({ projectId, entityId: card.id, data: { subtype: v === "__none__" ? undefined : v } });
                            onRefresh();
                          } catch { toast({ title: "Update failed", variant: "destructive" }); }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:border-primary/20 hover:bg-primary/5 w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {CARD_SUBTYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Effect */}
                    <td className="px-1 py-0.5">
                      <CellText cardId={card.id} field="description" value={card.description ?? ""} placeholder="effect text" />
                    </td>
                    {/* Flavor */}
                    <td className="px-1 py-0.5">
                      <CellText cardId={card.id} field="lore" value={card.lore ?? ""} placeholder="flavor text" />
                    </td>
                    {/* Delete */}
                    <td className="px-1 py-0.5">
                      <button
                        onClick={() => handleDelete(card.id, card.name)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Quick-add row */}
              <tr className="border-t border-dashed border-border/50 bg-muted/5">
                <td className="px-1 py-1">
                  <span className="text-[10px] text-muted-foreground/40 px-2">Untested</span>
                </td>
                <td className="px-1 py-1" colSpan={2}>
                  <div className="flex gap-1">
                    <Input
                      ref={quickRef}
                      value={quickName}
                      onChange={e => setQuickName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); }}
                      placeholder="+ Type name and press Enter"
                      className="h-7 text-xs bg-input/50 border-dashed border-border/50 focus:border-primary/40 flex-1"
                    />
                    <Select value={quickSubtype || "__none__"} onValueChange={v => setQuickSubtype(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-7 w-24 text-xs bg-input/50 border-dashed border-border/50 shrink-0">
                        <SelectValue placeholder="Subtype" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {CARD_SUBTYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </td>
                <td className="px-1 py-1" colSpan={3}>
                  {createEntity.isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-2" />}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Add Card Full Form ─────────────────────────────────────────────────────────

function AddCardForm({ onAdd, onCancel, isPending }: {
  onAdd: (data: { name: string; subtype: string; description: string; lore: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ name: "", subtype: "", description: "", lore: "" });
  return (
    <div className="px-4 py-3 border-b border-border/40 bg-card/50 space-y-2">
      <p className="text-xs font-medium text-white">New card</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Name *</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="h-7 text-xs bg-input"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") onAdd(form); }}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Subtype</Label>
          <Select value={form.subtype || "__none__"} onValueChange={v => setForm(f => ({ ...f, subtype: v === "__none__" ? "" : v }))}>
            <SelectTrigger className="h-7 text-xs bg-input"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {CARD_SUBTYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Effect / Rules text</Label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-7 text-xs bg-input" placeholder="When played…" />
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Flavor text</Label>
        <Input value={form.lore} onChange={e => setForm(f => ({ ...f, lore: e.target.value }))} className="h-7 text-xs bg-input" placeholder="A brief narrative quote…" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onAdd(form)} disabled={!form.name.trim() || isPending} className="h-7 text-xs gap-1">
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add to deck
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
