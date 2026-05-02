import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3-force";
import { type Player } from "@workspace/api-client-react";
import { PLAYER_TYPE_COLORS } from "@/lib/player-colors";

interface Relationship { targetPlayerId: number; relationshipType: string; }

function castRelationships(raw: unknown): Relationship[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => {
    if (!r || typeof r !== "object") return false;
    const x = r as Record<string, unknown>;
    return typeof x["targetPlayerId"] === "number" && typeof x["relationshipType"] === "string";
  }).map((r) => r as Relationship);
}

const REL_COLORS: Record<string, string> = {
  Allied: "#4ade80",
  Enemy: "#f87171",
  Rival: "#fb923c",
  Mentor: "#60a5fa",
  Dependent: "#c084fc",
  Neutral: "#94a3b8",
};

function relColor(type: string) {
  return REL_COLORS[type] ?? "#94a3b8";
}

function nodeColor(playerType: string) {
  return PLAYER_TYPE_COLORS[playerType] ?? "#7c3aed";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  playerType: string;
}

// d3 resolves string|number link ids to node objects during simulation init.
// We use number ids here (matching GraphNode.id) so d3 can resolve them correctly.
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: number | GraphNode;
  target: number | GraphNode;
  label: string;
}

interface Props {
  players: Player[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// The graph intentionally shows the full cast topology regardless of any
// active search/type/faction filters in the roster list. This gives designers
// a complete network view of all player relationships at a glance.
export function PlayerRelationshipGraph({ players, selectedId, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store per-node circle/ring elements so selection can update them without
  // rebuilding the simulation.
  const nodeElsRef = useRef<Map<number, { circle: SVGCircleElement; ring: SVGCircleElement }>>(new Map());
  // Store a stable ref to selectedId so the selection-update effect can read
  // the latest value without triggering the simulation rebuild.
  const selectedIdRef = useRef<number | null>(selectedId);
  selectedIdRef.current = selectedId;

  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      playerType: (p.playerType as string) ?? "Character",
    }));

    const idSet = new Set(players.map((p) => p.id));
    const links: GraphLink[] = [];
    const seen = new Set<string>();

    for (const p of players) {
      const rels = castRelationships(p.relationships);
      for (const rel of rels) {
        if (!idSet.has(rel.targetPlayerId)) continue;
        const key = [Math.min(p.id, rel.targetPlayerId), Math.max(p.id, rel.targetPlayerId), rel.relationshipType].join(":");
        if (seen.has(key)) continue;
        seen.add(key);
        // Use numeric IDs — d3 resolves these to node objects during simulation init.
        links.push({ source: p.id, target: rel.targetPlayerId, label: rel.relationshipType });
      }
    }

    return { nodes, links };
  }, [players]);

  // ── Main simulation effect — only rebuilds when cast topology changes ──────
  // selectedId is intentionally excluded from deps; selection highlights are
  // updated in a separate effect below without restarting the simulation.
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const W = container.clientWidth || 400;
    const H = container.clientHeight || 400;

    svg.setAttribute("width", String(W));
    svg.setAttribute("height", String(H));
    svg.innerHTML = "";
    nodeElsRef.current.clear();

    if (nodes.length === 0) return;

    const ns = "http://www.w3.org/2000/svg";

    const defs = document.createElementNS(ns, "defs");
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", "arrow");
    marker.setAttribute("viewBox", "0 -5 10 10");
    marker.setAttribute("refX", "22");
    marker.setAttribute("refY", "0");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto");
    const arrowPath = document.createElementNS(ns, "path");
    arrowPath.setAttribute("d", "M0,-5L10,0L0,5");
    arrowPath.setAttribute("fill", "#475569");
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const g = document.createElementNS(ns, "g");
    svg.appendChild(g);

    const linkEls: SVGLineElement[] = [];
    const labelEls: SVGTextElement[] = [];

    for (const link of links) {
      const line = document.createElementNS(ns, "line") as SVGLineElement;
      line.setAttribute("stroke", relColor(link.label));
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-opacity", "0.6");
      line.setAttribute("marker-end", "url(#arrow)");
      g.appendChild(line);
      linkEls.push(line);

      const text = document.createElementNS(ns, "text") as SVGTextElement;
      text.setAttribute("font-size", "9");
      text.setAttribute("fill", relColor(link.label));
      text.setAttribute("fill-opacity", "0.8");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.textContent = link.label;
      g.appendChild(text);
      labelEls.push(text);
    }

    const nodeEls: Array<{ id: number; circle: SVGCircleElement; text: SVGTextElement; ring: SVGCircleElement; nameLabel: SVGTextElement }> = [];

    for (const node of nodes) {
      const color = nodeColor(node.playerType);
      const isSelected = node.id === selectedIdRef.current;

      const ring = document.createElementNS(ns, "circle") as SVGCircleElement;
      ring.setAttribute("r", "20");
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", color);
      ring.setAttribute("stroke-width", isSelected ? "2.5" : "0");
      ring.setAttribute("stroke-opacity", "0.8");
      g.appendChild(ring);

      const circle = document.createElementNS(ns, "circle") as SVGCircleElement;
      circle.setAttribute("r", "16");
      circle.setAttribute("fill", `${color}${isSelected ? "44" : "22"}`);
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", isSelected ? "2.5" : "1.5");
      circle.setAttribute("cursor", "pointer");
      g.appendChild(circle);

      const text = document.createElementNS(ns, "text") as SVGTextElement;
      text.setAttribute("font-size", "11");
      text.setAttribute("font-weight", "600");
      text.setAttribute("fill", color);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.setAttribute("pointer-events", "none");
      text.textContent = initials(node.name);
      g.appendChild(text);

      const nameLabel = document.createElementNS(ns, "text") as SVGTextElement;
      nameLabel.setAttribute("font-size", "9");
      nameLabel.setAttribute("fill", "#cbd5e1");
      nameLabel.setAttribute("text-anchor", "middle");
      nameLabel.setAttribute("dominant-baseline", "middle");
      nameLabel.setAttribute("pointer-events", "none");
      nameLabel.textContent = node.name.length > 14 ? node.name.slice(0, 13) + "…" : node.name;
      g.appendChild(nameLabel);

      circle.addEventListener("click", () => onSelect(node.id));
      circle.addEventListener("mouseenter", () => {
        circle.setAttribute("fill", `${color}44`);
      });
      circle.addEventListener("mouseleave", () => {
        const sel = selectedIdRef.current;
        circle.setAttribute("fill", `${color}${sel === node.id ? "44" : "22"}`);
      });

      nodeEls.push({ id: node.id, circle, text, ring, nameLabel });
      nodeElsRef.current.set(node.id, { circle, ring });
    }

    // Deep-clone node objects so the simulation doesn't mutate our memoised array.
    const simNodes: GraphNode[] = nodes.map((n) => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 + (Math.random() - 0.5) * 200,
    }));

    // Deep-clone link objects; d3 will resolve numeric source/target to node refs.
    const simLinks: GraphLink[] = links.map((l) => ({ ...l }));

    const sim = d3
      .forceSimulation<GraphNode>(simNodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(simLinks).id((d) => d.id).distance(120).strength(0.4))
      .force("charge", d3.forceManyBody<GraphNode>().strength(-280))
      .force("center", d3.forceCenter<GraphNode>(W / 2, H / 2))
      .force("collision", d3.forceCollide<GraphNode>(30))
      .alphaDecay(0.02);

    const R = 16;

    sim.on("tick", () => {
      simNodes.forEach((n) => {
        n.x = Math.max(R + 4, Math.min(W - R - 4, n.x ?? W / 2));
        n.y = Math.max(R + 18, Math.min(H - R - 4, n.y ?? H / 2));
      });

      simLinks.forEach((l, i) => {
        const src = l.source as GraphNode;
        const tgt = l.target as GraphNode;
        const line = linkEls[i]!;
        const lbl = labelEls[i]!;
        line.setAttribute("x1", String(src.x));
        line.setAttribute("y1", String(src.y));
        line.setAttribute("x2", String(tgt.x));
        line.setAttribute("y2", String(tgt.y));
        lbl.setAttribute("x", String(((src.x ?? 0) + (tgt.x ?? 0)) / 2));
        lbl.setAttribute("y", String(((src.y ?? 0) + (tgt.y ?? 0)) / 2 - 8));
      });

      simNodes.forEach((n, i) => {
        const { circle, text, ring, nameLabel } = nodeEls[i]!;
        circle.setAttribute("cx", String(n.x));
        circle.setAttribute("cy", String(n.y));
        text.setAttribute("x", String(n.x));
        text.setAttribute("y", String(n.y));
        ring.setAttribute("cx", String(n.x));
        ring.setAttribute("cy", String(n.y));
        nameLabel.setAttribute("x", String(n.x));
        nameLabel.setAttribute("y", String((n.y ?? 0) + 28));
      });
    });

    return () => { sim.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links]); // intentionally excludes selectedId — see selection effect below

  // ── Selection highlight effect — updates ring/fill without resetting sim ──
  useEffect(() => {
    nodeElsRef.current.forEach(({ circle, ring }, nodeId) => {
      const colorKey = nodes.find((n) => n.id === nodeId)?.playerType ?? "Character";
      const color = nodeColor(colorKey);
      const isSelected = nodeId === selectedId;
      ring.setAttribute("stroke-width", isSelected ? "2.5" : "0");
      circle.setAttribute("fill", `${color}${isSelected ? "44" : "22"}`);
      circle.setAttribute("stroke-width", isSelected ? "2.5" : "1.5");
    });
  }, [selectedId, nodes]);

  const hasRelationships = links.length > 0;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-card/20">
      <svg ref={svgRef} className="w-full h-full" />
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No characters yet</p>
        </div>
      )}
      {nodes.length > 0 && !hasRelationships && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <p className="text-[10px] text-muted-foreground bg-background/80 px-3 py-1 rounded-full border border-border">
            Open a character sheet and add relationships to see connections
          </p>
        </div>
      )}
    </div>
  );
}
