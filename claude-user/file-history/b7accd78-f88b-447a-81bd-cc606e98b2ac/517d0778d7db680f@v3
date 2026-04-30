import { useState, useMemo, useRef } from "react";
import {
  useUpdateEntity, useCreateEntity, useDeleteEntity,
  type Entity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, Upload, Loader2 } from "lucide-react";
import {
  ALL_COMPONENT_TYPES, COMPONENT_SUBTYPES, STATUS_OPTIONS, getMeta,
} from "@/lib/game-component-types";

type SheetField = "name" | "type" | "subtype" | "description" | "lore" | "status";

interface EditingCell { entityId: number; field: SheetField }

function exportToCSV(entities: Entity[], projectName: string) {
  const headers = ["Name", "Type", "Subtype", "Description / Effect", "Flavor Text", "Status"];
  const rows = entities.map(e => [
    e.name,
    e.type,
    e.subtype ?? "",
    (e.description ?? "").replace(/"/g, '""'),
    (e.lore ?? "").replace(/"/g, '""'),
    e.status ?? "draft",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(projectName || "components").replace(/\s+/g, "_")}_sheet.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface EntitySheetViewProps {
  projectId: number;
  entities: Entity[];
  projectName: string;
  onRefresh: () => void;
}

export function EntitySheetView({ projectId, entities, projectName, onRefresh }: EntitySheetViewProps) {
  const { toast } = useToast();
  const updateEntity = useUpdateEntity();
  const createEntity = useCreateEntity();
  const deleteEntity = useDeleteEntity();

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [newRow, setNewRow] = useState({ name: "", type: "Card", subtype: "" });
  const [addingRow, setAddingRow] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState<"name" | "type">("type");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const topLevel = useMemo(() => {
    const childIds = new Set(entities.filter(e => e.parentEntityId).map(e => e.id));
    return entities.filter(e => !childIds.has(e.id));
  }, [entities]);

  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    topLevel.forEach(e => { out[e.type] = (out[e.type] || 0) + 1; });
    return out;
  }, [topLevel]);

  const filtered = useMemo(() => {
    let list = filterType === "all" ? topLevel : topLevel.filter(e => e.type === filterType);
    return [...list].sort((a, b) => {
      const av = sortField === "name" ? a.name : a.type;
      const bv = sortField === "name" ? b.name : b.type;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [topLevel, filterType, sortField, sortDir]);

  const startEdit = (entityId: number, field: SheetField, currentValue: string) => {
    if (editingCell?.entityId === entityId && editingCell.field === field) return;
    setEditingCell({ entityId, field });
    setEditValue(currentValue);
  };

  const commitEdit = async () => {
    if (!editingCell || saving) return;
    const entity = entities.find(e => e.id === editingCell.entityId);
    if (!entity) { setEditingCell(null); return; }
    const currentVal = (entity as unknown as Record<string, unknown>)[editingCell.field] as string ?? "";
    if (editValue === currentVal) { setEditingCell(null); return; }
    setSaving(true);
    try {
      await updateEntity.mutateAsync({
        projectId,
        entityId: editingCell.entityId,
        data: { [editingCell.field]: editValue || undefined } as Parameters<typeof updateEntity.mutateAsync>[0]["data"],
      });
      onRefresh();
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleAddRow = async () => {
    if (!newRow.name.trim()) return;
    setAddingRow(true);
    try {
      await createEntity.mutateAsync({
        projectId,
        data: { name: newRow.name.trim(), type: newRow.type, subtype: newRow.subtype || undefined },
      });
      setNewRow(r => ({ ...r, name: "" }));
      onRefresh();
    } catch {
      toast({ title: "Could not add component", variant: "destructive" });
    } finally {
      setAddingRow(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteEntity.mutateAsync({ projectId, entityId: id });
      onRefresh();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const dataLines = lines.slice(1);
    let imported = 0;
    for (const line of dataLines) {
      const cols = Array.from(line.matchAll(/"([^"]*)"/g)).map(m => m[1]);
      if (!cols[0]?.trim()) continue;
      try {
        await createEntity.mutateAsync({
          projectId,
          data: {
            name: cols[0].trim(),
            type: cols[1]?.trim() || "Card",
            subtype: cols[2]?.trim() || undefined,
            description: cols[3]?.trim() || undefined,
            lore: cols[4]?.trim() || undefined,
          },
        });
        imported++;
      } catch { /* skip bad rows */ }
    }
    onRefresh();
    toast({ title: `Imported ${imported} components` });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSort = (field: "name" | "type") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const typeOptions = ALL_COMPONENT_TYPES.map(t => ({ value: t, label: `${getMeta(t).icon} ${t}` }));

  const CellText = ({ entityId, field, value }: { entityId: number; field: SheetField; value: string }) => {
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
        className="min-h-[28px] px-2 py-1 text-sm cursor-text rounded hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors truncate"
        onClick={() => startEdit(entityId, field, value)}
        title={value || "click to edit"}
      >
        {value || <span className="text-muted-foreground/30 italic text-xs">—</span>}
      </div>
    );
  };

  const SelectCell = ({
    entityId, field, value, options,
  }: { entityId: number; field: SheetField; value: string; options: { value: string; label: string }[] }) => (
    <Select
      value={value || options[0]?.value || ""}
      onValueChange={async v => {
        try {
          await updateEntity.mutateAsync({
            projectId, entityId,
            data: { [field]: v || undefined } as Parameters<typeof updateEntity.mutateAsync>[0]["data"],
          });
          onRefresh();
        } catch { toast({ title: "Update failed", variant: "destructive" }); }
      }}
    >
      <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:border-primary/20 hover:bg-primary/5 transition-colors w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-3 pb-8">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`text-xs px-2 py-1 rounded border transition-colors ${filterType === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"}`}
          >
            All ({topLevel.length})
          </button>
          {Object.entries(typeCounts).sort().map(([t, c]) => {
            const m = getMeta(t);
            return (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? "all" : t)}
                className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${filterType === t ? `${m.badge}` : "text-muted-foreground border-border hover:text-white"}`}
              >
                <span>{m.icon}</span> {t} ({c})
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex gap-1.5">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => exportToCSV(filtered, projectName)}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Sheet table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">
                  <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                    Name {sortField === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                  <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("type")}>
                    Type {sortField === "type" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Subtype</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description / Effect</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[170px]">Flavor Text</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(entity => (
                <tr key={entity.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-1 py-0.5">
                    <CellText entityId={entity.id} field="name" value={entity.name} />
                  </td>
                  <td className="px-1 py-0.5">
                    <SelectCell
                      entityId={entity.id} field="type" value={entity.type}
                      options={typeOptions}
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <SelectCell
                      entityId={entity.id} field="subtype" value={entity.subtype ?? ""}
                      options={[{ value: "", label: "—" }, ...(COMPONENT_SUBTYPES[entity.type] ?? []).map(s => ({ value: s, label: s }))]}
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <CellText entityId={entity.id} field="description" value={entity.description ?? ""} />
                  </td>
                  <td className="px-1 py-0.5">
                    <CellText entityId={entity.id} field="lore" value={entity.lore ?? ""} />
                  </td>
                  <td className="px-1 py-0.5">
                    <SelectCell
                      entityId={entity.id} field="status" value={entity.status ?? "draft"}
                      options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <button
                      onClick={() => handleDelete(entity.id, entity.name)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Add row */}
              <tr className="border-t border-dashed border-border bg-muted/5">
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="+ new component…"
                    value={newRow.name}
                    onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") handleAddRow(); }}
                    className="h-7 text-xs bg-input"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select value={newRow.type} onValueChange={v => setNewRow(r => ({ ...r, type: v, subtype: "" }))}>
                    <SelectTrigger className="h-7 text-xs bg-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_COMPONENT_TYPES.map(t => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Select value={newRow.subtype || "__none__"} onValueChange={v => setNewRow(r => ({ ...r, subtype: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-7 text-xs bg-input"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {(COMPONENT_SUBTYPES[newRow.type] ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td colSpan={3} className="px-3 py-1.5 text-xs text-muted-foreground italic">
                  Enter name and press Enter or click Add →
                </td>
                <td className="px-2 py-1.5">
                  <Button size="sm" onClick={handleAddRow} disabled={!newRow.name.trim() || addingRow} className="h-7 text-xs gap-1">
                    {addingRow ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Click any cell to edit inline · Enter to confirm · Esc to cancel · {filtered.length} of {topLevel.length} components
      </p>
    </div>
  );
}
