import { useState, useEffect, useRef, useMemo } from "react";
import {
  useListAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useAiEnhanceAsset,
  useGetProject, useUpdateProject, getListAssetsQueryKey, getGetProjectQueryKey,
  useListEntities, useCreateEntity, useUpdateEntity, useDeleteEntity,
  useAiGenerateEntities, useAiEnhanceEntity,
  useListEntityProperties, useCreateEntityProperty, useUpdateEntityProperty, useDeleteEntityProperty,
  useListRules, useListProjectEntityProperties,
  useListEntityRules, useLinkEntityRule, useUnlinkEntityRule, getListEntityRulesQueryKey,
  getListEntitiesQueryKey, getListEntityPropertiesQueryKey,
  type Asset, type AssetEnhanceSuggestion, type Entity, type EntityProperty,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, ImageIcon, Edit2, Sparkles, Download, Loader2, Wand2, Save, BookOpen,
  Layers, Square, Circle, Dice5, User, Map as MapIcon, Package, Tag, Check, X, RefreshCw,
  ChevronDown, ChevronRight, Settings, Pencil, Copy, FileText, Activity, Eye, TableIcon,
  GitBranch, Zap, LayoutGrid, Library, Images,
} from "lucide-react";
import { buildLinks, CoverageGaps, EntityGraph, EntityNodeInspector, ComponentBrowser, PropertyDictionary, RuleEntityLinks } from "./component-graph";
import { ComponentLibraryView } from "./component-library";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  PHYSICAL_TYPES, WORLD_TYPES, ALL_COMPONENT_TYPES, COMPONENT_META, COMPONENT_SUBTYPES,
  STATUS_OPTIONS, getMeta, getStatusMeta, type ComponentType,
} from "@/lib/game-component-types";
import { EntitySheetView } from "./entity-sheet-view";
import { CardStudio } from "./card-studio";
import { DieFaceDesigner } from "./die-face-designer";
import { VariantManager } from "./variant-manager";
import { ComponentBOM } from "./component-bom";
import { Entities } from "@/components/workspace/entities";


type ComponentKind = { id: string; label: string; kind: string; icon: React.ComponentType<{ className?: string }>; promptHint: string };
const COMPONENT_KINDS: ComponentKind[] = [
  { id: "card",      label: "Card Deck",    kind: "card",     icon: Layers,   promptHint: "a hand-illustrated card with title bar, central art frame, and rule text area" },
  { id: "board",     label: "Game Board",   kind: "board",    icon: Square,   promptHint: "a top-down game board with hex or grid regions, paths, and iconography" },
  { id: "token",     label: "Token Set",    kind: "token",    icon: Circle,   promptHint: "a set of small circular player tokens with distinct icons and colors" },
  { id: "tile",      label: "Tile Set",     kind: "tile",     icon: MapIcon,  promptHint: "a collection of interlocking hex or square terrain tiles with illustrated surfaces" },
  { id: "dice",      label: "Dice",         kind: "dice",     icon: Dice5,    promptHint: "custom-faced dice with engraved symbols on each face, wooden or resin" },
  { id: "rulebook",  label: "Rulebook",     kind: "rulebook", icon: BookOpen, promptHint: "a booklet cover with the game logo and thematic art, professional layout" },
  { id: "character", label: "Character",    kind: "other",    icon: User,     promptHint: "a character portrait, three-quarter view, hand-painted illustration" },
  { id: "custom",    label: "Custom…",      kind: "other",    icon: Tag,      promptHint: "a custom game component with thematic art and professional finish" },
];

const ASSET_KINDS = ["card", "token", "board", "tile", "dice", "rulebook", "other"];

// displayOrder offsets per kind so per-section order persists without collisions
const KIND_ORDER_OFFSET: Record<string, number> = {
  card:     0,
  token:    10000,
  tile:     20000,
  board:    30000,
  dice:     40000,
  rulebook: 50000,
  other:    60000,
};

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

  const [narrative, setNarrative] = useState("");
  const [narrativeDirty, setNarrativeDirty] = useState(false);
  const [savingNarrative, setSavingNarrative] = useState(false);
  const [gammaDialog, setGammaDialog] = useState<{ title: string; prompt: string } | null>(null);
  const narrativeRef = useRef(narrative);
  narrativeRef.current = narrative;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advanced drawer state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<"graph" | "library">("graph");

  // Collapsible sections
  const [workshopOpen, setWorkshopOpen] = useState(true);
  const [manifestOpen, setManifestOpen] = useState(false);

  useEffect(() => {
    if (project && !narrativeDirty) setNarrative(project.narrative ?? "");
  }, [project, narrativeDirty]);

  // Flush any pending debounce save on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, []);

  const saveNarrative = async (value: string) => {
    setSavingNarrative(true);
    try {
      await updateProject.mutateAsync({ projectId, data: { narrative: value } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      // Only clear dirty flag if the narrative hasn't changed since this save started
      setNarrativeDirty((dirty) => (dirty && narrativeRef.current !== value ? dirty : false));
    } catch (err) {
      toast({ title: "Narrative save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSavingNarrative(false);
    }
  };

  const handleNarrativeChange = (value: string) => {
    setNarrative(value);
    setNarrativeDirty(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => saveNarrative(value), 1000);
  };

  const openGamma = (title: string, prompt: string) => setGammaDialog({ title, prompt });

  const { data: allAssets } = useListAssets(projectId);
  const { data: allEntities } = useListEntities(projectId);
  const { data: allRules } = useListRules(projectId);
  const { data: allProperties } = useListProjectEntityProperties(projectId);

  const [selectedGraphEntity, setSelectedGraphEntity] = useState<Entity | null>(null);
  const links = useMemo(() => buildLinks(allEntities ?? [], allRules ?? []), [allEntities, allRules]);
  const propsByEntity = useMemo(() => {
    const m = new Map<number, EntityProperty[]>();
    for (const p of allProperties ?? []) {
      const arr = m.get(p.entityId) ?? [];
      arr.push(p);
      m.set(p.entityId, arr);
    }
    return m;
  }, [allProperties]);

  const sendToChat = (prompt: string) => {
    onChatPrompt?.(prompt);
    toast({ title: "Sent to AI Chat", description: "Open the chat panel to review and send." });
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Component Studio
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Design, generate, and manage every component in your game
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { setAdvancedTab("graph"); setAdvancedOpen(true); }}
          >
            <GitBranch className="h-3.5 w-3.5" /> Graph
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { setAdvancedTab("library"); setAdvancedOpen(true); }}
          >
            <Library className="h-3.5 w-3.5" /> Library
          </Button>
        </div>
      </div>

      {/* ── Zone 1 & 2: Generation Bar + Component Gallery (Assets) ── */}
      <AssetsView
        projectId={projectId}
        narrative={narrative}
        onNarrativeChange={handleNarrativeChange}
        narrativeDirty={narrativeDirty}
        savingNarrative={savingNarrative}
        projectName={project?.name ?? "Untitled"}
        projectDescription={project?.description ?? ""}
        onGamma={openGamma}
      />

      {/* ── Workshop section (entities) ── collapsible ── */}
      <Collapsible open={workshopOpen} onOpenChange={setWorkshopOpen}>
        <div className="flex items-center gap-2 border border-border rounded-lg px-4 py-3 bg-card">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 flex-1 text-left">
              {workshopOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">Component Workshop</span>
              <span className="text-xs text-muted-foreground ml-1">— design entities, manage cards, dice & tiles</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="mt-3">
            <Entities projectId={projectId} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Manifest accordion ── */}
      <Collapsible open={manifestOpen} onOpenChange={setManifestOpen}>
        <div className="flex items-center gap-2 border border-border rounded-lg px-4 py-3 bg-card">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 flex-1 text-left">
              {manifestOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              <Package className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">Manifest (Bill of Materials)</span>
              <span className="text-xs text-muted-foreground ml-1">— component totals and printable list</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="mt-3">
            <ComponentBOM
              projectId={projectId}
              projectName={project?.name ?? "Untitled"}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Advanced drawer (Graph + Library) ── */}
      <Sheet open={advancedOpen} onOpenChange={(v) => { setAdvancedOpen(v); if (!v) setSelectedGraphEntity(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl overflow-y-auto bg-background border-l border-border p-0"
        >
          <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center gap-3">
            <SheetHeader className="flex-1 space-y-0">
              <SheetTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Advanced Views
              </SheetTitle>
            </SheetHeader>
            <div className="flex gap-1 p-1 bg-muted/30 rounded-md border border-border">
              <button
                onClick={() => { setAdvancedTab("graph"); setSelectedGraphEntity(null); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  advancedTab === "graph" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitBranch className="h-3 w-3" /> Graph
              </button>
              <button
                onClick={() => { setAdvancedTab("library"); setSelectedGraphEntity(null); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  advancedTab === "library" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-3 w-3" /> Library
              </button>
            </div>
          </div>

          <div className="p-6">
            {advancedTab === "graph" ? (
              <div className="space-y-6 pb-8">
                <CoverageGaps
                  entities={allEntities ?? []}
                  rules={allRules ?? []}
                  links={links}
                  onJump={() => setAdvancedOpen(false)}
                />
                <EntityGraph
                  projectId={projectId}
                  entities={allEntities ?? []}
                  links={links}
                  assets={allAssets ?? []}
                  onEntityClick={(entity) => setSelectedGraphEntity(entity)}
                  onJump={() => setAdvancedOpen(false)}
                />
                {selectedGraphEntity && (
                  <EntityNodeInspector
                    entity={selectedGraphEntity}
                    assets={allAssets ?? []}
                    links={links}
                    propCount={propsByEntity.get(selectedGraphEntity.id)?.length ?? 0}
                    onClose={() => setSelectedGraphEntity(null)}
                  />
                )}
                <ComponentBrowser
                  entities={allEntities ?? []}
                  links={links}
                  propsByEntity={propsByEntity}
                  onJump={() => setAdvancedOpen(false)}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <PropertyDictionary
                    entities={allEntities ?? []}
                    properties={allProperties ?? []}
                  />
                  <RuleEntityLinks
                    rules={allRules ?? []}
                    entities={allEntities ?? []}
                    links={links}
                  />
                </div>
              </div>
            ) : (
              <ComponentLibraryView />
            )}
          </div>
        </SheetContent>
      </Sheet>

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

// ── Assets view (Component Studio — Generation Bar + Gallery + Inspector) ─────

function AssetsView({
  projectId, narrative, onNarrativeChange, narrativeDirty,
  savingNarrative, projectName, projectDescription, onGamma,
}: {
  projectId: number;
  narrative: string;
  onNarrativeChange: (v: string) => void;
  narrativeDirty: boolean;
  savingNarrative: boolean;
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
  const [genCount, setGenCount] = useState(1);
  const [genQueue, setGenQueue] = useState<{ done: number; total: number } | null>(null);
  const [placeholders, setPlaceholders] = useState<Array<{ tempId: string; name: string }>>([]);
  const [generating, setGenerating] = useState<number | null>(null);
  const [imagePromptId, setImagePromptId] = useState<number | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormKind, setAddFormKind] = useState<string>("card");
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [groupByType, setGroupByType] = useState(
    () => localStorage.getItem("gameforge:groupByType") === "true"
  );
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  // Inspector sheet
  const [inspectorAssetId, setInspectorAssetId] = useState<number | null>(null);
  const inspectorAsset = assets?.find((a) => a.id === inspectorAssetId) ?? null;

  useEffect(() => {
    localStorage.setItem("gameforge:groupByType", String(groupByType));
  }, [groupByType]);

  // Drag-and-drop order tracking
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<number[]>([]);
  const dragOverIdRef = useRef<number | null>(null);
  const isSavingOrder = useRef(false);
  // Keyboard reorder focus tracking
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const localOrderRef = useRef<number[]>(localOrder);
  useEffect(() => { localOrderRef.current = localOrder; }, [localOrder]);

  // Per-kind order tracking for grouped mode
  const [draggedKind, setDraggedKind] = useState<string | null>(null);
  const [localGroupOrder, setLocalGroupOrder] = useState<Map<string, number[]>>(new Map());

  // Sync localOrder from server whenever assets change (but not during active drag)
  useEffect(() => {
    if (!assets || draggedId !== null) return;
    setLocalOrder(assets.map((a) => a.id));
  }, [assets, draggedId]);

  // Sync localGroupOrder from server whenever assets change (but not during active drag)
  useEffect(() => {
    if (!assets || draggedId !== null) return;
    const map = new Map<string, number[]>();
    for (const a of assets) {
      const k = a.kind ?? "other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a.id);
    }
    setLocalGroupOrder(map);
  }, [assets, draggedId]);

  // Derive sorted asset list from localOrder
  const orderedAssets = useMemo(() => {
    if (!assets?.length) return assets ?? [];
    const orderMap = new Map(localOrder.map((id, i) => [id, i]));
    return [...assets].sort((a, b) => {
      const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
      const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
      return ia - ib;
    });
  }, [assets, localOrder]);

  const handleDragStart = (id: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
    dragOverIdRef.current = null;
    document.body.style.cursor = "grabbing";
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId === null || draggedId === targetId) return;
    setDropTargetId(targetId);
    if (dragOverIdRef.current === targetId) return;
    dragOverIdRef.current = targetId;
    setLocalOrder((prev) => {
      const from = prev.indexOf(draggedId);
      const to = prev.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      return next;
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    document.body.style.cursor = "";
    if (draggedId === null || isSavingOrder.current) return;
    isSavingOrder.current = true;
    const finalOrder = [...localOrder];
    setDraggedId(null);
    setDropTargetId(null);
    dragOverIdRef.current = null;
    try {
      await Promise.all(
        finalOrder.map((id, index) =>
          updateAsset.mutateAsync({ projectId, assetId: id, data: { displayOrder: index } })
        )
      );
      refresh();
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" });
      refresh();
    } finally {
      isSavingOrder.current = false;
    }
  };

  const handleDragEnd = () => {
    document.body.style.cursor = "";
    setDraggedId(null);
    setDropTargetId(null);
    dragOverIdRef.current = null;
  };

  // ── Grouped-mode drag handlers (within-section only) ──────────────────────
  const handleGroupedDragStart = (id: number, kind: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
    setDraggedKind(kind);
    dragOverIdRef.current = null;
  };

  const handleGroupedDragOver = (e: React.DragEvent, targetId: number, targetKind: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId === null || draggedKind === null || draggedId === targetId) return;
    if (draggedKind !== targetKind) return;
    setDropTargetId(targetId);
    if (dragOverIdRef.current === targetId) return;
    dragOverIdRef.current = targetId;
    setLocalGroupOrder((prev) => {
      const ids = prev.get(draggedKind) ?? [];
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...ids];
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      const newMap = new Map(prev);
      newMap.set(draggedKind, next);
      return newMap;
    });
  };

  const handleGroupedDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedId === null || draggedKind === null || isSavingOrder.current) return;
    isSavingOrder.current = true;
    const kind = draggedKind;
    const finalKindOrder = localGroupOrder.get(kind) ?? [];
    const kindOffset = KIND_ORDER_OFFSET[kind] ?? 60000;
    setDraggedId(null);
    setDraggedKind(null);
    setDropTargetId(null);
    dragOverIdRef.current = null;
    try {
      await Promise.all(
        finalKindOrder.map((id, index) =>
          updateAsset.mutateAsync({ projectId, assetId: id, data: { displayOrder: kindOffset + index } })
        )
      );
      refresh();
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" });
      refresh();
    } finally {
      isSavingOrder.current = false;
    }
  };

  const handleGroupedDragEnd = () => {
    setDraggedId(null);
    setDraggedKind(null);
    setDropTargetId(null);
    dragOverIdRef.current = null;
  };

  // Card element refs for focus restoration after keyboard move (#38)
  const cardElemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const moveAsset = async (id: number, delta: -1 | 1) => {
    const currentOrder = localOrderRef.current;
    const idx = currentOrder.indexOf(id);
    if (idx === -1) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= currentOrder.length) return;
    const finalOrder = [...currentOrder];
    finalOrder.splice(idx, 1);
    finalOrder.splice(newIdx, 0, id);
    setLocalOrder(finalOrder);
    requestAnimationFrame(() => cardElemRefs.current.get(id)?.focus());
    try {
      await Promise.all(
        finalOrder.map((aid, index) =>
          updateAsset.mutateAsync({ projectId, assetId: aid, data: { displayOrder: index } })
        )
      );
      refresh();
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" });
      refresh();
    }
  };

  const moveGroupedAsset = async (id: number, kind: string, delta: -1 | 1) => {
    const kindIds = localGroupOrder.get(kind) ?? [];
    const idx = kindIds.indexOf(id);
    if (idx === -1) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= kindIds.length) return;
    const next = [...kindIds];
    next.splice(idx, 1);
    next.splice(newIdx, 0, id);
    setLocalGroupOrder((prev) => { const m = new Map(prev); m.set(kind, next); return m; });
    requestAnimationFrame(() => cardElemRefs.current.get(id)?.focus());
    const kindOffset = KIND_ORDER_OFFSET[kind] ?? 60000;
    try {
      await Promise.all(
        next.map((aid, index) =>
          updateAsset.mutateAsync({ projectId, assetId: aid, data: { displayOrder: kindOffset + index } })
        )
      );
      refresh();
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" });
      refresh();
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, id: number, kind?: string) => {
    if (!e.shiftKey) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      if (groupByType && kind) moveGroupedAsset(id, kind, -1);
      else moveAsset(id, -1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (groupByType && kind) moveGroupedAsset(id, kind, 1);
      else moveAsset(id, 1);
    }
  };

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
      toast({ title: "Add a narrative first", description: "Open the context panel and write a story seed.", variant: "destructive" });
      setNarrativeOpen(true);
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
    const count = Math.max(1, Math.min(10, genCount));
    // Seed optimistic placeholder cards immediately
    const seeds = Array.from({ length: count }, (_, i) => ({
      tempId: `ph-${Date.now()}-${i}`,
      name: count > 1 ? `${txt.slice(0, 40)} #${i + 1}` : txt.slice(0, 60),
    }));
    setPlaceholders(seeds);
    if (count > 1) setGenQueue({ done: 0, total: count });
    let succeeded = 0;
    try {
      const narr = narrative.trim() || projectDescription || "";
      const fullPrompt = narr ? `${txt}. Narrative: ${narr}. Style: hand-painted, professional board-game art.` : txt;
      for (let i = 0; i < count; i++) {
        const suffix = count > 1 ? ` #${i + 1}` : "";
        const created = await createAsset.mutateAsync({ projectId, data: { name: (txt.slice(0, 58) + suffix).slice(0, 60), kind: "other", description: `Custom — ${txt}`.slice(0, 240), flavorText: "Custom" } });
        // Replace the first placeholder with the real card
        setPlaceholders((prev) => prev.slice(1));
        refresh();
        const ok = await generateImageDirect(created.id, fullPrompt);
        if (ok) succeeded++;
        refresh();
        if (count > 1) setGenQueue({ done: i + 1, total: count });
      }
      toast({ title: count === 1 ? (succeeded ? "Asset generated" : "Image failed — asset created") : `Generated ${succeeded}/${count} assets` });
      if (succeeded > 0) setFreeformPrompt("");
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGeneratingFreeform(false);
      setGenQueue(null);
      setPlaceholders([]);
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

  const bulkGenerateImages = async () => {
    const missing = (assets ?? []).filter((a) => !a.imageDataUrl);
    if (!missing.length) { toast({ title: "All assets already have images" }); return; }
    setBulkGenerating(true);
    setBulkProgress({ done: 0, total: missing.length });
    let done = 0;
    for (const a of missing) {
      const prompt = a.imagePrompt || `${a.name} ${a.description || ""}`.trim();
      try { await generateImageDirect(a.id, prompt); refresh(); } catch { /* continue */ }
      done++;
      setBulkProgress({ done, total: missing.length });
    }
    setBulkGenerating(false);
    setBulkProgress(null);
    refresh();
    toast({ title: `Generated images for ${done} asset${done === 1 ? "" : "s"}` });
  };

  // Fixed section order for grouped gallery — Dice is first-class
  const GALLERY_SECTIONS: { kind: string; label: string }[] = [
    { kind: "card",     label: "Cards" },
    { kind: "token",    label: "Tokens" },
    { kind: "tile",     label: "Tiles" },
    { kind: "board",    label: "Boards" },
    { kind: "dice",     label: "Dice" },
    { kind: "rulebook", label: "Rulebooks" },
    { kind: "other",    label: "Other" },
  ];


  // Group assets by kind when groupByType is on
  const groupedAssets = useMemo(() => {
    if (!groupByType || !assets?.length) return null;
    const map = new Map<string, Asset[]>();
    for (const a of assets) {
      const k = a.kind ?? "other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return map;
  }, [assets, groupByType]);

  const missingImageCount = (assets ?? []).filter((a) => !a.imageDataUrl).length;

  return (
    <div className="space-y-4">
      {/* ── Zone 1: Generation Bar ── */}
      <Card className="bg-card border-primary/20">
        <CardContent className="p-4 space-y-3">
          {/* Freeform prompt bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Zap className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
              <Input
                data-testid="freeform-prompt"
                placeholder="Describe a component to generate… e.g. 'Ancient storm-shard relic with weathered runes'"
                value={freeformPrompt}
                onChange={(e) => setFreeformPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !generatingFreeform) generateFromFreeform(); }}
                className="pl-9 bg-input"
              />
            </div>
            {/* Count selector 1–10 */}
            <div className="flex items-center gap-1 shrink-0">
              <label className="text-xs text-muted-foreground sr-only">Count</label>
              <Select value={String(genCount)} onValueChange={(v) => setGenCount(Number(v))}>
                <SelectTrigger className="h-10 w-16 text-xs font-mono" data-testid="gen-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs font-mono">×{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generateFromFreeform}
              disabled={!freeformPrompt.trim() || generatingFreeform}
              data-testid="generate-freeform"
              className="gap-1.5 shrink-0"
            >
              {generatingFreeform ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </div>
          {/* Generation queue progress */}
          {genQueue && (
            <div className="flex items-center gap-3 py-1">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">Generating components…</span>
                  <span className="text-muted-foreground">{genQueue.done} / {genQueue.total}</span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(genQueue.done / genQueue.total) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick-generate tiles */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {COMPONENT_KINDS.map((tile) => {
              const Icon = tile.icon;
              const busy = generatingTile === tile.id;
              return (
                <button
                  key={tile.id}
                  onClick={() => generateFromTile(tile)}
                  disabled={busy || !!generatingTile || generatingFreeform}
                  data-testid={`tile-${tile.id}`}
                  className="group flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={tile.label}
                >
                  {busy
                    ? <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    : <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />}
                  <span className="text-[10px] font-medium leading-tight text-center">{tile.label}</span>
                </button>
              );
            })}
          </div>

          {/* Narrative seed — collapsible context panel */}
          <Collapsible open={narrativeOpen} onOpenChange={setNarrativeOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {narrativeOpen
                  ? <ChevronDown className="h-3.5 w-3.5" />
                  : <ChevronRight className="h-3.5 w-3.5" />}
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Context / Narrative seed</span>
                {narrative.trim()
                  ? <span className="text-primary ml-1">· set</span>
                  : <span className="text-muted-foreground/60 ml-1">· not set — AI will use generic prompts</span>}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                <Textarea
                  data-testid="narrative-seed"
                  rows={3}
                  placeholder="A storm-wracked archipelago where rival cartels of weather-shapers race to claim drifting sky-islands…"
                  value={narrative}
                  onChange={(e) => onNarrativeChange(e.target.value)}
                  className="bg-input text-sm resize-none"
                />
                <div className="flex justify-end items-center gap-1.5 h-7">
                  {savingNarrative ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                    </span>
                  ) : narrativeDirty ? (
                    <span className="text-xs text-muted-foreground">Unsaved</span>
                  ) : narrative.trim() ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500" /> Saved
                    </span>
                  ) : null}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Bulk generation progress bar */}
      {bulkProgress && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary font-medium">Generating images…</span>
              <span className="text-muted-foreground">{bulkProgress.done} / {bulkProgress.total}</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Zone 2: Component Gallery ── */}
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{assets?.length ?? 0}</span> components
            {missingImageCount > 0 && (
              <span className="ml-2 text-muted-foreground/70">· {missingImageCount} without image</span>
            )}
          </p>
          <button
            onClick={() => setGroupByType((v) => !v)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              groupByType
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3 w-3" /> Group by type
          </button>
        </div>
        <div className="flex gap-1.5">
          {missingImageCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={bulkGenerateImages}
              disabled={bulkGenerating}
            >
              {bulkGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Images className="h-3.5 w-3.5" />}
              Generate missing images
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setAddFormKind("card"); setShowAddForm((v) => !v); }} className="gap-1.5 text-xs" data-testid="add-asset-button">
            <Plus className="h-3.5 w-3.5" /> Manual asset
          </Button>
        </div>
      </div>

      {showAddForm && (
        <AssetForm
          projectId={projectId}
          entities={entities ?? []}
          initial={{ kind: addFormKind }}
          onSave={async (data) => {
            await createAsset.mutateAsync({ projectId, data });
            refresh(); setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          saving={createAsset.isPending}
        />
      )}

      {imagePromptId !== null && (
        <Card className="bg-card border-primary/40" data-testid="image-prompt-panel">
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

      {/* Optimistic placeholder cards (during batch freeform generation) */}
      {placeholders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {placeholders.map((ph) => (
            <div key={ph.tempId} className="rounded-xl border border-primary/30 bg-card overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted/40 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Generating…</span>
              </div>
              <div className="p-3 space-y-1.5">
                <div className="h-3.5 bg-muted/60 rounded w-3/4" />
                <div className="h-3 bg-muted/40 rounded w-1/2" />
                <p className="text-[10px] text-muted-foreground truncate mt-1 italic">{ph.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gallery: loading / empty / grouped / flat */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : !assets?.length && placeholders.length === 0 ? (
        /* Empty state */
        <div className="py-10 border border-dashed border-border rounded-xl space-y-6">
          <div className="text-center space-y-2">
            <ImageIcon className="h-10 w-10 text-muted-foreground opacity-20 mx-auto" />
            <p className="text-base font-semibold text-foreground/80">What's in your game?</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Pick a component below to instantly generate AI art for it — or type a description above.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto px-4">
            {[
              { id: "card",  label: "Standard Card Deck", kind: "card",  icon: Layers,   promptHint: "a hand-illustrated card with title bar, central art frame, and rule text area" },
              { id: "tile",  label: "Hex Tile Set",       kind: "tile",  icon: MapIcon,  promptHint: "a collection of interlocking hex terrain tiles with illustrated surfaces" },
              { id: "token", label: "Token Collection",   kind: "token", icon: Circle,   promptHint: "a set of small circular player tokens with distinct icons and colors" },
              { id: "board", label: "Game Board",         kind: "board", icon: Square,   promptHint: "a top-down game board with hex or grid regions, paths, and iconography" },
            ].map((tile) => {
              const Icon = tile.icon;
              const busy = generatingTile === tile.id;
              return (
                <button
                  key={tile.id}
                  onClick={() => generateFromTile(tile)}
                  disabled={busy || !!generatingTile}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-7 w-7 text-primary animate-spin" /> : <Icon className="h-7 w-7 text-primary" />}
                  <span className="text-sm font-medium">{tile.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center">One-click generate</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : groupedAssets ? (
        /* Grouped by type — each section has its own independent drag-and-drop ordering */
        <div className="space-y-6">
          {GALLERY_SECTIONS.filter((sec) => groupedAssets.has(sec.kind)).map((sec) => {
            const assetById = new Map((assets ?? []).map((a) => [a.id, a]));
            const kindIds = localGroupOrder.get(sec.kind) ?? [];
            const kindAssets = kindIds
              .map((id) => assetById.get(id))
              .filter((a): a is Asset => a !== undefined && (a.kind ?? "other") === sec.kind);
            if (!kindAssets.length) return null;
            return (
              <div key={sec.kind}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{sec.label}</h3>
                  <Badge variant="outline" className="text-[10px]">{kindAssets.length}</Badge>
                  <button
                    onClick={() => { setAddFormKind(sec.kind); setShowAddForm(true); }}
                    className="ml-auto text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-2.5 w-2.5" /> Add {sec.label.slice(0, -1)}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kindAssets.map((a) => (
                    <div
                      key={a.id}
                      ref={(el) => { if (el) cardElemRefs.current.set(a.id, el); else cardElemRefs.current.delete(a.id); }}
                      draggable
                      tabIndex={0}
                      role="group"
                      aria-label={`${a.name} — use Shift+Arrow keys to reorder`}
                      onDragStart={(e) => handleGroupedDragStart(a.id, sec.kind, e)}
                      onDragOver={(e) => handleGroupedDragOver(e, a.id, sec.kind)}
                      onDrop={handleGroupedDrop}
                      onDragEnd={handleGroupedDragEnd}
                      onFocus={() => setFocusedId(a.id)}
                      onBlur={() => setFocusedId((prev) => (prev === a.id ? null : prev))}
                      onKeyDown={(e) => handleCardKeyDown(e, a.id, sec.kind)}
                      className={[
                        "relative transition-all duration-150 rounded-xl outline-none",
                        draggedId === a.id
                          ? "opacity-35 cursor-grabbing"
                          : "cursor-grab",
                        dropTargetId === a.id && draggedId !== null && draggedId !== a.id
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                          : "",
                        focusedId === a.id
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "",
                      ].join(" ")}
                    >
                      <AssetCard
                        asset={a}
                        entities={entities ?? []}
                        projectId={projectId}
                        isGenerating={generating === a.id}
                        onGenerateImage={() => openImagePrompt(a.id)}
                        onInspect={() => setInspectorAssetId(a.id)}
                        onDownload={() => {
                          if (!a.imageDataUrl) return;
                          const link = document.createElement("a");
                          link.href = a.imageDataUrl;
                          link.download = `${a.name.replace(/[^a-z0-9]+/gi, "_")}.png`;
                          link.click();
                        }}
                        onDelete={async () => { await deleteAsset.mutateAsync({ projectId, assetId: a.id }); refresh(); }}
                        onUpdated={refresh}
                        fetchEnhance={() => enhanceAsset.mutateAsync({ projectId, assetId: a.id })}
                        applyEnhance={async (fields) => { await updateAsset.mutateAsync({ projectId, assetId: a.id, data: fields }); refresh(); }}
                        onGamma={() => onGamma(`Asset PDF — ${a.name}`, buildAssetPrompt(a, entities?.find((e) => e.id === a.entityId), projectName, narrative))}
                      />
                      {focusedId === a.id && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-medium shadow-sm whitespace-nowrap">
                            Shift+← → to reorder
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat grid — drag-and-drop enabled */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedAssets.map((a) => (
            <div
              key={a.id}
              ref={(el) => { if (el) cardElemRefs.current.set(a.id, el); else cardElemRefs.current.delete(a.id); }}
              draggable
              tabIndex={0}
              role="group"
              aria-label={`${a.name} — use Shift+Arrow keys to reorder`}
              onDragStart={(e) => handleDragStart(a.id, e)}
              onDragOver={(e) => handleDragOver(e, a.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onFocus={() => setFocusedId(a.id)}
              onBlur={() => setFocusedId((prev) => (prev === a.id ? null : prev))}
              onKeyDown={(e) => handleCardKeyDown(e, a.id)}
              className={[
                "relative transition-all duration-150 rounded-xl outline-none",
                draggedId === a.id
                  ? "opacity-35 cursor-grabbing"
                  : "cursor-grab",
                dropTargetId === a.id && draggedId !== null && draggedId !== a.id
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                  : "",
                focusedId === a.id
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "",
              ].join(" ")}
            >
              <AssetCard
                asset={a}
                entities={entities ?? []}
                projectId={projectId}
                isGenerating={generating === a.id}
                onGenerateImage={() => openImagePrompt(a.id)}
                onInspect={() => setInspectorAssetId(a.id)}
                onDownload={() => {
                  if (!a.imageDataUrl) return;
                  const link = document.createElement("a");
                  link.href = a.imageDataUrl;
                  link.download = `${a.name.replace(/[^a-z0-9]+/gi, "_")}.png`;
                  link.click();
                }}
                onDelete={async () => { await deleteAsset.mutateAsync({ projectId, assetId: a.id }); refresh(); }}
                onUpdated={refresh}
                fetchEnhance={() => enhanceAsset.mutateAsync({ projectId, assetId: a.id })}
                applyEnhance={async (fields) => { await updateAsset.mutateAsync({ projectId, assetId: a.id, data: fields }); refresh(); }}
                onGamma={() => onGamma(`Asset PDF — ${a.name}`, buildAssetPrompt(a, entities?.find((e) => e.id === a.entityId), projectName, narrative))}
              />
              {focusedId === a.id && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-medium shadow-sm whitespace-nowrap">
                    Shift+← → to reorder
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Zone 3: Component Inspector slide-in sheet ── */}
      <Sheet open={inspectorAssetId !== null} onOpenChange={(v) => { if (!v) setInspectorAssetId(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border p-0"
        >
          {inspectorAsset && (
            <ComponentInspector
              asset={inspectorAsset}
              entities={entities ?? []}
              projectId={projectId}
              isGenerating={generating === inspectorAsset.id}
              onGenerateImage={(prompt) => generateImage(inspectorAsset.id, prompt)}
              onDownload={() => {
                if (!inspectorAsset.imageDataUrl) return;
                const link = document.createElement("a");
                link.href = inspectorAsset.imageDataUrl;
                link.download = `${inspectorAsset.name.replace(/[^a-z0-9]+/gi, "_")}.png`;
                link.click();
              }}
              onDelete={async () => {
                await deleteAsset.mutateAsync({ projectId, assetId: inspectorAsset.id });
                setInspectorAssetId(null);
                refresh();
              }}
              onUpdated={refresh}
              fetchEnhance={() => enhanceAsset.mutateAsync({ projectId, assetId: inspectorAsset.id })}
              applyEnhance={async (fields) => {
                await updateAsset.mutateAsync({ projectId, assetId: inspectorAsset.id, data: fields });
                refresh();
              }}
              onGamma={() => onGamma(`Asset PDF — ${inspectorAsset.name}`, buildAssetPrompt(inspectorAsset, entities?.find((e) => e.id === inspectorAsset.entityId), projectName, narrative))}
              onClose={() => setInspectorAssetId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
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
  onSave: (data: { name: string; kind: string; description: string; flavorText: string; entityId?: number; quantity: number; status: string }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    kind: initial?.kind ?? "card",
    description: initial?.description ?? "",
    flavorText: initial?.flavorText ?? "",
    entityId: initial?.entityId ?? "",
    quantity: 1,
    status: "draft",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave({
      name: form.name, kind: form.kind, description: form.description,
      flavorText: form.flavorText, quantity: form.quantity, status: form.status,
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Qty per copy</Label>
              <input
                type="number" min={1} max={9999} value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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

// ── Component details definitions ─────────────────────────────────────────────

const COMPONENT_DETAIL_FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "number" | "select"; options?: string[] }>> = {
  card: [
    { key: "cost",    label: "Cost / Mana",  type: "number" },
    { key: "power",   label: "Power / ATK",  type: "number" },
    { key: "defense", label: "Defense / DEF", type: "number" },
    { key: "rarity",  label: "Rarity",        type: "select", options: ["Common", "Uncommon", "Rare", "Legendary"] },
    { key: "cardText", label: "Card Text",    type: "text" },
    { key: "set",     label: "Set / Expansion", type: "text" },
  ],
  die: [
    { key: "faces",      label: "Face Count",   type: "select", options: ["4", "6", "8", "10", "12", "20", "Custom"] },
    { key: "faceValues", label: "Face Values",  type: "text" },
    { key: "dieColor",   label: "Color",        type: "text" },
  ],
  token: [
    { key: "value",      label: "Value / Denom", type: "number" },
    { key: "shape",      label: "Shape",         type: "select", options: ["Round", "Square", "Hex", "Custom"] },
    { key: "tokenColor", label: "Color",         type: "text" },
    { key: "doubleSided", label: "Double-sided?", type: "select", options: ["No", "Yes"] },
  ],
  tile: [
    { key: "gridSize",    label: "Grid Size",     type: "text" },
    { key: "connections", label: "Edge Connections", type: "text" },
    { key: "terrain",     label: "Terrain Type",  type: "text" },
    { key: "backFace",    label: "Back Face?",    type: "select", options: ["No", "Yes"] },
  ],
  board: [
    { key: "dimensions",  label: "Dimensions",    type: "text" },
    { key: "zones",       label: "Zones / Regions", type: "text" },
    { key: "playerSlots", label: "Player Slots",  type: "number" },
    { key: "folds",       label: "Folds?",        type: "select", options: ["No", "2-fold", "4-fold"] },
  ],
  other: [
    { key: "material",    label: "Material",      type: "text" },
    { key: "dimensions",  label: "Dimensions",    type: "text" },
  ],
};

function parseDetails(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function ComponentDetailsEditor({
  kind, value, onChange,
}: {
  kind: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  const fields = COMPONENT_DETAIL_FIELDS[kind] ?? COMPONENT_DETAIL_FIELDS.other;
  const parsed = parseDetails(value);

  const update = (key: string, val: string) => {
    const next = { ...parsed, [key]: val };
    // Drop empty strings to keep the stored JSON lean
    Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
    onChange(Object.keys(next).length ? JSON.stringify(next) : "");
  };

  return (
    <div className="space-y-2 border-t border-border/50 pt-2 mt-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Component Details</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {fields.map((f) => (
          <div key={f.key} className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
            {f.type === "select" ? (
              <Select value={parsed[f.key] ?? ""} onValueChange={(v) => update(f.key, v)}>
                <SelectTrigger className="h-7 text-xs bg-input"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                value={parsed[f.key] ?? ""}
                onChange={(e) => update(f.key, e.target.value)}
                className="w-full h-7 rounded-md border border-input bg-input px-2 text-xs font-mono"
                placeholder="—"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card layout preview ────────────────────────────────────────────────────────

const RARITY_FRAME: Record<string, { border: string; gem: string; label: string }> = {
  Common:    { border: "border-slate-500",   gem: "bg-slate-400",   label: "text-slate-300" },
  Uncommon:  { border: "border-emerald-500", gem: "bg-emerald-400", label: "text-emerald-300" },
  Rare:      { border: "border-blue-500",    gem: "bg-blue-400",    label: "text-blue-300" },
  Legendary: { border: "border-amber-400",   gem: "bg-amber-300",   label: "text-amber-200" },
};

function CardPreviewDialog({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const details = parseDetails(asset.componentDetails);
  const rarity = details.rarity ?? "Common";
  const frame = RARITY_FRAME[rarity] ?? RARITY_FRAME.Common;
  const cost    = details.cost ?? "";
  const power   = details.power ?? "";
  const defense = details.defense ?? "";
  const cardText = details.cardText ?? asset.description ?? "";
  const expansion = details.set ?? "";
  const hasPT = power !== "" || defense !== "";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-primary" /> Card Preview
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Approximate layout — based on component details.
          </DialogDescription>
        </DialogHeader>

        {/* Card frame */}
        <div className={`mx-auto w-56 rounded-xl border-2 ${frame.border} bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl overflow-hidden`}
          style={{ fontFamily: "Georgia, serif" }}>

          {/* Header: name + cost */}
          <div className="flex items-center justify-between px-2.5 pt-2 pb-1 bg-black/30">
            <span className="text-xs font-bold text-white leading-tight flex-1 line-clamp-1">{asset.name}</span>
            {cost !== "" && (
              <span className="ml-1.5 shrink-0 w-6 h-6 rounded-full bg-slate-600 border border-slate-400 text-white text-[10px] font-bold flex items-center justify-center">
                {cost}
              </span>
            )}
          </div>

          {/* Art */}
          <div className="mx-2 aspect-[4/3] bg-slate-700/50 border border-slate-600/50 overflow-hidden flex items-center justify-center">
            {asset.imageDataUrl ? (
              <img src={asset.imageDataUrl} alt={asset.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-500">
                <ImageIcon className="h-8 w-8 opacity-30" />
                <span className="text-[9px] opacity-50">No art yet</span>
              </div>
            )}
          </div>

          {/* Type line */}
          <div className="flex items-center justify-between px-2.5 py-1 bg-black/20">
            <span className={`text-[9px] font-semibold uppercase tracking-widest ${frame.label}`}>{rarity}</span>
            {expansion && <span className="text-[9px] text-slate-400 italic">{expansion}</span>}
          </div>

          {/* Text box */}
          <div className="mx-2 mb-2 rounded bg-slate-900/60 border border-slate-700/50 px-2 py-1.5 min-h-[56px]">
            {cardText ? (
              <p className="text-[9px] text-slate-200 leading-relaxed whitespace-pre-wrap">{cardText}</p>
            ) : (
              <p className="text-[9px] text-slate-500 italic">No card text.</p>
            )}
            {asset.flavorText && (
              <p className="text-[9px] text-slate-400 italic mt-1 border-t border-slate-700/50 pt-1">"{asset.flavorText}"</p>
            )}
          </div>

          {/* Footer: rarity gem + P/T */}
          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className={`w-3 h-3 rounded-full ${frame.gem} shadow-sm`} />
            {hasPT && (
              <span className="text-[10px] font-bold text-white bg-slate-700 border border-slate-500 rounded px-1.5 py-0.5">
                {power}/{defense}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Asset card ────────────────────────────────────────────────────────────────

function AssetCard({
  asset, entities, projectId, isGenerating,
  onGenerateImage, onDownload, onDelete, onUpdated, fetchEnhance, applyEnhance, onGamma, onInspect,
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
  onInspect?: () => void;
}) {
  const { toast } = useToast();
  const updateAsset = useUpdateAsset();
  const qc = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: asset.name, kind: asset.kind, description: asset.description ?? "",
    flavorText: asset.flavorText ?? "", entityId: asset.entityId ? String(asset.entityId) : "",
    quantity: asset.quantity ?? 1, status: asset.status ?? "draft",
    componentDetails: asset.componentDetails ?? "",
  });

  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [suggestion, setSuggestion] = useState<AssetEnhanceSuggestion | null>(null);
  const [picked, setPicked] = useState({ name: true, description: true, flavorText: true });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showCardPreview, setShowCardPreview] = useState(false);

  const linkedEntity = entities.find((e) => e.id === asset.entityId);

  const saveEdit = async () => {
    try {
      await updateAsset.mutateAsync({
        projectId, assetId: asset.id,
        data: {
          name: editForm.name, kind: editForm.kind, description: editForm.description,
          flavorText: editForm.flavorText, quantity: editForm.quantity, status: editForm.status,
          componentDetails: editForm.componentDetails || undefined,
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
      {/* Image area — click to open inspector */}
      <div
        className={`aspect-square bg-muted/30 relative ${onInspect ? "cursor-pointer" : ""}`}
        onClick={onInspect}
      >
        {asset.imageDataUrl ? (
          <img src={asset.imageDataUrl} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground opacity-20" />
          </div>
        )}
        {/* Hover overlay — "Open Inspector" */}
        {onInspect && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Eye className="h-3 w-3" /> Open inspector
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase font-bold bg-black/60 text-white px-2 py-0.5 rounded">
          {asset.kind}
        </span>
        <span className={`absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getStatusMeta(asset.status ?? "draft").color}`}>
          {getStatusMeta(asset.status ?? "draft").label}
        </span>
        {(asset.quantity ?? 1) > 1 && (
          <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
            ×{asset.quantity}
          </span>
        )}
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Qty per copy</Label>
                <input
                  type="number" min={1} max={9999}
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full h-7 rounded-md border border-input bg-input px-2 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ComponentDetailsEditor
              kind={editForm.kind}
              value={editForm.componentDetails}
              onChange={(v) => setEditForm({ ...editForm, componentDetails: v })}
            />
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
                {asset.kind === "card" && (
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-primary" onClick={() => setShowCardPreview(true)} title="Card layout preview">
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                )}
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
            {asset.componentDetails && (() => {
              const d = parseDetails(asset.componentDetails);
              const entries = Object.entries(d).slice(0, 4);
              if (!entries.length) return null;
              return (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {entries.map(([k, v]) => (
                    <span key={k} className="text-[10px] text-muted-foreground font-mono">
                      <span className="text-muted-foreground/50">{k}:</span> {v}
                    </span>
                  ))}
                </div>
              );
            })()}
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

      {showCardPreview && (
        <CardPreviewDialog asset={asset} onClose={() => setShowCardPreview(false)} />
      )}

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

// ── Component Inspector (slide-in sheet panel) ────────────────────────────────

function ComponentInspector({
  asset, entities, projectId, isGenerating,
  onGenerateImage, onDownload, onDelete, onUpdated, fetchEnhance, applyEnhance, onGamma, onClose,
}: {
  asset: Asset;
  entities: Entity[];
  projectId: number;
  isGenerating: boolean;
  onGenerateImage: (prompt: string) => void;
  onDownload: () => void;
  onDelete: () => Promise<void>;
  onUpdated: () => void;
  fetchEnhance: () => Promise<AssetEnhanceSuggestion>;
  applyEnhance: (fields: Partial<{ name: string; description: string; flavorText: string }>) => Promise<void>;
  onGamma: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const updateAsset = useUpdateAsset();
  const qc = useQueryClient();
  const [editForm, setEditForm] = useState({
    name: asset.name, kind: asset.kind, description: asset.description ?? "",
    flavorText: asset.flavorText ?? "", entityId: asset.entityId ? String(asset.entityId) : "",
    quantity: asset.quantity ?? 1, status: asset.status ?? "draft",
    componentDetails: asset.componentDetails ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState(asset.imagePrompt || "");
  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [suggestion, setSuggestion] = useState<AssetEnhanceSuggestion | null>(null);
  const [picked, setPicked] = useState({ name: true, description: true, flavorText: true });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showCardPreview, setShowCardPreview] = useState(false);

  const saveField = async (patch: Partial<Parameters<typeof updateAsset.mutateAsync>[0]["data"]>) => {
    setSaving(true);
    try {
      await updateAsset.mutateAsync({ projectId, assetId: asset.id, data: patch });
      qc.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
      onUpdated();
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    await saveField({
      name: editForm.name, kind: editForm.kind, description: editForm.description,
      flavorText: editForm.flavorText, quantity: editForm.quantity, status: editForm.status,
      componentDetails: editForm.componentDetails || undefined,
      ...(editForm.entityId ? { entityId: parseInt(editForm.entityId) } : { entityId: undefined }),
    });
    toast({ title: "Component saved" });
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
    } finally { setIsEnhancing(false); }
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
      if (fields.name) setEditForm((f) => ({ ...f, name: fields.name! }));
      if (fields.description) setEditForm((f) => ({ ...f, description: fields.description! }));
      if (fields.flavorText) setEditForm((f) => ({ ...f, flavorText: fields.flavorText! }));
      setApplied(true);
      toast({ title: "Enhancement applied" });
      setTimeout(() => { setShowEnhance(false); setSuggestion(null); setApplied(false); }, 1200);
    } catch (err) {
      toast({ title: "Apply failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setApplying(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <SheetTitle className="text-base font-semibold truncate">{asset.name}</SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="uppercase font-mono">{asset.kind}</span>
            {asset.status && <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getStatusMeta(asset.status).color}`}>{getStatusMeta(asset.status).label}</span>}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-primary" onClick={runEnhance} disabled={isEnhancing}>
            {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} AI
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-primary" onClick={onGamma}>
            <FileText className="h-3 w-3" /> Gamma
          </Button>
          {asset.kind === "card" && (
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-primary" onClick={() => setShowCardPreview(true)}>
              <Eye className="h-3 w-3" /> Preview
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Image */}
        <div className="aspect-video bg-muted/30 rounded-lg overflow-hidden relative">
          {asset.imageDataUrl ? (
            <img src={asset.imageDataUrl} alt={asset.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-20" />
              <p className="text-xs opacity-60">No image yet</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => setImagePromptOpen((v) => !v)} disabled={isGenerating}>
            <Sparkles className="h-3 w-3" /> {isGenerating ? "Generating…" : asset.imageDataUrl ? "Regen image" : "Generate image"}
          </Button>
          <label className="cursor-pointer">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs pointer-events-none" asChild>
              <span><ImageIcon className="h-3 w-3" /> Upload</span>
            </Button>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const dataUrl = reader.result as string;
                  await saveField({ imageDataUrl: dataUrl } as Parameters<typeof saveField>[0]);
                  toast({ title: "Image uploaded" });
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
          {asset.imageDataUrl && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onDownload}>
              <Download className="h-3 w-3" /> Download
            </Button>
          )}
        </div>

        {imagePromptOpen && (
          <div className="space-y-2 p-3 bg-muted/10 rounded-lg border border-border">
            <Label className="text-xs font-semibold">Image prompt</Label>
            <Textarea
              rows={3}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="A fantasy card with runes and glowing edges…"
              className="text-xs resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setImagePromptOpen(false)}>Cancel</Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => { onGenerateImage(imagePrompt); setImagePromptOpen(false); }} disabled={!imagePrompt.trim()}>
                <Sparkles className="h-3 w-3" /> Generate
              </Button>
            </div>
          </div>
        )}

        {/* Metadata fields */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Details</p>

          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} onBlur={() => saveField({ name: editForm.name })} className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Kind</Label>
              <Select value={editForm.kind} onValueChange={(v) => { setEditForm((f) => ({ ...f, kind: v })); saveField({ kind: v }); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={editForm.status} onValueChange={(v) => { setEditForm((f) => ({ ...f, status: v })); saveField({ status: v }); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <input
                type="number" min={1} max={9999} value={editForm.quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                onBlur={() => saveField({ quantity: editForm.quantity })}
                className="w-full h-8 rounded-md border border-input bg-input px-3 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Linked Entity</Label>
              <Select value={editForm.entityId || "none"} onValueChange={(v) => { const val = v === "none" ? "" : v; setEditForm((f) => ({ ...f, entityId: val })); saveField({ entityId: val ? parseInt(val) : undefined }); }}>
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
            <Textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              onBlur={() => saveField({ description: editForm.description })}
              placeholder="What does this component do in the game?"
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Flavor text / Lore</Label>
            <Textarea
              rows={2}
              value={editForm.flavorText}
              onChange={(e) => setEditForm((f) => ({ ...f, flavorText: e.target.value }))}
              onBlur={() => saveField({ flavorText: editForm.flavorText })}
              placeholder="A vivid in-world quote or tag…"
              className="text-xs resize-none italic"
            />
          </div>

          <div onBlur={() => saveField({ componentDetails: editForm.componentDetails || undefined })}>
            <ComponentDetailsEditor
              kind={editForm.kind}
              value={editForm.componentDetails}
              onChange={(v) => setEditForm((f) => ({ ...f, componentDetails: v }))}
            />
          </div>
        </div>

        {/* AI Enhance */}
        {showEnhance && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
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
                <SuggestionField label="Name" current={asset.name} proposed={suggestion.name} checked={picked.name} onToggle={() => setPicked((p) => ({ ...p, name: !p.name }))} />
                <SuggestionField label="Description" current={asset.description ?? ""} proposed={suggestion.description} checked={picked.description} onToggle={() => setPicked((p) => ({ ...p, description: !p.description }))} />
                <SuggestionField label="Flavor text" current={asset.flavorText ?? ""} proposed={suggestion.flavorText} checked={picked.flavorText} onToggle={() => setPicked((p) => ({ ...p, flavorText: !p.flavorText }))} />
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
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3 flex items-center gap-2">
        <Button size="sm" className="gap-1.5 flex-1 text-xs" onClick={saveAll} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saving ? "Saving…" : "Save all"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={runEnhance} disabled={isEnhancing}>
          <Wand2 className="h-3 w-3" /> AI Enhance
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
          onClick={async () => { if (confirm(`Delete "${asset.name}"?`)) { await onDelete(); onClose(); } }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {showCardPreview && <CardPreviewDialog asset={asset} onClose={() => setShowCardPreview(false)} />}
    </div>
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
