import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Entity, type Rule, type EntityProperty, type Asset, useGetGraphLayout, useUpdateGraphLayout, getGetGraphLayoutQueryKey } from "@workspace/api-client-react";
import { AlertTriangle, Sparkles, Box, Activity, GitBranch, Search, ArrowRight, Link as LinkIcon, Unlink, Layers, Table as TableIcon, ImageIcon, X, ChevronRight, Plus, RotateCcw, Filter, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ALL_COMPONENT_TYPES, type ComponentType } from "@/lib/game-component-types";
import { COMPONENT_DOCS } from "@/lib/component-docs";
import { useDesignerArtifact } from "@/hooks/use-designer-artifact";

function typeBadge(type: string) {
  return COMPONENT_DOCS[type as ComponentType]?.badge ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}
function typeHex(type: string): string {
  return COMPONENT_DOCS[type as ComponentType]?.hex ?? "#7c3aed";
}

// ════════════════════════════════════════════════════════════════════════════
// Smart linker — word-boundary, case-insensitive matching with min name length.
// ════════════════════════════════════════════════════════════════════════════
type EntityProp = EntityProperty;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type LinkMaps = {
  entityToRules: Map<number, Set<number>>;
  ruleToEntities: Map<number, Set<number>>;
};

export function buildLinks(entities: Entity[], rules: Rule[]): LinkMaps {
  const entityToRules = new Map<number, Set<number>>();
  const ruleToEntities = new Map<number, Set<number>>();
  for (const e of entities) entityToRules.set(e.id, new Set());
  for (const r of rules) ruleToEntities.set(r.id, new Set());

  const candidates = entities
    .filter((e) => e.name && e.name.trim().length >= 3)
    .map((e) => ({
      id: e.id,
      re: new RegExp(
        `(?:^|[^A-Za-z0-9_])${escapeRegex(e.name)}(?=[^A-Za-z0-9_]|$)`,
        "i",
      ),
    }));

  for (const r of rules) {
    const text = `${r.title ?? ""}\n${r.content ?? ""}`;
    for (const c of candidates) {
      if (c.re.test(text)) {
        entityToRules.get(c.id)!.add(r.id);
        ruleToEntities.get(r.id)!.add(c.id);
      }
    }
  }
  return { entityToRules, ruleToEntities };
}

// ════════════════════════════════════════════════════════════════════════════
// Coverage gaps — orphan entities + abstract rules
// ════════════════════════════════════════════════════════════════════════════
export function CoverageGaps({
  entities, rules, links, onJump,
}: {
  entities: Entity[];
  rules: Rule[];
  links: LinkMaps;
  onJump: (tab: string) => void;
}) {
  const orphans = useMemo(
    () => entities.filter((e) => (links.entityToRules.get(e.id)?.size ?? 0) === 0),
    [entities, links],
  );
  const abstract = useMemo(
    () => rules.filter((r) => (links.ruleToEntities.get(r.id)?.size ?? 0) === 0),
    [rules, links],
  );

  const totalIssues = orphans.length + abstract.length;

  return (
    <Card className={totalIssues === 0 ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {totalIssues === 0
            ? <Sparkles className="h-4 w-4 text-green-400" />
            : <AlertTriangle className="h-4 w-4 text-amber-400" />}
          Coverage gaps
          {totalIssues > 0 && (
            <Badge variant="outline" className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              {totalIssues}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {totalIssues === 0
            ? "Every component is referenced by at least one rule, and every rule mentions at least one component. Nicely tied together."
            : "Items below are unconnected — components never named by any rule, or rules that don't mention any of your components. Often signals missing design work."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Box className="h-3 w-3" /> Orphan components
            <Badge variant="outline" className="ml-1 text-[10px]">{orphans.length}</Badge>
          </h4>
          {orphans.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic">None — every component is referenced.</p>
          ) : (
            <div className="space-y-1.5">
              {orphans.slice(0, 12).map((e) => (
                <button
                  key={e.id}
                  onClick={() => onJump("assets-entities")}
                  className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-border/60 bg-background/40 hover:bg-background/60 transition-colors group"
                  data-testid={`orphan-entity-${e.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${typeBadge(e.type)}`}>{e.type}</span>
                    <span className="text-sm font-medium text-white truncate">{e.name}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
              {orphans.length > 12 && (
                <p className="text-[11px] text-muted-foreground/60 italic pt-1">+ {orphans.length - 12} more…</p>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Abstract rules
            <Badge variant="outline" className="ml-1 text-[10px]">{abstract.length}</Badge>
          </h4>
          {abstract.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic">None — every rule references a component by name.</p>
          ) : (
            <div className="space-y-1.5">
              {abstract.slice(0, 12).map((r) => (
                <button
                  key={r.id}
                  onClick={() => onJump("rules")}
                  className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-border/60 bg-background/40 hover:bg-background/60 transition-colors group"
                  data-testid={`abstract-rule-${r.id}`}
                >
                  <span className="text-sm font-medium text-white truncate">{r.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
              {abstract.length > 12 && (
                <p className="text-[11px] text-muted-foreground/60 italic pt-1">+ {abstract.length - 12} more…</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Entity graph — radial SVG, sectored by type
// ════════════════════════════════════════════════════════════════════════════
type GraphNode = { id: number; name: string; type: string; x: number; y: number; r: number };
type GraphEdge = { a: number; b: number; kind: "explicit" | "inferred"; weight: number };

function buildGraph(
  entities: Entity[],
  links: LinkMaps,
  width: number,
  height: number,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (entities.length === 0) return { nodes: [], edges: [] };

  const groups = new Map<string, Entity[]>();
  for (const t of ALL_COMPONENT_TYPES) groups.set(t, []);
  for (const e of entities) {
    if (!groups.has(e.type)) groups.set(e.type, []);
    groups.get(e.type)!.push(e);
  }
  const filledGroups = [...groups.entries()].filter(([, arr]) => arr.length > 0);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 60;

  const total = entities.length;
  let angleCursor = -Math.PI / 2;
  const placement = new Map<number, { x: number; y: number }>();

  for (const [, arr] of filledGroups) {
    const arcSize = (arr.length / total) * 2 * Math.PI;
    const step = arcSize / arr.length;
    for (let i = 0; i < arr.length; i++) {
      const angle = angleCursor + step * i + step / 2;
      placement.set(arr[i].id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }
    angleCursor += arcSize;
  }

  const nodes: GraphNode[] = entities.map((e) => {
    const ruleCount = links.entityToRules.get(e.id)?.size ?? 0;
    const r = 8 + Math.min(8, Math.log2(1 + ruleCount) * 3);
    const pos = placement.get(e.id)!;
    return { id: e.id, name: e.name, type: e.type, x: pos.x, y: pos.y, r };
  });

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  const nameIndex = new Map<string, number>();
  for (const e of entities) nameIndex.set(e.name.toLowerCase(), e.id);

  for (const e of entities) {
    if (!e.relatedTo) continue;
    const refs = e.relatedTo.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    for (const ref of refs) {
      const targetId = nameIndex.get(ref.toLowerCase());
      if (!targetId || targetId === e.id) continue;
      const k = key(e.id, targetId);
      if (seen.has(k)) continue;
      seen.add(k);
      edges.push({ a: e.id, b: targetId, kind: "explicit", weight: 1 });
    }
  }

  const coCount = new Map<string, number>();
  for (const ruleEntities of links.ruleToEntities.values()) {
    const arr = [...ruleEntities];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const k = key(arr[i], arr[j]);
        coCount.set(k, (coCount.get(k) ?? 0) + 1);
      }
    }
  }
  for (const [k, count] of coCount.entries()) {
    if (count < 2) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    const [a, b] = k.split(":").map(Number);
    edges.push({ a, b, kind: "inferred", weight: count });
  }

  return { nodes, edges };
}

const GRAPH_NODE_CAP = 80;

const ASSET_KIND_HEX: Record<string, string> = {
  card:     "#3b82f6",
  board:    "#22c55e",
  token:    "#f97316",
  tile:     "#eab308",
  dice:     "#ef4444",
  rulebook: "#a855f7",
  other:    "#6b7280",
};

// Hop-distance colors for multi-hop path highlighting (#65).
// Index 0 = focused node (handled by isFocused), 1..N = hop distance.
const HOP_COLORS: Record<number, string> = {
  1: "hsl(var(--primary))",
  2: "#f59e0b",
  3: "#34d399",
};
function hopColor(hop: number): string {
  return HOP_COLORS[hop] ?? "#94a3b8";
}
// Fill opacity scales down with hop distance so far-away nodes look lighter.
function hopFillOpacity(hop: number): number {
  if (hop <= 1) return 0.85;
  if (hop === 2) return 0.60;
  if (hop === 3) return 0.40;
  return 0.25;
}

function assetKindHex(kind: string): string {
  return ASSET_KIND_HEX[kind] ?? ASSET_KIND_HEX.other;
}

type AssetNode = {
  id: number;
  name: string;
  kind: string;
  entityId: number;
  x: number;
  y: number;
  size: number;
};

function buildAssetNodes(
  assets: Asset[],
  nodeById: Map<number, GraphNode>,
  cx: number,
  cy: number,
): AssetNode[] {
  const entityAssets = new Map<number, Asset[]>();
  for (const a of assets) {
    if (!a.entityId || !nodeById.has(a.entityId)) continue;
    const arr = entityAssets.get(a.entityId) ?? [];
    arr.push(a);
    entityAssets.set(a.entityId, arr);
  }

  const result: AssetNode[] = [];
  for (const [entityId, eAssets] of entityAssets) {
    const en = nodeById.get(entityId)!;
    const angle = Math.atan2(en.y - cy, en.x - cx);
    const baseR = Math.sqrt((en.x - cx) ** 2 + (en.y - cy) ** 2);
    const outerR = baseR + 44;
    const spread = Math.PI / 10;

    for (let i = 0; i < eAssets.length; i++) {
      const a = eAssets[i];
      const offset = (i - (eAssets.length - 1) / 2) * spread;
      const aAngle = angle + offset;
      result.push({
        id: a.id,
        name: a.name,
        kind: a.kind,
        entityId,
        x: cx + Math.cos(aAngle) * outerR,
        y: cy + Math.sin(aAngle) * outerR,
        size: 5,
      });
    }
  }
  return result;
}

function localStorageKey(projectId: number): string {
  return `gameforge-graph-positions-project-${projectId}`;
}

// Legacy localStorage key for filters (used for one-time import only).
function legacyFilterStorageKey(projectId: number): string {
  return `gameforge-graph-filters-project-${projectId}`;
}

type PersistedFilters = {
  activeTypes: string[];
  minWeight: number;
  showNeighborsOnly?: boolean;
  neighborDepth?: number;
  alwaysShowLabels?: boolean;
};

function defaultFilters(): PersistedFilters {
  return {
    activeTypes: [...ALL_COMPONENT_TYPES],
    minWeight: 2,
    showNeighborsOnly: false,
    neighborDepth: 1,
    alwaysShowLabels: false,
  };
}

function loadLocalPositions(projectId: number): Map<number, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(localStorageKey(projectId));
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, { x: number; y: number }>;
    return new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
  } catch {
    return new Map();
  }
}

function saveLocalPositions(projectId: number, positions: Map<number, { x: number; y: number }>) {
  try {
    const obj: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of positions) obj[String(id)] = pos;
    localStorage.setItem(localStorageKey(projectId), JSON.stringify(obj));
  } catch {
    // ignore storage errors
  }
}

function positionsToRecord(positions: Map<number, { x: number; y: number }>): Record<string, { x: number; y: number }> {
  const obj: Record<string, { x: number; y: number }> = {};
  for (const [id, pos] of positions) obj[String(id)] = pos;
  return obj;
}

function recordToPositions(obj: Record<string, { x: number; y: number }>): Map<number, { x: number; y: number }> {
  return new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
}

export function EntityGraph({
  projectId, entities, links, assets, onEntityClick, onAssetClick, onJump,
}: {
  projectId: number;
  entities: Entity[];
  links: LinkMaps;
  assets?: Asset[];
  onEntityClick?: (entity: Entity) => void;
  onAssetClick?: (asset: Asset) => void;
  onJump: (tab: string) => void;
}) {
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  // ── Filters ──────────────────────────────────────────────────────────────
  const presentTypes = useMemo(
    () => ALL_COMPONENT_TYPES.filter((t) => entities.some((e) => e.type === t)),
    [entities],
  );

  // Filters live in the consolidated `graph-filters` designer artifact (per-project).
  // One-time legacy import from the old `gameforge-graph-filters-project-{id}` localStorage key.
  const { state: filters, setState: setFilters } = useDesignerArtifact<PersistedFilters>(
    projectId,
    "graph-filters",
    defaultFilters,
    legacyFilterStorageKey,
  );

  const activeTypes = useMemo(() => new Set(filters.activeTypes), [filters.activeTypes]);
  const alwaysShowLabels = filters.alwaysShowLabels ?? false;
  const showNeighborsOnly = filters.showNeighborsOnly ?? false;
  const neighborDepth = filters.neighborDepth ?? 1;
  const minWeight = filters.minWeight;

  // React-style setters: accept either a value or a functional updater.
  const setActiveTypes = useCallback(
    (next: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setFilters((prev) => {
        const prevSet = new Set(prev.activeTypes);
        const nextSet = typeof next === "function" ? next(prevSet) : next;
        return { ...prev, activeTypes: [...nextSet] };
      });
    },
    [setFilters],
  );
  const setAlwaysShowLabels = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) =>
      setFilters((prev) => {
        const cur = prev.alwaysShowLabels ?? false;
        return { ...prev, alwaysShowLabels: typeof next === "function" ? next(cur) : next };
      }),
    [setFilters],
  );
  const setShowNeighborsOnly = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) =>
      setFilters((prev) => {
        const cur = prev.showNeighborsOnly ?? false;
        return { ...prev, showNeighborsOnly: typeof next === "function" ? next(cur) : next };
      }),
    [setFilters],
  );
  const setNeighborDepth = useCallback(
    (next: number | ((prev: number) => number)) =>
      setFilters((prev) => {
        const cur = prev.neighborDepth ?? 1;
        return { ...prev, neighborDepth: typeof next === "function" ? next(cur) : next };
      }),
    [setFilters],
  );
  const setMinWeight = useCallback(
    (next: number | ((prev: number) => number)) =>
      setFilters((prev) => ({
        ...prev,
        minWeight: typeof next === "function" ? next(prev.minWeight) : next,
      })),
    [setFilters],
  );

  const [focusedNodeId, setFocusedNodeId] = useState<number | null>(null);

  // Reset focused node when project changes.
  const filterProjectRef = useRef(projectId);
  useEffect(() => {
    if (filterProjectRef.current !== projectId) {
      filterProjectRef.current = projectId;
      setFocusedNodeId(null);
    }
  }, [projectId]);

  const allActive = presentTypes.every((t) => activeTypes.has(t));

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return new Set(ALL_COMPONENT_TYPES);
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function resetTypes() {
    setActiveTypes(new Set(ALL_COMPONENT_TYPES));
  }

  const width = 720;
  const height = 480;

  const overCap = entities.length > GRAPH_NODE_CAP;
  const cappedEntities = useMemo(() => {
    if (!overCap || showAll) return entities;
    const sorted = [...entities].sort(
      (a, b) =>
        (links.entityToRules.get(b.id)?.size ?? 0) -
        (links.entityToRules.get(a.id)?.size ?? 0),
    );
    return sorted.slice(0, GRAPH_NODE_CAP);
  }, [entities, links, overCap, showAll]);

  // Apply type filter
  const typeFilteredEntities = useMemo(
    () => allActive ? cappedEntities : cappedEntities.filter((e) => activeTypes.has(e.type)),
    [cappedEntities, activeTypes, allActive],
  );

  // Build graph from type-filtered set (needed to find adjacency for neighbor filter)
  const { nodes: preFilterNodes, edges: preFilterEdges } = useMemo(
    () => buildGraph(typeFilteredEntities, links, width, height),
    [typeFilteredEntities, links, width, height],
  );

  // Rendered pre-filter edges (minWeight applied to inferred) — computed early so
  // neighbor logic uses the same edge set as the renderer, preventing phantom neighbors
  // from hidden weak edges.
  const renderedPreFilterEdges = useMemo(
    () => preFilterEdges.filter((e) => e.kind === "explicit" || e.weight >= minWeight),
    [preFilterEdges, minWeight],
  );

  // Adjacency map built from the rendered pre-filter edges — used by BFS below.
  const adjacencyMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const e of renderedPreFilterEdges) {
      if (!map.has(e.a)) map.set(e.a, []);
      if (!map.has(e.b)) map.set(e.b, []);
      map.get(e.a)!.push(e.b);
      map.get(e.b)!.push(e.a);
    }
    return map;
  }, [renderedPreFilterEdges]);

  // BFS hop-distance map (#65) — node id → hop distance from focused node.
  // Populated whenever a node is focused (full graph or neighbor-only mode).
  // Hop 0 = focused, 1 = direct neighbor, etc.
  const hopNodeMap = useMemo(() => {
    if (!focusedNodeId) return new Map<number, number>();
    const map = new Map<number, number>();
    map.set(focusedNodeId, 0);
    let frontier = new Set<number>([focusedNodeId]);
    for (let hop = 1; hop <= neighborDepth; hop++) {
      const next = new Set<number>();
      for (const nodeId of frontier) {
        for (const neighborId of (adjacencyMap.get(nodeId) ?? [])) {
          if (!map.has(neighborId)) {
            map.set(neighborId, hop);
            next.add(neighborId);
          }
        }
      }
      frontier = next;
      if (frontier.size === 0) break;
    }
    return map;
  }, [focusedNodeId, neighborDepth, adjacencyMap]);

  // Apply neighbor filter — BFS up to neighborDepth hops, capped at GRAPH_NODE_CAP.
  // The focused node is always retained even when the cap is reached.
  const finalEntities = useMemo(() => {
    if (!showNeighborsOnly || !focusedNodeId) return typeFilteredEntities;
    const visited = new Set<number>([focusedNodeId]);
    let frontier = new Set<number>([focusedNodeId]);
    outer: for (let hop = 0; hop < neighborDepth; hop++) {
      const next = new Set<number>();
      for (const nodeId of frontier) {
        for (const neighborId of (adjacencyMap.get(nodeId) ?? [])) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            next.add(neighborId);
            if (visited.size >= GRAPH_NODE_CAP) break outer;
          }
        }
      }
      frontier = next;
      if (frontier.size === 0) break;
    }
    // Always include focused node; filter preserves typeFilteredEntities order.
    const inVisited = typeFilteredEntities.filter((e) => visited.has(e.id));
    if (inVisited.length > GRAPH_NODE_CAP) {
      // Guarantee focused node is first so it survives the slice
      const rest = inVisited.filter((e) => e.id !== focusedNodeId);
      const focused = inVisited.find((e) => e.id === focusedNodeId);
      return focused ? [focused, ...rest.slice(0, GRAPH_NODE_CAP - 1)] : rest.slice(0, GRAPH_NODE_CAP);
    }
    return inVisited;
  }, [typeFilteredEntities, adjacencyMap, showNeighborsOnly, focusedNodeId, neighborDepth]);

  // Build the final base graph (before position overrides).
  const baseGraph = useMemo(
    () => (showNeighborsOnly && focusedNodeId)
      ? buildGraph(finalEntities, links, width, height)
      : { nodes: preFilterNodes, edges: preFilterEdges },
    [finalEntities, links, width, height, showNeighborsOnly, focusedNodeId, preFilterNodes, preFilterEdges],
  );

  // ── Server-side persistence ──────────────────────────────────────────────────
  const qc = useQueryClient();
  const { data: serverLayout } = useGetGraphLayout(projectId);
  const updateGraphLayout = useUpdateGraphLayout();

  // ── Drag state ──────────────────────────────────────────────────────────────
  // Seed from localStorage immediately (fast local cache), then reconcile with server once it loads.
  const [nodePositions, setNodePositions] = useState<Map<number, { x: number; y: number }>>(
    () => loadLocalPositions(projectId),
  );
  // Track the fingerprint (JSON) of the last server layout we applied so we:
  // a) apply every distinct server response (including empty to clear stale local data), and
  // b) skip re-applying the same data after our own mutation updated the cache.
  const appliedServerFingerprintRef = useRef<string | null>(null);

  // Whenever server layout changes, apply it if it's new data we haven't seen yet.
  // Server state is always authoritative — including empty (clears stale localStorage positions).
  useEffect(() => {
    if (!serverLayout) return;
    const fingerprint = JSON.stringify(serverLayout.positions);
    if (fingerprint === appliedServerFingerprintRef.current) return;
    appliedServerFingerprintRef.current = fingerprint;
    const serverPositions = recordToPositions(
      serverLayout.positions as Record<string, { x: number; y: number }>,
    );
    setNodePositions(serverPositions);
    // Sync local cache to match server (clears stale data when server returns empty)
    saveLocalPositions(projectId, serverPositions);
  }, [serverLayout, projectId]);

  // Reset fingerprint when switching projects so the new project's server layout is always applied
  useEffect(() => {
    appliedServerFingerprintRef.current = null;
    setNodePositions(loadLocalPositions(projectId));
  }, [projectId]);

  // #58: On mount, migrate old per-entity localStorage keys to the project-scoped format
  useEffect(() => {
    try {
      const projectKey = localStorageKey(projectId);
      if (localStorage.getItem(projectKey)) return; // already has project-scoped layout
      const merged: Record<string, { x: number; y: number }> = {};
      const toDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("entity-graph-layout-")) continue;
        try {
          const val = localStorage.getItem(key);
          if (!val) continue;
          const parsed = JSON.parse(val) as Record<string, { x: number; y: number }>;
          Object.assign(merged, parsed);
          toDelete.push(key);
        } catch { /* skip malformed entries */ }
      }
      if (Object.keys(merged).length > 0) {
        localStorage.setItem(projectKey, JSON.stringify(merged));
        toDelete.forEach((k) => localStorage.removeItem(k));
      }
    } catch { /* ignore storage errors */ }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    nodeId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  // Ref copy of positions for use inside debounce closures (#57)
  const positionsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Debounce handle for real-time layout sync during drag (#57)
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref to the mutate function so debounce closures stay fresh (#57)
  const updateGraphLayoutRef = useRef(updateGraphLayout);
  useEffect(() => { updateGraphLayoutRef.current = updateGraphLayout; }, [updateGraphLayout]);

  const clientToSvg = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: number, nodeX: number, nodeY: number) => {
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      const svgPos = clientToSvg(e.clientX, e.clientY);
      dragRef.current = {
        nodeId,
        offsetX: svgPos.x - nodeX,
        offsetY: svgPos.y - nodeY,
      };
    },
    [clientToSvg],
  );

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const svgPos = clientToSvg(e.clientX, e.clientY);
      const newX = Math.max(10, Math.min(width - 10, svgPos.x - drag.offsetX));
      const newY = Math.max(10, Math.min(height - 10, svgPos.y - drag.offsetY));
      didDragRef.current = true;
      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(drag.nodeId, { x: newX, y: newY });
        positionsRef.current = next; // keep ref in sync for debounce closure (#57)
        return next;
      });
      // Debounced server save during drag so layout syncs in real time (#57)
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => {
        const curr = positionsRef.current;
        saveLocalPositions(projectId, curr);
        const posRecord = positionsToRecord(curr);
        updateGraphLayoutRef.current.mutate(
          { projectId, data: { positions: posRecord } },
          { onSuccess: (data) => {
            appliedServerFingerprintRef.current = JSON.stringify(data.positions);
            qc.setQueryData(getGetGraphLayoutQueryKey(projectId), data);
          }},
        );
      }, 800);
    },
    [clientToSvg, width, height, projectId, qc],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    // Cancel any in-flight debounced save; endDrag does an immediate final save (#57)
    if (saveDebounceRef.current) { clearTimeout(saveDebounceRef.current); saveDebounceRef.current = null; }
    dragRef.current = null;
    setNodePositions((prev) => {
      // Save to localStorage immediately (fast)
      saveLocalPositions(projectId, prev);
      const posRecord = positionsToRecord(prev);
      // Save to server (durable, cross-device); update query cache on success so
      // the fingerprint stays in sync and stale background refetches don't overwrite local state.
      updateGraphLayout.mutate(
        { projectId, data: { positions: posRecord } },
        {
          onSuccess: (data) => {
            const newFingerprint = JSON.stringify(data.positions);
            appliedServerFingerprintRef.current = newFingerprint;
            qc.setQueryData(getGetGraphLayoutQueryKey(projectId), data);
          },
        },
      );
      return prev;
    });
  }, [projectId, updateGraphLayout, qc]);

  const handleSvgPointerUp = endDrag;
  const handleSvgPointerCancel = endDrag;

  const resetLayout = useCallback(() => {
    const empty = new Map<number, { x: number; y: number }>();
    setNodePositions(empty);
    try { localStorage.removeItem(localStorageKey(projectId)); } catch { /* ignore */ }
    updateGraphLayout.mutate(
      { projectId, data: { positions: {} } },
      {
        onSuccess: (data) => {
          const newFingerprint = JSON.stringify(data.positions);
          appliedServerFingerprintRef.current = newFingerprint;
          qc.setQueryData(getGetGraphLayoutQueryKey(projectId), data);
        },
      },
    );
  }, [projectId, updateGraphLayout, qc]);

  const nodes: GraphNode[] = useMemo(
    () =>
      baseGraph.nodes.map((n) => {
        const override = nodePositions.get(n.id);
        return override ? { ...n, x: override.x, y: override.y } : n;
      }),
    [baseGraph.nodes, nodePositions],
  );
  const { edges } = baseGraph;

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Auto-clear focus when the focused node is filtered out of the visible set
  useEffect(() => {
    if (focusedNodeId != null && !nodeById.has(focusedNodeId)) {
      setFocusedNodeId(null);
      setShowNeighborsOnly(false);
    }
  }, [focusedNodeId, nodeById]);

  const assetNodes = useMemo(
    () => buildAssetNodes(assets ?? [], nodeById, width / 2, height / 2),
    [assets, nodeById, width, height],
  );

  if (entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" /> Component graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No components yet. Add some to see the graph.</p>
        </CardContent>
      </Card>
    );
  }

  const adjacent = (id: number): Set<number> => {
    const set = new Set<number>();
    for (const e of edges) {
      if (e.a === id) set.add(e.b);
      else if (e.b === id) set.add(e.a);
    }
    return set;
  };

  const draggingId = dragRef.current?.nodeId ?? null;
  const hoverAdj = hoverId == null ? new Set<number>() : adjacent(hoverId);
  const fewNodes = nodes.length <= 20;

  // Label de-clash (#60): alternate labels above/below when nodes are crowded.
  // A simple greedy pass: sort by x then y, and if a node is within 55 px of a
  // previously-placed "above" label, push the later node's label below.
  const nodeLabelSides = useMemo(() => {
    const sides = new Map<number, 1 | -1>(); // 1 = above, -1 = below
    nodes.forEach((n) => sides.set(n.id, 1));
    const sorted = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y);
    sorted.forEach((n, i) => {
      for (const m of sorted.slice(i + 1)) {
        if (Math.hypot(n.x - m.x, n.y - m.y) < 55 && sides.get(n.id) === 1) {
          sides.set(m.id, -1);
        }
      }
    });
    return sides;
  }, [nodes]);

  const entityById = new Map(entities.map((e) => [e.id, e]));

  // ── Collision-free label positions (computed when always-on labels are shown) ──
  const labelPositions = useMemo(() => {
    if (!fewNodes && !alwaysShowLabels) return new Map<number, { dx: number; dy: number; anchor: "middle"; fontSize: number }>();

    const cx = width / 2;
    const cy = height / 2;
    // Font size scales down slightly for denser graphs
    const fontSize = nodes.length <= 10 ? 11 : nodes.length <= 15 ? 10 : 9;
    const charW = fontSize * 0.62;   // approximate character width
    const labelH = fontSize + 4;     // approximate label bounding-box height
    const OFFSET = 8;                // gap between node edge and label
    const ITERATIONS = 40;
    const PUSH = 3;

    // Absolute SVG coords for each label (center of bounding box)
    const pos = nodes.map((n) => {
      const dx = n.x - cx;
      const dy = n.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const r = n.r + OFFSET;
      return {
        id: n.id,
        x: n.x + ux * r,
        y: n.y + uy * r,
        w: Math.max(n.name.length * charW, 20),
        h: labelH,
        nodeX: n.x,
        nodeY: n.y,
      };
    });

    // Simple iterative AABB repulsion pass
    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const a = pos[i];
          const b = pos[j];
          const halfWA = a.w / 2 + 1;
          const halfWB = b.w / 2 + 1;
          const halfHA = a.h / 2 + 1;
          const halfHB = b.h / 2 + 1;
          const overlapX = halfWA + halfWB - Math.abs(a.x - b.x);
          const overlapY = halfHA + halfHB - Math.abs(a.y - b.y);
          if (overlapX > 0 && overlapY > 0) {
            const ddx = a.x - b.x || 0.1;
            const ddy = a.y - b.y || 0.1;
            const d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            const ratioX = overlapX / (overlapX + overlapY);
            const ratioY = overlapY / (overlapX + overlapY);
            const pushX = (ddx / d) * PUSH * ratioX;
            const pushY = (ddy / d) * PUSH * ratioY;
            a.x += pushX;
            a.y += pushY;
            b.x -= pushX;
            b.y -= pushY;
          }
        }
      }
    }

    // Clamp labels to stay within SVG bounds (padding so text doesn't clip at edges)
    const PAD = 4;
    for (const p of pos) {
      p.x = Math.max(p.w / 2 + PAD, Math.min(width - p.w / 2 - PAD, p.x));
      p.y = Math.max(p.h / 2 + PAD, Math.min(height - p.h / 2 - PAD, p.y));
    }

    // textAnchor is always "middle" so the rendered bounding box exactly matches
    // the collision box (centered at p.x, p.y ± w/2).
    const result = new Map<number, { dx: number; dy: number; anchor: "middle"; fontSize: number }>();
    for (const p of pos) {
      result.set(p.id, { dx: p.x - p.nodeX, dy: p.y - p.nodeY, anchor: "middle", fontSize });
    }
    return result;
  }, [nodes, fewNodes, alwaysShowLabels, width, height]);
  const assetById = useMemo(() => new Map((assets ?? []).map((a) => [a.id, a])), [assets]);
  const explicitEdges = edges.filter((e) => e.kind === "explicit");
  // Apply min-weight filter to inferred edges
  const inferredEdges = edges.filter((e) => e.kind === "inferred" && e.weight >= minWeight);

  const linkedAssetCount = assetNodes.length;
  // Legend only shows types visible in the current filtered graph
  const visibleNodeTypes = new Set(nodes.map((n) => n.type));
  const legendTypes = ALL_COMPONENT_TYPES.filter((t) => visibleNodeTypes.has(t));
  const usedAssetKinds = [...new Set((assets ?? []).filter((a) => a.entityId && nodeById.has(a.entityId)).map((a) => a.kind))];
  const hasCustomPositions = nodePositions.size > 0;

  // Focused node info
  const focusedEntity = focusedNodeId != null ? entityById.get(focusedNodeId) : undefined;
  const focusedNeighborCount = focusedNodeId != null
    ? adjacent(focusedNodeId).size
    : 0;

  const handleNodeClick = (entity: Entity) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setFocusedNodeId((prev) => (prev === entity.id ? null : entity.id));
    if (onEntityClick) {
      onEntityClick(entity);
    } else {
      onJump("assets-entities");
    }
  };

  const handleAssetClick = (an: AssetNode) => {
    const asset = assetById.get(an.id);
    if (asset && onAssetClick) {
      onAssetClick(asset);
    } else if (asset && onEntityClick) {
      const entity = entityById.get(an.entityId);
      if (entity) onEntityClick(entity);
    } else {
      onJump("assets-entities");
    }
  };

  const maxWeight = useMemo(() => {
    const weights = preFilterEdges.filter((e) => e.kind === "inferred").map((e) => e.weight);
    return weights.length > 0 ? Math.max(...weights) : 10;
  }, [preFilterEdges]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4" /> Component graph
          <Badge variant="outline" className="text-[10px] ml-1">
            {nodes.length} entities · {linkedAssetCount} assets · {explicitEdges.length + inferredEdges.length} links
          </Badge>
          {hasCustomPositions && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-white ml-auto"
              onClick={resetLayout}
              data-testid="graph-reset-layout"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset layout
            </Button>
          )}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-6 h-px bg-foreground/70" />
            Explicit (relatedTo)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-6 h-px border-t border-dashed border-foreground/50" />
            Inferred (rule co-occurrence ≥ {minWeight})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-px border-t border-dashed" style={{ borderColor: "#3b82f6" }} />
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6", opacity: 0.7 }} />
            Asset link
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
            Drag nodes to rearrange · click to inspect.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ── Type filter pills ── */}
        <div className="flex flex-wrap items-center gap-1.5" data-testid="graph-type-filters">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
            <Filter className="h-3 w-3" /> Type
          </span>
          {!allActive && (
            <button
              onClick={resetTypes}
              className="text-[10px] px-2 py-0.5 rounded-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              data-testid="graph-filter-all"
            >
              All
            </button>
          )}
          {presentTypes.map((t) => {
            const on = activeTypes.has(t);
            const count = cappedEntities.filter((e) => e.type === t).length;
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  on
                    ? `${typeBadge(t)} opacity-100`
                    : "border-border/40 bg-background/40 text-muted-foreground/50 opacity-60"
                }`}
                data-testid={`graph-filter-type-${t}`}
              >
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeHex(t), opacity: on ? 1 : 0.4 }} />
                {t}
                <span className="text-[9px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* ── Edge weight slider ── */}
        <div className="flex items-center gap-3" data-testid="graph-weight-slider">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
            <SlidersHorizontal className="h-3 w-3" /> Min. co-occurrence
          </span>
          <input
            type="range"
            min={2}
            max={Math.max(2, maxWeight)}
            value={minWeight}
            onChange={(e) => setMinWeight(Number(e.target.value))}
            className="flex-1 max-w-[140px] h-1.5 accent-primary cursor-pointer"
            data-testid="graph-weight-range"
          />
          <Badge variant="outline" className="text-[10px] tabular-nums shrink-0">≥ {minWeight}</Badge>
          {minWeight > 2 && (
            <button
              onClick={() => setMinWeight(2)}
              className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              data-testid="graph-weight-reset"
            >
              reset
            </button>
          )}
          <button
            onClick={() => setAlwaysShowLabels((v) => !v)}
            className={`ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${
              alwaysShowLabels
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border/50 bg-background/40 text-muted-foreground hover:text-white"
            }`}
            data-testid="graph-always-labels"
            title="Always show all node labels"
          >
            Always show labels
          </button>
        </div>

        {/* ── Focused node / neighbor strip ── */}
        {focusedEntity && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs"
            data-testid="graph-focus-bar"
          >
            <span className="text-muted-foreground">Focused:</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${typeBadge(focusedEntity.type)}`}>
              {focusedEntity.type}
            </span>
            <span className="font-medium text-white">{focusedEntity.name}</span>
            {showNeighborsOnly ? (
              <span className="text-muted-foreground/70">
                · {finalEntities.length - 1} node{finalEntities.length - 1 !== 1 ? "s" : ""} within {neighborDepth} hop{neighborDepth !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-muted-foreground/70">· {focusedNeighborCount} neighbor{focusedNeighborCount !== 1 ? "s" : ""}</span>
            )}
            <button
              onClick={() => setShowNeighborsOnly((v) => !v)}
              className={`ml-1 px-2 py-0.5 rounded border text-[10px] transition-colors ${
                showNeighborsOnly
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:text-white"
              }`}
              data-testid="graph-neighbors-toggle"
            >
              {showNeighborsOnly ? "Showing neighbors only" : "Show neighbors only"}
            </button>
            {/* Depth stepper — visible whenever a node is focused, regardless of neighbor-only mode */}
            <span className="flex items-center gap-1 ml-1" data-testid="graph-depth-stepper">
              <span className="text-[10px] text-muted-foreground shrink-0">Depth:</span>
              <button
                onClick={() => setNeighborDepth((v) => Math.max(1, v - 1))}
                className="w-5 h-5 rounded border border-border/50 bg-background/40 text-muted-foreground hover:text-white text-[11px] font-bold transition-colors flex items-center justify-center"
                data-testid="graph-depth-dec"
                aria-label="Decrease depth"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={20}
                value={neighborDepth}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) setNeighborDepth(Math.min(v, 20));
                }}
                className="w-9 h-5 rounded border border-primary/40 bg-background/60 text-primary text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                data-testid="graph-depth-input"
              />
              <button
                onClick={() => setNeighborDepth((v) => Math.min(20, v + 1))}
                className="w-5 h-5 rounded border border-border/50 bg-background/40 text-muted-foreground hover:text-white text-[11px] font-bold transition-colors flex items-center justify-center"
                data-testid="graph-depth-inc"
                aria-label="Increase depth"
              >
                +
              </button>
            </span>
            <button
              onClick={() => { setFocusedNodeId(null); setShowNeighborsOnly(false); setNeighborDepth(1); }}
              className="ml-auto text-muted-foreground/60 hover:text-white transition-colors"
              data-testid="graph-focus-clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Neighbor-filter on but no node clicked yet */}
        {showNeighborsOnly && !focusedNodeId && (
          <div className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs text-blue-200/80" data-testid="graph-no-focus-hint">
            <span className="text-blue-400">ℹ</span>
            Click any node to focus it — the graph will then show only its neighbors within the selected depth.
          </div>
        )}

        {/* Cap warning — neighbor mode cut off nodes due to GRAPH_NODE_CAP */}
        {showNeighborsOnly && focusedNodeId && finalEntities.length >= GRAPH_NODE_CAP && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80" data-testid="graph-cap-warning">
            <span className="text-amber-400">⚠</span>
            Showing {GRAPH_NODE_CAP} nodes max — some nodes at depth {neighborDepth} may be hidden. Reduce depth to see a more complete neighborhood.
          </div>
        )}

        {overCap && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
            <span className="text-amber-200/90">
              {entities.length} components is too many for one graph — showing the top {GRAPH_NODE_CAP} by rule references.
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show top only" : "Show all anyway"}
            </Button>
          </div>
        )}

        {nodes.length === 0 && (
          <div className="rounded-md border border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No components match the current filters.{" "}
            <button onClick={resetTypes} className="text-primary hover:underline">Reset filters</button>
          </div>
        )}

        {nodes.length > 0 && (
          <div className="rounded-md border border-border bg-background/40 overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto"
              data-testid="entity-graph-svg"
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerCancel={handleSvgPointerCancel}
              onPointerLeave={handleSvgPointerUp}
              style={{ touchAction: "none" }}
            >
              <g>
                {inferredEdges.map((e, i) => {
                  const a = nodeById.get(e.a);
                  const b = nodeById.get(e.b);
                  if (!a || !b) return null;
                  const muted = hoverId != null && hoverId !== e.a && hoverId !== e.b;
                  const haA = hopNodeMap.get(e.a);
                  const haB = hopNodeMap.get(e.b);
                  const edgeHop = (haA != null && haB != null) ? Math.max(haA, haB) : null;
                  const color = edgeHop != null ? hopColor(edgeHop) : "currentColor";
                  const opacity = edgeHop != null ? (0.9 - edgeHop * 0.12) : (muted ? 0.05 : 0.25);
                  return (
                    <line key={`i${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={color}
                      strokeOpacity={Math.max(0.15, opacity)}
                      strokeWidth={edgeHop != null ? (edgeHop <= 1 ? 2 : 1.5) : Math.min(3, 1 + Math.log2(e.weight))}
                      strokeDasharray={edgeHop != null ? undefined : "4 3"}
                      className={edgeHop != null ? undefined : "text-foreground"}
                      style={{ transition: "stroke-opacity 0.15s ease" }}>
                      <title>{a.name} ↔ {b.name} (co-occur in {e.weight} rules{edgeHop != null ? `, hop ${edgeHop}` : ""})</title>
                    </line>
                  );
                })}
                {explicitEdges.map((e, i) => {
                  const a = nodeById.get(e.a);
                  const b = nodeById.get(e.b);
                  if (!a || !b) return null;
                  const muted = hoverId != null && hoverId !== e.a && hoverId !== e.b;
                  const haA = hopNodeMap.get(e.a);
                  const haB = hopNodeMap.get(e.b);
                  const edgeHop = (haA != null && haB != null) ? Math.max(haA, haB) : null;
                  const color = edgeHop != null ? hopColor(edgeHop) : "currentColor";
                  const opacity = edgeHop != null ? (0.95 - edgeHop * 0.12) : (muted ? 0.08 : 0.55);
                  return (
                    <line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={color}
                      strokeOpacity={Math.max(0.15, opacity)}
                      strokeWidth={edgeHop != null ? (edgeHop <= 1 ? 2.5 : 1.8) : 1.4}
                      className={edgeHop != null ? undefined : "text-foreground"}
                      style={{ transition: "stroke-opacity 0.15s ease" }}>
                      <title>{a.name} → {b.name} (explicit{edgeHop != null ? `, hop ${edgeHop}` : ""})</title>
                    </line>
                  );
                })}
                {assetNodes.map((an) => {
                  const en = nodeById.get(an.entityId);
                  if (!en) return null;
                  const muted = hoverId != null && hoverId !== an.entityId;
                  return (
                    <line key={`asset-edge-${an.id}`}
                      x1={en.x} y1={en.y} x2={an.x} y2={an.y}
                      stroke={assetKindHex(an.kind)}
                      strokeOpacity={muted ? 0.08 : 0.45}
                      strokeWidth={1}
                      strokeDasharray="3 2">
                      <title>{an.name} → {en.name} (asset link)</title>
                    </line>
                  );
                })}
              </g>
              <g>
                {assetNodes.map((an) => {
                  const muted = hoverId != null && hoverId !== an.entityId;
                  const s = an.size;
                  const clickable = !!(onAssetClick || onEntityClick);
                  return (
                    <g key={`asset-node-${an.id}`} transform={`translate(${an.x},${an.y})`}
                      onClick={() => handleAssetClick(an)}
                      style={{ cursor: clickable ? "pointer" : "default" }}
                      data-testid={`graph-asset-node-${an.id}`}>
                      <rect x={-s} y={-s} width={s * 2} height={s * 2}
                        rx={1.5}
                        fill={assetKindHex(an.kind)}
                        fillOpacity={muted ? 0.1 : 0.7}
                        stroke={assetKindHex(an.kind)}
                        strokeOpacity={muted ? 0.1 : 0.9}
                        strokeWidth={0.8} />
                      <title>{an.name} ({an.kind} asset) — click to inspect linked component</title>
                    </g>
                  );
                })}
              </g>
              <g>
                {nodes.map((n) => {
                  const isHover = hoverId === n.id;
                  const isFocused = focusedNodeId === n.id;
                  const isAdj = hoverAdj.has(n.id);
                  const isDragging = draggingId === n.id;
                  const dim = hoverId != null && !isHover && !isAdj && !isDragging;
                  const entity = entityById.get(n.id);
                  const nodeHop = hopNodeMap.get(n.id);
                  const hasHopMode = hopNodeMap.size > 0;
                  const baseFillOpacity = hasHopMode && nodeHop != null
                    ? hopFillOpacity(nodeHop)
                    : (dim ? 0.2 : 0.85);
                  return (
                    <g key={n.id} transform={`translate(${n.x},${n.y})`}
                      onMouseEnter={() => !dragRef.current && setHoverId(n.id)}
                      onMouseLeave={() => !dragRef.current && setHoverId((x) => (x === n.id ? null : x))}
                      onPointerDown={(e) => handleNodePointerDown(e, n.id, n.x, n.y)}
                      onClick={() => entity && handleNodeClick(entity)}
                      style={{ cursor: isDragging ? "grabbing" : "grab" }}
                      data-testid={`graph-node-${n.id}`}>
                      <circle r={n.r + (isHover || isDragging ? 3 : 0)} fill={typeHex(n.type)}
                        fillOpacity={baseFillOpacity} stroke="currentColor"
                        strokeOpacity={isFocused ? 1 : isHover || isDragging ? 0.9 : 0.4}
                        strokeWidth={isFocused ? 2.5 : isHover || isDragging ? 2 : 1}
                        className="text-foreground"
                        style={{ transition: "fill-opacity 0.15s ease, stroke-opacity 0.15s ease" }} />
                      {isFocused && (
                        <circle r={n.r + 6} fill="none" stroke="currentColor"
                          strokeOpacity={0.4} strokeWidth={1} strokeDasharray="3 2"
                          className="text-primary" />
                      )}
                      {hasHopMode && !isFocused && nodeHop != null && nodeHop > 0 && (
                        <circle r={n.r + (isHover || isDragging ? 5 : 4)} fill="none"
                          stroke={hopColor(nodeHop)}
                          strokeOpacity={isHover ? 0.9 : 0.65}
                          strokeWidth={nodeHop === 1 ? 1.8 : 1.2}
                          strokeDasharray={nodeHop === 1 ? undefined : "3 2"} />
                      )}
                      {(alwaysShowLabels || fewNodes || isHover || isAdj || isDragging || isFocused) && (() => {
                        const lp = labelPositions.get(n.id);
                        const alwaysOn = (alwaysShowLabels || fewNodes) && lp != null;
                        const dx = alwaysOn ? lp!.dx : 0;
                        const dy = alwaysOn ? lp!.dy : -(n.r + 8);
                        const anchor = alwaysOn ? lp!.anchor : "middle";
                        const fs = alwaysOn ? lp!.fontSize : 11;
                        const opacity = alwaysOn && !isHover && !isAdj && !isDragging && !isFocused
                          ? (hoverId != null ? 0.35 : 0.65)
                          : 1;
                        const dist = Math.hypot(dx, dy);
                        const showLeader = alwaysOn && dist > 2 * n.r;
                        const edgeX = showLeader ? (dx / dist) * n.r : 0;
                        const edgeY = showLeader ? (dy / dist) * n.r : 0;
                        return (
                          <>
                            {showLeader && (
                              <line
                                x1={edgeX} y1={edgeY} x2={dx} y2={dy}
                                stroke="currentColor"
                                strokeOpacity={dim ? 0.08 : 0.25}
                                strokeWidth={0.8}
                                strokeDasharray="3 2"
                                className="text-foreground pointer-events-none"
                              />
                            )}
                            <text x={dx} y={dy} textAnchor={anchor} fontSize={fs}
                              fill="currentColor"
                              fillOpacity={opacity}
                              className="text-foreground font-medium pointer-events-none">
                              {n.name}
                            </text>
                          </>
                        );
                      })()}
                      <title>{n.name} ({n.type}) — drag to reposition · click to focus · inspect</title>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        {/* ── Legend — only types visible in the current filtered graph ── */}
        <div className="flex flex-wrap gap-3">
          {legendTypes.map((t) => {
            const count = nodes.filter((n) => n.type === t).length;
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
                title={`Click to toggle ${t} visibility`}
                data-testid={`graph-legend-${t}`}
              >
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: typeHex(t) }} />
                <span className="text-muted-foreground">{t}</span>
                <span className="text-muted-foreground/60">({count})</span>
              </button>
            );
          })}
          {usedAssetKinds.map((k) => (
            <div key={`asset-${k}`} className="flex items-center gap-1.5 text-xs">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: assetKindHex(k) }} />
              <span className="text-muted-foreground">{k} <span className="text-muted-foreground/50">(asset)</span></span>
            </div>
          ))}
        </div>

        {/* ── Hop-distance legend — shown when neighbor mode is active ── */}
        {hopNodeMap.size > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-border/50 bg-background/30 px-3 py-2" data-testid="graph-hop-legend">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Hop distance</span>
            <span className="flex items-center gap-1.5 text-xs">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="5" fill="hsl(var(--primary))" fillOpacity={0.85} />
                <circle cx="8" cy="8" r="7" fill="none" stroke="hsl(var(--primary))" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="3 2" />
              </svg>
              <span className="text-muted-foreground">Focused (origin)</span>
            </span>
            {([1, 2, 3] as const).map((hop) => (
              <span key={hop} className="flex items-center gap-1.5 text-xs">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="4" fill="currentColor" fillOpacity={hopFillOpacity(hop)} className="text-foreground" />
                  <circle cx="8" cy="8" r="6.5" fill="none"
                    stroke={hopColor(hop)} strokeOpacity={0.65}
                    strokeWidth={hop === 1 ? 1.8 : 1.2}
                    strokeDasharray={hop === 1 ? undefined : "3 2"} />
                </svg>
                <span className="text-muted-foreground">Hop {hop}{hop === 3 ? "+" : ""}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs ml-2 pl-2 border-l border-border/50">
              <span className="inline-block w-5 h-px" style={{ backgroundColor: hopColor(1), opacity: 0.9 }} />
              <span className="text-muted-foreground/70 text-[10px]">hop-1 edge</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="inline-block w-5 h-px" style={{ backgroundColor: hopColor(2), opacity: 0.8 }} />
              <span className="text-muted-foreground/70 text-[10px]">hop-2 edge</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="inline-block w-5 h-px" style={{ backgroundColor: hopColor(3), opacity: 0.7 }} />
              <span className="text-muted-foreground/70 text-[10px]">hop-3 edge</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Entity node inspector — inline panel shown when a node is clicked
// ════════════════════════════════════════════════════════════════════════════
export function EntityNodeInspector({
  entity, assets, links, propCount, onClose, onLinkAsset, onUnlinkAsset,
}: {
  entity: Entity;
  assets: Asset[];
  links: LinkMaps;
  propCount: number;
  onClose: () => void;
  onLinkAsset?: (assetId: number) => void;
  onUnlinkAsset?: (assetId: number) => void;
}) {
  const linkedAssets = useMemo(
    () => assets.filter((a) => a.entityId === entity.id),
    [assets, entity.id],
  );
  // Assets not yet linked to THIS entity (includes unlinked and linked-elsewhere)
  const linkableAssets = useMemo(
    () => assets.filter((a) => a.entityId !== entity.id),
    [assets, entity.id],
  );
  const ruleCount = links.entityToRules.get(entity.id)?.size ?? 0;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFilter, setPickerFilter] = useState("");
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setPickerFilter("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const filteredUnlinked = useMemo(() => {
    const f = pickerFilter.trim().toLowerCase();
    if (!f) return linkableAssets;
    return linkableAssets.filter(
      (a) => a.name.toLowerCase().includes(f) || a.kind.toLowerCase().includes(f),
    );
  }, [linkableAssets, pickerFilter]);

  const handleLink = async (assetId: number) => {
    if (!onLinkAsset) return;
    setLinkingId(assetId);
    try {
      await onLinkAsset(assetId);
    } finally {
      setLinkingId(null);
      setPickerOpen(false);
      setPickerFilter("");
    }
  };

  const handleUnlink = async (assetId: number) => {
    if (!onUnlinkAsset) return;
    setUnlinkingId(assetId);
    try {
      await onUnlinkAsset(assetId);
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      data-testid={`entity-inspector-${entity.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-white truncate">{entity.name}</h3>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${typeBadge(entity.type)}`}>
              {entity.type}
            </Badge>
            {entity.subtype && (
              <Badge variant="outline" className="text-[10px] shrink-0 bg-secondary/30">
                {entity.subtype}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>{ruleCount} rule{ruleCount !== 1 ? "s" : ""}</span>
            <span>{propCount} propert{propCount !== 1 ? "ies" : "y"}</span>
            <span>{linkedAssets.length} asset{linkedAssets.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-muted-foreground hover:text-white transition-colors"
          data-testid="entity-inspector-close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {entity.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{entity.description}</p>
      )}
      {entity.lore && (
        <p className="text-xs text-purple-300/80 italic leading-relaxed">"{entity.lore}"</p>
      )}
      {entity.designNotes && (
        <p className="text-xs text-blue-300/80 leading-relaxed border-l-2 border-blue-500/30 pl-2">{entity.designNotes}</p>
      )}

      {/* Linked assets section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" /> Linked assets
          </p>
          {onLinkAsset && (
            <div className="relative" ref={pickerRef}>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() => { setPickerOpen((v) => !v); setPickerFilter(""); }}
                data-testid="link-asset-button"
              >
                <Plus className="h-3 w-3" /> Link asset
              </Button>

              {pickerOpen && (
                <div
                  className="absolute right-0 top-8 z-50 w-64 rounded-lg border border-border bg-card shadow-xl p-2 space-y-1.5"
                  data-testid="link-asset-picker"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-0.5">
                    Link an asset to this component
                  </p>
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoFocus
                      value={pickerFilter}
                      onChange={(e) => setPickerFilter(e.target.value)}
                      placeholder="Filter assets…"
                      className="w-full bg-input border border-border rounded text-xs pl-6 pr-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                      data-testid="link-asset-filter"
                    />
                  </div>
                  {filteredUnlinked.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 italic px-1 py-1">
                      {pickerFilter ? "No assets match." : "No other assets available. Create an asset first."}
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {filteredUnlinked.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => handleLink(a.id)}
                          disabled={linkingId === a.id}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent transition-colors text-left group"
                          data-testid={`pick-asset-${a.id}`}
                        >
                          {a.imageDataUrl ? (
                            <img src={a.imageDataUrl} alt={a.name} className="w-6 h-6 rounded object-cover shrink-0" />
                          ) : (
                            <div
                              className="w-6 h-6 rounded shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: assetKindHex(a.kind) + "33" }}
                            >
                              <ImageIcon className="h-3 w-3" style={{ color: assetKindHex(a.kind) }} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-white truncate">{a.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{a.kind}</p>
                          </div>
                          {linkingId === a.id ? (
                            <span className="text-[10px] text-muted-foreground shrink-0">linking…</span>
                          ) : (
                            <LinkIcon className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {linkedAssets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {linkedAssets.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded border border-border/60 bg-background/40 group"
                data-testid={`inspector-asset-${a.id}`}
              >
                {a.imageDataUrl ? (
                  <img
                    src={a.imageDataUrl}
                    alt={a.name}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: assetKindHex(a.kind) + "33" }}
                  >
                    <ImageIcon className="h-3.5 w-3.5" style={{ color: assetKindHex(a.kind) }} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate max-w-[120px]">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{a.kind}</p>
                </div>
                {onUnlinkAsset && (
                  <button
                    onClick={() => handleUnlink(a.id)}
                    disabled={unlinkingId === a.id}
                    className="ml-1 shrink-0 text-muted-foreground/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove link"
                    data-testid={`unlink-asset-${a.id}`}
                  >
                    {unlinkingId === a.id ? (
                      <span className="text-[9px]">…</span>
                    ) : (
                      <Unlink className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" /> No assets linked to this component yet.
            {onLinkAsset && linkableAssets.length > 0 && (
              <span className="not-italic text-primary/70 cursor-pointer hover:text-primary" onClick={() => setPickerOpen(true)}>
                Link one now.
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Component browser — sortable, filterable table
// ════════════════════════════════════════════════════════════════════════════
type SortKey = "name" | "type" | "props" | "rules";

export function ComponentBrowser({
  entities, links, propsByEntity, onJump,
}: {
  entities: Entity[];
  links: LinkMaps;
  propsByEntity: Map<number, EntityProp[]>;
  onJump: (tab: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rules");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = entities
      .filter((e) =>
        !f ||
        e.name.toLowerCase().includes(f) ||
        e.type.toLowerCase().includes(f) ||
        (e.subtype ?? "").toLowerCase().includes(f),
      )
      .map((e) => ({
        entity: e,
        propCount: propsByEntity.get(e.id)?.length ?? 0,
        ruleCount: links.entityToRules.get(e.id)?.size ?? 0,
      }));
    list.sort((a, b) => {
      const cmp =
        sortKey === "name" ? a.entity.name.localeCompare(b.entity.name)
        : sortKey === "type" ? a.entity.type.localeCompare(b.entity.type)
        : sortKey === "props" ? a.propCount - b.propCount
        : a.ruleCount - b.ruleCount;
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [entities, filter, sortKey, sortDesc, propsByEntity, links]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDesc((d) => !d);
    else { setSortKey(k); setSortDesc(true); }
  };

  const Header = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 ${className ?? ""}`}
      data-testid={`browser-sort-${k}`}
    >
      {label}
      {sortKey === k && <span className="text-primary">{sortDesc ? "▼" : "▲"}</span>}
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TableIcon className="h-4 w-4" /> Component browser
          <Badge variant="outline" className="text-[10px] ml-1">{entities.length}</Badge>
        </CardTitle>
        <CardDescription>
          Every component at a glance with property counts, rule references, and tag completeness. Click a row to open in Components.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, type, subtype…"
            className="bg-input h-8 text-xs pl-8"
            data-testid="entity-browser-filter"
          />
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-muted/20 border-b border-border">
            <Header k="name" label="Name" className="col-span-4" />
            <Header k="type" label="Type" className="col-span-2" />
            <Header k="props" label="Props" className="col-span-1" />
            <Header k="rules" label="Rules" className="col-span-1" />
            <div className="col-span-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</div>
          </div>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">No components match.</p>
          ) : (
            rows.map(({ entity: e, propCount, ruleCount }) => (
              <button
                key={e.id}
                onClick={() => onJump("assets-entities")}
                className="w-full grid grid-cols-12 gap-3 px-3 py-2 items-center text-sm hover:bg-muted/10 cursor-pointer text-left border-b border-border/40 last:border-0 transition-colors"
                data-testid={`browser-row-${e.id}`}
              >
                <div className="col-span-4 truncate">
                  <span className="text-white font-medium">{e.name}</span>
                  {e.subtype && <span className="text-muted-foreground text-xs ml-1.5">/ {e.subtype}</span>}
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className={`text-[10px] ${typeBadge(e.type)}`}>{e.type}</Badge>
                </div>
                <div className="col-span-1 text-xs text-muted-foreground font-mono">{propCount}</div>
                <div className={`col-span-1 text-xs font-mono ${ruleCount === 0 ? "text-amber-400/70" : "text-muted-foreground"}`}>
                  {ruleCount}
                </div>
                <div className="col-span-4 flex flex-wrap gap-1">
                  {e.description && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">desc</span>}
                  {e.lore && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">lore</span>}
                  {e.designNotes && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">notes</span>}
                  {e.stats && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">stats</span>}
                  {!e.description && !e.lore && !e.designNotes && !e.stats && (
                    <span className="text-[10px] text-muted-foreground/50 italic">empty</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Property dictionary — live view of project's actual properties
// ════════════════════════════════════════════════════════════════════════════
export function PropertyDictionary({
  entities, properties,
}: {
  entities: Entity[];
  properties: EntityProp[];
}) {
  const entityById = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  const dict = useMemo(() => {
    const byName = new Map<string, { name: string; types: Set<string>; entities: Entity[] }>();
    for (const p of properties) {
      const ent = entityById.get(p.entityId);
      if (!ent) continue;
      const entry = byName.get(p.name) ?? { name: p.name, types: new Set(), entities: [] };
      entry.types.add(p.dataType);
      entry.entities.push(ent);
      byName.set(p.name, entry);
    }
    return [...byName.values()].sort((a, b) => b.entities.length - a.entities.length);
  }, [properties, entityById]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" /> Live property dictionary
          <Badge variant="outline" className="text-[10px] ml-1">{dict.length}</Badge>
        </CardTitle>
        <CardDescription>
          Properties your project components actually have, grouped by name. Mixed data-types or near-duplicate names (<code>hp</code> vs <code>health</code>) are usually worth normalizing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dict.length === 0 ? (
          <p className="text-sm text-muted-foreground">No component properties yet. Add properties to entities to populate this dictionary.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
            {dict.map((d) => (
              <div key={d.name} className="border border-border/60 rounded-md p-2.5 bg-background/30" data-testid={`prop-dict-${d.name}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm text-white font-mono font-semibold">{d.name}</code>
                  {[...d.types].map((t) => (
                    <Badge key={t} variant="outline"
                      className={`text-[10px] font-mono ${d.types.size > 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-secondary/30"}`}>
                      {t}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {d.entities.length} {d.entities.length === 1 ? "component" : "components"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {d.entities.map((e) => (
                    <span key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadge(e.type)}`} title={`${e.type}: ${e.name}`}>
                      {e.name}
                    </span>
                  ))}
                </div>
                {d.types.size > 1 && (
                  <p className="text-[11px] text-amber-400/80 mt-1.5 italic">
                    ⚠ Mixed data-types — components define <code>{d.name}</code> with different types.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Rule ↔ component links list
// ════════════════════════════════════════════════════════════════════════════
export function RuleEntityLinks({
  rules, entities, links,
}: {
  rules: Rule[];
  entities: Entity[];
  links: LinkMaps;
}) {
  const entityById = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const linked = useMemo(() => {
    return rules
      .map((r) => ({
        rule: r,
        entityIds: [...(links.ruleToEntities.get(r.id) ?? new Set<number>())],
      }))
      .filter((x) => x.entityIds.length > 0);
  }, [rules, links]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LinkIcon className="h-4 w-4" /> Rule ↔ Component links
          <Badge variant="outline" className="text-[10px] ml-1">{linked.length}</Badge>
        </CardTitle>
        <CardDescription>
          Whole-word, case-insensitive matches between rule text and component names.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No detected links yet. Reference component names in rules to populate this list.
          </p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {linked.map(({ rule, entityIds }) => (
              <div key={rule.id} className="border-l-2 border-primary/40 pl-3 py-1">
                <div className="font-medium text-sm">{rule.title}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entityIds.map((id) => {
                    const e = entityById.get(id);
                    if (!e) return null;
                    return (
                      <span key={id} className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadge(e.type)}`}>
                        {e.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
