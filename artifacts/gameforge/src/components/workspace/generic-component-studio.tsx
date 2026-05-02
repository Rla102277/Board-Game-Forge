import { useState, useMemo, useRef, type ReactNode } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Loader2, Sparkles, X, Download, Hash, BarChart2, Filter } from "lucide-react";
import {
  COMPONENT_META, COMPONENT_SUBTYPES, STATUS_OPTIONS, getStatusMeta,
  type ComponentType,
} from "@/lib/game-component-types";

export interface ExtraColumn {
  header: string;
  /** key in Entity, or "__custom" if provided via render */
  key?: keyof Entity | string;
  width?: string;
  render: (entity: Entity) => ReactNode;
  /** optional inline editor for the cell */
  editable?: { field: keyof Entity; placeholder?: string };
}

export interface GenericComponentStudioProps {
  projectId: number;
  /** Game-piece type this studio is rendering */
  type: ComponentType;
  /** Optional parent entity (e.g. a Deck container for cards). When provided, new entities are created with parentEntityId set. */
  parentEntity?: Entity;
  /** The entities to display in the studio table */
  entities: Entity[];
  onRefresh: () => void;
  /** Extra type-specific columns inserted between Subtype and Description */
  extraColumns?: ExtraColumn[];
  /** Extra toolbar buttons rendered on the right of the header */
  extraToolbar?: ReactNode;
  /** AI prompt suggestion chips shown in the AI panel */
  aiPromptSeeds?: string[];
  /** Custom AI prompt prefix (defaults to a generic one based on `type`) */
  buildAiPrompt?: (userPrompt: string, count: number) => string;
}

function exportSetCSV(typeLabel: string, parentName: string | undefined, items: Entity[], extraColumns: ExtraColumn[]) {
  const baseHeaders = ["Name", "Subtype", "Status", "Description", "Lore / Flavor", "Designer Notes"];
  const extraHeaders = extraColumns.map(c => c.header);
  const headers = [...baseHeaders.slice(0, 3), ...extraHeaders, ...baseHeaders.slice(3)];
  const rows = items.map(e => {
    const base = [
      e.name,
      e.subtype ?? "",
      e.status ?? "draft",
      (e.description ?? "").replace(/"/g, '""'),
      (e.lore ?? "").replace(/"/g, '""'),
      (e.designNotes ?? "").replace(/"/g, '""'),
    ];
    const extras = extraColumns.map(c => {
      if (c.editable) return String(e[c.editable.field] ?? "").replace(/"/g, '""');
      return "";
    });
    return [...base.slice(0, 3), ...extras, ...base.slice(3)];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fname = (parentName ?? typeLabel).replace(/\W+/g, "_");
  a.href = url;
  a.download = `${fname}_${typeLabel.toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function GenericComponentStudio({
  projectId, type, parentEntity, entities, onRefresh,
  extraColumns = [], extraToolbar, aiPromptSeeds = [], buildAiPrompt,
}: GenericComponentStudioProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const deleteEntity = useDeleteEntity();
  const aiGenerate = useAiGenerateEntities();

  const meta = COMPONENT_META[type];
  const subtypes = COMPONENT_SUBTYPES[type] ?? [];

  const { data: allProperties } = useListProjectEntityProperties(projectId);
  const propsByEntity = useMemo(() => {
    const m = new Map<number, { name: string; value: number | null }[]>();
    for (const p of allProperties ?? []) {
      if (!entities.find(e => e.id === p.entityId)) continue;
      const arr = m.get(p.entityId) ?? [];
      const numVal = typeof p.value === "number" ? p.value : (p.defaultValue != null ? Number(p.defaultValue) : null);
      arr.push({ name: p.name, value: Number.isFinite(numVal as number) ? (numVal as number) : null });
      m.set(p.entityId, arr);
    }
    return m;
  }, [allProperties, entities]);

  type EditCell = { entityId: number; field: keyof Entity };
  const [editingCell, setEditingCell] = useState<EditCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [quickName, setQuickName] = useState("");
  const [quickSubtype, setQuickSubtype] = useState("");
  const quickRef = useRef<HTMLInputElement>(null);

  const [showAI, setShowAI] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [subtypeFilter, setSubtypeFilter] = useState<string>("all");

  const startEdit = (entityId: number, field: keyof Entity, value: string) => {
    setEditingCell({ entityId, field });
    setEditValue(value);
  };

  const commitEdit = async () => {
    if (!editingCell || saving) return;
    setSaving(true);
    try {
      await updateEntity.mutateAsync({
        projectId, entityId: editingCell.entityId,
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
          type,
          subtype: quickSubtype || undefined,
          ...(parentEntity ? { parentEntityId: parentEntity.id } : {}),
        },
      });
      setQuickName("");
      setQuickSubtype("");
      quickRef.current?.focus();
      onRefresh();
    } catch {
      toast({ title: `Could not add ${type.toLowerCase()}`, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    try {
      await deleteEntity.mutateAsync({ projectId, entityId: id });
      onRefresh();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const updateStatus = async (entityId: number, status: string) => {
    try {
      await updateEntity.mutateAsync({ projectId, entityId, data: { status } });
      onRefresh();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    setGenerating(true);
    const beforeIds = new Set(entities.map(e => e.id));
    try {
      const fullPrompt = buildAiPrompt
        ? buildAiPrompt(aiPrompt, aiCount)
        : `Generate ${aiCount} ${type.toLowerCase()}${aiCount === 1 ? "" : "s"} ${parentEntity ? `for "${parentEntity.name}"` : ""}. ${aiPrompt}. Each should be type "${type}" with a clear name, subtype, and 1-2 sentence description.`;
      await aiGenerate.mutateAsync({ projectId, data: { prompt: fullPrompt, count: aiCount } });
      qc.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
      await new Promise(r => setTimeout(r, 600));
      const cached = qc.getQueryData<Entity[]>(getListEntitiesQueryKey(projectId)) ?? [];
      const newOnes = cached.filter(e => e.type === type && !beforeIds.has(e.id));
      // If we have a parent and new entities aren't yet linked, link them
      if (parentEntity && newOnes.length > 0) {
        await Promise.allSettled(newOnes
          .filter(e => e.parentEntityId !== parentEntity.id)
          .map(e => updateEntity.mutateAsync({ projectId, entityId: e.id, data: { parentEntityId: parentEntity.id } })));
      }
      setAiPrompt("");
      setShowAI(false);
      onRefresh();
      toast({ title: `${aiCount} ${type.toLowerCase()}${aiCount === 1 ? "" : "s"} generated` });
    } catch (err) {
      toast({ title: "AI generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const CellText = ({ entityId, field, value, placeholder }: { entityId: number; field: keyof Entity; value: string; placeholder?: string }) => {
    const isEditing = editingCell?.entityId === entityId && editingCell.field === field;
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
        onClick={() => startEdit(entityId, field, value)}
        title={value || placeholder}
      >
        {value || <span className="text-muted-foreground/30 italic">{placeholder ? `${placeholder}…` : "—"}</span>}
      </div>
    );
  };

  // Derived stats
  const subtypeCounts = useMemo(() => entities.reduce<Record<string, number>>((acc, e) => {
    const k = e.subtype || "Uncategorized";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}), [entities]);

  const statusCounts = useMemo(() => entities.reduce<Record<string, number>>((acc, e) => {
    const k = e.status || "draft";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}), [entities]);

  const propStats = useMemo(() => {
    const stats: Record<string, { values: number[]; avg: number; min: number; max: number }> = {};
    for (const ent of entities) {
      const props = propsByEntity.get(ent.id) ?? [];
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
  }, [entities, propsByEntity]);

  const filteredEntities = useMemo(
    () => subtypeFilter === "all" ? entities : entities.filter(e => (e.subtype || "Uncategorized") === subtypeFilter),
    [entities, subtypeFilter]
  );

  const allSubtypes = useMemo(() => Object.keys(subtypeCounts), [subtypeCounts]);

  const typeLabel = type;
  const typeLabelLower = type.toLowerCase();

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-background/30" data-testid={`generic-studio-${type.toLowerCase()}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10 border-b border-border/40 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5 shrink-0">
            <span className="text-base">{meta.icon}</span>
            <Hash className={`w-3.5 h-3.5 ${meta.color}`} />
            {entities.length} {entities.length === 1 ? typeLabelLower : `${typeLabelLower}s`}
          </span>
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.filter(s => statusCounts[s.value]).map(s => (
              <Tooltip key={s.value}>
                <TooltipTrigger asChild>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border cursor-default ${s.color}`}>
                    {statusCounts[s.value]} {s.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{statusCounts[s.value]} {s.label} {typeLabelLower}{statusCounts[s.value] === 1 ? "" : "s"}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 items-center">
          {extraToolbar}
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-white" onClick={() => setShowStats(v => !v)}>
            <BarChart2 className="w-3 h-3" /> Stats
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary hover:bg-primary/10" onClick={() => setShowAI(v => !v)}>
            <Sparkles className="w-3 h-3" /> AI Generate
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-white" onClick={() => exportSetCSV(typeLabel, parentEntity?.name, entities, extraColumns)} disabled={entities.length === 0}>
            <Download className="w-3 h-3" /> CSV
          </Button>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && (
        <div className="px-4 py-3 border-b border-border/40 bg-card/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white flex items-center gap-1.5"><BarChart2 className={`w-3.5 h-3.5 ${meta.color}`} /> {typeLabel} Statistics</p>
            <button onClick={() => setShowStats(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Subtypes</p>
              <div className="space-y-1">
                {Object.entries(subtypeCounts).map(([k, count]) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div className={`h-full rounded-full ${meta.bg.replace("/5", "/80")}`} style={{ width: `${(count / Math.max(entities.length, 1)) * 100}%`, background: "currentColor" }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-24 truncate">{k}</span>
                    <span className="text-[10px] text-muted-foreground w-4 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(subtypeCounts).length === 0 && <p className="text-[10px] text-muted-foreground/50 italic">No items yet</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Production Status</p>
              <div className="space-y-1">
                {STATUS_OPTIONS.filter(s => (statusCounts[s.value] ?? 0) > 0).map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${((statusCounts[s.value] ?? 0) / Math.max(entities.length, 1)) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-16">{s.label}</span>
                    <span className="text-[10px] text-muted-foreground w-4 text-right">{statusCounts[s.value] ?? 0}</span>
                  </div>
                ))}
                {entities.length === 0 && <p className="text-[10px] text-muted-foreground/50 italic">No items yet</p>}
              </div>
            </div>
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

      {/* AI panel */}
      {showAI && (
        <div className="px-4 py-3 border-b border-border/40 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" /> Batch Generate {typeLabel}{aiCount === 1 ? "" : "s"}</p>
            <button onClick={() => setShowAI(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" /></button>
          </div>
          {aiPromptSeeds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {aiPromptSeeds.map(seed => (
                <button
                  key={seed}
                  onClick={() => setAiPrompt(seed)}
                  className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10"
                >
                  {seed}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAIGenerate(); }}
              placeholder={`e.g. "varied ${typeLabelLower}s for ${parentEntity?.name ?? "the game"}"…`}
              className="h-8 text-xs bg-input flex-1"
            />
            <Select value={aiCount.toString()} onValueChange={v => setAiCount(parseInt(v))}>
              <SelectTrigger className="h-8 w-16 text-xs bg-input shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>{[3, 5, 8, 12, 20].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAIGenerate} disabled={!aiPrompt || generating} className="w-full h-7 text-xs gap-1.5">
            {generating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> Generate {aiCount} {typeLabelLower}{aiCount === 1 ? "" : "s"}</>}
          </Button>
        </div>
      )}

      {/* Subtype filter tabs */}
      {allSubtypes.length > 1 && (
        <div className="flex gap-0.5 px-3 py-1.5 border-b border-border/40 bg-muted/5 overflow-x-auto">
          <button
            onClick={() => setSubtypeFilter("all")}
            className={`px-2.5 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${subtypeFilter === "all" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
          >
            All ({entities.length})
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

      {/* Table */}
      {entities.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="text-3xl">{meta.icon}</div>
          <p className="text-xs text-muted-foreground">No {typeLabelLower}s yet — add manually below or use AI Generate.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10">
                <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Status</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Name</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Subtype</th>
                {extraColumns.map((c, i) => (
                  <th key={i} className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: c.width }}>{c.header}</th>
                ))}
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Lore / Flavor</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredEntities.map(ent => {
                const sm = getStatusMeta(ent.status ?? "draft");
                return (
                  <tr key={ent.id} className="hover:bg-muted/10 transition-colors group" data-testid={`studio-row-${ent.id}`}>
                    <td className="px-1 py-0.5">
                      <Select value={ent.status || "draft"} onValueChange={v => updateStatus(ent.id, v)}>
                        <SelectTrigger className="h-6 text-[10px] bg-transparent border-transparent hover:border-primary/20 hover:bg-primary/5 w-full gap-1 px-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${sm.color}`}>
                            {sm.label}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-1 py-0.5">
                      <CellText entityId={ent.id} field="name" value={ent.name} placeholder="Name" />
                    </td>
                    <td className="px-1 py-0.5">
                      <Select value={ent.subtype || ""} onValueChange={v => updateEntity.mutateAsync({ projectId, entityId: ent.id, data: { subtype: v || undefined } }).then(onRefresh)}>
                        <SelectTrigger className="h-6 text-[10px] bg-transparent border-transparent hover:border-primary/20 w-full px-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {subtypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    {extraColumns.map((c, i) => (
                      <td key={i} className="px-1 py-0.5">
                        {c.editable
                          ? <CellText entityId={ent.id} field={c.editable.field} value={String(ent[c.editable.field] ?? "")} placeholder={c.editable.placeholder} />
                          : c.render(ent)}
                      </td>
                    ))}
                    <td className="px-1 py-0.5">
                      <CellText entityId={ent.id} field="description" value={ent.description ?? ""} placeholder="Effect / description" />
                    </td>
                    <td className="px-1 py-0.5">
                      <CellText entityId={ent.id} field="lore" value={ent.lore ?? ""} placeholder="Flavor text" />
                    </td>
                    <td className="px-1 py-0.5">
                      <button
                        onClick={() => handleDelete(ent.id, ent.name)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 transition-opacity p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Quick-add row */}
              <tr className="bg-muted/5">
                <td className="px-1 py-1" />
                <td className="px-1 py-1">
                  <Input
                    ref={quickRef}
                    value={quickName}
                    onChange={e => setQuickName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); }}
                    placeholder={`+ New ${typeLabelLower}`}
                    className="h-6 text-xs bg-input/40 border-dashed px-2"
                  />
                </td>
                <td className="px-1 py-1">
                  <Select value={quickSubtype} onValueChange={setQuickSubtype}>
                    <SelectTrigger className="h-6 text-[10px] bg-input/40 border-dashed px-1.5"><SelectValue placeholder="Subtype" /></SelectTrigger>
                    <SelectContent>{subtypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td colSpan={extraColumns.length + 2} />
                <td className="px-1 py-1">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={handleQuickAdd} disabled={!quickName.trim() || createEntity.isPending}>
                    {createEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
