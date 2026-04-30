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
      `GameForge is an end-to-end IDE for designing tabletop games. The core loop is: brainstorm with the AI Co-Designer, define entities & rules, simulate with Monte Carlo and live playthroughs, generate assets, and export print-and-play files. The Bible introduces this loop. Confident designers should know which tab solves which problem and how to move work forward through the workflow rather than getting stuck in any one phase.`,
    ),
    T(
      "bible:overview",
      "Workspace overview",
      `The workspace is organized into tabs: Research, Ontology, Entities, Players, Rules, Simulator, Assets, Playtesting, Notes, Tasks, Storyboard, Balance, Exports, Chat, and AI Providers. Tabs share project state via Drizzle/Postgres so changes propagate. Designers should understand which tabs are upstream (Research, Ontology) vs. downstream (Simulator, Exports) and not skip the early definitional work.`,
    ),
    T(
      "bible:research",
      "Research tab",
      `Research is where you collect inspirations, references to existing games, mechanics catalog, and target audience notes. It informs everything downstream. Confident designers do landscape analysis (what plays well in this genre? what's overdone?) and write a one-paragraph design pillar before touching mechanics. Use research to pre-empt "this already exists" feedback.`,
    ),
    T(
      "bible:ontology",
      "Ontology tab",
      `Ontology defines the conceptual schema of your game: which kinds of things exist (Cards, Tokens, Resources, Locations, Players, Phases) and how they relate. Good ontologies are minimal — fewer entity types means clearer rules. Confident designers iterate on ontology before authoring entities; a messy ontology produces messy rules.`,
    ),
    T(
      "bible:entities",
      "Entities tab",
      `Entities are concrete instances of your ontology types: specific cards, tokens, board tiles, decks. The Entities tab supports bulk editing, tagging, and balance metadata (cost, power, rarity). Confident designers define entity templates first (e.g. "all attack cards have cost, damage, range") so balance work and asset generation can be automated downstream.`,
    ),
    T(
      "bible:players",
      "Players tab",
      `Players defines player counts, personas, win conditions per player, and asymmetric roles if any. Confident designers explicitly model archetype players ("the optimizer", "the storyteller", "the new player") and check that core decisions remain interesting for each archetype. Player counts have huge implications for downtime, scaling, and table presence.`,
    ),
    T(
      "bible:rules",
      "Rules tab",
      `Rules captures the rulebook in structured form: setup, turn structure, phases, actions, end conditions, edge cases, and FAQ. Confident designers write rules as a state machine (phases → legal actions → state changes) and aggressively cut special cases. Each special case is a tax on every future playtest.`,
    ),
    T(
      "bible:simulator",
      "Simulator tab",
      `Simulator runs Monte Carlo trials and live agent playthroughs against your current rules. It surfaces game length, win rate skew, kingmaker scenarios, and dead strategies. Confident designers tune simulator agents to specific personas and read variance — high variance can mean exciting OR broken; you have to inspect runs to know which.`,
    ),
    T(
      "bible:assets",
      "Assets tab",
      `Assets generates and manages card art, tokens, board art, icons, and tuckbox graphics using AI image models, with templates that bind to your entity data so a card's text/cost/art update together. Confident designers lock template layout early and defer "final art" until rules are stable; cheap placeholder art keeps focus on play.`,
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
      `Exports produces print-and-play PDFs, Tabletop Simulator mods, and manufacturer-ready files (bleed, CMYK, DPI). Confident designers treat exports as a checkpoint — a clean export forces you to confront missing icons, untested copy, and incomplete entity data.`,
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
      `Components are the physical UI: cards, dice, boards, tokens, player aids. They communicate state, constrain action space, and create tactile pleasure. Confident designers minimize component count, give every component a clear "language" (color, shape, icon), and prototype with paper before committing to manufacturing. Player aids are not optional — they are the rulebook compressed.`,
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
  ].map((t) => [t.id, t]),
);

export function getLearnTopic(id: string): LearnTopic | undefined {
  return LEARN_TOPICS[id];
}
