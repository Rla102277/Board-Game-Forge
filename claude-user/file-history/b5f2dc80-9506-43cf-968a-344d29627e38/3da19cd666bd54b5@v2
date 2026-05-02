import type { ComponentType } from "@/lib/game-component-types";

export interface StatRange {
  name: string;
  min: number;
  max: number;
  step?: number;
  description?: string;
}

export interface EntityTemplate {
  id: string;
  name: string;
  entityType: ComponentType;
  subtype?: string;
  icon: string;
  description: string;
  accentColor: string;
  bgColor: string;
  statRanges: StatRange[];
  descriptionHint: string;
  namingHint: string;
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  {
    id: "enemy",
    name: "Enemy",
    entityType: "Meeple",
    subtype: "Figure",
    icon: "👹",
    description: "Hostile NPC that players fight. Stats scale by tier.",
    accentColor: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/30",
    descriptionHint: "A dangerous foe lurking in the depths…",
    namingHint: "e.g. Goblin, Skeleton, Dragon",
    statRanges: [
      { name: "Health",   min: 1,  max: 20, description: "Hit points before defeated" },
      { name: "Damage",   min: 1,  max: 8,  description: "Damage dealt per attack" },
      { name: "Speed",    min: 1,  max: 5,  description: "Movement range per turn" },
      { name: "Loot",     min: 1,  max: 10, description: "Gold/XP reward on defeat" },
    ],
  },
  {
    id: "item",
    name: "Item",
    entityType: "Card",
    subtype: "Item",
    icon: "⚔️",
    description: "Equipable or consumable game card. Balanced cost vs power.",
    accentColor: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/30",
    descriptionHint: "A powerful artifact sought by adventurers…",
    namingHint: "e.g. Iron Sword, Health Potion, Magic Shield",
    statRanges: [
      { name: "Cost",    min: 1,  max: 10, description: "Resource cost to acquire or play" },
      { name: "Power",   min: 1,  max: 8,  description: "Attack bonus or effect strength" },
      { name: "Defense", min: 0,  max: 5,  description: "Armor or damage reduction" },
      { name: "Rarity",  min: 1,  max: 5,  step: 1, description: "1=Common … 5=Legendary" },
    ],
  },
  {
    id: "location",
    name: "Location",
    entityType: "Location",
    subtype: "Dungeon",
    icon: "🗺️",
    description: "Map area players explore. Scales difficulty and rewards by tier.",
    accentColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/30",
    descriptionHint: "A treacherous region filled with danger and treasure…",
    namingHint: "e.g. Dark Forest, Ancient Ruins, Crystal Caves",
    statRanges: [
      { name: "Difficulty",  min: 1, max: 5,  description: "Overall danger level" },
      { name: "Encounters",  min: 0, max: 6,  description: "Number of enemy encounters" },
      { name: "Rewards",     min: 1, max: 10, description: "Loot pool value" },
      { name: "Exploration", min: 1, max: 5,  description: "Rounds needed to fully explore" },
    ],
  },
  {
    id: "faction",
    name: "Faction",
    entityType: "Faction",
    subtype: "Guild",
    icon: "⚔️",
    description: "Organised group with agenda, economy and military power.",
    accentColor: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    descriptionHint: "An ancient order with sweeping political influence…",
    namingHint: "e.g. Iron Guild, Shadow Court, Merchant League",
    statRanges: [
      { name: "Members",   min: 2,  max: 50, description: "Active member count (flavour)" },
      { name: "Economy",   min: 1,  max: 5,  description: "Resource generation rate" },
      { name: "Military",  min: 1,  max: 5,  description: "Combat / territorial strength" },
      { name: "Relations", min: 0,  max: 3,  description: "Allied factions count" },
    ],
  },
  {
    id: "resource",
    name: "Resource",
    entityType: "Token",
    subtype: "Resource",
    icon: "💎",
    description: "Currency, material or mana token used in the economy.",
    accentColor: "text-teal-400",
    bgColor: "bg-teal-500/10 border-teal-500/30",
    descriptionHint: "A precious material traded across the realm…",
    namingHint: "e.g. Gold, Iron, Mana Crystal",
    statRanges: [
      { name: "Value",    min: 1,  max: 10, description: "Base exchange value" },
      { name: "Supply",   min: 5,  max: 30, description: "Starting pool in the game" },
      { name: "Weight",   min: 1,  max: 5,  description: "Carry limit contribution" },
    ],
  },
  {
    id: "ability",
    name: "Ability",
    entityType: "Ability",
    subtype: "Active",
    icon: "✨",
    description: "Player or enemy special power with cost and cooldown.",
    accentColor: "text-pink-400",
    bgColor: "bg-pink-500/10 border-pink-500/30",
    descriptionHint: "A devastating technique mastered through training…",
    namingHint: "e.g. Fireball, Shield Bash, Shadow Step",
    statRanges: [
      { name: "Power",    min: 1, max: 10, description: "Effect strength" },
      { name: "Cost",     min: 1, max: 5,  description: "Resource or mana cost" },
      { name: "Cooldown", min: 0, max: 5,  description: "Turns before reuse (0 = instant)" },
      { name: "Range",    min: 1, max: 5,  description: "Target distance in spaces" },
    ],
  },
];

/**
 * Generate a stat value scaled to tier (1–5) with optional variance.
 * tier 1 = near minimum, tier 5 = near maximum.
 */
export function generateStatValue(range: StatRange, tier: number, variance = 0.15): number {
  const t = (Math.max(1, Math.min(5, tier)) - 1) / 4; // normalise 0..1
  const base = range.min + (range.max - range.min) * t;
  const spread = (range.max - range.min) * variance;
  const jitter = (Math.random() * 2 - 1) * spread;
  const raw = base + jitter;
  const step = range.step ?? 1;
  const snapped = Math.round(raw / step) * step;
  return Math.max(range.min, Math.min(range.max, snapped));
}

/**
 * Build the stats string (e.g. "Health 8 / Damage 3 / Speed 2") for a
 * generated entity given its template and tier.
 */
export function buildStatsForTier(
  template: EntityTemplate,
  tier: number,
  overrides: Record<string, number> = {},
): string {
  return template.statRanges
    .map((r) => {
      const val = r.name in overrides ? overrides[r.name] : generateStatValue(r, tier);
      return `${r.name} ${val}`;
    })
    .join(" / ");
}

/** Preview value shown in the stat table for a given tier (deterministic midpoint) */
export function previewStatValue(range: StatRange, tier: number): number {
  const t = (Math.max(1, Math.min(5, tier)) - 1) / 4;
  const base = range.min + (range.max - range.min) * t;
  const step = range.step ?? 1;
  return Math.max(range.min, Math.min(range.max, Math.round(base / step) * step));
}

export function getTemplateById(id: string): EntityTemplate | undefined {
  return ENTITY_TEMPLATES.find((t) => t.id === id);
}

export const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Tier 1 — Beginner",  color: "text-emerald-400" },
  2: { label: "Tier 2 — Easy",      color: "text-lime-400" },
  3: { label: "Tier 3 — Medium",    color: "text-amber-400" },
  4: { label: "Tier 4 — Hard",      color: "text-orange-400" },
  5: { label: "Tier 5 — Boss",      color: "text-red-400" },
};
