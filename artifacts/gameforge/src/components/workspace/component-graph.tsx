import { useMemo, useState } from "react";
import { type Entity, type Rule, type EntityProperty } from "@workspace/api-client-react";
import { AlertTriangle, Sparkles, Box, Activity, GitBranch, Search, ArrowRight, Link as LinkIcon, Layers, Table as TableIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ALL_COMPONENT_TYPES, type ComponentType } from "@/lib/game-component-types";
import { COMPONENT_DOCS } from "@/lib/component-docs";

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

export function EntityGraph({
  entities, links, onJump,
}: {
  entities: Entity[];
  links: LinkMaps;
  onJump: (tab: string) => void;
}) {
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const width = 720;
  const height = 480;

  const overCap = entities.length > GRAPH_NODE_CAP;
  const visibleEntities = useMemo(() => {
    if (!overCap || showAll) return entities;
    const sorted = [...entities].sort(
      (a, b) =>
        (links.entityToRules.get(b.id)?.size ?? 0) -
        (links.entityToRules.get(a.id)?.size ?? 0),
    );
    return sorted.slice(0, GRAPH_NODE_CAP);
  }, [entities, links, overCap, showAll]);

  const { nodes, edges } = useMemo(
    () => buildGraph(visibleEntities, links, width, height),
    [visibleEntities, links, width, height],
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

  const hoverAdj = hoverId == null ? new Set<number>() : adjacent(hoverId);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const explicitEdges = edges.filter((e) => e.kind === "explicit");
  const inferredEdges = edges.filter((e) => e.kind === "inferred");

  const legendTypes = ALL_COMPONENT_TYPES.filter((t) => entities.some((e) => e.type === t));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4" /> Component graph
          <Badge variant="outline" className="text-[10px] ml-1">
            {nodes.length} nodes · {edges.length} edges
          </Badge>
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-6 h-px bg-foreground/70" />
            Explicit (relatedTo)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-6 h-px border-t border-dashed border-foreground/50" />
            Inferred (rule co-occurrence ≥ 2)
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
            Hover to highlight, click to open in Components.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overCap && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
            <span className="text-amber-200/90">
              {entities.length} components is too many for one graph — showing the top {GRAPH_NODE_CAP} by rule references.
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show top only" : "Show all anyway"}
            </Button>
          </div>
        )}
        <div className="rounded-md border border-border bg-background/40 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" data-testid="entity-graph-svg">
            <g>
              {inferredEdges.map((e, i) => {
                const a = nodeById.get(e.a);
                const b = nodeById.get(e.b);
                if (!a || !b) return null;
                const muted = hoverId != null && hoverId !== e.a && hoverId !== e.b;
                return (
                  <line key={`i${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="currentColor" strokeOpacity={muted ? 0.05 : 0.25}
                    strokeWidth={Math.min(3, 1 + Math.log2(e.weight))}
                    strokeDasharray="4 3" className="text-foreground">
                    <title>{a.name} ↔ {b.name} (co-occur in {e.weight} rules)</title>
                  </line>
                );
              })}
              {explicitEdges.map((e, i) => {
                const a = nodeById.get(e.a);
                const b = nodeById.get(e.b);
                if (!a || !b) return null;
                const muted = hoverId != null && hoverId !== e.a && hoverId !== e.b;
                return (
                  <line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="currentColor" strokeOpacity={muted ? 0.08 : 0.55}
                    strokeWidth={1.4} className="text-foreground">
                    <title>{a.name} → {b.name} (explicit)</title>
                  </line>
                );
              })}
            </g>
            <g>
              {nodes.map((n) => {
                const isHover = hoverId === n.id;
                const isAdj = hoverAdj.has(n.id);
                const dim = hoverId != null && !isHover && !isAdj;
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`}
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId((x) => (x === n.id ? null : x))}
                    onClick={() => onJump("assets-entities")}
                    style={{ cursor: "pointer" }}
                    data-testid={`graph-node-${n.id}`}>
                    <circle r={n.r + (isHover ? 3 : 0)} fill={typeHex(n.type)}
                      fillOpacity={dim ? 0.2 : 0.85} stroke="currentColor"
                      strokeOpacity={isHover ? 0.9 : 0.4} strokeWidth={isHover ? 2 : 1}
                      className="text-foreground" />
                    {(isHover || isAdj) && (
                      <text y={-(n.r + 6)} textAnchor="middle" fontSize="11"
                        fill="currentColor" className="text-foreground font-medium pointer-events-none">
                        {n.name}
                      </text>
                    )}
                    <title>{n.name} ({n.type})</title>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {legendTypes.map((t) => {
            const count = entities.filter((e) => e.type === t).length;
            return (
              <div key={t} className="flex items-center gap-1.5 text-xs">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: typeHex(t) }} />
                <span className="text-muted-foreground">{t}</span>
                <span className="text-muted-foreground/60">({count})</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
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
