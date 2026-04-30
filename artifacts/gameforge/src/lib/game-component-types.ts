// Shared game component type constants used across entity and sheet views

export const PHYSICAL_TYPES = ["Card", "Deck", "Token", "Die", "Tile", "Meeple", "Board", "Zone"] as const;
export const WORLD_TYPES = ["Location", "Faction", "Event", "Resource", "Ability"] as const;
export const ALL_COMPONENT_TYPES = [...PHYSICAL_TYPES, ...WORLD_TYPES] as const;
export type ComponentType = typeof ALL_COMPONENT_TYPES[number];

export const COMPONENT_META: Record<ComponentType, { icon: string; color: string; bg: string; badge: string; desc: string }> = {
  Card:     { icon: "🃏", color: "text-violet-400",  bg: "bg-violet-500/5",  badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",  desc: "Action, item, spell, event, treasure cards" },
  Deck:     { icon: "📦", color: "text-indigo-400",  bg: "bg-indigo-500/5",  badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",  desc: "Collection of cards (container)" },
  Token:    { icon: "🪙", color: "text-amber-400",   bg: "bg-amber-500/5",   badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",     desc: "Resource, currency, health, status markers" },
  Die:      { icon: "🎲", color: "text-red-400",     bg: "bg-red-500/5",     badge: "bg-red-500/20 text-red-400 border-red-500/30",           desc: "Custom die type or face set" },
  Tile:     { icon: "🗺️", color: "text-emerald-400", bg: "bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", desc: "Map, dungeon, terrain tiles" },
  Meeple:   { icon: "🧩", color: "text-blue-400",    bg: "bg-blue-500/5",    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",        desc: "Pawn, figure, standee, miniature" },
  Board:    { icon: "📋", color: "text-slate-400",   bg: "bg-slate-500/5",   badge: "bg-slate-500/20 text-slate-400 border-slate-500/30",     desc: "Game board, player mat, reference sheet" },
  Zone:     { icon: "📤", color: "text-lime-400",    bg: "bg-lime-500/5",    badge: "bg-lime-500/20 text-lime-400 border-lime-500/30",        desc: "Draw pile, discard, hand, market, bag" },
  Location: { icon: "📍", color: "text-cyan-400",    bg: "bg-cyan-500/5",    badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",        desc: "City, dungeon, region, landmark" },
  Faction:  { icon: "⚔️", color: "text-purple-400",  bg: "bg-purple-500/5",  badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",  desc: "Guild, tribe, nation, team" },
  Event:    { icon: "⚡", color: "text-orange-400",  bg: "bg-orange-500/5",  badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",  desc: "Random event, scenario, story beat" },
  Resource: { icon: "💎", color: "text-teal-400",    bg: "bg-teal-500/5",    badge: "bg-teal-500/20 text-teal-400 border-teal-500/30",        desc: "Material, food, energy, mana" },
  Ability:  { icon: "✨", color: "text-pink-400",    bg: "bg-pink-500/5",    badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",        desc: "Passive, active, triggered, ultimate" },
};

export function getMeta(type: string) {
  return COMPONENT_META[type as ComponentType] ?? {
    icon: "🔷", color: "text-gray-400", bg: "bg-gray-500/5",
    badge: "bg-gray-500/20 text-gray-400 border-gray-500/30", desc: "",
  };
}

export const COMPONENT_SUBTYPES: Record<string, string[]> = {
  Card:     ["Action", "Item", "Spell", "Event", "Quest", "Encounter", "Treasure", "Attack", "Defense"],
  Deck:     ["Item Deck", "Event Deck", "Encounter Deck", "Spell Deck", "Quest Deck", "Custom"],
  Token:    ["Resource", "Currency", "Health", "Status", "Marker", "Victory Point", "Damage"],
  Die:      ["Action Die", "Combat Die", "Event Die", "Skill Die", "Custom"],
  Tile:     ["Map Tile", "Dungeon Tile", "Terrain", "Room", "Hex", "Starting Tile"],
  Meeple:   ["Pawn", "Figure", "Standee", "Miniature", "Marker", "Ship", "Vehicle"],
  Board:    ["Main Board", "Player Board", "Map", "Reference Sheet", "Expansion Board"],
  Zone:     ["Draw Pile", "Discard Pile", "Hand", "Market", "Board Area", "Supply", "Bag", "Stockpile"],
  Location: ["City", "Dungeon", "Region", "Shop", "Quest Site", "Landmark", "Lair"],
  Faction:  ["Guild", "Tribe", "Nation", "Team", "House", "Order", "Corporation"],
  Event:    ["Random Event", "Scenario", "Story Beat", "Encounter", "World Event", "Trigger"],
  Resource: ["Currency", "Material", "Food", "Energy", "Mana", "Influence", "Faith"],
  Ability:  ["Passive", "Active", "Triggered", "Ultimate", "Reaction", "Aura"],
};

export const STATUS_OPTIONS = [
  { value: "draft",     label: "Draft",      color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  { value: "needs-art", label: "Needs Art",  color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "ready",     label: "Ready",      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "approved",  label: "Approved",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
] as const;

export function getStatusMeta(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
}

// Manufacturing material tiers for BOM
export const MFG_TIER: Record<string, { tier: string; color: string }> = {
  Card:     { tier: "Cardstock",        color: "text-violet-400" },
  Deck:     { tier: "Box / Insert",     color: "text-indigo-400" },
  Token:    { tier: "Cardboard / Wood", color: "text-amber-400"  },
  Die:      { tier: "Plastic / Resin",  color: "text-red-400"    },
  Tile:     { tier: "Cardboard",        color: "text-emerald-400" },
  Meeple:   { tier: "Wood / Plastic",   color: "text-blue-400"   },
  Board:    { tier: "Mounted Board",    color: "text-slate-400"  },
  Zone:     { tier: "Reference Card",   color: "text-lime-400"   },
  Location: { tier: "Conceptual",       color: "text-muted-foreground" },
  Faction:  { tier: "Conceptual",       color: "text-muted-foreground" },
  Event:    { tier: "Conceptual",       color: "text-muted-foreground" },
  Resource: { tier: "Conceptual",       color: "text-muted-foreground" },
  Ability:  { tier: "Conceptual",       color: "text-muted-foreground" },
  Asset:    { tier: "Digital / Print",  color: "text-primary"    },
};

// Monopoly demo entities for the template loader
export const MONOPOLY_ENTITIES = [
  { name: "Main Board",              type: "Board",    subtype: "Main Board",        description: "40-space board with properties, railroads, utilities, taxes, and corner spaces." },
  { name: "Chance Deck",             type: "Deck",     subtype: "Event Deck",        description: "16 Chance cards with random positive and negative events." },
  { name: "Community Chest Deck",    type: "Deck",     subtype: "Event Deck",        description: "16 Community Chest cards with bank, neighbour, and jackpot events." },
  { name: "Player Tokens",           type: "Meeple",   subtype: "Pawn",              description: "8 classic tokens: top hat, car, dog, thimble, iron, battleship, boot, wheelbarrow." },
  { name: "Monopoly Money",          type: "Token",    subtype: "Currency",          description: "Paper money in $1, $5, $10, $20, $50, $100, and $500 denominations." },
  { name: "Houses",                  type: "Token",    subtype: "Marker",            description: "32 green houses placed on owned properties to increase rent." },
  { name: "Hotels",                  type: "Token",    subtype: "Marker",            description: "12 red hotels — each replaces 4 houses on a property." },
  { name: "Standard Dice",           type: "Die",      subtype: "Action Die",        description: "2 standard d6 — roll both to move. Doubles roll again." },
  { name: "Property Deeds",          type: "Resource", subtype: "Currency",          description: "Title deed cards showing purchase price, 6 rent tiers, mortgage value, and house cost." },
  { name: "Brown Group",             type: "Faction",  subtype: "Team",              description: "Mediterranean & Baltic — cheapest properties, $60 & $60 purchase price." },
  { name: "Light Blue Group",        type: "Faction",  subtype: "Team",              description: "Oriental, Vermont, Connecticut — $100–$120." },
  { name: "Pink Group",              type: "Faction",  subtype: "Team",              description: "St. Charles, States, Virginia — $140–$160." },
  { name: "Orange Group",            type: "Faction",  subtype: "Team",              description: "St. James, Tennessee, New York — $180–$200." },
  { name: "Red Group",               type: "Faction",  subtype: "Team",              description: "Kentucky, Indiana, Illinois — $220–$240." },
  { name: "Yellow Group",            type: "Faction",  subtype: "Team",              description: "Atlantic, Ventnor, Marvin Gardens — $260–$280." },
  { name: "Green Group",             type: "Faction",  subtype: "Team",              description: "Pacific, North Carolina, Pennsylvania — $300–$320." },
  { name: "Dark Blue Group",         type: "Faction",  subtype: "Team",              description: "Park Place & Boardwalk — $350 & $400, highest rent in the game." },
  { name: "Go",                      type: "Location", subtype: "Starting Tile",     description: "Players collect $200 salary each time they pass or land on Go." },
  { name: "Jail / Just Visiting",    type: "Location", subtype: "Landmark",          description: "Land here visiting or get sent here — miss turns until doubles, Get Out card, or $50 bail." },
  { name: "Free Parking",            type: "Location", subtype: "Landmark",          description: "A free rest space — no standard rules action on landing." },
  { name: "Go to Jail",              type: "Location", subtype: "Landmark",          description: "Land here → move directly to Jail, do not collect $200." },
  { name: "Tax Spaces",              type: "Location", subtype: "Landmark",          description: "Income Tax ($200 or 10%) and Luxury Tax ($75) — paid to the bank." },
  { name: "Railroads",               type: "Location", subtype: "Landmark",          description: "4 railroads — $200 each, rent doubles for each additional railroad owned." },
  { name: "Utilities",               type: "Location", subtype: "Landmark",          description: "Electric Company & Water Works — rent is dice roll × 4 or × 10 if both owned." },
  { name: "Bank",                    type: "Zone",     subtype: "Supply",            description: "Unlimited money supply — pays salaries, loans, and holds unsold property deeds." },
  { name: "Free Parking Pool",       type: "Zone",     subtype: "Board Area",        description: "Optional variant — taxes and fines accumulate here and are collected by landing players." },
  { name: "Player Hand",             type: "Zone",     subtype: "Hand",              description: "Each player holds their own property deeds, money, and Get Out of Jail Free cards." },
] as const;
