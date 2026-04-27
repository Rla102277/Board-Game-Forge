import { useState } from "react";
import { useListEntities, useCreateEntity, useUpdateEntity, useDeleteEntity, useAiGenerateEntities, getListEntitiesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Wand2, Box } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Entity } from "@workspace/api-client-react/src/generated/api.schemas";

interface EntitiesProps {
  projectId: number;
}

export function Entities({ projectId }: EntitiesProps) {
  const queryClient = useQueryClient();
  const { data: entities, isLoading } = useListEntities(projectId);
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const deleteEntity = useDeleteEntity();
  const aiGenerate = useAiGenerateEntities();

  const [aiPrompt, setAiPrompt] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editEntityId, setEditEntityId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ name: "", type: "", description: "", stats: "", color: "" });

  const handleCreate = async () => {
    if (!formData.name || !formData.type) return;
    await createEntity.mutateAsync({ projectId, data: formData });
    setIsCreateOpen(false);
    setFormData({ name: "", type: "", description: "", stats: "", color: "" });
    queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
  };

  const handleUpdate = async () => {
    if (!editEntityId || !formData.name || !formData.type) return;
    await updateEntity.mutateAsync({ projectId, entityId: editEntityId, data: formData });
    setEditEntityId(null);
    setFormData({ name: "", type: "", description: "", stats: "", color: "" });
    queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
  };

  const handleDelete = async (id: number) => {
    await deleteEntity.mutateAsync({ projectId, entityId: id });
    queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    await aiGenerate.mutateAsync({ projectId, data: { prompt: aiPrompt, count: 5 } });
    setAiPrompt("");
    queryClient.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
  };

  const openEdit = (entity: Entity) => {
    setFormData({
      name: entity.name,
      type: entity.type,
      description: entity.description || "",
      stats: entity.stats || "",
      color: entity.color || ""
    });
    setEditEntityId(entity.id);
  };

  const grouped = entities?.reduce((acc, ent) => {
    if (!acc[ent.type]) acc[ent.type] = [];
    acc[ent.type].push(ent);
    return acc;
  }, {} as Record<string, Entity[]>) || {};

  return (
    <div className="space-y-8 pb-8">
      <Card className="bg-card border-border overflow-hidden">
        <div className="bg-primary/5 p-4 border-b border-border flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <Input 
              placeholder="e.g. 5 unique space ship classes with different stats..." 
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              className="bg-background max-w-lg"
              onKeyDown={e => e.key === "Enter" && handleAiGenerate()}
            />
            <Button onClick={handleAiGenerate} disabled={!aiPrompt || aiGenerate.isPending}>
              {aiGenerate.isPending ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setFormData({ name: "", type: "", description: "", stats: "", color: "" })}>
                <Plus className="h-4 w-4 mr-2" /> Add Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Entity</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Type *</Label><Input value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="e.g. Card, Token, Resource" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                <div className="space-y-2"><Label>Stats</Label><Input value={formData.stats} onChange={e => setFormData({...formData, stats: e.target.value})} placeholder="e.g. ATK: 5, DEF: 3" /></div>
                <div className="space-y-2"><Label>Color Accent</Label><Input type="color" value={formData.color || "#F97316"} onChange={e => setFormData({...formData, color: e.target.value})} className="h-10 w-16 p-1" /></div>
              </div>
              <DialogFooter><Button onClick={handleCreate} disabled={!formData.name || !formData.type}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : entities?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <Box className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No entities yet</h3>
          <p className="text-muted-foreground mt-1">Generate some with AI above or add them manually.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2">
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-sm">{items.length}</span>
                {type}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map(ent => (
                  <Card key={ent.id} className="bg-card border-border overflow-hidden relative group" style={{ borderLeftColor: ent.color || 'hsl(var(--primary))', borderLeftWidth: '4px' }}>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background" onClick={() => openEdit(ent)}><Edit2 className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background hover:text-destructive" onClick={() => handleDelete(ent.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{ent.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                      <p className="line-clamp-3">{ent.description || "No description."}</p>
                      {ent.stats && (
                        <div className="bg-muted p-2 rounded text-xs font-mono">
                          {ent.stats}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editEntityId} onOpenChange={o => !o && setEditEntityId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Entity</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Type *</Label><Input value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div className="space-y-2"><Label>Stats</Label><Input value={formData.stats} onChange={e => setFormData({...formData, stats: e.target.value})} /></div>
            <div className="space-y-2"><Label>Color Accent</Label><Input type="color" value={formData.color || "#F97316"} onChange={e => setFormData({...formData, color: e.target.value})} className="h-10 w-16 p-1" /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdate} disabled={!formData.name || !formData.type}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
