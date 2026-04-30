export interface LearnTopic {
  id: string;
  title: string;
  context: string;
}

const T = (id: string, title: string, context: string): LearnTopic => ({
  id,
  title,
  context: context.trim(),
});

export const LEARN_TOPICS: Record<string, LearnTopic> = Object.fromEntries(
  [
    T(
      "bible:welcome",
      "Welcome to GameForge",
      `GameForge is an end-to-end IDE for designing tabletop games of all types — card games, tile games, dice games, board games, hybrid games. The core loop is: brainstorm with the AI Co-Designer → define entities & rules → simulate with Monte Carlo and live playthroughs → generate assets → export or publish (Rulebook to Gamma, BOM, print-and-play). The Bible introduces this loop.

Key concepts:
- Every tab is either upstream (informs design) or downstream (consumes design). Research and Ontology are upstream; Simulator, BOM, and Exports are downstream.
- The Monopoly Demo Template (Overview tab → amber card) pre-loads 27 entities across all major component types in one click — ideal for learning the system.
- The Complexity Score widget (Overview) estimates BGG-style weight from your rule count, component count, and player range — use it to calibrate against your target audience.
- GameForge supports any tabletop format: deck-builders (Card + Deck + Zone), tile-placement (Tile + Meeple), dice games (Die with Die Face Designer), area-control (Board + Token + Faction), and more.`,
    ),
    T(
      "bible:overview",
      "Workspace overview",
      `The Overview tab shows your game's vital statistics and quick-action shortcuts. Key panels:

**Complexity Score**: An auto-calculated 1–5 weight estimate (Light / Medium / Heavy) based on rule count, component count, and player range. Compares to real games (Azul = Light, Gloomhaven = Heavy).

**AI Quick Actions**: One-click AI generation for rules, entities, and players scoped to your game's genre and player count.

**Monopoly Demo Template**: An amber-highlighted card that loads 27 pre-built Monopoly entities (Board, Decks, Tokens, Money, Dice, Properties, Railroads, Zones, etc.) to demonstrate the full range of component types. Use it to explore the system before building your own game.

**Project Stats**: Live counts of rules, entities, players, playtests — propagated from all other tabs via shared Drizzle/Postgres state.

Tabs are organized as: upstream (Research, Ontology, Players, Rules) → midstream (Assets & Entities, Simulator) → downstream (Playtesting, Balance, Exports, Rulebook).`,
    ),
    T(
      "bible:research",
      "Research tab",
      `Research is where you collect inspirations, references to existing games, mechanics catalog, and target audience notes. It informs everything downstream. Confident designers do landscape analysis (what plays well in this genre? what's overdone?) and write a one-paragraph design pillar before touching mechanics. Use research to pre-empt "this already exists" feedback.

Research items are tagged and surfaced in the Rulebook Editor — when you "Sync from project", existing research entries appear in the FAQ/References section of the rulebook automatically.`,
    ),
    T(
      "bible:ontology",
      "Ontology tab",
      `Ontology defines the conceptual schema of your game: which kinds of things exist (Cards, Tokens, Resources, Locations, Players, Phases) and how they relate. Good ontologies are minimal — fewer entity types means clearer rules. Confident designers iterate on ontology before authoring entities; a messy ontology produces messy rules.`,
    ),
    T(
      "bible:entities",
      "Assets & Entities tab",
      `The Assets & Entities tab is the main component workshop. It has three views:
- **Assets view**: Manage images, concept art, card mockups, and digital files
- **Components view**: Full entity management with Cards/Sheet toggle and per-entity tool panels
- **BOM view** (Bill of Materials): Physical component breakdown with CSV export for manufacturers

**Component types supported:**
- Card / Deck — Cards live inside Decks. Use Card Studio (expand any Deck entity) to manage individual cards, write card text, and AI-batch generate card content.
- Token — Resource, currency, health, status markers. Supports color/variant manager (e.g. Azul's 5 colors × 20 tiles each).
- Tile — Map, dungeon, terrain. Tile entities also get the variant manager for color/region sets.
- Die — Custom dice. Each Die entity gets the Die Face Designer: edit all 6 faces with emoji or text, see probability distribution.
- Meeple — Pawns, figures, standees, miniatures.
- Board — Game boards, player mats, reference sheets.
- Zone — Draw pile, discard pile, hand, market, bag, supply. Zones model game flow topology — where cards go between states.
- Location / Faction / Event / Resource / Ability — Conceptual world-building types (no physical component; filtered out of the BOM).

**Sheet view**: A spreadsheet-style table for bulk-editing entity names, types, subtypes, descriptions. Supports CSV import/export.

**Card Studio**: Expanded inside any Deck entity. Shows all child cards, allows individual editing, and uses AI batch generation with automatic parent assignment.

**Die Face Designer**: Edit face_1 through face_6, choose emoji from a quick palette, see face distribution as probability bars.

**Variant Manager**: For Tile and Token entities — define named color/variant sets with quantities (e.g. "Blue: 20, Red: 20, Yellow: 20").`,
    ),
    T(
      "bible:players",
      "Players tab",
      `Players defines player counts, personas, win conditions per player, and asymmetric roles if any. Fields include: name, player type, role, archetype, description, strategy, starting resources, victory condition, special ability, and playstyle.

Confident designers explicitly model archetype players ("the optimizer", "the storyteller", "the new player") and check that core decisions remain interesting for each archetype. Player counts have huge implications for downtime, scaling, and table presence.

Player data is upstream of:
- Rulebook Editor: player archetypes pre-populate the Turn Order and Objective sections when you "Sync from project"
- Chat co-designer: the AI knows your player archetypes for faction-balance advice
- Complexity Score: player range (1-player vs 6-player spread) affects the weight estimate`,
    ),
    T(
      "bible:rules",
      "Rules tab",
      `Rules captures the rulebook in structured form: title, content, category, priority, design notes, and edge cases. Rules are organized by category (Setup, Actions, Turn, Scoring, etc.) and surfaced downstream in the Rulebook Editor and Simulator.

Confident designers write rules as a state machine (phases → legal actions → state changes) and aggressively cut special cases. Each special case is a tax on every future playtest.

**Rulebook Editor** (separate Rulebook tab): Takes rules data and all other project data and produces a structured document. It has three sub-tabs:
- Outline: Section-based editor (Setup, Objective, Turn Order, Actions, Scoring, FAQ + custom)
- Glossary: Auto-detects capitalized terms in your content, lets you define them
- Preview: Full markdown preview

**"Sync from project" button**: One click pulls entities into Setup, rules into Actions, players into Turn Order/Objective, and research into FAQ. Sections are updated with structured content from live API data.

**"Publish to Gamma"**: Compiles all sections + glossary into a rich markdown document and opens the Gamma export modal. Copy the content into Gamma.app → New → Paste → Generate to create a professional presentation or document.`,
    ),
    T(
      "bible:simulator",
      "Simulator tab",
      `Simulator runs Monte Carlo trials and live agent playthroughs against your current rules. It surfaces game length, win rate skew, kingmaker scenarios, and dead strategies. Confident designers tune simulator agents to specific personas and read variance — high variance can mean exciting OR broken; you have to inspect runs to know which.`,
    ),
    T(
      "bible:assets",
      "Assets & Entities tab — Assets and BOM views",
      `The Assets view manages digital files: images, concept art, card mockups, reference sheets. Assets have kind (Image, Audio, Document, etc.), tags, version history, and notes.

**The BOM (Bill of Materials) view** — accessed via the three-way toggle at the top of the Assets & Entities tab — provides a manufacturer-ready component breakdown:

- **Physical Components** table: All Card, Deck, Token, Die, Tile, Meeple, Board, Zone entities with quantities and material/tier classification (Cardstock, Cardboard, Wood/Plastic, Mounted Board, Reference Card, Plastic/Resin)
- **Conceptual Components** section (dimmed): Location, Faction, Event, Resource, Ability entities — shown for reference but filtered from the physical count
- **Digital Assets** section: All uploaded assets with quantities

Summary cards at the top show: Physical component count, Card count, Unique types, Digital assets.

**Export CSV** button generates a manufacturer-ready spreadsheet with columns: Component, Type, Subtype, Quantity, Material/Tier.

Confident designers use the BOM to cross-check the physical component list before sending to a manufacturer or launching a Kickstarter. The BOM auto-updates whenever entities are added or changed.`,
    ),
    T(
      "bible:playtesting",
      "Playtesting tab",
      `Playtesting tracks scheduled sessions, participants, structured feedback forms, and notes against specific rules versions. Confident designers run blind tests (no designer at the table), instrument with observation sheets (decisions, downtime, rules questions), and triage feedback into "fix-now / iterate / not-a-bug" rather than reacting to every comment.`,
    ),
    T(
      "bible:notes",
      "Notes tab",
      `Notes is freeform markdown for half-formed ideas, design journal entries, and meeting notes. Treat it as your scratch space; it's not graded by simulator or rules. Confident designers periodically promote good notes into Rules, Tasks, or Research entries instead of letting them rot.`,
    ),
    T(
      "bible:tasks",
      "Tasks tab",
      `Tasks is a lightweight backlog — design debts, balance issues, art todos, rule clarifications — with priority and status. Confident designers keep this list short and ruthlessly close stale items; a 200-task backlog is a graveyard, not a plan.`,
    ),
    T(
      "bible:storyboard",
      "Storyboard tab",
      `Storyboard sequences key moments of a typical game: the opening, the mid-game pivot, the climax, the resolution. It's a narrative-design tool that exposes pacing problems. Confident designers use it to verify that the game has a discernible arc rather than 90 minutes of uniform turns.`,
    ),
    T(
      "bible:balance",
      "Balance tab",
      `Balance aggregates simulator output and exposes per-entity statistics — pick rates, win rates, win-rate-when-picked, average cost-to-impact ratios. Confident designers focus on outliers and look for "dominant" or "trap" cards; perfect balance is impossible, but extreme outliers should be either nerfed/buffed or made deliberately powerful with a clear cost.`,
    ),
    T(
      "bible:exports",
      "Exports tab",
      `Exports produces publisher-ready documents and files from your live project data. Available export formats:

- **Rulebook (Markdown)**: Full rulebook with components, player archetypes, and rules grouped by category
- **Kickstarter Campaign**: AI-generated campaign page with hook, story, how-to-play, stretch goals, reward tiers
- **Sell Sheet**: One-page publisher pitch with tagline, USPs, and comparable titles
- **Press Kit**: Headline, boilerplate, key facts, press quotes, FAQ
- **Tabletop Simulator JSON**: Entity list formatted as TTS object states for digital playtesting
- **Player Aid Card** _(beta)_: Reference card with key icons and turn summary
- **Component BOM CSV** _(beta)_: Manufacturer-ready bill of materials (same data as the BOM view in Assets & Entities, exported as a CSV)

**Publish to Gamma** (Rulebook tab): For a professional presentation-quality rulebook, use the Rulebook Editor → "Publish to Gamma" button. This compiles all sections + glossary into a rich structured document and opens a copy modal; paste the content into Gamma.app to generate a polished slide deck or document.

Confident designers treat each export as a design checkpoint — a clean export forces you to confront missing icons, untested copy, and incomplete entity data.`,
    ),
    T(
      "bible:chat",
      "Project chat",
      `Project chat is the workspace-wide AI Co-Designer that has access to your entire project state — all tabs, entities, rules. Use it for cross-cutting design questions ("does my deck composition support my win condition?"). It is distinct from the topic-scoped tutor inside Learn, which only knows about one chapter at a time.`,
    ),
    T(
      "bible:ai-providers",
      "AI providers",
      `AI Providers lets a workspace admin choose which LLM/image providers power Co-Designer, Tutor, Simulator agents, and Asset generation. Different providers have different strengths (reasoning, speed, image style) and cost profiles. Confident designers pick a fast cheap model for ideation and a stronger model for rule synthesis or balance critique.`,
    ),

    T(
      "design101:01-what-is",
      "What is a board game, really?",
      `A board game is a structured social experience produced by rules, components, and players — not just the rulebook. The "feeling" the game produces (tension, laughter, satisfying optimization, story) is the product. Confident designers write a one-sentence pitch ("a 60-minute negotiation game where every alliance must betray someone") and a one-line target feeling, then constantly check decisions against both.`,
    ),
    T(
      "design101:02-goals",
      "Goals, win conditions, and player motivation",
      `Win conditions tell players what to optimize. They can be single-axis (most VP), multi-axis (any of 3 paths), variable (asymmetric goals), or absent (sandbox). Motivation also comes from non-victory rewards: storytelling, mastery, expression. Confident designers ensure the dominant strategy is interesting, that there is more than one viable path, and that catch-up mechanics don't punish good play.`,
    ),
    T(
      "design101:03-mechanics",
      "Mechanics: the verbs of your game",
      `Mechanics are the verbs players do: draft, bid, place, move, push-your-luck, area-control, set-collection, deck-build, worker-placement, roll-and-write. Each mechanic has a "feel" and constraints. Confident designers pick 1-2 core mechanics and 1-2 supporting ones; combining 5+ unrelated mechanics produces incoherent games. Mechanics should reinforce the target feeling.`,
    ),
    T(
      "design101:04-components",
      "Components and physical design",
      `Components are the physical UI: cards, dice, boards, tokens, player aids. They communicate state, constrain action space, and create tactile pleasure. Confident designers minimize component count, give every component a clear "language" (color, shape, icon), and prototype with paper before committing to manufacturing. Player aids are not optional — they are the rulebook compressed.

GameForge component types and their tools:
- **Card + Deck**: Create a Deck entity, then use Card Studio (expand the Deck) to manage child cards individually and AI-generate card text in batch
- **Die**: Add a Die entity and use the Die Face Designer to define all 6 faces with emoji or text; GameForge shows the probability distribution
- **Tile / Token with variants**: Add a Tile or Token entity and use the Variant Manager to define color sets with quantities (e.g. Azul: 5 colors × 20 tiles = 100 tiles total)
- **Zone**: Models game topology — where cards/tokens go between states (draw pile, discard, hand, market, bag, supply). Add zones to model flow before writing rules.
- **Board / Meeple / Location / Faction**: Covered by standard entity types in the Components view

The Bill of Materials (BOM) view in Assets & Entities auto-aggregates all entities into a manufacturer-ready table. Export to CSV for quotes.`,
    ),
    T(
      "design101:05-balance",
      "Balance and probability",
      `Balance is about keeping decisions interesting, not about making everything equal. Use expected value, variance, and dominant-strategy analysis. Common heuristics: cost-to-impact roughly linear; no card is strictly better than another; variance is okay if it creates stories. Confident designers compute EV by hand for at least the top 5 cards, then verify with simulation.`,
    ),
    T(
      "design101:06-iteration",
      "Iteration and playtesting culture",
      `Design is iteration. Build the cheapest playable thing, test, learn, change one variable, retest. Confident designers separate "this rule is broken" from "this player didn't like this rule"; small samples lie. Use blind tests once you think you have a candidate, and freeze rules between rounds of testing so you can attribute changes.`,
    ),
    T(
      "design101:07-theme",
      "Theme and narrative integration",
      `Theme is the fiction wrapped around mechanics; integration means mechanics feel like the fiction. "Pasted-on" themes can be swapped without changing play; integrated themes can't. Confident designers either commit to deep integration (every mechanic justified by fiction) or lean into abstract elegance — half-measures feel worst.`,
    ),
    T(
      "design101:08-publishing",
      "Publishing paths and going to market",
      `You can self-publish (Kickstarter, direct), license to a publisher, or sell as print-and-play. Each path has different time, money, and creative-control trade-offs. Confident designers know roughly: self-pub needs ~$30k-$100k for a print run and a marketing audience; licensing needs a polished prototype and a pitch; PnP earns little but builds reputation.`,
    ),

    T(
      "tools:card-studio",
      "Card Studio — deck and card management",
      `Card Studio is the card-management panel inside any Deck entity in the Assets & Entities tab (expand a Deck entity to access it).

**What it does:**
- Lists all child cards assigned to the deck with their name, subtype, description, and lore
- Lets you add individual cards manually
- AI batch generation: enter a count and prompt, click Generate. GameForge generates that many Card entities, then automatically assigns them to the parent Deck via parentEntityId. This works around the AI API limitation — entities are generated first, then reparented.
- Inline editing: click any field on a card to edit it in place
- Delete individual cards

**Card data model:**
- name, type ("Card"), subtype (Action / Item / Spell / Event / etc.)
- description — the functional card text (what it does mechanically)
- lore — flavor text (thematic, optional)
- parentEntityId — the Deck entity's id that this card belongs to

**Good practice:**
- Define your card template (what fields each card uses) before generating in bulk
- Use the Sheet view for mass-edit after generation
- Check the BOM view — cards count toward the physical component total (each card = 1 unit; deck quantity = sum of child cards)`,
    ),
    T(
      "tools:die-face-designer",
      "Die Face Designer — custom dice",
      `The Die Face Designer appears when you expand a Die entity in the Assets & Entities tab.

**What it does:**
- Lets you define all 6 faces of a custom die using text or emoji
- Quick emoji palette with common game symbols (⚔️ 🛡️ 🏃 💎 ✨ 💀 🔥 ⚡ 🎯 🌟 ❌ ✅)
- Probability distribution: shows the percentage chance of each face being rolled (uniform for a d6, so each face = ~16.7%, but useful to compare how many faces share the same outcome)
- Dirty state detection: "Save faces" is only enabled when the face values differ from what is stored

**Storage**: Faces are stored as entity properties named face_1 through face_6 with textValue. This reuses the existing EntityProperty system with no schema changes.

**Game design notes:**
- For combat dice (like Eldritch Horror / Arkham Horror), group faces by outcome type: hits, misses, blanks, wilds
- For push-your-luck dice (e.g. Zombie Dice), the tension comes from face distribution — too many blanks → cautious play; too few → broken
- Probability display helps you catch unintended distributions before prototyping`,
    ),
    T(
      "tools:variant-manager",
      "Variant Manager — color and component sets",
      `The Variant Manager appears when you expand a Tile or Token entity in the Assets & Entities tab.

**What it does:**
- Defines named color/variant sets with per-variant quantities
- Running total shows overall component count across all variants
- Percentage bars show the distribution (useful for spotting uneven sets)
- Add, rename, and delete variants; adjust quantities inline

**Storage**: Variants are stored as entity properties with a "variant_" prefix (e.g. "variant_Blue" = 20, "variant_Red" = 20). The defaultValue field holds the integer quantity.

**Example — Azul:**
- Tile entity "Tile"
- Variants: Blue 20, Yellow 20, Red 20, Black 20, White 20
- Total: 100 tiles

**Example — Pirate's Dice:**
- Token entity "Skull Cup"
- Variants: White 30, Black 30
- (or model each player's dice set as a separate Token entity)

**Game design note**: Variant quantities feed into the BOM — the BOM currently shows 1 unit per top-level entity, but the Variant Manager helps you communicate the exact physical count to manufacturers and backers when writing the component list.`,
    ),
    T(
      "tools:zone-topology",
      "Zone entities — modeling game flow",
      `Zone is a special entity type in GameForge that models the locations where game elements move between states. Zones are physical (they take up table space or represent a conceptual holding area) but architectural — they define your game's flow topology before you write a single rule.

**Zone subtypes:**
- Draw Pile — where cards come from (face-down stack)
- Discard Pile — where used/spent cards go
- Hand — each player's private holding area
- Market — the face-up selection area (e.g. Dominion's market row)
- Board Area — a specific region on the board (e.g. a scoring track space)
- Supply — where tokens/resources are taken from
- Bag — randomized draw (tiles in a bag, Azul-style)
- Stockpile — a player's collected resources/cards

**Why model zones?**
Every card game has a state machine: cards move from Draw Pile → Hand → Play Area → Discard Pile → (shuffle) → Draw Pile. Modeling this as Zone entities forces you to be explicit about the cycle before rules are written, catching edge cases (what happens when the draw pile empties? is the discard reshuffled?).

**In the BOM**: Zones appear in the Physical Components table with tier "Reference Card" — model them as player-aid reference cards or board sections that label the zones.

**Example from Monopoly demo**: The Bank (Supply), Free Parking Pool (Board Area), and Player Hand (Hand) are all pre-loaded as Zone entities.`,
    ),
  ].map((t) => [t.id, t]),
);

export function getLearnTopic(id: string): LearnTopic | undefined {
  return LEARN_TOPICS[id];
}
