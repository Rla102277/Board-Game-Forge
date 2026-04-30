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
      `GameForge is an end-to-end IDE for designing tabletop games of all types — card games, tile games, dice games, board games, hybrid games. The core loop is: brainstorm with the AI Co-Designer → define entities & rules → simulate with Monte Carlo and live playthroughs → generate assets → export or publish (Rulebook to Gamma, BOM, print-and-play).

Key concepts:
- Every tab is either upstream (informs design) or downstream (consumes design). Research and Players are upstream; Simulator, BOM, and Exports are downstream.
- The **Monopoly Demo Template** (Overview tab → amber card) pre-loads 27 entities across all major component types in one click — ideal for learning the system. It includes the Board, two Dice, Chance and Community Chest Decks and their cards, Property tiles, Railroad tiles, Utility tiles, Money tokens (denominations $1–$500), Banker Zone, Free Parking Zone, Jail Zone, Go Zone, Tax Spaces, Player Tokens (Top Hat, Car, Thimble, etc.), and the Rulebook.
- The Complexity Score widget (Overview) estimates BGG-style weight from your rule count, component count, and player range — use it to calibrate against your target audience.
- The Workshop tab (Assets & Entities) is the core component editor and has five sections: Workshop, Graph, Library, Assets, Manifest.`,
    ),
    T(
      "bible:overview",
      "Workspace overview",
      `The Overview tab shows your game's vital statistics and quick-action shortcuts. Key panels:

**Complexity Score**: An auto-calculated 1–5 weight estimate (Light / Medium / Heavy) based on rule count, component count, and player range. Compares to real games — Monopoly sits around 1.5 (Light/Medium), Azul around 2, Gloomhaven around 4.5 (Heavy).

**AI Quick Actions**: One-click AI generation for rules, entities, and players scoped to your game's genre and player count. For a property-trading game like Monopoly, this might suggest Auction, Mortgage, and Rent rules automatically.

**Monopoly Demo Template**: An amber-highlighted card that loads 27 pre-built Monopoly entities (Board, Decks, Tokens, Money, Dice, Properties, Railroads, Zones, etc.) to demonstrate the full range of component types. Use it to explore the system before building your own game.

**Project Stats**: Live counts of rules, entities, players, playtests — propagated from all other tabs via shared state.

Tabs are organized into collapsible sidebar groups: Foundation (Overview, Research, Players) → Workshop (Assets & Entities) → Rules & Flow (Rules, Rulebook, Turn Structure) → Simulation (Simulator, Balance, Scoring Curve) → Playtesting (Playtesting, Blind Test) → Publish (Exports, Design Pipeline, Notes, Tasks) → Team (Comments, Activity, Versions).`,
    ),
    T(
      "bible:research",
      "Research tab",
      `Research is where you collect inspirations, references to existing games, mechanics catalog, and target audience notes. It informs everything downstream. Confident designers do landscape analysis (what plays well in this genre? what's overdone?) and write a one-paragraph design pillar before touching mechanics.

**Example**: If designing a property-trading game inspired by Monopoly, research entries might include: "Monopoly (1935) — negotiation + rent economy", "Acquire — hotel chains as corporate mergers", "Lords of Vegas — casino zoning", "Target audience: families, 8+, 60–120 min, familiar theme". Research surfaces later in the Rulebook Editor — when you "Sync from project", existing research entries auto-populate the FAQ/References section of the rulebook.`,
    ),
    T(
      "bible:ontology",
      "Ontology — moved to Workshop",
      `The Ontology tab has moved. Its content — component type reference, property glossary, graph analysis, and entity relationships — is now inside the **Assets & Entities tab → Graph and Library sections**.

To access it: click "Assets & Entities" in the left sidebar (under the Workshop group), then use the Graph or Library sub-tabs at the top of the page.

- **Graph**: coverage gaps, entity relationship graph, component browser, property dictionary, rule–entity link map
- **Library**: full component type reference with descriptions, design tips, and property glossary

This consolidation means you can move from editing entities directly into graph analysis and back without switching tabs.`,
    ),
    T(
      "bible:entities",
      "Assets & Entities tab — the component workshop",
      `The Assets & Entities tab is the main component workshop. It has five sub-sections accessible via a tab bar at the top:

**Workshop** — Full entity management: list view with Cards/Sheet toggle, per-entity tool panels (Card Studio for Decks, Die Face Designer for Dice, Variant Manager for Tiles/Tokens). This is where you create, edit, and bulk-import entities.

**Graph** — Visual analysis of your component ecosystem: coverage gaps (entity types with no rules), entity relationship diagram, component browser grouped by type, property dictionary, and rule–entity link map showing which rules reference which entities.

**Library** — Read-only component type reference: design tips, taglines, ideas, and canonical properties for all 13 component types. Also contains the full Property Glossary (26 canonical properties with rules interaction notes and examples).

**Assets** — Manage digital files: images, concept art, card mockups, reference sheets. Assets have kind (Image, Audio, Document), tags, version history, and notes.

**Manifest** — Bill of Materials: physical component breakdown with quantities, material tiers, and CSV export for manufacturers.

---

**Component types supported (Monopoly demo as examples):**
- **Card / Deck** — The Chance Deck and Community Chest Deck each contain 16 child cards. Use Card Studio to manage cards inside a Deck. Example: "Go to Jail" card in the Chance Deck.
- **Token** — Money denominations ($1, $5, $10, $20, $50, $100, $500) and player tokens (Top Hat, Thimble, Car, etc.). Use the Variant Manager for multi-color token sets.
- **Tile** — Property tiles (Mediterranean Ave → Boardwalk), Railroad tiles (4), Utility tiles (Electric Company, Water Works). Each color group is a variant set.
- **Die** — Monopoly uses two standard d6 dice. Use the Die Face Designer to define custom faces (e.g. ⚔️ ❤️ for a combat die) and see probability distributions.
- **Meeple** — Houses and Hotels in Monopoly. These are the wooden/plastic building pieces.
- **Board** — The main Monopoly game board (40 spaces in a loop). A single Board entity.
- **Zone** — Go (starting space), Jail/Just Visiting, Free Parking, Go To Jail, Bank (supply), each player's hand. Zones model game flow topology — where cards/tokens live between state changes.
- **Location / Faction / Event / Resource / Ability** — Conceptual world-building types. In Monopoly: "Color Groups" (Brown, Light Blue, Pink…) are Factions; "Collect $200" is an Event; "Rent" is a Resource flow. These appear in Graph analysis but are filtered from the physical BOM.

**Sheet view**: Spreadsheet-style bulk edit of entity names, types, subtypes, descriptions. Supports CSV import/export. Use it after AI batch-generating entities to spot-check and correct names.`,
    ),
    T(
      "bible:players",
      "Players tab",
      `Players defines player counts, personas, win conditions per player, and asymmetric roles if any. Fields include: name, player type, role, archetype, description, strategy, starting resources, victory condition, special ability, and playstyle.

**Example (Monopoly)**: 2–8 players. A "Monopoly player" model might look like:
- Archetype: "The Agressive Trader" — buys everything, negotiates hard, mortgages freely
- Victory condition: Last player solvent (all others bankrupt)
- Special ability: none (Monopoly is symmetric)
- Starting resources: $1,500 in mixed denominations

Confident designers explicitly model archetype players ("the optimizer", "the storyteller", "the new player") and check that core decisions remain interesting for each archetype.

Player data is upstream of:
- **Rulebook Editor**: player archetypes pre-populate the Turn Order and Objective sections when you "Sync from project"
- **Chat co-designer**: the AI knows your player archetypes for faction-balance advice
- **Complexity Score**: player range (2-player vs 8-player spread) affects the weight estimate`,
    ),
    T(
      "bible:rules",
      "Rules tab",
      `Rules captures the rulebook in structured form: title, content, category, priority, design notes, and edge cases. Rules are organized by category (Setup, Actions, Turn, Scoring, etc.) and surfaced downstream in the Rulebook Editor and Simulator.

**Example (Monopoly rules structure):**
- Category: Setup → "Place $1,500 in starting funds per player", "Shuffle and place Chance and Community Chest decks"
- Category: Turn → "Roll both dice, move token clockwise", "Doubles: take another turn (3 doubles = Go to Jail)"
- Category: Actions → "Buy unowned property at printed price", "Pay rent to owner", "Auction property if player declines purchase"
- Category: Scoring → "Last player remaining wins"
- Edge cases: "If the bank runs out of money, use paper"

Confident designers write rules as a state machine (phases → legal actions → state changes) and aggressively cut special cases. Each special case is a tax on every future playtest.

**Rulebook Editor** (Rulebook tab): Takes rules data and all other project data and produces a structured document with three sub-tabs:
- **Outline**: Section-based editor (Setup, Objective, Turn Order, Actions, Scoring, FAQ + custom)
- **Glossary**: Auto-detects capitalized terms in your content, lets you define them (e.g. "Mortgage", "Rent", "Doubles")
- **Preview**: Full markdown preview

**"Sync from project"**: One click pulls entities into Setup, rules into Actions, players into Turn Order/Objective, and research into FAQ.

**"Publish to Gamma"**: Compiles all sections + glossary into a rich markdown document and opens a copy modal. Paste into Gamma.app to generate a professional slide deck or document.`,
    ),
    T(
      "bible:simulator",
      "Simulator tab",
      `Simulator runs Monte Carlo trials and live agent playthroughs against your current rules. It surfaces game length, win rate skew, kingmaker scenarios, and dead strategies.

**Example**: Running 1,000 Monopoly simulations would reveal that early property acquisition on the orange and red color groups has a dramatically higher win rate — the "landing frequency" vs "rent value" curve peaks there. The simulator would also surface that the average game length balloons past 2 hours with 4+ players, which is the primary criticism of Monopoly's design.

Confident designers tune simulator agents to specific personas and read variance — high variance can mean exciting OR broken; you have to inspect runs to know which.`,
    ),
    T(
      "bible:assets",
      "Assets & Entities tab — Assets and Manifest views",
      `The **Assets view** manages digital files: images, concept art, card mockups, reference sheets. Assets have kind (Image, Audio, Document, etc.), tags, version history, and notes. Example: upload a scan of a Chance card mockup, tag it "card art / draft", and link it to the Chance Deck entity.

**The Manifest view** (fifth section in the Assets & Entities tab bar) provides a manufacturer-ready component breakdown:

- **Physical Components** table: All Card, Deck, Token, Die, Tile, Meeple, Board, Zone entities with quantities and material/tier classification (Cardstock, Cardboard, Wood/Plastic, Mounted Board, Reference Card, Plastic/Resin)
- **Conceptual Components** section (dimmed): Location, Faction, Event, Resource, Ability entities — shown for reference but filtered from the physical count
- **Digital Assets** section: All uploaded assets with quantities

Summary cards at the top show: Physical component count, Card count, Unique types, Digital assets.

**Export CSV** generates a manufacturer-ready spreadsheet with columns: Component, Type, Subtype, Quantity, Material/Tier.

**Example (Monopoly Manifest)**: 28 Property tiles, 4 Railroad tiles, 2 Utility tiles, 32 Houses (Meeple), 12 Hotels (Meeple), 2 Dice (Die), 16 Chance cards, 16 Community Chest cards, 1 Board, 8 Player Tokens, 1 Banker's Tray, Money denominations ($1 × 30, $5 × 30, $10 × 20, …).

Confident designers use the Manifest to cross-check the physical component list before sending to a manufacturer or launching a Kickstarter.`,
    ),
    T(
      "bible:playtesting",
      "Playtesting tab",
      `Playtesting tracks scheduled sessions, participants, structured feedback forms, and notes against specific rules versions. Confident designers run blind tests (no designer at the table), instrument with observation sheets (decisions, downtime, rules questions), and triage feedback into "fix-now / iterate / not-a-bug" rather than reacting to every comment.

**Example**: A blind test of a Monopoly-inspired game might reveal: "Players were confused about when to pay tax vs. when the bank collects" (fix-now) and "Three players said the game felt too long" (investigate — is this game length or player elimination making it feel slow?). The Blind Test tab structures this feedback capture.`,
    ),
    T(
      "bible:notes",
      "Notes tab",
      `Notes is freeform markdown for half-formed ideas, design journal entries, and meeting notes. Treat it as your scratch space. Confident designers periodically promote good notes into Rules, Tasks, or Research entries instead of letting them rot.

**Example**: "2025-04-30 — playtest 3 note: the auction rule felt exciting but slowed the game. Consider making it optional or house-rule-friendly. → Promote to Tasks: 'Design optional auction variant'."`,
    ),
    T(
      "bible:tasks",
      "Tasks tab",
      `Tasks is a lightweight backlog — design debts, balance issues, art todos, rule clarifications — with priority and status. Confident designers keep this list short and ruthlessly close stale items; a 200-task backlog is a graveyard, not a plan.

**Example tasks for a Monopoly redesign**: "Reduce game length for 4+ players (High)", "Add optional auction rule toggle (Medium)", "Design 6 new property color groups (Low)", "Commission board art (Medium)".`,
    ),
    T(
      "bible:storyboard",
      "Storyboard tab",
      `Storyboard sequences key moments of a typical game: the opening, the mid-game pivot, the climax, the resolution. It is a narrative-design tool that exposes pacing problems.

**Example (Monopoly arc)**: Opening (turns 1–10) — players acquire properties, the board feels abundant and open. Mid-game (turns 10–30) — monopolies form, first houses appear, tension rises. Climax (turns 30–50) — hotels trigger bankruptcy spirals, the table dynamic shifts to survival. Resolution — last player standing wins. Confident designers verify the game has a discernible arc rather than 90 minutes of uniform turns.`,
    ),
    T(
      "bible:balance",
      "Balance tab",
      `Balance aggregates simulator output and exposes per-entity statistics — pick rates, win rates, win-rate-when-picked, average cost-to-impact ratios. Confident designers focus on outliers and look for "dominant" or "trap" cards.

**Example**: In a Monopoly variant, the Balance tab might show Orange properties (St. James, Tennessee, New York) winning 34% of games despite being mid-tier cost — a dominant cluster. Dark Purple (Mediterranean, Baltic) might show near-0% win rate when held alone — a trap if players pay full price. Fix: reduce rent differential or adjust landing frequency via rule.`,
    ),
    T(
      "bible:exports",
      "Exports tab",
      `Exports produces publisher-ready documents and files from your live project data. Available export formats:

- **Rulebook (Markdown)**: Full rulebook with components, player archetypes, and rules grouped by category. Example: a Monopoly rulebook with all 40 board spaces listed under Components.
- **Kickstarter Campaign**: AI-generated campaign page with hook, story, how-to-play, stretch goals, reward tiers. Example: "Monopoly Evolved — the negotiation classic reimagined for modern gamers."
- **Sell Sheet**: One-page publisher pitch with tagline, USPs, and comparable titles. Example: "Like Monopoly but the negotiation actually works."
- **Press Kit**: Headline, boilerplate, key facts, press quotes placeholder, FAQ
- **Tabletop Simulator JSON**: Entity list formatted as TTS object states for digital playtesting
- **Player Aid Card** _(beta)_: Reference card with key icons and turn summary
- **Component BOM CSV** _(beta)_: Manufacturer-ready bill of materials (same data as the Manifest view in Assets & Entities)

**Publish to Gamma** (Rulebook tab → "Publish to Gamma" button): Compiles all sections + glossary into a rich structured document and opens a copy modal. Paste into Gamma.app to generate a professional slide deck or document. This is the fastest way to produce a shareable prototype rulebook.

Confident designers treat each export as a design checkpoint — a clean export forces you to confront missing icons, untested copy, and incomplete entity data.`,
    ),
    T(
      "bible:chat",
      "Project chat",
      `Project chat is the workspace-wide AI Co-Designer that has access to your entire project state — all tabs, entities, rules. Use it for cross-cutting design questions ("does my deck composition support my win condition?", "does the Chance deck have enough positive cards to balance the negative ones?"). It is distinct from the topic-scoped tutor inside Learn, which only knows about one chapter at a time.`,
    ),
    T(
      "bible:ai-providers",
      "AI providers",
      `AI Providers lets a workspace admin choose which LLM/image providers power Co-Designer, Tutor, Simulator agents, and Asset generation. Different providers have different strengths (reasoning, speed, image style) and cost profiles. Confident designers pick a fast cheap model for ideation and a stronger model for rule synthesis or balance critique.`,
    ),

    T(
      "design101:01-what-is",
      "What is a board game, really?",
      `A board game is a structured social experience produced by rules, components, and players — not just the rulebook. The "feeling" the game produces (tension, laughter, satisfying optimization, story) is the product. Confident designers write a one-sentence pitch and a one-line target feeling, then constantly check decisions against both.

**Example**: Monopoly's pitch is "a 90-minute negotiation game where one player wins by bankrupting everyone else." Its target feeling is "the thrill of the deal and the agony of landing on a hotel." Every mechanic (negotiation, rent, auctions) either serves or undermines that feeling.`,
    ),
    T(
      "design101:02-goals",
      "Goals, win conditions, and player motivation",
      `Win conditions tell players what to optimize. They can be single-axis (most VP), multi-axis (any of 3 paths), variable (asymmetric goals), or absent (sandbox). Motivation also comes from non-victory rewards: storytelling, mastery, expression. Confident designers ensure the dominant strategy is interesting, that there is more than one viable path, and that catch-up mechanics don't punish good play.

**Example**: Monopoly's single win condition (last player solvent) creates extreme end-game elimination — players are knocked out and sit watching for potentially an hour. Modern redesigns often replace elimination with VP or time limits to fix the pacing problem this creates.`,
    ),
    T(
      "design101:03-mechanics",
      "Mechanics: the verbs of your game",
      `Mechanics are the verbs players do: draft, bid, place, move, push-your-luck, area-control, set-collection, deck-build, worker-placement, roll-and-write. Each mechanic has a "feel" and constraints. Confident designers pick 1-2 core mechanics and 1-2 supporting ones; combining 5+ unrelated mechanics produces incoherent games.

**Example**: Monopoly's core mechanics are Roll-and-Move and Negotiation (trading properties, cutting deals). Its supporting mechanics are Set-Collection (color monopolies) and Auction. The roll-and-move creates randomness that frustrates strategic players; the negotiation creates the memorable social moments. When redesigning, designers often swap roll-and-move for drafting or bidding while keeping negotiation.`,
    ),
    T(
      "design101:04-components",
      "Components and physical design",
      `Components are the physical UI: cards, dice, boards, tokens, player aids. They communicate state, constrain action space, and create tactile pleasure. Confident designers minimize component count, give every component a clear "language" (color, shape, icon), and prototype with paper before committing to manufacturing.

GameForge component types and their tools:
- **Card + Deck**: Create a Deck entity, then expand it to open Card Studio. Manage child cards, write card text, AI-generate card sets in batch. Example: the Chance Deck (16 cards) and Community Chest Deck (16 cards) in the Monopoly demo.
- **Die**: Add a Die entity and open the Die Face Designer to define all 6 faces with emoji or text. Monopoly uses two standard d6; a redesign might add a custom action die with faces like 🏠 🏨 💸 ⚖️ 🎲 🃏.
- **Tile / Token with variants**: Add a Tile or Token entity and use the Variant Manager to define color sets with quantities. Example: Monopoly property tiles in 8 color groups — Brown (2), Light Blue (3), Pink (3), Orange (3), Red (3), Yellow (3), Green (3), Dark Blue (2).
- **Zone**: Models game topology — where cards/tokens go between states (Draw Pile, Discard, Hand, Bank supply, Free Parking pool). In Monopoly: Bank, Free Parking, Go, Jail, each player's hand.
- **Board / Meeple / Location / Faction**: Standard entity types in the Workshop. In Monopoly: 1 Board, Houses and Hotels as Meeples, color groups as Factions.

The **Manifest view** (Assets & Entities → Manifest) auto-aggregates all entities into a manufacturer-ready table. Export to CSV for quotes.`,
    ),
    T(
      "design101:05-balance",
      "Balance and probability",
      `Balance is about keeping decisions interesting, not about making everything equal. Use expected value, variance, and dominant-strategy analysis. Common heuristics: cost-to-impact roughly linear; no card is strictly better than another; variance is okay if it creates stories.

**Example**: In Monopoly, the expected rent income of a developed Orange property group is disproportionately high relative to purchase cost because of landing frequency (dice distribution favors the 6–9 range from Jail, which hits Orange perfectly). This is an intentional or accidental imbalance that makes Orange dominant. Confident designers compute EV for their top entities by hand, then verify with simulation.`,
    ),
    T(
      "design101:06-iteration",
      "Iteration and playtesting culture",
      `Design is iteration. Build the cheapest playable thing, test, learn, change one variable, retest. Confident designers separate "this rule is broken" from "this player didn't like this rule"; small samples lie. Use blind tests once you think you have a candidate, and freeze rules between rounds of testing so you can attribute changes.

**Example**: Monopoly's first edition (1935) had no houses or hotels — those came later after playtesting revealed end-games took too long without a rent escalation mechanism. The most important design decision in Monopoly was emergent from iteration, not the original design.`,
    ),
    T(
      "design101:07-theme",
      "Theme and narrative integration",
      `Theme is the fiction wrapped around mechanics; integration means mechanics feel like the fiction. "Pasted-on" themes can be swapped without changing play; integrated themes can't. Confident designers either commit to deep integration or lean into abstract elegance.

**Example**: Monopoly's theme (Atlantic City real estate) is essentially pasted on — you could reskin it as any city or franchise. This is why thousands of Monopoly editions exist (Star Wars, Game of Thrones, etc.) without changing a single rule. Contrast with Pandemic, where the theme (disease outbreak) is mechanically integrated: the infection deck, outbreak chain reactions, and role abilities all reflect the fiction.`,
    ),
    T(
      "design101:08-publishing",
      "Publishing paths and going to market",
      `You can self-publish (Kickstarter, direct), license to a publisher, or sell as print-and-play. Each path has different time, money, and creative-control trade-offs. Confident designers know roughly: self-pub needs ~$30k–$100k for a print run and a marketing audience; licensing needs a polished prototype and a pitch; PnP earns little but builds reputation.

**Example**: Monopoly was originally pitched to Parker Brothers by Charles Darrow and rejected — he self-published 5,000 copies and sold them at Wanamaker's department store before Parker Brothers reversed course and licensed it. The sell sheet and press kit exports in GameForge's Exports tab are designed to support both paths.`,
    ),

    T(
      "tools:card-studio",
      "Card Studio — deck and card management",
      `Card Studio is the card-management panel inside any Deck entity in the Assets & Entities tab (Workshop section). Expand a Deck entity to access it.

**What it does:**
- Lists all child cards assigned to the deck with their name, subtype, description, and lore
- Lets you add individual cards manually
- AI batch generation: enter a count and prompt, click Generate. GameForge generates that many Card entities, then automatically assigns them to the parent Deck via parentEntityId.
- Inline editing: click any field on a card to edit in place
- Delete individual cards

**Card data model:**
- name, type ("Card"), subtype (Action / Item / Event / etc.)
- description — the functional card text (what it does mechanically)
- lore — flavor text (thematic, optional)
- parentEntityId — the Deck entity's id this card belongs to

**Example (Monopoly Chance Deck)**: 16 Chance cards in the Chance Deck entity. Cards include:
- "Advance to Go (Collect $200)" — subtype: Movement, description: "Move token directly to Go space"
- "Go to Jail. Do not pass Go. Do not collect $200." — subtype: Penalty, description: "Move token to Jail and end turn"
- "Bank pays you dividend of $50" — subtype: Reward, description: "Collect $50 from Bank"

Use the Sheet view (Workshop tab → Sheet toggle) for mass-edit after AI batch-generating all 16 cards.`,
    ),
    T(
      "tools:die-face-designer",
      "Die Face Designer — custom dice",
      `The Die Face Designer appears when you expand a Die entity in the Assets & Entities tab (Workshop section).

**What it does:**
- Lets you define all 6 faces of a custom die using text or emoji
- Quick emoji palette with common game symbols (⚔️ 🛡️ 🏃 💎 ✨ 💀 🔥 ⚡ 🎯 🌟 ❌ ✅)
- Probability distribution: shows the percentage chance of each face (~16.7% per face on a d6, useful to compare faces sharing the same outcome)
- Dirty state detection: "Save faces" enabled only when face values differ from stored values

**Storage**: Faces are stored as entity properties named face_1 through face_6 with textValue. Reuses the EntityProperty system with no schema changes.

**Example (Monopoly standard d6)**:
- Faces: 1, 2, 3, 4, 5, 6 (text values) — each 16.7% probability
- Rolling two d6 creates a 2–12 range with 7 as the most common result (6 combinations out of 36)
- This is why Monopoly's Jail space (distance 6–9 from the most-landed-on board section) creates the Orange property dominance — dice distribution naturally clusters there

**Example (Monopoly redesign action die)**:
- face_1: 🏠 Buy Property
- face_2: 🏨 Build House
- face_3: 💸 Pay Tax
- face_4: ⚖️ Negotiate (force a trade offer)
- face_5: 🎲 Reroll movement
- face_6: 🃏 Draw Chance card`,
    ),
    T(
      "tools:variant-manager",
      "Variant Manager — color and component sets",
      `The Variant Manager appears when you expand a Tile or Token entity in the Assets & Entities tab (Workshop section).

**What it does:**
- Defines named color/variant sets with per-variant quantities
- Running total shows overall component count across all variants
- Percentage bars show distribution (useful for spotting uneven sets)
- Add, rename, and delete variants; adjust quantities inline

**Storage**: Variants are stored as entity properties with a "variant_" prefix (e.g. "variant_Blue" = 20, "variant_Red" = 20). The defaultValue field holds the integer quantity.

**Example — Monopoly Property Tiles:**
- Tile entity "Property Tiles"
- Variants: Brown 2, Light Blue 3, Pink 3, Orange 3, Red 3, Yellow 3, Green 3, Dark Blue 2
- Total: 22 property tiles
- (Railroads and Utilities are separate Tile entities)

**Example — Monopoly Money:**
- Token entity "Money"
- Variants: $1 × 30, $5 × 30, $10 20, $20 × 20, $50 × 20, $100 × 20, $500 × 20
- Total: 160 bills

**Game design note**: Variant quantities feed into the Manifest — the Manifest shows physical count per entity, and the Variant Manager helps communicate exact quantities to manufacturers and Kickstarter backers.`,
    ),
    T(
      "tools:zone-topology",
      "Zone entities — modeling game flow",
      `Zone is a special entity type in GameForge that models the locations where game elements move between states. Zones are physical (they take up table space or represent a conceptual holding area) and architectural — they define your game's flow topology before you write a single rule.

**Zone subtypes:**
- Draw Pile — where cards come from (face-down stack)
- Discard Pile — where used/spent cards go
- Hand — each player's private holding area
- Market — the face-up selection area (e.g. Dominion's market row)
- Board Area — a specific region on the board (e.g. a scoring track space)
- Supply — where tokens/resources are taken from (e.g. the Bank in Monopoly)
- Bag — randomized draw (tiles in a bag, Azul-style)
- Stockpile — a player's collected resources/cards

**Example — Monopoly Zone entities (pre-loaded in the demo template):**
- **Bank** (Supply) — holds all money and unowned property deeds; distributes on purchase or income
- **Free Parking** (Board Area) — holds tax payments (in the house rule variant); money pools here
- **Go** (Board Area) — players collect $200 when passing
- **Jail / Just Visiting** (Board Area) — players enter Jail from Go to Jail space or a Chance card; exit by rolling doubles, paying $50, or playing a card
- **Chance Discard** (Discard Pile) — used Chance cards go here; reshuffled when the Draw Pile empties
- **Community Chest Discard** (Discard Pile) — same for Community Chest cards
- **Player Hand** (Hand) — each player's property deed cards and Get Out of Jail Free cards

**Why model zones?** Modeling Monopoly's zones forces you to be explicit about the card cycle (Chance Draw Pile → player's hand → Chance Discard → reshuffled into Chance Draw Pile) before writing rules about it, catching edge cases (what happens when both draw piles are empty simultaneously?).

**In the Manifest**: Zones appear in the Physical Components table — model them as player-aid reference cards or board sections that label the zones.`,
    ),
  ].map((t) => [t.id, t]),
);

export function getLearnTopic(id: string): LearnTopic | undefined {
  return LEARN_TOPICS[id];
}
