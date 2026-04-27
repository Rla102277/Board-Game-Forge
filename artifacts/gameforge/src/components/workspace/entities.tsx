import { useState, useMemo } from "react";
import {
  useListEntities, useCreateEntity, useUpdateEntity, useDeleteEntity,
  useAiGenerateEntities,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Settings,
  Sparkles, Loader2, Check, Wand2, X, Pencil, Copy, Box,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const ENTITY_TYPES = ["Item", "Faction", "Location", "Event"] as const;
type EntityType = typeof ENTITY_TYPES[number];

const ENTITY_DOCS: Record<EntityType, { color: string; bg: string; badge: string; icon: string }> = {
  Item:     { color: "text-blue-400",   bg: "bg-blue-500/5",   badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",     icon: "📦" },
  Faction:  { color: "text-purple-400", bg: "bg-purple-500/5", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: "⚔️" },
  Location: { color: "text-green-400",  bg: "bg-green-500/5",  badge: "bg-green-500/20 text-green-400 border-green-500/30",   icon: "🗺️" },
  Event:    { color: "text-amber-400",  bg: "bg-amber-500/5",  badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",   icon: "⚡" },
};

function typeBadge(type: string) {
  return ENTITY_DOCS[type as EntityType]?.badge ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
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
  const [newEntity, setNewEntity] = useState({ name: "", type: "Item", description: "" });
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    try {
      await aiGenerate.mutateAsync({ projectId, data: { prompt: aiPrompt, count: aiCount } });
      setAiPrompt("");
      setShowAIPanel(false);
      refresh();
      toast({ title: "AI entities generated" });
    } catch (err) {
      toast({ title: "AI generate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleAddEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.name) return;
    try {
      await createEntity.mutateAsync({ projectId, data: newEntity });
      setNewEntity({ name: "", type: "Item", description: "" });
      setShowAddForm(false);
      refresh();
    } catch (err) {
      toast({ title: "Could not create entity", description: errMsg(err), variant: "destructive" });
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

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    (entities ?? []).forEach((e) => { out[e.type] = (out[e.type] || 0) + 1; });
    return out;
  }, [entities]);

  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    if (filterType === "all") return entities;
    return entities.filter((e) => e.type === filterType);
  }, [entities, filterType]);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" /> Entity Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entities?.length ?? 0} entities · expand any card to manage its properties · click AI Enhance for design suggestions
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
            size="sm"
            className="bg-primary text-primary-foreground h-8"
            data-testid="entities-add-toggle"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Entity
          </Button>
        </div>
      </div>

      {/* Type filter pills */}
      {entities && entities.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterType === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"
            }`}
            data-testid="filter-entities-all"
          >
            All ({entities.length})
          </button>
          {ENTITY_TYPES.map((t) => {
            const count = typeCounts[t];
            if (!count) return null;
            const doc = ENTITY_DOCS[t];
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                  filterType === t ? doc.badge : "text-muted-foreground border-border hover:text-white"
                }`}
                data-testid={`filter-entities-${t.toLowerCase()}`}
              >
                <span>{doc.icon}</span> {t} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* AI generate panel */}
      {showAIPanel && (
        <Card className="p-4 bg-card border-primary/30 border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Entity Generator</p>
            <button onClick={() => setShowAIPanel(false)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. 5 unique faction archetypes for a galactic trade game…"
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

      {/* Add entity form */}
      {showAddForm && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-primary" /> New Entity</p>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <form onSubmit={handleAddEntity} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={newEntity.name} onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })} className="h-8 bg-input" autoFocus />
              </div>
              <div className="w-40 space-y-1 shrink-0">
                <Label className="text-xs">Type</Label>
                <Select value={newEntity.type} onValueChange={(v) => setNewEntity({ ...newEntity, type: v })}>
                  <SelectTrigger className="h-8 bg-input text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{ENTITY_DOCS[t].icon} {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={newEntity.description}
                onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })}
                className="h-16 resize-none bg-input"
                placeholder="What is this entity, in one or two sentences?"
              />
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={createEntity.isPending}>
              {createEntity.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Add Entity
            </Button>
          </form>
        </Card>
      )}

      {/* Entity list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : !entities || entities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <Box className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No entities yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">Generate some with AI above or add them manually.</p>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
          <p className="text-muted-foreground text-sm">No {filterType} entities yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              projectId={projectId}
              isExpanded={expandedIds.has(entity.id)}
              onToggle={() => toggleExpand(entity.id)}
              onDelete={() => handleDelete(entity.id, entity.name)}
              onUpdated={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Entity Card — header, inline edit, AI Enhance preview, expanded properties
// ════════════════════════════════════════════════════════════════════════════
function EntityCard({
  entity, projectId, isExpanded, onToggle, onDelete, onUpdated,
}: {
  entity: Entity;
  projectId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const updateEntity = useUpdateEntity();
  const createEntity = useCreateEntity();
  const createProperty = useCreateEntityProperty();
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
    description: entity.description ?? "",
  });

  const doc = ENTITY_DOCS[entity.type as EntityType];
  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const handleSaveEdit = async () => {
    try {
      await updateEntity.mutateAsync({
        projectId,
        entityId: entity.id,
        data: editForm,
      });
      setIsEditing(false);
      onUpdated();
      toast({ title: "Entity updated" });
    } catch (err) {
      toast({ title: "Update failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    try {
      await createEntity.mutateAsync({
        projectId,
        data: {
          name: `${entity.name} (Copy)`,
          type: entity.type,
          description: entity.description ?? "",
        },
      });
      onUpdated();
      toast({ title: "Entity duplicated" });
    } catch (err) {
      toast({ title: "Duplicate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true);
    setEnhance(null);
    setShowEnhance(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/entities/${entity.id}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      if (res.ok) {
        const raw = (await res.json()) as Partial<AIEnhance> | null;
        const safeProps = Array.isArray(raw?.suggestedProperties)
          ? raw!.suggestedProperties.filter((p): p is AIEnhance["suggestedProperties"][number] =>
              !!p && typeof p === "object" && typeof p.name === "string",
            )
          : [];
        const data: AIEnhance = {
          description: typeof raw?.description === "string" ? raw.description : "",
          lore: typeof raw?.lore === "string" ? raw.lore : undefined,
          designNotes: typeof raw?.designNotes === "string" ? raw.designNotes : undefined,
          suggestedProperties: safeProps,
        };
        if (!data.description && data.suggestedProperties.length === 0) {
          toast({
            title: "AI returned no usable suggestions",
            description: "Try regenerating with a different model.",
            variant: "destructive",
          });
          setShowEnhance(false);
        } else {
          setEnhance(data);
          setSelectedProps(new Set(data.suggestedProperties.map((_, i) => i)));
        }
      } else {
        const body = await res.json().catch(() => ({}));
        toast({
          title: "AI enhance failed",
          description: body?.error ?? "Please try again.",
          variant: "destructive",
        });
        setShowEnhance(false);
      }
    } catch {
      toast({
        title: "AI enhance failed",
        description: "Could not reach the server.",
        variant: "destructive",
      });
      setShowEnhance(false);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Convert a string default value into the right column for our schema.
  const buildPropertyPayload = (p: { name: string; dataType: string; defaultValue?: string }) => {
    const payload: {
      name: string;
      dataType: string;
      defaultValue?: number;
      textValue?: string;
    } = { name: p.name, dataType: p.dataType };
    if (p.defaultValue != null && p.defaultValue !== "") {
      const numeric = Number(p.defaultValue);
      if (Number.isFinite(numeric) && p.defaultValue.trim() !== "") {
        payload.defaultValue = numeric;
      } else {
        payload.textValue = p.defaultValue;
      }
    }
    return payload;
  };

  const handleApply = async () => {
    if (!enhance) return;
    setApplying(true);
    try {
      // Apply description
      await updateEntity.mutateAsync({
        projectId,
        entityId: entity.id,
        data: { description: enhance.description },
      });
      // Add selected properties
      const propsToAdd = enhance.suggestedProperties.filter((_, i) => selectedProps.has(i));
      for (const prop of propsToAdd) {
        await createProperty.mutateAsync({
          projectId,
          entityId: entity.id,
          data: buildPropertyPayload(prop),
        });
      }
      queryClient.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entity.id) });
      onUpdated();
      setApplied(true);
      toast({
        title: "Applied!",
        description: `Description updated${propsToAdd.length ? ` and ${propsToAdd.length} ${propsToAdd.length === 1 ? "property" : "properties"} added.` : "."}`,
      });
      setTimeout(() => {
        setShowEnhance(false);
        setApplied(false);
        setEnhance(null);
      }, 1500);
    } catch (err) {
      toast({ title: "Apply failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden transition-shadow hover:shadow-md hover:shadow-black/20">
      {/* Header row — or inline edit mode */}
      {isEditing ? (
        <div className="px-4 py-3 space-y-3 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-input h-8 text-sm font-semibold flex-1 min-w-[140px]"
              placeholder="Entity name"
              autoFocus
            />
            <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="bg-input h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{ENTITY_DOCS[t].icon} {t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description…"
            className="bg-input text-sm resize-none h-16"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs bg-primary text-primary-foreground gap-1" disabled={updateEntity.isPending}>
              {updateEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditForm({ name: entity.name, type: entity.type, description: entity.description ?? "" });
                setIsEditing(false);
              }}
              className="h-7 text-xs text-muted-foreground hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/10 transition-colors"
          onClick={onToggle}
          data-testid={`entity-row-${entity.id}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isExpanded
              ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className={`text-base font-semibold truncate ${doc?.color ?? "text-white"}`}>{entity.name}</span>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${typeBadge(entity.type)}`}>
              {entity.type}
            </Badge>
            {entity.description && (
              <span className="text-xs text-muted-foreground truncate hidden md:block">{entity.description}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs h-7 px-2 gap-1 ${showEnhance ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
              onClick={() => { setShowEnhance(!showEnhance); if (!showEnhance && !enhance) handleEnhance(); }}
              data-testid={`enhance-entity-${entity.id}`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              AI Enhance
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-muted/20"
              onClick={() => {
                setEditForm({ name: entity.name, type: entity.type, description: entity.description ?? "" });
                setIsEditing(true);
              }}
              title="Edit entity"
              data-testid={`edit-entity-${entity.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-muted/20"
              onClick={handleDuplicate}
              title="Duplicate entity"
              data-testid={`duplicate-entity-${entity.id}`}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              title="Delete entity"
              data-testid={`delete-entity-${entity.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* AI Enhance Panel */}
      {showEnhance && (
        <div className={`border-t border-border ${doc?.bg ?? "bg-muted/5"} px-5 py-4`}>
          {isEnhancing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Analyzing entity and generating improvements…
            </div>
          )}

          {enhance && !isEnhancing && (
            <div className="space-y-4" data-testid={`enhance-panel-${entity.id}`}>
              {/* Description preview */}
              <div className="space-y-1.5">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${doc?.color ?? "text-primary"}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Enhanced Description
                </div>
                <p className="text-sm text-white leading-relaxed bg-background/50 border border-border rounded-md p-3">
                  {enhance.description}
                </p>
              </div>

              {/* Lore & Design Notes */}
              {(enhance.lore || enhance.designNotes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {enhance.lore && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flavor / Lore</p>
                      <p className="text-xs text-muted-foreground italic leading-relaxed bg-background/40 border border-border/50 rounded p-2.5">
                        "{enhance.lore}"
                      </p>
                    </div>
                  )}
                  {enhance.designNotes && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Designer's Notes</p>
                      <p className="text-xs text-muted-foreground leading-relaxed bg-background/40 border border-border/50 rounded p-2.5">
                        {enhance.designNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Suggested Properties */}
              {enhance.suggestedProperties.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${doc?.color ?? "text-primary"}`}>
                      Suggested Properties ({enhance.suggestedProperties.length})
                    </p>
                    <div className="flex gap-2 text-xs">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => setSelectedProps(new Set(enhance.suggestedProperties.map((_, i) => i)))}
                      >
                        All
                      </button>
                      <button
                        className="text-muted-foreground hover:underline"
                        onClick={() => setSelectedProps(new Set())}
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {enhance.suggestedProperties.map((prop, i) => {
                      const isSelected = selectedProps.has(i);
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                            isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-muted/10"
                          }`}
                          onClick={() => setSelectedProps((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            return next;
                          })}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected ? "border-primary bg-primary" : "border-border"
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <code className="text-white text-xs font-mono">{prop.name}</code>
                              <Badge variant="outline" className="text-[10px] font-mono bg-secondary/30">{prop.dataType}</Badge>
                              {prop.defaultValue != null && prop.defaultValue !== "" && (
                                <span className="text-xs text-muted-foreground font-mono">= {prop.defaultValue}</span>
                              )}
                            </div>
                            {prop.reason && (
                              <p className="text-xs text-muted-foreground mt-0.5">{prop.reason}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  onClick={handleApply}
                  disabled={applying || applied}
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  data-testid={`apply-enhance-${entity.id}`}
                >
                  {applied
                    ? <><Check className="w-3.5 h-3.5 mr-1.5" />Applied!</>
                    : applying
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Applying…</>
                    : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Apply Description{selectedProps.size > 0 ? ` + ${selectedProps.size} ${selectedProps.size === 1 ? "Property" : "Properties"}` : ""}</>}
                </Button>
                <Button
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  size="sm"
                  variant="outline"
                  className="text-muted-foreground border-border hover:text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Regenerate
                </Button>
                <Button
                  onClick={() => setShowEnhance(false)}
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-white ml-auto"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Properties panel (expanded) */}
      {isExpanded && (
        <div className="px-5 py-4 border-t border-border bg-muted/5">
          <EntityProperties projectId={projectId} entityId={entity.id} />
        </div>
      )}
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Entity Properties sub-component — table with inline editing + add row form
// ════════════════════════════════════════════════════════════════════════════
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

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entityId) });

  // Convert string input → backend payload (numeric → defaultValue, else textValue)
  const valueToPayload = (val: string): { defaultValue?: number; textValue?: string } => {
    if (val === "") return { textValue: "" };
    const num = Number(val);
    if (Number.isFinite(num) && val.trim() !== "") return { defaultValue: num, textValue: "" };
    return { textValue: val, defaultValue: undefined };
  };

  // Display the most relevant column value
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
      const payload = {
        name: newProp.name,
        dataType: newProp.dataType,
        ...valueToPayload(newProp.defaultValue),
      };
      await createProperty.mutateAsync({ projectId, entityId, data: payload });
      setNewProp({ name: "", dataType: "number", defaultValue: "" });
      refresh();
    } catch (err) {
      toast({ title: "Could not add property", description: errMsg(err), variant: "destructive" });
    }
  };

  const startEdit = (prop: EntityProperty) => {
    setEditingId(prop.id);
    setEditProp({
      name: prop.name,
      dataType: prop.dataType,
      defaultValue: displayValue(prop) === "—" ? "" : displayValue(prop),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const payload = {
        name: editProp.name,
        dataType: editProp.dataType,
        ...valueToPayload(editProp.defaultValue),
      };
      await updateProperty.mutateAsync({ projectId, entityId, propertyId: editingId, data: payload });
      setEditingId(null);
      refresh();
    } catch (err) {
      toast({ title: "Could not update property", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProperty.mutateAsync({ projectId, entityId, propertyId: id });
      refresh();
    } catch (err) {
      toast({ title: "Could not delete property", description: errMsg(err), variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-1">Loading properties…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Settings className="w-3.5 h-3.5" /> Properties
        {properties && properties.length > 0 && (
          <span className="text-muted-foreground/50 font-normal normal-case tracking-normal ml-1">
            — click row to edit
          </span>
        )}
      </div>

      {properties && properties.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20 border-b border-border">
            <div className="col-span-4">Name</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-3">Default</div>
            <div className="col-span-2" />
          </div>
          {properties.map((prop) => (
            <div key={prop.id} className="border-b border-border/40 last:border-0">
              {editingId === prop.id ? (
                <div className="grid grid-cols-12 gap-2 px-3 py-2 items-center bg-primary/5 border-l-2 border-primary">
                  <div className="col-span-4">
                    <Input
                      value={editProp.name}
                      onChange={(e) => setEditProp((p) => ({ ...p, name: e.target.value }))}
                      className="h-7 text-xs bg-input font-mono"
                      autoFocus
                    />
                  </div>
                  <div className="col-span-3">
                    <Select value={editProp.dataType} onValueChange={(v) => setEditProp((p) => ({ ...p, dataType: v }))}>
                      <SelectTrigger className="h-7 text-xs bg-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={editProp.defaultValue}
                      onChange={(e) => setEditProp((p) => ({ ...p, defaultValue: e.target.value }))}
                      className="h-7 text-xs bg-input font-mono"
                      placeholder="default"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      onClick={saveEdit}
                      disabled={updateProperty.isPending}
                      className="text-primary hover:text-primary/80 transition-colors p-1 disabled:opacity-50"
                      title="Save"
                    >
                      {updateProperty.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-muted-foreground hover:text-white transition-colors p-1"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="grid grid-cols-12 gap-3 px-3 py-2 items-center text-sm hover:bg-muted/10 cursor-pointer group"
                  onClick={() => startEdit(prop)}
                  data-testid={`prop-row-${prop.id}`}
                >
                  <div className="col-span-4 font-mono text-xs text-white truncate">{prop.name}</div>
                  <div className="col-span-3">
                    <Badge variant="secondary" className="bg-secondary/40 font-mono text-[10px]">{prop.dataType}</Badge>
                  </div>
                  <div className="col-span-3 text-muted-foreground font-mono text-xs truncate">{displayValue(prop)}</div>
                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(prop); }}
                      className="text-muted-foreground hover:text-white transition-colors p-0.5"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(!properties || properties.length === 0) && (
        <p className="text-xs text-muted-foreground/60 py-1">
          No properties yet. Add one below or use AI Enhance to get suggestions.
        </p>
      )}

      <form onSubmit={handleAddProp} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Property Name</Label>
          <Input
            className="h-8 text-xs bg-input font-mono"
            placeholder="property_name"
            value={newProp.name}
            onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
            data-testid={`prop-input-name-${entityId}`}
          />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</Label>
          <Select value={newProp.dataType} onValueChange={(v) => setNewProp({ ...newProp, dataType: v })}>
            <SelectTrigger className="h-8 text-xs bg-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Default</Label>
          <Input
            className="h-8 text-xs bg-input font-mono"
            placeholder="0"
            value={newProp.defaultValue}
            onChange={(e) => setNewProp({ ...newProp, defaultValue: e.target.value })}
          />
        </div>
        <Button size="sm" className="h-8 shrink-0" type="submit" disabled={createProperty.isPending || !newProp.name}>
          {createProperty.isPending
            ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            : <Plus className="w-3.5 h-3.5 mr-1" />}
          Add
        </Button>
      </form>
    </div>
  );
}
