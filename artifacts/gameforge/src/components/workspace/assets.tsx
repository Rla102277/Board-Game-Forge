import { useState, useEffect } from "react";
import {
  useListAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useAiEnhanceAsset,
  useGetProject,
  useUpdateProject,
  getListAssetsQueryKey,
  getGetProjectQueryKey,
  useListEntities,
  type Asset,
  type AssetEnhanceSuggestion,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ImageIcon,
  Edit2,
  Sparkles,
  Download,
  Loader2,
  Wand2,
  Save,
  BookOpen,
  Layers,
  Square,
  Circle,
  Dice5,
  User,
  Map as MapIcon,
  Package,
  Tag,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
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

type ComponentKind = {
  id: string;
  label: string;
  kind: string;
  icon: React.ComponentType<{ className?: string }>;
  promptHint: string;
};

const COMPONENT_KINDS: ComponentKind[] = [
  { id: "card", label: "Card", kind: "card", icon: Layers, promptHint: "a single illustrated game card with title bar, art frame, and rule text area" },
  { id: "board", label: "Board", kind: "board", icon: Square, promptHint: "a top-down hex or grid game board with regions and resource icons" },
  { id: "token", label: "Token", kind: "token", icon: Circle, promptHint: "a small circular wooden or cardboard token with a single icon" },
  { id: "dice", label: "Dice tray", kind: "other", icon: Dice5, promptHint: "a wooden dice tray with custom-faced dice scattered inside" },
  { id: "character", label: "Character art", kind: "other", icon: User, promptHint: "a character portrait, three-quarter view, painted illustration" },
  { id: "map", label: "Map", kind: "board", icon: MapIcon, promptHint: "a stylized world map with regions and a compass rose" },
  { id: "box", label: "Box cover", kind: "other", icon: Package, promptHint: "a board game box cover, dramatic key art with logo space" },
  { id: "logo", label: "Logo", kind: "other", icon: Tag, promptHint: "a game logo / wordmark, vector style, on transparent background" },
];

export function Assets({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: assets, isLoading } = useListAssets(projectId);
  const { data: project } = useGetProject(projectId);
  const { data: entities } = useListEntities(projectId);
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const updateProject = useUpdateProject();
  const enhanceAsset = useAiEnhanceAsset();

  const [narrative, setNarrative] = useState("");
  const [narrativeDirty, setNarrativeDirty] = useState(false);
  const [savingNarrative, setSavingNarrative] = useState(false);
  useEffect(() => {
    if (project && !narrativeDirty) setNarrative(project.narrative ?? "");
  }, [project, narrativeDirty]);

  const saveNarrative = async () => {
    setSavingNarrative(true);
    try {
      await updateProject.mutateAsync({ projectId, data: { narrative } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      setNarrativeDirty(false);
      toast({ title: "Narrative saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSavingNarrative(false);
    }
  };

  const [generatingTile, setGeneratingTile] = useState<string | null>(null);
  const [freeformPrompt, setFreeformPrompt] = useState("");
  const [generatingFreeform, setGeneratingFreeform] = useState(false);

  const composedPrompt = (kind: ComponentKind, customExtra?: string): { prompt: string; tag: string; assetName: string; description: string } => {
    const narr = narrative.trim() || project?.description || "a tabletop game";
    const entityNames = (entities ?? []).slice(0, 6).map((e) => e.name).filter(Boolean);
    const entityLine = entityNames.length ? `Featuring entities: ${entityNames.join(", ")}.` : "";
    const extra = customExtra?.trim() ? ` ${customExtra.trim()}` : "";
    const prompt = `Design ${kind.promptHint} for a board game called "${project?.name ?? "Untitled"}". Narrative: ${narr}. ${entityLine} Style: hand-painted, rich color, professional board-game art.${extra}`;
    const seedWord = narr.split(/\s+/).slice(0, 4).join(" ");
    const assetName = `${kind.label}: ${seedWord}`.slice(0, 60);
    const description = `${kind.label} from narrative beat — ${narr.slice(0, 140)}`;
    const tag = kind.label;
    return { prompt, tag, assetName, description };
  };

  const generateImageDirect = async (assetId: number, prompt: string): Promise<boolean> => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/api/projects/${projectId}/assets/${assetId}/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt }),
    });
    return res.ok;
  };

  const generateFromTile = async (tile: ComponentKind) => {
    if (!narrative.trim() && !project?.description) {
      toast({ title: "Add a narrative first", description: "Write a story seed above so the AI knows what to draw.", variant: "destructive" });
      return;
    }
    setGeneratingTile(tile.id);
    try {
      const composed = composedPrompt(tile);
      const created = await createAsset.mutateAsync({
        projectId,
        data: {
          name: composed.assetName,
          kind: tile.kind,
          description: composed.description,
          flavorText: composed.tag,
        },
      });
      qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
      const ok = await generateImageDirect(created.id, composed.prompt);
      qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
      if (ok) toast({ title: `${tile.label} generated` });
      else toast({ title: "Image generation failed", description: "Asset created without image — try regenerating.", variant: "destructive" });
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGeneratingTile(null);
    }
  };

  const generateFromFreeform = async () => {
    const txt = freeformPrompt.trim();
    if (!txt) return;
    setGeneratingFreeform(true);
    try {
      const narr = narrative.trim() || project?.description || "";
      const entityNames = (entities ?? []).slice(0, 4).map((e) => e.name).filter(Boolean);
      const entityLine = entityNames.length ? ` Featuring: ${entityNames.join(", ")}.` : "";
      const fullPrompt = narr
        ? `${txt}. Narrative: ${narr}.${entityLine} Style: hand-painted, rich color, professional board-game art.`
        : txt;
      const created = await createAsset.mutateAsync({
        projectId,
        data: {
          name: txt.slice(0, 60),
          kind: "other",
          description: `Custom — ${txt}`.slice(0, 240),
          flavorText: "Custom",
        },
      });
      qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
      const ok = await generateImageDirect(created.id, fullPrompt);
      qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
      if (ok) {
        toast({ title: "Asset generated" });
        setFreeformPrompt("");
      } else {
        toast({ title: "Image generation failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGeneratingFreeform(false);
    }
  };

  const fetchEnhance = async (assetId: number): Promise<AssetEnhanceSuggestion> => {
    return enhanceAsset.mutateAsync({ projectId, assetId });
  };

  const applyEnhance = async (assetId: number, fields: Partial<{ name: string; description: string; flavorText: string }>) => {
    if (Object.keys(fields).length === 0) return;
    await updateAsset.mutateAsync({ projectId, assetId, data: fields });
    qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
  };

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
      const ok = await generateImageDirect(assetId, prompt);
      if (!ok) throw new Error("gen failed");
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

  const totalAssets = assets?.length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="h-6 w-6 text-primary" /> Asset Library</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {totalAssets} {totalAssets === 1 ? "asset" : "assets"} · click <span className="text-primary font-medium">AI</span> on any card to enhance its name, description, and flavor text
          </p>
        </div>
        <Button variant="outline" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Manual asset</Button>
      </div>

      <Card className="bg-card border-card-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <Label htmlFor="narrative-seed" className="font-semibold">Narrative seed</Label>
            <span className="text-xs text-muted-foreground">— a short story setup the AI will weave into every component.</span>
          </div>
          <Textarea
            id="narrative-seed"
            data-testid="narrative-seed"
            rows={3}
            placeholder="A storm-wracked archipelago where rival cartels of weather-shapers race to claim drifting sky-islands…"
            value={narrative}
            onChange={(e) => { setNarrative(e.target.value); setNarrativeDirty(true); }}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveNarrative}
              disabled={!narrativeDirty || savingNarrative}
              className="gap-2"
              data-testid="save-narrative"
            >
              {savingNarrative ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {savingNarrative ? "Saving…" : narrativeDirty ? "Save narrative" : "Saved"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Component types</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {COMPONENT_KINDS.map((tile) => {
            const Icon = tile.icon;
            const isLoading = generatingTile === tile.id;
            return (
              <button
                key={tile.id}
                onClick={() => generateFromTile(tile)}
                disabled={isLoading || !!generatingTile}
                data-testid={`tile-${tile.id}`}
                className="group flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : (
                  <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                )}
                <span className="text-sm font-medium">{tile.label}</span>
                <span className="text-[10px] text-muted-foreground line-clamp-2 text-center">{isLoading ? "Composing…" : "Click to generate"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="bg-card border-card-border">
        <CardContent className="p-4 space-y-2">
          <Label htmlFor="freeform-prompt" className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5 text-primary" /> Or describe your own component
          </Label>
          <div className="flex gap-2">
            <Input
              id="freeform-prompt"
              data-testid="freeform-prompt"
              placeholder="A weathered storm-shard talisman engraved with sky-glyphs"
              value={freeformPrompt}
              onChange={(e) => setFreeformPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !generatingFreeform) generateFromFreeform(); }}
            />
            <Button
              onClick={generateFromFreeform}
              disabled={!freeformPrompt.trim() || generatingFreeform}
              data-testid="generate-freeform"
              className="gap-2"
            >
              {generatingFreeform ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72" />)}</div>
      ) : !assets?.length ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">No mockups yet. Pick a component type above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              isGenerating={generating === a.id}
              onEdit={() => openEdit(a.id)}
              onDelete={() => remove(a.id)}
              onGenerateImage={() => openImagePrompt(a.id)}
              onDownload={() => downloadImage(a)}
              fetchEnhance={() => fetchEnhance(a.id)}
              applyEnhance={(fields) => applyEnhance(a.id, fields)}
            />
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
            <div className="space-y-2"><Label>Flavor text / tag</Label><Textarea rows={2} value={form.flavorText} onChange={e => setForm({...form, flavorText: e.target.value})} /></div>
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

// ════════════════════════════════════════════════════════════════════════════
// AssetCard — image, action row, and inline AI Enhancement preview panel
// ════════════════════════════════════════════════════════════════════════════
function AssetCard({
  asset,
  isGenerating,
  onEdit,
  onDelete,
  onGenerateImage,
  onDownload,
  fetchEnhance,
  applyEnhance,
}: {
  asset: Asset;
  isGenerating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateImage: () => void;
  onDownload: () => void;
  fetchEnhance: () => Promise<AssetEnhanceSuggestion>;
  applyEnhance: (fields: Partial<{ name: string; description: string; flavorText: string }>) => Promise<void>;
}) {
  const { toast } = useToast();
  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [suggestion, setSuggestion] = useState<AssetEnhanceSuggestion | null>(null);
  const [picked, setPicked] = useState<{ name: boolean; description: boolean; flavorText: boolean }>({ name: true, description: true, flavorText: true });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const runEnhance = async () => {
    setIsEnhancing(true);
    setSuggestion(null);
    setApplied(false);
    setShowEnhance(true);
    try {
      const data = await fetchEnhance();
      setSuggestion(data);
      setPicked({
        name: !!data.name && data.name !== asset.name,
        description: !!data.description && data.description !== (asset.description ?? ""),
        flavorText: !!data.flavorText && data.flavorText !== (asset.flavorText ?? ""),
      });
    } catch (err) {
      const desc = err instanceof Error ? err.message : String(err);
      toast({ title: "AI enhance failed", description: desc, variant: "destructive" });
      setShowEnhance(false);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApply = async () => {
    if (!suggestion) return;
    const fields: Partial<{ name: string; description: string; flavorText: string }> = {};
    if (picked.name && suggestion.name) fields.name = suggestion.name;
    if (picked.description && suggestion.description) fields.description = suggestion.description;
    if (picked.flavorText && suggestion.flavorText) fields.flavorText = suggestion.flavorText;
    if (Object.keys(fields).length === 0) {
      toast({ title: "Pick at least one field to apply", variant: "destructive" });
      return;
    }
    setApplying(true);
    try {
      await applyEnhance(fields);
      setApplied(true);
      toast({ title: "Asset updated" });
      setTimeout(() => {
        setShowEnhance(false);
        setSuggestion(null);
        setApplied(false);
      }, 1200);
    } catch (err) {
      toast({ title: "Apply failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="bg-card border-card-border overflow-hidden flex flex-col group" data-testid={`asset-card-${asset.id}`}>
      <div className="aspect-square bg-muted/30 relative">
        {asset.imageDataUrl ? (
          <img src={asset.imageDataUrl} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-30" />
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider bg-black/60 text-white px-2 py-0.5 rounded">{asset.kind}</span>
        {asset.flavorText && (
          <span className="absolute top-2 right-2 text-[10px] uppercase font-semibold tracking-wider bg-primary/90 text-primary-foreground px-2 py-0.5 rounded">
            {asset.flavorText}
          </span>
        )}
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-semibold line-clamp-1 flex-1">{asset.name}</h3>
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs h-7 px-2 gap-1 ${showEnhance ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
              title="AI Enhance text"
              onClick={runEnhance}
              disabled={isEnhancing}
              data-testid={`enhance-asset-${asset.id}`}
            >
              {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              AI
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onEdit} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {asset.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{asset.description}</p>}
        <div className="flex gap-2 mt-auto">
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onGenerateImage} disabled={isGenerating}>
            <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Generating..." : asset.imageDataUrl ? "Regenerate" : "Generate"}
          </Button>
          {asset.imageDataUrl && <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-3.5 w-3.5" /></Button>}
        </div>
      </CardContent>

      {/* AI Enhance Panel */}
      {showEnhance && (
        <div className="border-t border-border bg-primary/5 px-4 py-3 space-y-3" data-testid={`enhance-panel-asset-${asset.id}`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-primary flex-1">AI Enhancement</p>
            <button
              onClick={() => { setShowEnhance(false); setSuggestion(null); }}
              className="text-muted-foreground hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isEnhancing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Rewriting copy…
            </div>
          )}

          {suggestion && !isEnhancing && (
            <div className="space-y-3">
              <SuggestionField
                label="Name"
                current={asset.name}
                proposed={suggestion.name}
                checked={picked.name}
                onToggle={() => setPicked({ ...picked, name: !picked.name })}
              />
              <SuggestionField
                label="Description"
                current={asset.description ?? ""}
                proposed={suggestion.description}
                checked={picked.description}
                onToggle={() => setPicked({ ...picked, description: !picked.description })}
              />
              <SuggestionField
                label="Flavor text"
                current={asset.flavorText ?? ""}
                proposed={suggestion.flavorText}
                checked={picked.flavorText}
                onToggle={() => setPicked({ ...picked, flavorText: !picked.flavorText })}
              />

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={applying || applied}
                  className="bg-primary text-primary-foreground gap-1.5"
                  data-testid={`apply-enhance-asset-${asset.id}`}
                >
                  {applied
                    ? <><Check className="w-3.5 h-3.5" /> Applied!</>
                    : applying
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</>
                    : <><Wand2 className="w-3.5 h-3.5" /> Apply</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runEnhance}
                  disabled={isEnhancing}
                  className="border-border text-muted-foreground hover:text-white gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowEnhance(false); setSuggestion(null); }}
                  className="text-muted-foreground hover:text-white ml-auto"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SuggestionField({
  label,
  current,
  proposed,
  checked,
  onToggle,
}: {
  label: string;
  current: string;
  proposed?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  if (!proposed) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs text-muted-foreground italic">No change suggested.</p>
      </div>
    );
  }
  if (proposed === current) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs text-muted-foreground italic">No change — AI returned the same value.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="h-3 w-3 accent-primary"
          />
          Apply this
        </label>
      </div>
      {current && (
        <p className="text-xs text-muted-foreground/70 line-through bg-background/40 border border-border rounded px-2 py-1">
          {current}
        </p>
      )}
      <p className={`text-xs leading-relaxed bg-background/60 border rounded px-2 py-1.5 ${checked ? "text-foreground border-primary/40" : "text-muted-foreground border-border"}`}>
        {proposed}
      </p>
    </div>
  );
}
