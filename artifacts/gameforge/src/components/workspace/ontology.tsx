import { useMemo, useState } from "react";
import {
  useListEntities,
  useListRules,
  useListProjectEntityProperties,
  type Entity,
  type Rule,
  type EntityProperty,
} from "@workspace/api-client-react";
import {
  Network, Box, Activity, Link as LinkIcon, ChevronDown, ChevronRight,
  Lightbulb, BookOpen, AlertTriangle, GitBranch, Table as TableIcon,
  Layers, ArrowRight, Search, Sparkles, Library,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════════
// Component type system — 12 canonical types in two groups
// ════════════════════════════════════════════════════════════════════════════
type ComponentDoc = {
  color: string;
  border: string;
  bg: string;
  badge: string;
  hex: string;
  icon: string;
  tagline: string;
  what: string;
  ideas: string[];
  properties: { name: string; type: string; note: string }[];
  designTip: string;
};

const PHYSICAL_TYPES = ["Card", "Deck", "Token", "Die", "Tile", "Meeple", "Board"] as const;
const WORLD_TYPES = ["Location", "Faction", "Event", "Resource", "Ability"] as const;
const ALL_COMPONENT_TYPES = [...PHYSICAL_TYPES, ...WORLD_TYPES] as const;
type ComponentType = typeof ALL_COMPONENT_TYPES[number];

const COMPONENT_DOCS: Record<ComponentType, ComponentDoc> = {
  Card: {
    color: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-500/5",
    badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    hex: "#7c3aed",
    icon: "🃏",
    tagline: "Individual playable cards drawn from a hand or deck.",
    what: "Cards are the primary interaction medium in card-driven games. Each card is a discrete unit of choice — playing, holding, or discarding it creates tension, planning, and hand management decisions. The composition of your hand at any moment defines your options.",
    ideas: [
      "Action Card — Play for an immediate effect or bonus",
      "Item Card — Equip for persistent stat boosts",
      "Spell Card — One-time powerful effect, often costly",
      "Encounter Card — Drawn from a deck, reactive surprise",
      "Quest Card — Long-term objective with staged rewards",
      "Treasure Card — Loot with varying rarity and effects",
      "Attack / Defense Card — Played in combat as reactions",
    ],
    properties: [
      { name: "cost", type: "number", note: "Resources or action points to play this card" },
      { name: "power", type: "number", note: "Offensive value in combat resolution" },
      { name: "defense", type: "number", note: "Damage mitigation when played defensively" },
      { name: "effect_type", type: "enum", note: "buff / debuff / damage / heal / draw / discard" },
      { name: "trigger", type: "string", note: "Condition under which the effect fires" },
      { name: "rarity", type: "enum", note: "common / uncommon / rare / legendary" },
      { name: "hand_cost", type: "number", note: "Additional cards discarded to play this" },
    ],
    designTip:
      "Cards with dual modes (play for effect A or discard for effect B) multiply decisions without adding rules complexity. Control how many copies exist per deck — scarcity drives tension.",
  },
  Deck: {
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/5",
    badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    hex: "#4f46e5",
    icon: "📦",
    tagline: "An ordered or shuffled collection of cards players draw from.",
    what: "Decks are the supply source for card interactions. They create uncertainty (what's coming next?), pacing, and depletion tension. A thinning deck or a freshly shuffled one each produce distinct strategic feelings — the state of the deck IS information.",
    ideas: [
      "Action Deck — Core decision cards for the active player",
      "Event Deck — World events triggered each round",
      "Encounter Deck — Enemies or challenges drawn on entry",
      "Spell / Magic Deck — Drawn by caster characters only",
      "Loot Deck — Rewards drawn after clearing a room",
      "Market Deck — Purchasable upgrades available each turn",
    ],
    properties: [
      { name: "size", type: "number", note: "Total cards at game start" },
      { name: "cards_per_draw", type: "number", note: "Cards drawn per action" },
      { name: "shuffle_when_empty", type: "boolean", note: "Reshuffle discard pile to refill?" },
      { name: "shared", type: "boolean", note: "One deck for all vs. per-player deck?" },
      { name: "visible_top", type: "boolean", note: "Top card visible to all players?" },
      { name: "discard_visible", type: "boolean", note: "Discard pile face-up and inspectable?" },
    ],
    designTip:
      "Deck thickness controls information density. Thin decks (10–15 cards) cycle fast and feel predictable — ideal for engine-builders. Thick decks (40+) feel like a lottery — right for randomness-heavy themes.",
  },
  Token: {
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    hex: "#d97706",
    icon: "🪙",
    tagline: "Physical markers tracking resources, status, or quantities on the board.",
    what: "Tokens are the economy's heartbeat — they track health, currency, influence, and any countable game state. The act of gaining and losing tokens is often the most tactile and satisfying core loop. Supply scarcity (running out of tokens) creates natural hard limits.",
    ideas: [
      "Health / Hit Points — Damage tracker per unit",
      "Gold / Coin — Spend on actions or purchases",
      "Victory Points — Accumulate for end-game scoring",
      "Status Marker — Poisoned, Burning, Stunned",
      "Influence Chip — Political or social power",
      "Food / Supply — Upkeep consumed each round",
      "Action Token — Placed to mark a used action",
    ],
    properties: [
      { name: "quantity", type: "number", note: "Total supply in the game box" },
      { name: "max_stack", type: "number", note: "Max per player or per space" },
      { name: "per_player", type: "boolean", note: "Each player has own supply?" },
      { name: "tradeable", type: "boolean", note: "Can players exchange freely?" },
      { name: "stackable", type: "boolean", note: "Can multiples share one space?" },
      { name: "value", type: "number", note: "Point or trade value per token" },
    ],
    designTip:
      "Keep tokens physically distinct — different shapes or colors prevent confusion during high-tension plays. Soft caps (max 10 gold) create interesting spend pressure before the cap hits.",
  },
  Die: {
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
    hex: "#dc2626",
    icon: "🎲",
    tagline: "Randomizers that introduce variance and drama into key decisions.",
    what: "Dice add drama and tension. The best dice mechanics give players agency over the result — rerolls, modifiers, or choosing which result to apply — so luck feels like something you can influence, not something that simply happens to you.",
    ideas: [
      "Combat Die — Determines hit and damage in battles",
      "Action Die — Selected each round to power specific moves",
      "Event Die — Triggers random world events on a roll",
      "Skill Die — Rolled against a difficulty threshold",
      "Custom Symbol Die — Symbols mapped to unique effects",
      "Fate Die — Modifies luck or narrative outcome",
    ],
    properties: [
      { name: "faces", type: "number", note: "Number of sides (d4, d6, d8, d12, d20…)" },
      { name: "modifier", type: "number", note: "Flat bonus added to every roll result" },
      { name: "reroll_count", type: "number", note: "How many rerolls are allowed per use" },
      { name: "custom_faces", type: "string", note: "Comma-separated face values or symbols" },
      { name: "exploding", type: "boolean", note: "Max roll triggers an additional roll?" },
      { name: "pool_size", type: "number", note: "How many of this die roll simultaneously" },
    ],
    designTip:
      "Mitigation beats elimination. Give players 1–2 rerolls or ±modifiers so dice feel fair without removing variance. Pure luck frustrates; managed luck thrills.",
  },
  Tile: {
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    hex: "#059669",
    icon: "🗺️",
    tagline: "Modular board pieces that define terrain, layout, and spatial relationships.",
    what: "Tiles build the physical map. They define where actions happen, movement costs, adjacency rules, and which areas are accessible or contested. Modular tiles let you change the layout between sessions, multiplying replayability without new content.",
    ideas: [
      "Dungeon Room — Revealed as players explore inward",
      "Hex Terrain — Forest, Mountain, Plains, Water, Desert",
      "Map Segment — Locks into a larger puzzle layout",
      "Starting Tile — Fixed anchor for the board setup",
      "Corridor — Single-path connector between rooms",
      "Outdoor Region — Open areas with resource nodes",
    ],
    properties: [
      { name: "terrain_type", type: "enum", note: "forest / plains / water / mountain / urban / void" },
      { name: "movement_cost", type: "number", note: "Action points required to enter" },
      { name: "defense_bonus", type: "number", note: "Combat modifier added to occupant defense" },
      { name: "passable", type: "boolean", note: "Can units move through this tile?" },
      { name: "resource_yield", type: "number", note: "Resources produced per turn while occupied" },
      { name: "vision_range", type: "number", note: "Tiles visible from this position" },
      { name: "face_down", type: "boolean", note: "Starts hidden until a player explores it?" },
    ],
    designTip:
      "Two or three terrain types are usually enough. Every additional type needs a distinct strategic purpose — otherwise it's visual noise. Chokepoints (1-tile corridors) are where the best tension lives.",
  },
  Meeple: {
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    hex: "#2563eb",
    icon: "🧩",
    tagline: "Player pawns, figures, or standees that occupy spaces and represent presence.",
    what: "Meeples define physical presence on the board. Where your meeple is determines what actions you can take, what you control, and what threatens you. Meeples turn the board into a contest of positioning and blocking.",
    ideas: [
      "Player Pawn — One per player, tracks position",
      "Worker — Placed to lock in an action (worker placement)",
      "Unit Figure — Military or exploration unit",
      "Ship / Vehicle — Transport or naval unit",
      "Creature Standee — Monster or NPC on the board",
      "Merchant — Trade-route unit that follows paths",
    ],
    properties: [
      { name: "movement", type: "number", note: "Spaces moved per movement action" },
      { name: "health", type: "number", note: "Hit points before removed from board" },
      { name: "attack", type: "number", note: "Damage dealt per combat exchange" },
      { name: "defense", type: "number", note: "Damage reduced per incoming hit" },
      { name: "unit_type", type: "enum", note: "infantry / cavalry / ranged / naval / aerial" },
      { name: "per_player", type: "boolean", note: "Each player has one? Or shared pool?" },
      { name: "blocking", type: "boolean", note: "Does it block passage for other meeples?" },
    ],
    designTip:
      "Area control is more interesting when meeples can be captured but not permanently destroyed — capture mechanics create tension without player elimination. Give each meeple type a clear strategic niche.",
  },
  Board: {
    color: "text-slate-400",
    border: "border-slate-500/30",
    bg: "bg-slate-500/5",
    badge: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    hex: "#64748b",
    icon: "📋",
    tagline: "The main playing surface — the shared stage where all action takes place.",
    what: "The board is the common space all players reference and contest. It defines the macro layout, spatial rules, progress tracks, and often the win-condition display. A well-designed board communicates the entire game state at a glance from across the table.",
    ideas: [
      "Main Board — Shared world map or primary action space",
      "Player Board — Individual dashboard and component storage",
      "Reference Sheet — Quick-rules summary (non-interactive)",
      "Score Track — Victory point display around the perimeter",
      "Market Board — Shared shop available each round",
      "Combat Grid — Battle arena for tactical skirmishes",
    ],
    properties: [
      { name: "zones", type: "number", note: "Number of distinct regions or action spaces" },
      { name: "shared", type: "boolean", note: "One board for all vs. each player has one" },
      { name: "player_count_scales", type: "boolean", note: "Board size adjusts for fewer players?" },
      { name: "double_sided", type: "boolean", note: "Alternate layout on the reverse face?" },
      { name: "track_length", type: "number", note: "Spaces on a progress or score track" },
    ],
    designTip:
      "Board real estate is expensive — every space needs a reason to exist. Score tracks and status zones should be legible from across the table. Test at minimum player count to confirm the board doesn't feel empty.",
  },
  Location: {
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    hex: "#0891b2",
    icon: "📍",
    tagline: "Named places, zones, or regions that entities occupy, visit, or control.",
    what: "Locations form the navigable world. They define where players can go, what resources or encounters await them there, and what's worth fighting over. Controlling key locations often drives victory conditions.",
    ideas: [
      "City — Trade hub with market and guild access",
      "Dungeon — Multi-room encounter zone",
      "Shop / Market — Purchase location for items",
      "Landmark — Special named site with unique rules",
      "Lair — Boss encounter or high-risk high-reward site",
      "Wilderness Region — Open-world exploration area",
      "Political Seat — Controls faction influence output",
    ],
    properties: [
      { name: "terrain_type", type: "enum", note: "forest / plains / water / mountain / urban" },
      { name: "capacity", type: "number", note: "Max units or players that can occupy" },
      { name: "resource_yield", type: "number", note: "Resources produced per turn while controlled" },
      { name: "defense_bonus", type: "number", note: "Combat modifier for occupying units" },
      { name: "movement_cost", type: "number", note: "Action points to enter" },
      { name: "connected_to", type: "string", note: "Adjacent location names, comma-separated" },
      { name: "control_value", type: "number", note: "Victory points for holding at game end" },
    ],
    designTip:
      "Chokepoints (1 connection in or out) generate the best tension. Make sure there's always somewhere worth going — dead-end locations with no yield go unvisited and waste board space.",
  },
  Faction: {
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    hex: "#9333ea",
    icon: "⚔️",
    tagline: "Groups, allegiances, or power blocs with shared goals and asymmetric abilities.",
    what: "Factions define the major players or forces. They provide identity, asymmetry, and social structure — who you align with, fight, trade with, or betray. Each faction should feel strategically distinct with a clear identity sentence.",
    ideas: [
      "Guild — Professional trade organization with market perks",
      "Tribe / Clan — Military-focused with combat bonuses",
      "Nation / Empire — Resource-rich with territorial goals",
      "Shadow Syndicate — Covert operations, spy mechanics",
      "Merchant Company — Economy and trade advantages",
      "Arcane Order — Magic and knowledge-based abilities",
      "Creature Hivemind — Alien or non-human logic set",
    ],
    properties: [
      { name: "influence", type: "number", note: "Political / social power" },
      { name: "military_strength", type: "number", note: "Combat capability rating" },
      { name: "treasury", type: "number", note: "Starting gold or resource pool" },
      { name: "morale", type: "number", note: "Efficiency modifier; falls under losses" },
      { name: "territory", type: "number", note: "Starting controlled zones" },
      { name: "diplomatic_stance", type: "enum", note: "aggressive / neutral / peaceful / isolationist" },
      { name: "unique_ability", type: "string", note: "Name of this faction's special rule" },
    ],
    designTip:
      "Asymmetric factions are the backbone of replayability. Each needs a one-sentence identity: 'The Guild wins by cornering the market; the Tribe wins by eliminating rivals.' If you can't say it in one sentence, the faction needs more focus.",
  },
  Event: {
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/5",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    hex: "#ea580c",
    icon: "⚡",
    tagline: "Triggered or random occurrences that disrupt and reshape the game state.",
    what: "Events introduce dynamic change and narrative tension. They can be random chaos, player-triggered effects, or scheduled milestones — either way they shake up the status quo and create memorable turning points in a session.",
    ideas: [
      "Natural Disaster — Plague, Earthquake, Famine",
      "Trade Boom — Bonus resources for specific locations",
      "Political Upheaval — Shift diplomatic stances",
      "Bandit Raid — Random threat hitting exposed players",
      "Season Change — Winter shortage, summer harvest",
      "Betrayal — One player activates a traitor mechanic",
      "Discovery — New tile or location revealed to all",
    ],
    properties: [
      { name: "frequency", type: "enum", note: "once / rare / uncommon / every_round" },
      { name: "severity", type: "number", note: "1–10 scale of board impact" },
      { name: "duration", type: "number", note: "Rounds the effect persists" },
      { name: "affects", type: "enum", note: "all_players / active_player / specific_faction / board" },
      { name: "trigger_condition", type: "string", note: "What causes this event to fire" },
      { name: "reversible", type: "boolean", note: "Can players undo the effect?" },
      { name: "chained", type: "boolean", note: "This event draws another event after resolving?" },
    ],
    designTip:
      "Events should never feel arbitrary. The best events create decisions (respond now or ignore?), shift power temporarily, and give trailing players a path back. Avoid events that punish whoever is already winning.",
  },
  Resource: {
    color: "text-teal-400",
    border: "border-teal-500/30",
    bg: "bg-teal-500/5",
    badge: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    hex: "#0d9488",
    icon: "💎",
    tagline: "Currency, materials, or consumables that fuel actions and purchases.",
    what: "Resources are the engine of your economy. Players collect, spend, and trade them to take actions, acquire components, and advance toward victory. The flow of resources should feel like a living system, not just a score counter.",
    ideas: [
      "Gold / Coin — Universal currency for purchasing",
      "Food / Supply — Upkeep cost per unit per round",
      "Wood / Stone — Construction material for buildings",
      "Mana / Energy — Fuel for spells or special abilities",
      "Influence — Social capital for political actions",
      "Research Points — Unlock technology or new abilities",
      "Trade Good — Commodity with variable exchange rates",
    ],
    properties: [
      { name: "quantity", type: "number", note: "Total supply across all players" },
      { name: "max_hold", type: "number", note: "Max a single player can hold at once" },
      { name: "per_turn_yield", type: "number", note: "Gained automatically each round" },
      { name: "tradeable", type: "boolean", note: "Can players exchange with each other?" },
      { name: "conversion_rate", type: "string", note: "Exchange ratio to other resources (e.g. 2:1)" },
      { name: "perishable", type: "boolean", note: "Lost if not spent by end of round?" },
    ],
    designTip:
      "A resource with no sink inflates until it's meaningless. For every resource, ensure there is at least one compelling way to spend it. Scarcity — not abundance — creates the interesting choices.",
  },
  Ability: {
    color: "text-pink-400",
    border: "border-pink-500/30",
    bg: "bg-pink-500/5",
    badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    hex: "#db2777",
    icon: "✨",
    tagline: "Special powers, skills, or triggered effects tied to characters or factions.",
    what: "Abilities define what makes a character, card, or faction feel unique. A great ability creates a distinctive playstyle rather than just adding raw numbers. It answers: 'What can I do that others cannot?'",
    ideas: [
      "Passive Ability — Always-on stat modifier or rule exception",
      "Active Skill — Player chooses exactly when to activate",
      "Triggered Effect — Fires automatically when condition met",
      "Ultimate — Powerful effect with a long cooldown",
      "Reaction — Fires in response to another player's action",
      "Aura — Affects adjacent units or entities passively",
      "Combo Ability — Requires another card or action to unlock",
    ],
    properties: [
      { name: "cost", type: "number", note: "Resources or action points to activate" },
      { name: "cooldown", type: "number", note: "Rounds before can activate again" },
      { name: "trigger_type", type: "enum", note: "active / passive / triggered / reaction / aura" },
      { name: "target", type: "enum", note: "self / ally / enemy / all / location" },
      { name: "effect_type", type: "enum", note: "buff / debuff / damage / heal / draw / move / summon" },
      { name: "duration", type: "number", note: "Rounds effect lasts (0 = instant)" },
      { name: "range", type: "number", note: "Tiles / spaces the ability can reach" },
    ],
    designTip:
      "Abilities should have clear trade-offs. A free always-on ability with no cost isn't memorable. The restriction IS the design — 'you can do this amazing thing, but only when X' creates the stories players remember.",
  },
};

const FALLBACK_HEX = "#7c3aed";

function typeBadge(type: string) {
  const doc = COMPONENT_DOCS[type as ComponentType];
  return doc?.badge ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function typeHex(type: string): string {
  return COMPONENT_DOCS[type as ComponentType]?.hex ?? FALLBACK_HEX;
}

// ════════════════════════════════════════════════════════════════════════════
// Property Glossary — canonical game-design property definitions
// ════════════════════════════════════════════════════════════════════════════
type GlossaryEntry = {
  name: string;
  dataType: "number" | "string" | "boolean" | "enum" | "text";
  appliesTo: ComponentType[];
  description: string;
  rulesInteraction: string;
  example: string;
};

const PROPERTY_GLOSSARY: GlossaryEntry[] = [
  {
    name: "cost",
    dataType: "number",
    appliesTo: ["Card", "Ability", "Resource", "Meeple"],
    description: "Resources or action points required to play, activate, or purchase this component.",
    rulesInteraction: "Referenced in spend rules: 'Pay {cost} gold to play this card.' Drives economy balance and limits per-turn burst power.",
    example: "cost: 3 — requires 3 gold to activate this ability.",
  },
  {
    name: "attack / power",
    dataType: "number",
    appliesTo: ["Card", "Meeple", "Faction", "Ability"],
    description: "The offensive stat used in combat — damage dealt when attacking another unit or player.",
    rulesInteraction: "Compared against the defender's defense stat. Often modified by terrain bonuses, status effects, or ability buffs from rules.",
    example: "attack: 5 — deals 5 damage before the defender's defense is applied.",
  },
  {
    name: "defense",
    dataType: "number",
    appliesTo: ["Card", "Meeple", "Tile", "Location", "Faction"],
    description: "Damage reduction or protection value. Subtracted from incoming attack before health loss is applied.",
    rulesInteraction: "Stacks with terrain: 'Effective defense = unit.defense + tile.defense_bonus.' Rules must specify whether defense is applied before or after special effects.",
    example: "defense: 2 — reduces all incoming damage by 2.",
  },
  {
    name: "health / hp",
    dataType: "number",
    appliesTo: ["Meeple", "Faction", "Card"],
    description: "Hit points before the component is removed, defeated, or destroyed.",
    rulesInteraction: "Depleted by attack damage, event severity, or ability effects. Restored by heal actions. Rules should address what happens when health reaches exactly 0 vs. goes negative.",
    example: "health: 10 — the unit is removed from the board when this reaches 0.",
  },
  {
    name: "movement",
    dataType: "number",
    appliesTo: ["Meeple", "Tile"],
    description: "Spaces or tiles a unit can traverse in a single move action.",
    rulesInteraction: "Modified by terrain movement_cost: 'A forest tile costs 2 movement to enter instead of 1.' Abilities and cards can extend or restrict this per turn.",
    example: "movement: 3 — unit may cross up to 3 standard (cost-1) tiles per action.",
  },
  {
    name: "range",
    dataType: "number",
    appliesTo: ["Card", "Ability", "Meeple"],
    description: "Tiles or spaces from which this component can target or affect other entities.",
    rulesInteraction: "Distance to target must be ≤ range. Rules must define whether terrain blocks line of sight and how distance is measured (Manhattan, Chebyshev, or path length).",
    example: "range: 2 — can target any unit within 2 tiles, regardless of walls.",
  },
  {
    name: "duration",
    dataType: "number",
    appliesTo: ["Ability", "Event", "Card"],
    description: "Number of rounds an effect persists before expiring automatically. 0 means instant (resolves this turn only).",
    rulesInteraction: "Decremented each round. Rules must specify exactly when it ticks (start vs. end of round) and what happens on expiry (the effect simply ends, or a new effect triggers).",
    example: "duration: 3 — the buff lasts for 3 rounds then fades without further action.",
  },
  {
    name: "cooldown",
    dataType: "number",
    appliesTo: ["Ability", "Card", "Die"],
    description: "Rounds that must pass before this ability or card can be activated again after use.",
    rulesInteraction: "Track with an exhausted marker or counter on the card. Rules must specify whether cooldown starts counting immediately or on the following round.",
    example: "cooldown: 2 — after activating, must wait 2 full rounds before using again.",
  },
  {
    name: "rarity",
    dataType: "enum",
    appliesTo: ["Card", "Token", "Resource"],
    description: "Distribution tier — how frequently this component appears. Drives perceived value and draft/deck strategy.",
    rulesInteraction: "Often determines inclusion limits: 'You may have at most 1 legendary card per deck.' Rarer components are expected to be proportionally more impactful.",
    example: "rarity: legendary — only 1 copy exists in the entire game box.",
  },
  {
    name: "quantity",
    dataType: "number",
    appliesTo: ["Token", "Resource", "Card"],
    description: "Total copies of this component available across the entire game. A hard scarcity ceiling.",
    rulesInteraction: "When the supply is depleted, no more can be gained. Rules must address what happens when someone tries to take more than is available.",
    example: "quantity: 24 — only 24 gold tokens exist. Once taken, others must wait for someone to spend.",
  },
  {
    name: "terrain_type",
    dataType: "enum",
    appliesTo: ["Tile", "Location"],
    description: "The surface or environmental type, affecting movement cost, combat bonuses, and available actions.",
    rulesInteraction: "Cross-referenced in movement rules ('entering forest costs 2 movement') and combat rules ('mountains grant +1 defense to defenders').",
    example: "terrain_type: mountain — costs 2 movement to enter, grants +2 defense to occupants.",
  },
  {
    name: "resource_yield",
    dataType: "number",
    appliesTo: ["Location", "Tile", "Resource"],
    description: "Resources produced per turn when a player occupies or controls this component.",
    rulesInteraction: "Triggers during the income phase: 'Each player collects resource_yield from each controlled location.' Multiple locations stack.",
    example: "resource_yield: 2 — controlling this location produces 2 gold per round.",
  },
  {
    name: "capacity",
    dataType: "number",
    appliesTo: ["Location", "Deck", "Board"],
    description: "Maximum number of units, tokens, or cards that can occupy this component simultaneously.",
    rulesInteraction: "Enforced during placement: 'You may not move a unit into a location at its capacity.' Creates natural chokepoints and bottleneck tension.",
    example: "capacity: 3 — no more than 3 units from any combination of players may occupy this location.",
  },
  {
    name: "connected_to",
    dataType: "string",
    appliesTo: ["Location", "Tile"],
    description: "Comma-separated list of adjacent locations reachable in a single move without passing through other named locations.",
    rulesInteraction: "Defines the movement graph. Rules must specify whether adjacency is undirected (bidirectional) or directed (one-way passage only).",
    example: "connected_to: 'Dark Forest, Mountain Pass' — units may move freely to either neighbor.",
  },
  {
    name: "trigger_condition",
    dataType: "string",
    appliesTo: ["Event", "Ability", "Card"],
    description: "The game-state condition that must be true for this effect to activate automatically.",
    rulesInteraction: "Evaluated at specific timing windows defined in the rules (start of round, on attack, when a threshold is crossed). Multiple triggers on the same timing window resolve in declared order.",
    example: "trigger_condition: 'when any player reaches 10 VP' — fires the event at that scoring milestone.",
  },
  {
    name: "frequency",
    dataType: "enum",
    appliesTo: ["Event"],
    description: "How often this event occurs: once (single-use), rare (~25% per round), uncommon (~50%), or every_round.",
    rulesInteraction: "Determines event deck composition. A 'rare' event would appear 1–2 times in a 60-card deck. Higher frequency events should have lower severity to avoid oppressive patterns.",
    example: "frequency: rare — drawn roughly once every 4 rounds on average.",
  },
  {
    name: "severity",
    dataType: "number",
    appliesTo: ["Event"],
    description: "1–10 scale of how impactful an event is on the board state or player resources.",
    rulesInteraction: "High-severity events may trigger mandatory response rules: 'If severity ≥ 8, all players must sacrifice 1 unit immediately.' Low-severity events are background noise.",
    example: "severity: 7 — a major disruption; all players lose 2 resources immediately.",
  },
  {
    name: "diplomatic_stance",
    dataType: "enum",
    appliesTo: ["Faction"],
    description: "The faction's default relationship posture: aggressive, neutral, peaceful, or isolationist.",
    rulesInteraction: "Determines NPC/AI behavior. Affects trade rates, attack thresholds, and alliance availability as defined in faction interaction rules.",
    example: "diplomatic_stance: aggressive — this faction attacks adjacent players whenever able each round.",
  },
  {
    name: "influence",
    dataType: "number",
    appliesTo: ["Faction", "Location", "Resource"],
    description: "Social, political, or cultural power used for non-military control, negotiation, and special actions.",
    rulesInteraction: "Compared in political resolution: 'Player with highest influence wins the election.' May decay if not actively maintained through actions or events.",
    example: "influence: 5 — faction starts with moderate political standing in the council.",
  },
  {
    name: "tradeable",
    dataType: "boolean",
    appliesTo: ["Resource", "Token", "Card"],
    description: "Whether players may freely exchange this component with each other during designated trading phases.",
    rulesInteraction: "Non-tradeable resources prevent snowball trading. Rules must define when trading windows open and whether trades require both parties to agree.",
    example: "tradeable: true — players may negotiate and freely exchange this resource on their turn.",
  },
  {
    name: "effect_type",
    dataType: "enum",
    appliesTo: ["Card", "Ability"],
    description: "The category of gameplay effect produced: buff, debuff, damage, heal, draw, discard, move, or summon.",
    rulesInteraction: "Used to limit combinations: 'You may play at most 1 damage card per turn.' Also drives UI categorization and priority ordering when effects resolve simultaneously.",
    example: "effect_type: buff — temporarily increases an ally's attack or defense for the duration.",
  },
  {
    name: "victory_points",
    dataType: "number",
    appliesTo: ["Token", "Location", "Card", "Faction"],
    description: "Score value contributed to a player's final score when end-game conditions are triggered.",
    rulesInteraction: "Summed in the scoring phase. May be conditional: 'Score 1 VP per unit in your territory.' The scoring phase rules must enumerate every VP source to prevent disputes.",
    example: "victory_points: 3 — controlling this location at game end is worth 3 points.",
  },
  {
    name: "per_player",
    dataType: "boolean",
    appliesTo: ["Token", "Board", "Meeple"],
    description: "Whether each player has their own independent copy (true) or all players share one pool (false).",
    rulesInteraction: "Shared components create indirect conflict and contention. Per-player components simplify bookkeeping but increase component count and cost.",
    example: "per_player: true — each player has their own token supply; players cannot see each other's counts.",
  },
  {
    name: "defense_bonus",
    dataType: "number",
    appliesTo: ["Location", "Tile"],
    description: "Combat modifier added to units occupying this space when defending against attacks.",
    rulesInteraction: "Added to the unit's base defense during combat resolution: 'Effective defense = unit.defense + tile.defense_bonus.' Rules should cap maximum effective defense.",
    example: "defense_bonus: 2 — all units occupying this tile gain +2 defense against any attack.",
  },
  {
    name: "perishable",
    dataType: "boolean",
    appliesTo: ["Resource", "Token"],
    description: "Whether unused quantities of this resource are discarded at the end of the round rather than carried over.",
    rulesInteraction: "Creates urgent spend pressure. Rules must define exactly when the discard check occurs (end of active player's turn vs. end of full round) and whether players can convert perishables to non-perishables.",
    example: "perishable: true — unspent food tokens are discarded at end of round.",
  },
  {
    name: "shared",
    dataType: "boolean",
    appliesTo: ["Deck", "Board"],
    description: "Whether all players draw from or interact with the same single component, vs. each having their own private version.",
    rulesInteraction: "Shared decks create race dynamics (take the good cards before others). Private decks isolate strategy. Rules must specify interaction rules when shared components become contested.",
    example: "shared: true — all players draw from the same encounter deck; its depletion affects everyone.",
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Smart linker — word-boundary, case-insensitive matching with min name length.
// ════════════════════════════════════════════════════════════════════════════
type EntityProp = EntityProperty;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type LinkMaps = {
  entityToRules: Map<number, Set<number>>;
  ruleToEntities: Map<number, Set<number>>;
};

function buildLinks(entities: Entity[], rules: Rule[]): LinkMaps {
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
// Component type reference card (collapsible)
// ════════════════════════════════════════════════════════════════════════════
function ComponentTypeReference({ type }: { type: ComponentType }) {
  const doc = COMPONENT_DOCS[type];
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
                <div key={i} className="grid grid-cols-[130px_60px_1fr] gap-3 text-xs">
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

// ════════════════════════════════════════════════════════════════════════════
// Property Glossary — searchable static reference
// ════════════════════════════════════════════════════════════════════════════
function PropertyGlossary() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PROPERTY_GLOSSARY;
    return PROPERTY_GLOSSARY.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.dataType.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.appliesTo.some((t) => t.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Library className="h-4 w-4" /> Property glossary
          <Badge variant="outline" className="text-[10px] ml-1">{PROPERTY_GLOSSARY.length} properties</Badge>
        </CardTitle>
        <CardDescription>
          Canonical definitions for common game-design properties — what they mean, which component types use them, and how they tie to your rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, data type, or component type…"
            className="bg-input h-8 text-xs pl-8"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic p-2">No properties match that search.</p>
        ) : (
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filtered.map((entry) => (
              <div
                key={entry.name}
                className="rounded-md border border-border/60 bg-background/30 p-3 space-y-2"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <code className="text-sm font-mono font-bold text-white">{entry.name}</code>
                  <Badge variant="outline" className="text-[10px] font-mono bg-secondary/30 shrink-0">
                    {entry.dataType}
                  </Badge>
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {entry.appliesTo.map((t) => (
                      <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadge(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{entry.description}</p>
                <div className="rounded bg-primary/5 border border-primary/10 px-2.5 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">Rules tie-in — </span>
                  <span className="text-xs text-foreground/70">{entry.rulesInteraction}</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic">{entry.example}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Coverage gaps — orphan entities + abstract rules
// ════════════════════════════════════════════════════════════════════════════
function CoverageGaps({
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
                  onClick={() => onJump("entities")}
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

function EntityGraph({
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
                    onClick={() => onJump("entities")}
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
// Entity browser — sortable, filterable table
// ════════════════════════════════════════════════════════════════════════════
type SortKey = "name" | "type" | "props" | "rules";

function EntityBrowser({
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
                onClick={() => onJump("entities")}
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
function PropertyDictionary({
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
function RuleEntityLinks({
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

// ════════════════════════════════════════════════════════════════════════════
// Top-level Ontology
// ════════════════════════════════════════════════════════════════════════════
export function Ontology({
  projectId, onJump,
}: {
  projectId: number;
  onJump?: (tab: string) => void;
}) {
  const { data: entities, isLoading: entLoading } = useListEntities(projectId);
  const { data: rules, isLoading: rulesLoading } = useListRules(projectId);
  const { data: properties } = useListProjectEntityProperties(projectId);

  const ents = entities ?? [];
  const rls = rules ?? [];
  const props = properties ?? [];
  const goTo = onJump ?? (() => {});

  const links = useMemo(() => buildLinks(ents, rls), [ents, rls]);

  const propsByEntity = useMemo(() => {
    const m = new Map<number, EntityProp[]>();
    for (const p of props) {
      const arr = m.get(p.entityId) ?? [];
      arr.push(p);
      m.set(p.entityId, arr);
    }
    return m;
  }, [props]);

  const groupedEntities = useMemo(() => {
    const out: Record<string, Entity[]> = {};
    for (const e of ents) {
      const key = e.type || "other";
      if (!out[key]) out[key] = [];
      out[key].push(e);
    }
    return out;
  }, [ents]);

  const isLoading = entLoading || rulesLoading;

  return (
    <div className="space-y-8 max-w-6xl pb-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" /> Ontology
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          A bird's-eye view of how your components and rules connect — surface gaps, explore your design system, and find inconsistencies before playtesting.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          {/* 1. Coverage gaps */}
          <section>
            <CoverageGaps entities={ents} rules={rls} links={links} onJump={goTo} />
          </section>

          {/* 2. Visual graph */}
          <section>
            <EntityGraph entities={ents} links={links} onJump={goTo} />
          </section>

          {/* 3. Component browser */}
          <section>
            <EntityBrowser entities={ents} links={links} propsByEntity={propsByEntity} onJump={goTo} />
          </section>

          {/* 4. Live property dictionary + rule links side by side */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Connections
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Box className="h-4 w-4" /> Component taxonomy
                  </CardTitle>
                  <CardDescription>Grouped by type.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!ents.length ? (
                    <p className="text-sm text-muted-foreground">No components yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedEntities).map(([kind, list]) => (
                        <div key={kind}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeBadge(kind)}`}>{kind}</span>
                            <span className="text-xs text-muted-foreground">{list.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {list.map((e) => (
                              <Badge
                                key={e.id}
                                variant="outline"
                                className="text-xs bg-primary/10 border-primary/20 text-primary cursor-pointer hover:bg-primary/20"
                                onClick={() => goTo("entities")}
                              >
                                {e.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <RuleEntityLinks rules={rls} entities={ents} links={links} />
            </div>
          </section>

          {/* 5. Live property dictionary */}
          <section>
            <PropertyDictionary entities={ents} properties={props} />
          </section>

          {/* 6. Property Glossary — static canonical reference */}
          <section>
            <PropertyGlossary />
          </section>

          {/* 7. Coverage stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" /> Coverage stats
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Component types" value={Object.keys(groupedEntities).length} />
              <Stat label="Total components" value={ents.length} />
              <Stat label="Total rules" value={rls.length} />
              <Stat label="Linked rules" value={rls.length - rls.filter((r) => (links.ruleToEntities.get(r.id)?.size ?? 0) === 0).length} />
              <Stat label="Properties" value={props.length} />
            </CardContent>
          </Card>

          {/* 8. Component-type reference — Physical */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Component-type reference
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              What each type is for, design examples, suggested properties, and a design tip. Click any card to expand.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2 pl-1">
                  Physical components — the tangible pieces of your game
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PHYSICAL_TYPES.map((t) => (
                    <ComponentTypeReference key={t} type={t} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2 pl-1 mt-4">
                  World components — the living system your game takes place in
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {WORLD_TYPES.map((t) => (
                    <ComponentTypeReference key={t} type={t} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
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
