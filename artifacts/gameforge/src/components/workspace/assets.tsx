import { useState } from "react";
import { useListAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, getListAssetsQueryKey, useListEntities } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ImageIcon, Edit2, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const KINDS = ["card", "token", "board", "tile", "rulebook", "other"];

export function Assets({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: assets, isLoading } = useListAssets(projectId);
  const { data: entities } = useListEntities(projectId);
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", kind: "card", description: "", flavorText: "", entityId: "" });
  const [generating, setGenerating] = useState<number | null>(null);
  const [imagePromptOpen, setImagePromptOpen] = useState<number | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
  const openCreate = () => { setEditing(null); setForm({ name: "", kind: "card", description: "", flavorText: "", entityId: "" }); setOpen(true); };
  const openEdit = (id: number) => {
    const a = assets?.find(x => x.id === id); if (!a) return;
    setEditing(id);
    setForm({ name: a.name, kind: a.kind, description: a.description || "", flavorText: a.flavorText || "", entityId: a.entityId ? String(a.entityId) : "" });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.name.trim()) return;
    const data = {
      name: form.name, kind: form.kind, description: form.description, flavorText: form.flavorText,
      ...(form.entityId ? { entityId: parseInt(form.entityId) } : {}),
    };
    try {
      if (editing) await updateAsset.mutateAsync({ projectId, assetId: editing, data });
      else await createAsset.mutateAsync({ projectId, data });
      setOpen(false); refresh();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    try { await deleteAsset.mutateAsync({ projectId, assetId: id }); refresh(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const generateImage = async (assetId: number, prompt: string) => {
    setGenerating(assetId);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/projects/${projectId}/assets/${assetId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("gen failed");
      refresh();
      toast({ title: "Image generated" });
    } catch { toast({ title: "Generation failed", variant: "destructive" }); }
    finally { setGenerating(null); }
  };

  const openImagePrompt = (id: number) => {
    const a = assets?.find(x => x.id === id);
    setImagePrompt(a?.imagePrompt || `${a?.name} ${a?.description || ""}`.trim());
    setImagePromptOpen(id);
  };

  const downloadImage = (a: { name: string; imageDataUrl?: string | null }) => {
    if (!a.imageDataUrl) return;
    const link = document.createElement("a");
    link.href = a.imageDataUrl;
    link.download = `${a.name.replace(/[^a-z0-9]+/gi, "_")}.png`;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="h-6 w-6 text-primary" /> Assets</h2>
          <p className="text-muted-foreground text-sm mt-1">Cards, tokens, boards, and other game art.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Asset</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72" />)}</div>
      ) : !assets?.length ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground mb-4">No assets yet. Design your first card or token.</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Asset</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map(a => (
            <Card key={a.id} className="bg-card border-card-border overflow-hidden flex flex-col group">
              <div className="aspect-square bg-muted/30 relative">
                {a.imageDataUrl ? (
                  <img src={a.imageDataUrl} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 opacity-30" />
                  </div>
                )}
                <span className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider bg-black/60 text-white px-2 py-0.5 rounded">{a.kind}</span>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="font-semibold line-clamp-1">{a.name}</h3>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a.id)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {a.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{a.description}</p>}
                {a.flavorText && <p className="text-xs italic text-muted-foreground/80 line-clamp-2 mb-3">"{a.flavorText}"</p>}
                <div className="flex gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openImagePrompt(a.id)} disabled={generating === a.id}>
                    <Sparkles className="h-3.5 w-3.5" /> {generating === a.id ? "Generating..." : a.imageDataUrl ? "Regenerate" : "Generate"}
                  </Button>
                  {a.imageDataUrl && <Button size="sm" variant="outline" onClick={() => downloadImage(a)}><Download className="h-3.5 w-3.5" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Asset" : "New Asset"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus /></div>
              <div className="space-y-2"><Label>Kind</Label>
                <Select value={form.kind} onValueChange={v => setForm({...form, kind: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Linked Entity</Label>
                <Select value={form.entityId || "none"} onValueChange={v => setForm({...form, entityId: v === "none" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {entities?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="space-y-2"><Label>Flavor text</Label><Textarea rows={2} value={form.flavorText} onChange={e => setForm({...form, flavorText: e.target.value})} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={imagePromptOpen !== null} onOpenChange={(o) => !o && setImagePromptOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate image</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Image prompt</Label>
            <Textarea rows={5} value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="A fantasy card showing..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImagePromptOpen(null)}>Cancel</Button>
            <Button onClick={() => { if (imagePromptOpen) { generateImage(imagePromptOpen, imagePrompt); setImagePromptOpen(null); } }} disabled={!imagePrompt.trim()} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
