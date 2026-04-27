import { useMemo, useState } from "react";
import { useListEntities, useListRules } from "@workspace/api-client-react";
import { Network, Box, Activity, Link as LinkIcon, ChevronDown, ChevronRight, Lightbulb, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type EntityDoc = {
  color: string;
  border: string;
  bg: string;
  badge: string;
  icon: string;
  tagline: string;
  what: string;
  ideas: string[];
  properties: { name: string; type: string; note: string }[];
  designTip: string;
};

const ENTITY_DOCS: Record<string, EntityDoc> = {
  Item: {
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: "📦",
    tagline: "Physical or abstract objects that players hold, spend, trade, or collect.",
    what: "Items are the building blocks of your economy. They can be resources, cards, tokens, weapons, consumables, currencies, or any discrete object that exists in the game world.",
    ideas: [
      "Resources — Gold, Wood, Food, Energy, Victory Points",
      "Cards — Action Card, Event Card, Equipment Card",
      "Tokens — Health Token, Morale Marker, Influence Chip",
      "Equipment — Sword, Shield, Artifact, Relic",
      "Consumables — Potion, Scroll, Bomb, Ration",
      "Currencies — Coin, Credit, Barter Good, Trade Debt",
    ],
    properties: [
      { name: "quantity", type: "number", note: "How many exist at game start" },
      { name: "value", type: "number", note: "Trade or VP worth" },
      { name: "rarity", type: "enum", note: "common / uncommon / rare / legendary" },
      { name: "weight", type: "number", note: "Affects carrying capacity limits" },
      { name: "stackable", type: "boolean", note: "Can multiple occupy one space?" },
      { name: "tradeable", type: "boolean", note: "Can players exchange it?" },
    ],
    designTip:
      "Items with multiple uses (resource + weapon) create interesting decisions. Consider scarcity — how many copies enter the game and when?",
  },
  Faction: {
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: "⚔️",
    tagline: "Groups, teams, civilizations, or power blocs that compete or cooperate.",
    what: "Factions define the major players or forces in your game world. They can be player-controlled sides, AI groups, neutral powers, or abstract forces. Each faction typically has unique abilities, resources, and win conditions.",
    ideas: [
      "Civilizations — Roman Empire, Elven Kingdom, Space Federation",
      "Player Roles — Merchant Guild, Military Order, Shadow Syndicate",
      "AI Groups — Bandit Horde, Monster Clan, Rival Corporation",
      "Political Parties — Progressive Alliance, Conservative Council",
      "Species — Human Colony, Alien Hivemind, Robotic Collective",
      "Economic Classes — Nobility, Peasantry, Merchant Class",
    ],
    properties: [
      { name: "influence", type: "number", note: "Political/social power level" },
      { name: "military_strength", type: "number", note: "Combat capability" },
      { name: "treasury", type: "number", note: "Starting gold/resources" },
      { name: "morale", type: "number", note: "Affects action efficiency" },
      { name: "territory", type: "number", note: "Number of controlled zones" },
      { name: "diplomatic_stance", type: "enum", note: "aggressive / neutral / peaceful" },
    ],
    designTip:
      "Asymmetric factions (each with unique abilities) add deep replayability. Make sure each faction has a clear strategic identity that feels distinct from others.",
  },
  Location: {
    color: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    badge: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: "🗺️",
    tagline: "Spaces, zones, regions, tiles, or places players move through or control.",
    what: "Locations form the physical or abstract map of your game. They define where actions happen, what resources are available, how movement works, and what areas are worth controlling.",
    ideas: [
      "Tiles — Forest, Mountain, Desert, Ocean, Plains",
      "Zones — Market District, Industrial Quarter, Residential Area",
      "Regions — Northern Wastes, Trade Route, Neutral Territory",
      "Structures — Castle, Outpost, Factory, Space Station",
      "Abstract Spaces — Supply Chain Node, Political Seat, Trade Hub",
      "Dungeons — Dungeon Room, Treasure Vault, Boss Chamber",
    ],
    properties: [
      { name: "terrain_type", type: "enum", note: "forest / plains / water / mountain / urban" },
      { name: "capacity", type: "number", note: "Max units / players that can occupy" },
      { name: "resource_yield", type: "number", note: "Resources produced per turn" },
      { name: "defense_bonus", type: "number", note: "Combat modifier for occupants" },
      { name: "movement_cost", type: "number", note: "Action points to enter" },
      { name: "connected_to", type: "string", note: "Adjacent location names" },
    ],
    designTip:
      "Locations create the stage for conflict. Consider adjacency (which locations connect?), control value (what do you gain by holding it?), and chokepoints (high-value bottlenecks that generate tension).",
  },
  Event: {
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: "⚡",
    tagline: "Triggers, incidents, crises, or opportunities that shake up the game state.",
    what: "Events introduce dynamic change and narrative tension. They can be random occurrences, player-triggered effects, scheduled milestones, or reactive consequences that alter the board state in meaningful ways.",
    ideas: [
      "Disasters — Plague, Famine, Earthquake, Economic Crash",
      "Opportunities — Trade Boom, Harvest Festival, Alliance Offer",
      "Triggers — War Declaration, Regime Change, Discovery",
      "Season Events — Winter Supply Shortage, Summer Harvest, Storm Season",
      "Political Events — Election, Revolt, Treaty, Betrayal",
      "Random Events — Bandit Raid, Magical Anomaly, Supply Drop",
    ],
    properties: [
      { name: "frequency", type: "enum", note: "once / rare / common / every_round" },
      { name: "severity", type: "number", note: "1–10 scale of impact" },
      { name: "duration", type: "number", note: "Rounds the effect lasts" },
      { name: "affects", type: "enum", note: "all_players / active_player / specific_faction" },
      { name: "trigger_condition", type: "string", note: "What causes this event to fire" },
      { name: "reversible", type: "boolean", note: "Can players undo the effect?" },
    ],
    designTip:
      "Events should feel meaningful but not arbitrary. The best events create interesting decisions (respond or ignore?), shift power dynamics temporarily, and give losing players a path back into the game.",
  },
};

const ENTITY_TYPES = ["Item", "Faction", "Location", "Event"] as const;
type EntityType = typeof ENTITY_TYPES[number];

function typeBadge(type: string) {
  const doc = ENTITY_DOCS[type as EntityType];
  return doc?.badge ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function EntityTypeReference({ type }: { type: EntityType }) {
  const doc = ENTITY_DOCS[type];
  const [open, setOpen] = useState(false);

  return (
    <Card className={`border ${doc.border} ${doc.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-black/10 transition-colors"
        data-testid={`entity-doc-toggle-${type.toLowerCase()}`}
      >
        <span className="text-2xl shrink-0" aria-hidden>{doc.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold ${doc.color}`}>{type}</h3>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${doc.badge}`}>Reference</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.tagline}</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-4 text-sm">
          <p className="text-foreground/90 leading-relaxed">{doc.what}</p>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Examples & ideas</h4>
            <ul className="grid sm:grid-cols-2 gap-1.5">
              {doc.ideas.map((idea, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className={`shrink-0 ${doc.color} mt-0.5`}>›</span>
                  <span className="text-foreground/80">{idea}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Suggested properties</h4>
            <div className="space-y-1">
              {doc.properties.map((p, i) => (
                <div key={i} className="grid grid-cols-[120px_70px_1fr] gap-3 text-xs">
                  <code className="font-mono text-foreground/90">{p.name}</code>
                  <span className="text-muted-foreground italic">{p.type}</span>
                  <span className="text-muted-foreground">{p.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3" /> Design tip
            </h4>
            <p className="text-xs text-amber-100/90 leading-relaxed">{doc.designTip}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

export function Ontology({ projectId }: { projectId: number }) {
  const { data: entities, isLoading: entLoading } = useListEntities(projectId);
  const { data: rules, isLoading: rulesLoading } = useListRules(projectId);

  const groupedEntities = useMemo(() => {
    if (!entities) return {};
    const out: Record<string, typeof entities> = {};
    for (const e of entities) {
      const key = e.type || "other";
      if (!out[key]) out[key] = [];
      out[key].push(e);
    }
    return out;
  }, [entities]);

  const links = useMemo(() => {
    if (!rules || !entities) return [];
    const found: { rule: typeof rules[number]; entities: typeof entities }[] = [];
    for (const r of rules) {
      const text = (r.title + " " + (r.content || "")).toLowerCase();
      const linked = entities.filter(
        (e) => text.includes(e.name.toLowerCase()) && e.name.length > 2,
      );
      if (linked.length) found.push({ rule: r, entities: linked });
    }
    return found;
  }, [rules, entities]);

  return (
    <div className="space-y-8 max-w-6xl pb-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" /> Ontology
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          A bird's-eye view of how your entities and rules connect, plus reference material on what each entity type is for.
        </p>
      </div>

      {/* Entity-type reference */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Entity-type reference
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Click any type below to see what it's for, example entities, suggested properties, and a design tip.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ENTITY_TYPES.map((t) => (
            <EntityTypeReference key={t} type={t} />
          ))}
        </div>
      </section>

      {/* Live ontology */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Your project's ontology
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Box className="h-4 w-4" /> Entity taxonomy
              </CardTitle>
              <CardDescription>Grouped by kind.</CardDescription>
            </CardHeader>
            <CardContent>
              {entLoading ? (
                <Skeleton className="h-40" />
              ) : !entities?.length ? (
                <p className="text-sm text-muted-foreground">No entities yet.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedEntities).map(([kind, ents]) => {
                    const badge = typeBadge(kind);
                    return (
                      <div key={kind}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge}`}>{kind}</span>
                          <span className="text-xs text-muted-foreground">{ents.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ents.map((e) => (
                            <Badge
                              key={e.id}
                              variant="outline"
                              className="text-xs bg-primary/10 border-primary/20 text-primary"
                            >
                              {e.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="h-4 w-4" /> Rule ↔ Entity links
              </CardTitle>
              <CardDescription>Rules that mention entities by name.</CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <Skeleton className="h-40" />
              ) : !links.length ? (
                <p className="text-sm text-muted-foreground">
                  No detected links yet. Reference entity names in rules to populate.
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {links.map(({ rule, entities }) => (
                    <div key={rule.id} className="border-l-2 border-primary/40 pl-3 py-1">
                      <div className="font-medium text-sm">{rule.title}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entities.map((e) => (
                          <span
                            key={e.id}
                            className="text-[10px] bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded"
                          >
                            {e.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Coverage stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Coverage stats
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Entity types" value={Object.keys(groupedEntities).length} />
          <Stat label="Total entities" value={entities?.length ?? 0} />
          <Stat label="Total rules" value={rules?.length ?? 0} />
          <Stat label="Linked rules" value={links.length} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
