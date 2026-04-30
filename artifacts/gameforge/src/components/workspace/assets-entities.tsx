import { useState, useEffect, useMemo } from "react";
import {
  useListAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useAiEnhanceAsset,
  useGetProject, useUpdateProject, getListAssetsQueryKey, getGetProjectQueryKey,
  useListEntities, useCreateEntity, useUpdateEntity, useDeleteEntity,
  useAiGenerateEntities, useAiEnhanceEntity,
  useListEntityProperties, useCreateEntityProperty, useUpdateEntityProperty, useDeleteEntityProperty,
  getListEntitiesQueryKey, getListEntityPropertiesQueryKey,
  type Asset, type AssetEnhanceSuggestion, type Entity, type EntityProperty,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, ImageIcon, Edit2, Sparkles, Download, Loader2, Wand2, Save, BookOpen,
  Layers, Square, Circle, Dice5, User, Map as MapIcon, Package, Tag, Check, X, RefreshCw,
  ChevronDown, ChevronRight, Settings, Pencil, Copy, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ── Component type constants ──────────────────────────────────────────────────

const PHYSICAL_TYPES = ["Card", "Deck", "Token", "Die", "Tile", "Meeple", "Board"] as const;
const WORLD_TYPES    = ["Location", "Faction", "Event", "Resource", "Ability"] as const;
const ALL_COMPONENT_TYPES = [...PHYSICAL_TYPES, ...WORLD_TYPES] as const;
type ComponentType = typeof ALL_COMPONENT_TYPES[number];

const COMPONENT_META: Record<ComponentType, { icon: string; color: string; bg: string; badge: string; desc: string }> = {
  Card:     { icon: "🃏", color: "text-violet-400",  bg: "bg-violet-500/5",  badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",  desc: "Action, item, spell, event, treasure cards" },
  Deck:     { icon: "📦", color: "text-indigo-400",  bg: "bg-indigo-500/5",  badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",  desc: "Collection of cards (container)" },
  Token:    { icon: "🪙", color: "text-amber-400",   bg: "bg-amber-500/5",   badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",     desc: "Resource, currency, health, status markers" },
  Die:      { icon: "🎲", color: "text-red-400",     bg: "bg-red-500/5",     badge: "bg-red-500/20 text-red-400 border-red-500/30",           desc: "Custom die type or face set" },
  Tile:     { icon: "🗺️", color: "text-emerald-400", bg: "bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", desc: "Map, dungeon, terrain tiles" },
  Meeple:   { icon: "🧩", color: "text-blue-400",    bg: "bg-blue-500/5",    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",        desc: "Pawn, figure, standee, miniature" },
  Board:    { icon: "📋", color: "text-slate-400",   bg: "bg-slate-500/5",   badge: "bg-slate-500/20 text-slate-400 border-slate-500/30",     desc: "Game board, player mat, reference sheet" },
  Location: { icon: "📍", color: "text-cyan-400",    bg: "bg-cyan-500/5",    badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",        desc: "City, dungeon, region, landmark" },
  Faction:  { icon: "⚔️", color: "text-purple-400",  bg: "bg-purple-500/5",  badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",  desc: "Guild, tribe, nation, team" },
  Event:    { icon: "⚡", color: "text-orange-400",  bg: "bg-orange-500/5",  badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",  desc: "Random event, scenario, story beat" },
  Resource: { icon: "💎", color: "text-teal-400",    bg: "bg-teal-500/5",    badge: "bg-teal-500/20 text-teal-400 border-teal-500/30",        desc: "Material, food, energy, mana" },
  Ability:  { icon: "✨", color: "text-pink-400",    bg: "bg-pink-500/5",    badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",        desc: "Passive, active, triggered, ultimate" },
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

type ComponentKind = { id: string; label: string; kind: string; icon: React.ComponentType<{ className?: string }>; promptHint: string };
const COMPONENT_KINDS: ComponentKind[] = [
  { id: "card",      label: "Card",          kind: "card",  icon: Layers,   promptHint: "a single illustrated game card with title bar, art frame, and rule text area" },
  { id: "board",     label: "Board",         kind: "board", icon: Square,   promptHint: "a top-down hex or grid game board with regions and resource icons" },
  { id: "token",     label: "Token",         kind: "token", icon: Circle,   promptHint: "a small circular wooden or cardboard token with a single icon" },
  { id: "dice",      label: "Dice tray",     kind: "other", icon: Dice5,    promptHint: "a wooden dice tray with custom-faced dice scattered inside" },
  { id: "character", label: "Character art", kind: "other", icon: User,     promptHint: "a character portrait, three-quarter view, painted illustration" },
  { id: "map",       label: "Map",           kind: "board", icon: MapIcon,  promptHint: "a stylized world map with regions and a compass rose" },
  { id: "box",       label: "Box cover",     kind: "other", icon: Package,  promptHint: "a board game box cover, dramatic key art with logo space" },
  { id: "logo",      label: "Logo",          kind: "other", icon: Tag,      promptHint: "a game logo / wordmark, vector style, on transparent background" },
];

const ASSET_KINDS = ["card", "token", "board", "tile", "rulebook", "other"];

type AIEnhanceEntity = {
  description: string;
  lore?: string;
  designNotes?: string;
  suggestedProperties: { name: string; dataType: string; defaultValue?: string; reason: string }[];
};

// ── Gamma prompt builders ─────────────────────────────────────────────────────

function buildDeckPrompt(
  deck: Entity,
  cards: Entity[],
  projectName: string,
  narrative: string,
): string {
  const cardList = cards.length
    ? cards.map((c, i) =>
        `${i + 1}. **${c.name}**${c.subtype ? ` (${c.subtype})` : ""}${c.description ? ` — ${c.description}` : ""}${c.lore ? `\n   Lore: "${c.lore}"` : ""}`
      ).join("\n")
    : "No cards defined yet.";

  return `Please generate a Gamma PDF presentation for my board game deck.

**Game:** ${projectName}
**Narrative:** ${narrative || "(none)"}

**Deck:** ${deck.name}${deck.subtype ? ` (${deck.subtype})` : ""}
**Description:** ${deck.description || "(none)"}${deck.lore ? `\n**Flavor/Lore:** ${deck.lore}` : ""}${deck.designNotes ? `\n**Designer Notes:** ${deck.designNotes}` : ""}

**Cards in this deck (${cards.length}):**
${cardList}

Create a polished PDF presentation (exportAs: pdf) with:
- Cover slide: deck name and themed board-game illustration
- Deck overview: purpose, strategy, card count
- One slide per card: name, subtype, art concept, rules text, flavor quote
- Quick-reference summary table

Use the game narrative and art style to keep illustrations consistent. Share the PDF link when done.`;
}

function buildEntityPrompt(
  entity: Entity,
  projectName: string,
  narrative: string,
): string {
  const meta = getMeta(entity.type);
  return `Please generate a Gamma document for a game component.

**Game:** ${projectName}
**Narrative:** ${narrative || "(none)"}

**Component:** ${entity.name} — ${meta.icon} ${entity.type}${entity.subtype ? ` / ${entity.subtype}` : ""}
**Description:** ${entity.description || "(none)"}${entity.lore ? `\n**Flavor/Lore:** ${entity.lore}` : ""}${entity.designNotes ? `\n**Designer Notes:** ${entity.designNotes}` : ""}

Create a game component reference document with:
- Component illustration (themed to the game's narrative)
- Name, type, and description in a clean layout
- Flavor / lore text in italic
- Designer notes section
- Blank "properties" table the designer can fill in

Share the link when done.`;
}

function buildAssetPrompt(
  asset: Asset,
  linkedEntity: Entity | undefined,
  projectName: string,
  narrative: string,
): string {
  return `Please generate a Gamma PDF reference for a game asset.

**Game:** ${projectName}
**Narrative:** ${narrative || "(none)"}

**Asset:** ${asset.name} (kind: ${asset.kind})
**Description:** ${asset.description || "(none)"}${asset.flavorText ? `\n**Flavor text:** ${asset.flavorText}` : ""}${linkedEntity ? `\n**Linked component:** ${linkedEntity.name} (${linkedEntity.type})` : ""}

Create a visual reference PDF (exportAs: pdf) with:
- Cover: asset name with a generated illustration matching the game's art style
- Description and design notes
- Usage context within the game
- Flavor text displayed prominently

Share the PDF link when done.`;
}

// ── Gamma dialog ──────────────────────────────────────────────────────────────

function GammaDialog({
  open, onClose, title, prompt, onSend,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  prompt: string;
  onSend: (prompt: string) => void;
}) {
  const [edited, setEdited] = useState(prompt);
  useEffect(() => { if (open) setEdited(prompt); }, [open, prompt]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Generate with Gamma
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {title} — review and edit the prompt, then send it to the AI chat.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={edited}
          onChange={(e) => setEdited(e.target.value)}
          rows={14}
          className="font-mono text-xs bg-background resize-none"
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSend(edited); onClose(); }} className="gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Send to AI Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function AssetsEntities({
  projectId,
  onChatPrompt,
}: {
  projectId: number;
  onChatPrompt?: (prompt: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: project } = useGetProject(projectId);
  const updateProject = useUpdateProject();

  const [activeView, setActiveView] = useState<"assets" | "entities">("assets");
  const [narrative, setNarrative] = useState("");
  const [narrativeDirty, setNarrativeDirty] = useState(false);
  const [savingNarrative, setSavingNarrative] = useState(false);
  const [gammaDialog, setGammaDialog] = useState<{ title: string; prompt: string } | null>(null);

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

  const openGamma = (title: string, prompt: string) => setGammaDialog({ title, prompt });

  const sendToChat = (prompt: string) => {
    onChatPrompt?.(prompt);
    toast({ title: "Sent to AI Chat", description: "Open the chat panel to review and send." });
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" /> Assets & Entities
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage artwork, mockups, and game components — generate PDFs for any deck or entity with Gamma
        </p>
      </div>

      {/* Narrative seed */}
      <Card className="bg-card border-card-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <Label className="font-semibold">Narrative seed</Label>
            <span className="text-xs text-muted-foreground">— woven into every asset and component generation</span>
          </div>
          <Textarea
            rows={3}
            placeholder="A storm-wracked archipelago where rival cartels of weather-shapers race to claim drifting sky-islands…"
            value={narrative}
            onChange={(e) => { setNarrative(e.target.value); setNarrativeDirty(true); }}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={saveNarrative} disabled={!narrativeDirty || savingNarrative} className="gap-2">
              {savingNarrative ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {savingNarrative ? "Saving…" : narrativeDirty ? "Save narrative" : "Saved"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View switcher */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit border border-border">
        {(["assets", "entities"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeView === v
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "assets" ? <ImageIcon className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
            {v === "assets" ? "Assets" : "Components & Entities"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === "assets" ? (
        <AssetsView
          projectId={projectId}
          narrative={narrative}
          projectName={project?.name ?? "Untitled"}
          projectDescription={project?.description ?? ""}
          onGamma={openGamma}
        />
      ) : (
        <EntitiesView
          projectId={projectId}
          narrative={narrative}
          projectName={project?.name ?? "Untitled"}
          onGamma={openGamma}
        />
      )}

      {gammaDialog && (
        <GammaDialog
          open
          onClose={() => setGammaDialog(null)}
          title={gammaDialog.title}
          prompt={gammaDialog.prompt}
          onSend={sendToChat}
        />
      )}
    </div>
  );
}

// ── Assets view ───────────────────────────────────────────────────────────────

function AssetsView({
  projectId, narrative, projectName, projectDescription, onGamma,
}: {
  projectId: number;
  narrative: string;
  projectName: string;
  projectDescription: string;
  onGamma: (title: string, prompt: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: assets, isLoading } = useListAssets(projectId);
  const { data: entities } = useListEntities(projectId);
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const enhanceAsset = useAiEnhanceAsset();

  const [generatingTile, setGeneratingTile] = useState<string | null>(null);
  const [freeformPrompt, setFreeformPrompt] = useState("");
  const [generatingFreeform, setGeneratingFreeform] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [imagePromptId, setImagePromptId] = useState<number | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });

  const composedPrompt = (kind: ComponentKind, extra?: string) => {
    const narr = narrative.trim() || projectDescription || "a tabletop game";
    const entityNames = (entities ?? []).slice(0, 6).map((e) => e.name).filter(Boolean);
    const entityLine = entityNames.length ? `Featuring: ${entityNames.join(", ")}.` : "";
    const prompt = `Design ${kind.promptHint} for "${projectName}". Narrative: ${narr}. ${entityLine} Style: hand-painted, rich color, professional board-game art.${extra ? " " + extra : ""}`;
    return {
      prompt,
      assetName: `${kind.label}: ${narr.split(/\s+/).slice(0, 4).join(" ")}`.slice(0, 60),
      description: `${kind.label} — ${narr.slice(0, 140)}`,
      tag: kind.label,
    };
  };

  const generateImageDirect = async (assetId: number, prompt: string) => {
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
    if (!narrative.trim() && !projectDescription) {
      toast({ title: "Add a narrative first", variant: "destructive" });
      return;
    }
    setGeneratingTile(tile.id);
    try {
      const c = composedPrompt(tile);
      const created = await createAsset.mutateAsync({ projectId, data: { name: c.assetName, kind: tile.kind, description: c.description, flavorText: c.tag } });
      refresh();
      const ok = await generateImageDirect(created.id, c.prompt);
      refresh();
      toast({ title: ok ? `${tile.label} generated` : "Image failed — asset created", variant: ok ? "default" : "destructive" });
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
      const narr = narrative.trim() || projectDescription || "";
      const fullPrompt = narr ? `${txt}. Narrative: ${narr}. Style: hand-painted, professional board-game art.` : txt;
      const created = await createAsset.mutateAsync({ projectId, data: { name: txt.slice(0, 60), kind: "other", description: `Custom — ${txt}`.slice(0, 240), flavorText: "Custom" } });
      refresh();
      const ok = await generateImageDirect(created.id, fullPrompt);
      refresh();
      if (ok) { toast({ title: "Asset generated" }); setFreeformPrompt(""); }
      else toast({ title: "Image generation failed", variant: "destructive" });
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGeneratingFreeform(false);
    }
  };

  const generateImage = async (assetId: number, prompt: string) => {
    setGenerating(assetId);
    try {
      if (!await generateImageDirect(assetId, prompt)) throw new Error("gen failed");
      refresh(); toast({ title: "Image generated" });
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const openImagePrompt = (id: number) => {
    const a = assets?.find((x) => x.id === id);
    setImagePrompt(a?.imagePrompt || `${a?.name} ${a?.description || ""}`.trim());
    setImagePromptId(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {assets?.length ?? 0} assets · click <span className="text-primary font-medium">AI</span> on any card to enhance text · <span className="text-primary font-medium">Gamma</span> to generate a PDF
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowAddForm((v) => !v)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Manual asset
        </Button>
      </div>

      {showAddForm && (
        <AssetForm
          projectId={projectId}
          entities={entities ?? []}
          onSave={async (data) => {
            await createAsset.mutateAsync({ projectId, data });
            refresh(); setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          saving={createAsset.isPending}
        />
      )}

      {imagePromptId !== null && (
        <Card className="bg-card border-primary/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Generate image</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setImagePromptId(null); setImagePrompt(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea rows={4} value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setImagePromptId(null); setImagePrompt(""); }}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={() => { generateImage(imagePromptId!, imagePrompt); setImagePromptId(null); setImagePrompt(""); }} disabled={!imagePrompt.trim()}>
                <Sparkles className="h-3.5 w-3.5" /> Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick-generate tiles */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick generate</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COMPONENT_KINDS.map((tile) => {
            const Icon = tile.icon;
            const busy = generatingTile === tile.id;
            return (
              <button
                key={tile.id}
                onClick={() => generateFromTile(tile)}
                disabled={busy || !!generatingTile}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Icon className="h-5 w-5 text-primary" />}
                <span className="text-xs font-medium">{tile.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Freeform */}
      <Card className="bg-card border-card-border">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Describe a custom component…"
              value={freeformPrompt}
              onChange={(e) => setFreeformPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !generatingFreeform) generateFromFreeform(); }}
            />
            <Button onClick={generateFromFreeform} disabled={!freeformPrompt.trim() || generatingFreeform} className="gap-1.5 shrink-0">
              {generatingFreeform ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Asset grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : !assets?.length ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">No assets yet — pick a type above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              entities={entities ?? []}
              projectId={projectId}
              isGenerating={generating === a.id}
              onGenerateImage={() => openImagePrompt(a.id)}
              onDownload={() => {
                if (!a.imageDataUrl) return;
                const link = document.createElement("a");
                link.href = a.imageDataUrl;
                link.download = `${a.name.replace(/[^a-z0-9]+/gi, "_")}.png`;
                link.click();
              }}
              onDelete={async () => {
                await deleteAsset.mutateAsync({ projectId, assetId: a.id }); refresh();
              }}
              onUpdated={refresh}
              fetchEnhance={() => enhanceAsset.mutateAsync({ projectId, assetId: a.id })}
              applyEnhance={async (fields) => {
                await updateAsset.mutateAsync({ projectId, assetId: a.id, data: fields });
                refresh();
              }}
              onGamma={() =>
                onGamma(
                  `Asset PDF — ${a.name}`,
                  buildAssetPrompt(a, entities?.find((e) => e.id === a.entityId), projectName, narrative),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Asset form (create) ───────────────────────────────────────────────────────

function AssetForm({
  projectId: _projectId,
  entities,
  initial,
  onSave,
  onCancel,
  saving,
}: {
  projectId: number;
  entities: Entity[];
  initial?: Partial<{ name: string; kind: string; description: string; flavorText: string; entityId: string }>;
  onSave: (data: { name: string; kind: string; description: string; flavorText: string; entityId?: number }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    kind: initial?.kind ?? "card",
    description: initial?.description ?? "",
    flavorText: initial?.flavorText ?? "",
    entityId: initial?.entityId ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave({
      name: form.name, kind: form.kind, description: form.description,
      flavorText: form.flavorText,
      ...(form.entityId ? { entityId: parseInt(form.entityId) } : {}),
    });
  };

  return (
    <Card className="bg-card border-primary/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{initial ? "Edit Asset" : "New Asset"}</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}><X className="h-3.5 w-3.5" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kind</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Linked Entity</Label>
              <Select value={form.entityId || "none"} onValueChange={(v) => setForm({ ...form, entityId: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {entities.map((e) => <SelectItem key={e.id} value={String(e.id)}>{getMeta(e.type).icon} {e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="resize-none" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Flavor text / tag</Label>
            <Textarea rows={2} value={form.flavorText} onChange={(e) => setForm({ ...form, flavorText: e.target.value })} className="resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {initial ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Asset card ────────────────────────────────────────────────────────────────

function AssetCard({
  asset, entities, projectId, isGenerating,
  onGenerateImage, onDownload, onDelete, onUpdated, fetchEnhance, applyEnhance, onGamma,
}: {
  asset: Asset;
  entities: Entity[];
  projectId: number;
  isGenerating: boolean;
  onGenerateImage: () => void;
  onDownload: () => void;
  onDelete: () => Promise<void>;
  onUpdated: () => void;
  fetchEnhance: () => Promise<AssetEnhanceSuggestion>;
  applyEnhance: (fields: Partial<{ name: string; description: string; flavorText: string }>) => Promise<void>;
  onGamma: () => void;
}) {
  const { toast } = useToast();
  const updateAsset = useUpdateAsset();
  const qc = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: asset.name, kind: asset.kind, description: asset.description ?? "",
    flavorText: asset.flavorText ?? "", entityId: asset.entityId ? String(asset.entityId) : "",
  });

  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [suggestion, setSuggestion] = useState<AssetEnhanceSuggestion | null>(null);
  const [picked, setPicked] = useState({ name: true, description: true, flavorText: true });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const linkedEntity = entities.find((e) => e.id === asset.entityId);

  const saveEdit = async () => {
    try {
      await updateAsset.mutateAsync({
        projectId, assetId: asset.id,
        data: {
          name: editForm.name, kind: editForm.kind, description: editForm.description,
          flavorText: editForm.flavorText,
          ...(editForm.entityId ? { entityId: parseInt(editForm.entityId) } : { entityId: undefined }),
        },
      });
      qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const runEnhance = async () => {
    setIsEnhancing(true); setSuggestion(null); setApplied(false); setShowEnhance(true);
    try {
      const data = await fetchEnhance();
      setSuggestion(data);
      setPicked({
        name: !!data.name && data.name !== asset.name,
        description: !!data.description && data.description !== (asset.description ?? ""),
        flavorText: !!data.flavorText && data.flavorText !== (asset.flavorText ?? ""),
      });
    } catch (err) {
      toast({ title: "AI enhance failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
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
    if (!Object.keys(fields).length) { toast({ title: "Pick at least one field", variant: "destructive" }); return; }
    setApplying(true);
    try {
      await applyEnhance(fields);
      setApplied(true);
      toast({ title: "Asset updated" });
      setTimeout(() => { setShowEnhance(false); setSuggestion(null); setApplied(false); }, 1200);
    } catch (err) {
      toast({ title: "Apply failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="bg-card border-card-border overflow-hidden flex flex-col group">
      {/* Image area */}
      <div className="aspect-square bg-muted/30 relative">
        {asset.imageDataUrl ? (
          <img src={asset.imageDataUrl} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground opacity-20" />
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase font-bold bg-black/60 text-white px-2 py-0.5 rounded">
          {asset.kind}
        </span>
        {linkedEntity && (
          <span className={`absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded border ${getMeta(linkedEntity.type).badge}`}>
            {getMeta(linkedEntity.type).icon} {linkedEntity.name}
          </span>
        )}
      </div>

      {/* Info / edit */}
      <CardContent className="p-3 flex-1 flex flex-col gap-2">
        {isEditing ? (
          <div className="space-y-2">
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-sm font-semibold" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <Select value={editForm.kind} onValueChange={(v) => setEditForm({ ...editForm, kind: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={editForm.entityId || "none"} onValueChange={(v) => setEditForm({ ...editForm, entityId: v === "none" ? "" : v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="No entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {entities.map((e) => <SelectItem key={e.id} value={String(e.id)}>{getMeta(e.type).icon} {e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea rows={2} placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="text-xs resize-none" />
            <Textarea rows={2} placeholder="Flavor text / tag" value={editForm.flavorText} onChange={(e) => setEditForm({ ...editForm, flavorText: e.target.value })} className="text-xs resize-none" />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={saveEdit} disabled={updateAsset.isPending}>
                {updateAsset.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-semibold text-sm line-clamp-1 flex-1">{asset.name}</h3>
              <div className="flex gap-0.5 shrink-0">
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-primary" onClick={runEnhance} disabled={isEnhancing}>
                  {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} AI
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-primary" onClick={onGamma} title="Generate PDF with Gamma">
                  <FileText className="h-3 w-3" /> Gamma
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {asset.description && <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>}
            {asset.flavorText && <p className="text-xs text-muted-foreground/60 italic line-clamp-1">"{asset.flavorText}"</p>}
            <div className="flex gap-1.5 mt-auto pt-1">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={onGenerateImage} disabled={isGenerating}>
                <Sparkles className="h-3 w-3" /> {isGenerating ? "Generating…" : asset.imageDataUrl ? "Regen" : "Generate"}
              </Button>
              {asset.imageDataUrl && (
                <Button size="sm" variant="outline" className="h-7" onClick={onDownload}>
                  <Download className="h-3 w-3" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* AI enhance panel */}
      {showEnhance && (
        <div className="border-t border-border bg-primary/5 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold text-primary flex-1">AI Enhancement</p>
            <button onClick={() => { setShowEnhance(false); setSuggestion(null); }} className="text-muted-foreground hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {isEnhancing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Rewriting copy…
            </div>
          )}
          {suggestion && !isEnhancing && (
            <div className="space-y-2">
              <SuggestionField label="Name" current={asset.name} proposed={suggestion.name} checked={picked.name} onToggle={() => setPicked({ ...picked, name: !picked.name })} />
              <SuggestionField label="Description" current={asset.description ?? ""} proposed={suggestion.description} checked={picked.description} onToggle={() => setPicked({ ...picked, description: !picked.description })} />
              <SuggestionField label="Flavor text" current={asset.flavorText ?? ""} proposed={suggestion.flavorText} checked={picked.flavorText} onToggle={() => setPicked({ ...picked, flavorText: !picked.flavorText })} />
              <div className="flex gap-1.5 pt-1 flex-wrap">
                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleApply} disabled={applying || applied}>
                  {applied ? <><Check className="h-3 w-3" /> Applied!</> : applying ? <><Loader2 className="h-3 w-3 animate-spin" /> Applying…</> : <><Wand2 className="h-3 w-3" /> Apply</>}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={runEnhance} disabled={isEnhancing}>
                  <RefreshCw className="h-3 w-3" /> Retry
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => { setShowEnhance(false); setSuggestion(null); }}>Dismiss</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Entities view ─────────────────────────────────────────────────────────────

function EntitiesView({
  projectId, narrative, projectName, onGamma,
}: {
  projectId: number;
  narrative: string;
  projectName: string;
  onGamma: (title: string, prompt: string) => void;
}) {
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
  const [filterType, setFilterType] = useState("all");

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
        data: { name: newEntity.name, type: newEntity.type, subtype: newEntity.subtype || undefined, description: newEntity.description || undefined, parentEntityId: newEntity.parentEntityId || undefined },
      });
      setNewEntity({ name: "", type: "Card", subtype: "", description: "" });
      setShowAddForm(false); refresh();
    } catch (err) {
      toast({ title: "Could not create component", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteEntity.mutateAsync({ projectId, entityId: id }); refresh(); }
    catch (err) { toast({ title: "Delete failed", description: errMsg(err), variant: "destructive" }); }
  };

  const toggleExpand = (id: number) =>
    setExpandedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleGroup = (type: string) =>
    setCollapsedGroups((prev) => { const s = new Set(prev); s.has(type) ? s.delete(type) : s.add(type); return s; });

  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    (entities ?? []).forEach((e) => { out[e.type] = (out[e.type] || 0) + 1; });
    return out;
  }, [entities]);

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
    return { topLevel: all.filter((e) => !childIds.has(e.id)), childrenByParent, decks: new Set(all.filter((e) => e.type === "Deck").map((e) => e.id)) };
  }, [entities]);

  const filtered = useMemo(() => filterType === "all" ? topLevel : topLevel.filter((e) => e.type === filterType), [topLevel, filterType]);

  const grouped = useMemo(() => {
    if (filterType !== "all") return null;
    const map = new Map<string, Entity[]>();
    filtered.forEach((e) => { if (!map.has(e.type)) map.set(e.type, []); map.get(e.type)!.push(e); });
    return map;
  }, [filtered, filterType]);

  const deckOptions = useMemo(() => (entities ?? []).filter((e) => e.type === "Deck"), [entities]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground">
          {entities?.length ?? 0} components · use <span className="text-primary font-medium">Gamma</span> on any entity to generate a reference doc or PDF
        </p>
        <div className="flex gap-1.5">
          <Button onClick={() => { setShowAIPanel(!showAIPanel); setShowAddForm(false); }} variant="outline" size="sm" className="h-8 border-primary/30 text-primary hover:bg-primary/10">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> AI Generate
          </Button>
          <Button onClick={() => { setShowAddForm(!showAddForm); setShowAIPanel(false); }} size="sm" className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Component
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      {entities && entities.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterType("all")} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === "all" ? "bg-white/10 text-white border-white/20" : "text-muted-foreground border-border hover:text-white"}`}>
              All ({topLevel.length})
            </button>
            {PHYSICAL_TYPES.map((t) => { const c = typeCounts[t]; if (!c) return null; const m = getMeta(t); return (
              <button key={t} onClick={() => setFilterType(t)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filterType === t ? m.badge : "text-muted-foreground border-border hover:text-white"}`}>
                <span>{m.icon}</span> {t} ({c})
              </button>
            ); })}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {WORLD_TYPES.map((t) => { const c = typeCounts[t]; if (!c) return null; const m = getMeta(t); return (
              <button key={t} onClick={() => setFilterType(t)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filterType === t ? m.badge : "text-muted-foreground border-border hover:text-white"}`}>
                <span>{m.icon}</span> {t} ({c})
              </button>
            ); })}
          </div>
        </div>
      )}

      {/* AI panel */}
      {showAIPanel && (
        <Card className="p-4 bg-card border-primary/30 border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Component Generator</p>
            <button onClick={() => setShowAIPanel(false)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex gap-2">
            <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g. 5 item cards and a matching deck for a fantasy dungeon crawler…" className="bg-input h-14 resize-none text-xs flex-1" />
            <div className="w-16 shrink-0 space-y-1">
              <Label className="text-xs">Count</Label>
              <Select value={aiCount.toString()} onValueChange={(v) => setAiCount(parseInt(v))}>
                <SelectTrigger className="h-8 bg-input text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{[3, 5, 8].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAiGenerate} disabled={!aiPrompt || aiGenerate.isPending} size="sm" className="w-full">
            {aiGenerate.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generating…</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</>}
          </Button>
        </Card>
      )}

      {/* Add form */}
      {showAddForm && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-primary" /> New Component</p>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <form onSubmit={handleAddEntity} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={newEntity.name} onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })} className="h-8 bg-input" autoFocus />
              </div>
              <div className="w-44 shrink-0 space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={newEntity.type} onValueChange={(v) => setNewEntity({ ...newEntity, type: v as ComponentType, subtype: "", parentEntityId: undefined })}>
                  <SelectTrigger className="h-8 bg-input text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup><SelectLabel className="text-[10px]">Physical</SelectLabel>{PHYSICAL_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}</SelectGroup>
                    <SelectGroup><SelectLabel className="text-[10px]">World</SelectLabel>{WORLD_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}</SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Subtype</Label>
                <Select value={newEntity.subtype || "__none__"} onValueChange={(v) => setNewEntity({ ...newEntity, subtype: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="h-8 bg-input text-xs"><SelectValue placeholder="Select subtype…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {COMPONENT_SUBTYPES[newEntity.type].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {newEntity.type === "Card" && deckOptions.length > 0 && (
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Add to Deck</Label>
                  <Select value={newEntity.parentEntityId ? String(newEntity.parentEntityId) : "__none__"} onValueChange={(v) => setNewEntity({ ...newEntity, parentEntityId: v === "__none__" ? undefined : parseInt(v) })}>
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
              <Textarea value={newEntity.description} onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })} className="h-16 resize-none bg-input" placeholder={getMeta(newEntity.type).desc} />
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
          <p className="text-muted-foreground mt-1 text-sm">Generate with AI or add manually.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-10">No {filterType} components yet.</p>
      ) : grouped ? (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([type, items]) => {
            const m = getMeta(type);
            const collapsed = collapsedGroups.has(type);
            return (
              <div key={type} className="rounded-lg border border-border overflow-hidden">
                <button onClick={() => toggleGroup(type)} className="w-full flex items-center gap-3 px-4 py-2.5 bg-muted/20 hover:bg-muted/30 transition-colors text-left">
                  {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="text-base">{m.icon}</span>
                  <span className={`text-sm font-semibold ${m.color}`}>{type}s</span>
                  <Badge variant="outline" className={`text-[10px] ml-1 ${m.badge}`}>{items.length}</Badge>
                  <span className="text-xs text-muted-foreground ml-1 hidden sm:block">{m.desc}</span>
                </button>
                {!collapsed && (
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
                        onGamma={() =>
                          onGamma(
                            decks.has(entity.id) ? `Deck PDF — ${entity.name}` : `Component Doc — ${entity.name}`,
                            decks.has(entity.id)
                              ? buildDeckPrompt(entity, childrenByParent[entity.id] ?? [], projectName, narrative)
                              : buildEntityPrompt(entity, projectName, narrative),
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
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
              onGamma={() =>
                onGamma(
                  decks.has(entity.id) ? `Deck PDF — ${entity.name}` : `Component Doc — ${entity.name}`,
                  decks.has(entity.id)
                    ? buildDeckPrompt(entity, childrenByParent[entity.id] ?? [], projectName, narrative)
                    : buildEntityPrompt(entity, projectName, narrative),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entity card ───────────────────────────────────────────────────────────────

function EntityCard({
  entity, projectId, isExpanded, onToggle, onDelete, onUpdated,
  childEntities, isDeck, deckOptions, onGamma,
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
  onGamma: () => void;
}) {
  const queryClient = useQueryClient();
  const updateEntity = useUpdateEntity();
  const createEntity = useCreateEntity();
  const enhanceEntity = useAiEnhanceEntity();
  const { toast } = useToast();

  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhance, setEnhance] = useState<AIEnhanceEntity | null>(null);
  const [selectedProps, setSelectedProps] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: entity.name, type: entity.type, subtype: entity.subtype ?? "",
    description: entity.description ?? "", parentEntityId: entity.parentEntityId ?? undefined as number | undefined,
  });
  const createProperty = useCreateEntityProperty();
  const meta = getMeta(entity.type);
  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const handleSaveEdit = async () => {
    try {
      await updateEntity.mutateAsync({
        projectId, entityId: entity.id,
        data: { name: editForm.name, type: editForm.type, subtype: editForm.subtype || undefined, description: editForm.description, parentEntityId: editForm.parentEntityId ?? null },
      });
      setIsEditing(false); onUpdated();
      toast({ title: "Component updated" });
    } catch (err) {
      toast({ title: "Update failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    try {
      await createEntity.mutateAsync({ projectId, data: { name: `${entity.name} (Copy)`, type: entity.type, description: entity.description ?? "" } });
      onUpdated(); toast({ title: "Component duplicated" });
    } catch (err) {
      toast({ title: "Duplicate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true); setEnhance(null); setShowEnhance(true);
    try {
      const raw = await enhanceEntity.mutateAsync({ projectId, entityId: entity.id });
      const safeProps = Array.isArray(raw?.suggestedProperties)
        ? raw.suggestedProperties.filter((p): p is AIEnhanceEntity["suggestedProperties"][number] => !!p && typeof p === "object" && typeof p.name === "string")
        : [];
      const data: AIEnhanceEntity = {
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
    const payload: { name: string; dataType: string; defaultValue?: number; textValue?: string } = { name: p.name, dataType: p.dataType };
    if (p.defaultValue != null && p.defaultValue !== "") {
      const n = Number(p.defaultValue);
      if (Number.isFinite(n) && p.defaultValue.trim() !== "") payload.defaultValue = n;
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
        data: { description: enhance.description, ...(enhance.lore ? { lore: enhance.lore } : {}), ...(enhance.designNotes ? { designNotes: enhance.designNotes } : {}) },
      });
      const propsToAdd = enhance.suggestedProperties.filter((_, i) => selectedProps.has(i));
      for (const prop of propsToAdd) {
        await createProperty.mutateAsync({ projectId, entityId: entity.id, data: buildPropertyPayload(prop) });
      }
      queryClient.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entity.id) });
      onUpdated(); setApplied(true);
      toast({ title: "Applied!", description: `Description updated${propsToAdd.length ? ` + ${propsToAdd.length} propert${propsToAdd.length === 1 ? "y" : "ies"} added.` : "."}` });
      setTimeout(() => { setShowEnhance(false); setApplied(false); setEnhance(null); }, 1500);
    } catch (err) {
      toast({ title: "Apply failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden rounded-none border-0 border-b last:border-b-0">
      {isEditing ? (
        <div className="px-4 py-3 space-y-3 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="bg-input h-8 text-sm font-semibold flex-1 min-w-[140px]" autoFocus />
            <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v, subtype: "" }))}>
              <SelectTrigger className="bg-input h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup><SelectLabel className="text-[10px]">Physical</SelectLabel>{PHYSICAL_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}</SelectGroup>
                <SelectGroup><SelectLabel className="text-[10px]">World</SelectLabel>{WORLD_TYPES.map((t) => <SelectItem key={t} value={t}>{getMeta(t).icon} {t}</SelectItem>)}</SelectGroup>
              </SelectContent>
            </Select>
            <Select value={editForm.subtype || "__none__"} onValueChange={(v) => setEditForm((f) => ({ ...f, subtype: v === "__none__" ? "" : v }))}>
              <SelectTrigger className="bg-input h-8 text-xs w-36"><SelectValue placeholder="Subtype…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {COMPONENT_SUBTYPES[editForm.type as ComponentType]?.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {editForm.type === "Card" && deckOptions && deckOptions.length > 0 && (
            <Select value={editForm.parentEntityId ? String(editForm.parentEntityId) : "__none__"} onValueChange={(v) => setEditForm((f) => ({ ...f, parentEntityId: v === "__none__" ? undefined : parseInt(v) }))}>
              <SelectTrigger className="h-8 bg-input text-xs w-56"><SelectValue placeholder="No deck…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No deck —</SelectItem>
                {deckOptions.map((d) => <SelectItem key={d.id} value={String(d.id)}>📦 {d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description…" className="bg-input text-sm resize-none h-16" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs gap-1" disabled={updateEntity.isPending}>
              {updateEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditForm({ name: entity.name, type: entity.type, subtype: entity.subtype ?? "", description: entity.description ?? "", parentEntityId: entity.parentEntityId ?? undefined }); setIsEditing(false); }} className="h-7 text-xs text-muted-foreground">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/10 transition-colors" onClick={onToggle}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className="text-sm shrink-0">{meta.icon}</span>
            <span className={`text-base font-semibold truncate ${meta.color}`}>{entity.name}</span>
            {entity.subtype && <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.badge}`}>{entity.subtype}</Badge>}
            {isDeck && childEntities && childEntities.length > 0 && (
              <Badge variant="outline" className="text-[10px] shrink-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                {childEntities.length} card{childEntities.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {entity.description && <span className="text-xs text-muted-foreground truncate hidden md:block">{entity.description}</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className={`text-xs h-7 px-2 gap-1 ${showEnhance ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
              onClick={() => { setShowEnhance(!showEnhance); if (!showEnhance && !enhance) handleEnhance(); }}>
              <Wand2 className="w-3.5 h-3.5" /> AI
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={onGamma} title={isDeck ? "Generate deck PDF with Gamma" : "Generate component doc with Gamma"}>
              <FileText className="w-3.5 h-3.5" /> {isDeck ? "PDF" : "Doc"}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-muted/20"
              onClick={() => { setEditForm({ name: entity.name, type: entity.type, subtype: entity.subtype ?? "", description: entity.description ?? "", parentEntityId: entity.parentEntityId ?? undefined }); setIsEditing(true); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={handleDuplicate}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* AI enhance panel */}
      {showEnhance && (
        <div className={`border-t border-border ${meta.bg} px-5 py-4`}>
          {isEnhancing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Analyzing and generating improvements…
            </div>
          )}
          {enhance && !isEnhancing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${meta.color}`}><Sparkles className="w-3.5 h-3.5" /> Enhanced Description</div>
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
                    <p className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>Suggested Properties ({enhance.suggestedProperties.length})</p>
                    <div className="flex gap-2 text-xs">
                      <button className="text-primary hover:underline" onClick={() => setSelectedProps(new Set(enhance.suggestedProperties.map((_, i) => i)))}>All</button>
                      <button className="text-muted-foreground hover:underline" onClick={() => setSelectedProps(new Set())}>None</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
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
                              {prop.defaultValue != null && prop.defaultValue !== "" && <span className="text-xs text-muted-foreground font-mono">= {prop.defaultValue}</span>}
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
                <Button onClick={handleApply} disabled={applying || applied} size="sm" className="bg-primary text-primary-foreground">
                  {applied ? <><Check className="w-3.5 h-3.5 mr-1.5" />Applied!</> : applying ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Applying…</> : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Apply{selectedProps.size > 0 ? ` + ${selectedProps.size} Props` : ""}</>}
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

      {/* Expanded panel */}
      {isExpanded && (
        <div className="px-5 py-4 border-t border-border bg-muted/5 space-y-4">
          {(entity.lore || entity.designNotes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entity.lore && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Flavor / Lore</p>
                  <p className="text-xs text-muted-foreground italic leading-relaxed bg-background/40 border border-border/50 rounded p-2.5 whitespace-pre-wrap">"{entity.lore}"</p>
                </div>
              )}
              {entity.designNotes && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Designer's Notes</p>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background/40 border border-border/50 rounded p-2.5 whitespace-pre-wrap">{entity.designNotes}</p>
                </div>
              )}
            </div>
          )}
          {isDeck && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>🃏</span> Cards in this deck ({childEntities?.length ?? 0})
                </p>
                <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2 text-primary border-primary/30 hover:bg-primary/10" onClick={onGamma}>
                  <FileText className="w-3 h-3" /> Generate PDF
                </Button>
              </div>
              {!childEntities || childEntities.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">No cards yet.</p>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border/50">
                  {childEntities.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span>{getMeta(child.type).icon}</span>
                      <span className="font-medium text-white truncate">{child.name}</span>
                      {child.subtype && <Badge variant="outline" className={`text-[10px] shrink-0 ${getMeta(child.type).badge}`}>{child.subtype}</Badge>}
                      {child.description && <span className="text-xs text-muted-foreground truncate hidden sm:block">{child.description}</span>}
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

// ── Entity properties ─────────────────────────────────────────────────────────

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

  const valueToPayload = (val: string) => {
    if (val === "") return { textValue: "" };
    const num = Number(val);
    if (Number.isFinite(num) && val.trim() !== "") return { defaultValue: num, textValue: "" };
    return { textValue: val, defaultValue: undefined };
  };

  const displayValue = (p: EntityProperty) => {
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
    } catch (err) { toast({ title: "Could not update property", description: errMsg(err), variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteProperty.mutateAsync({ projectId, entityId, propertyId: id }); refresh(); }
    catch (err) { toast({ title: "Could not delete property", description: errMsg(err), variant: "destructive" }); }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-1">Loading properties…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Settings className="w-3.5 h-3.5" /> Properties
        {properties && properties.length > 0 && <span className="text-muted-foreground/50 font-normal normal-case tracking-normal ml-1">— click row to edit</span>}
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
                    <button onClick={saveEdit} disabled={updateProperty.isPending} className="text-primary hover:text-primary/80 p-1 disabled:opacity-50">
                      {updateProperty.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-white p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-3 px-3 py-2 items-center text-sm hover:bg-muted/10 cursor-pointer group" onClick={() => startEdit(prop)}>
                  <div className="col-span-4 font-mono text-xs text-white truncate">{prop.name}</div>
                  <div className="col-span-3"><Badge variant="secondary" className="bg-secondary/40 font-mono text-[10px]">{prop.dataType}</Badge></div>
                  <div className="col-span-3 text-muted-foreground font-mono text-xs truncate">{displayValue(prop)}</div>
                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(prop); }} className="text-muted-foreground hover:text-white p-0.5"><Pencil className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {(!properties || properties.length === 0) && <p className="text-xs text-muted-foreground/60 py-1">No properties yet.</p>}
      <form onSubmit={handleAddProp} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Property Name</Label>
          <Input className="h-8 text-xs bg-input font-mono" placeholder="property_name" value={newProp.name} onChange={(e) => setNewProp({ ...newProp, name: e.target.value })} />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</Label>
          <Select value={newProp.dataType} onValueChange={(v) => setNewProp({ ...newProp, dataType: v })}>
            <SelectTrigger className="h-8 text-xs bg-input"><SelectValue /></SelectTrigger>
            <SelectContent>{PROP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-28 space-y-1">
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

// ── Suggestion field (asset AI enhance) ───────────────────────────────────────

function SuggestionField({ label, current, proposed, checked, onToggle }: {
  label: string; current: string; proposed?: string; checked: boolean; onToggle: () => void;
}) {
  if (!proposed || proposed === current) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs text-muted-foreground italic">{!proposed ? "No change suggested." : "No change — AI returned same value."}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={checked} onChange={onToggle} className="h-3 w-3 accent-primary" />
          Apply this
        </label>
      </div>
      {current && <p className="text-xs text-muted-foreground/70 line-through bg-background/40 border border-border rounded px-2 py-1">{current}</p>}
      <p className={`text-xs leading-relaxed bg-background/60 border rounded px-2 py-1.5 ${checked ? "text-foreground border-primary/40" : "text-muted-foreground border-border"}`}>{proposed}</p>
    </div>
  );
}
