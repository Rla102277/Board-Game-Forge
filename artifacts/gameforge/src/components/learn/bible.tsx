import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Sparkles, Target, Layers,
  ScrollText, Users, Network, FileText, CheckSquare, MessageSquare, Image,
  Beaker, BarChart3, Film, Download, KeyRound, FlaskConical, Wand2, AlertTriangle,
  Lightbulb, Flag, Compass, StickyNote, GitBranch, ListChecks,
} from "lucide-react";
import { LearnChat } from "./learn-chat";
import { useUserArtifact } from "@/hooks/use-user-artifact";

const LEGACY_STORAGE_KEY = "gameforge.learn.bible.completed";

type Section = { heading: string; points: string[] };

type Chapter = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  body: Section[];
  deepDive?: Section[];
  examples?: { name: string; note: string }[];
  pitfalls?: string[];
  tips?: string[];
  starters?: string[];
};

const CHAPTERS: Chapter[] = [
  {
    id: "entities-ontology",
    title: "Entities, Ontology & Your Game's Vocabulary",
    icon: Network,
    blurb: "Before you explore any other part of GameForge, two ideas are worth understanding: what 'entities' are, and what 'ontology' means. Neither is intimidating — they're just precise names for things every game designer already thinks about, even if they've never used those words.",
    body: [
      {
        heading: "What is an entity?",
        points: [
          "An entity is simply any distinct 'thing' that exists in your game and has its own identity, name, and characteristics. A sword is an entity. A dragon is an entity. A trade route, a faction, a city district, a spell card, a treasure chest — all entities. If your game gives something a name and other rules can refer to it, it qualifies as an entity.",
          "GameForge uses the word 'entity' rather than 'component' or 'piece' because entities can represent things beyond physical objects. A 'season' in a farming game is an entity. A 'market cycle' in an economic game is an entity. Even an abstract concept like a 'political alliance' can be an entity, as long as your rules treat it as a distinct thing with its own behavior. The word is broad on purpose.",
          "What makes an entity truly useful in GameForge is giving it properties. Properties are the numbers and descriptions that define what an entity actually does — its cost, its power, its rarity, its duration, whatever dimensions matter in your game. A Sword entity with no properties is just a name floating in space. A Sword entity with a damage value of 3, a cost of 2 gold, and a rarity of 'uncommon' is something the AI can compare, the Simulator can compute, and the Balance tab can chart.",
        ],
      },
      {
        heading: "What does 'ontology' mean?",
        points: [
          "Ontology is a word borrowed from philosophy, where it means 'the study of what exists and how things relate to each other.' In GameForge, your game's ontology is simply the complete picture of everything that exists in your design — all your entities, all your rules — and the web of connections between them.",
          "Here's how that map gets built: when you write a rule that says 'the Merchant may sell any Item to any City for gold equal to the Item's value,' your ontology records that this rule connects three things — the Merchant entity, the Item entity, and the City entity. Over time, those connections accumulate into a network. The Ontology tab draws that network visually, so you can see which entities are central to your design and which are sitting untouched on the edges.",
          "The reason ontology matters is that it reveals things about your design that are very hard to see by just reading your rules. An entity with no rules attached to it is a design orphan — you've named something, perhaps even imagined it vividly, but you haven't given players anything to do with it yet. The ontology view turns those invisible problems visible.",
        ],
      },
      {
        heading: "How GameForge uses entities and ontology",
        points: [
          "When you ask the AI anything — whether through the chat panel or through the Enhance button on a rule or entity — it reads your entire ontology behind the scenes before it responds. It knows your entity names, their properties, and which rules connect to which pieces. Building out your entities and properties before chatting with the AI produces dramatically richer responses.",
          "The Simulator tab — which runs automated playtest scenarios — depends almost entirely on your entities having numeric properties. A game with richly defined entities and clear properties will give the Simulator enough to work with for meaningful results. A game where entities are just names without properties will produce only guesses.",
          "Think of building your ontology as laying down a foundation. Every other tool in GameForge — the AI chat, the Simulator, the Balance tab, the Export engine — reads from that same foundation. The more carefully you define your entities and the rules that connect them, the more useful every other feature becomes.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "An example: building a simple medieval game's ontology",
        points: [
          "Imagine a game where players are knights competing to control territories. You might start by defining four entities: Knight (the player role), Castle (a location), Sword (an item), and Peasant (a resource). You'd give each one properties — a Knight might have a movement range of 2 and starting gold of 10; a Sword might have a damage value of 3 and a cost of 4 gold.",
          "Then you'd write rules like 'a Knight may move to any adjacent Castle on their turn' and 'a Knight carrying a Sword deals double damage in combat.' Your ontology automatically connects Knight to Castle through the first rule, and Knight to Sword through the second. If the Peasant entity has no rule connections, the Ontology tab will highlight it as unconnected — a useful prompt that you've defined something you haven't used yet.",
          "This example shows the core idea: entities are the nouns of your game, rules are the verbs, and the ontology is the grammar that shows whether your nouns and verbs are forming coherent sentences.",
        ],
      },
    ],
    pitfalls: [
      "Thinking entities can only be physical game components. An 'alliance' between factions, a 'seasonal phase,' or a 'market event' can all be entities if your rules refer to them by name and treat them as distinct things with behaviors.",
      "Building a list of entity names without adding any properties. Even one or two numeric properties per entity — a cost and an effect — is enough to unlock the Simulator and Balance tools.",
      "Waiting until your design feels 'finished' before defining entities. Start with a rough list early and refine it over time. The act of naming your core entities will clarify your thinking in ways that are hard to predict until you try it.",
    ],
    tips: [
      "Start by asking yourself: what are the five or six things players will interact with most often on a typical turn? Those are almost certainly your core entities. List them first before writing any rules.",
      "After writing any new rule, pause and check: does every entity this rule mentions exist in my Entities tab? If not, add it right then. This habit keeps your ontology accurate without requiring a separate cleanup session.",
      "Open the Ontology tab after any major writing session. Anything with no connections is your next design question — either give it rules that make it meaningful, or ask yourself whether it needs to be in the game at all.",
    ],
    starters: [
      "Help me figure out what the main entities of my game should be.",
      "What's the difference between an entity and a rule in GameForge?",
      "How do I know if my game's ontology is in good shape?",
    ],
  },
  {
    id: "welcome",
    title: "Welcome to GameForge",
    icon: Sparkles,
    blurb: "GameForge is a workspace for designing tabletop board games — from the first spark of an idea all the way to a printed prototype you can place in front of real players. This guide walks you through every panel and feature so nothing feels mysterious.",
    body: [
      {
        heading: "What you can do here",
        points: [
          "You can capture your game's vision — its theme, player count, target playing time, mechanic DNA, and designer context — in one central place that the AI always reads before responding. The Overview tab has two views: Game Dashboard for health metrics and phase management, and Game Identity for the deeper creative vision and mechanics fingerprint.",
          "You can build a structured vocabulary of entities, rules, and player roles that the AI reasons about rather than guessing. The Ontology tab visualizes how those pieces connect, the Balance tab charts their numerical relationships, and the Simulator runs automated scenarios to surface dominant strategies before you invest in physical prototypes.",
          "You can browse reference games in the Research tab, have the AI deeply analyze their mechanics, and use [Use this mechanic] to instantly create a draft rule and linked task from any mechanic you want to adapt — bridging your inspiration directly to your rulebook.",
          "You can track your design phase across a guided progression from Concept → Prototype → Alpha → Beta → Release Candidate. The Phase Guide shows week-by-week and month-by-month action lists, plus a data-driven checklist of the specific conditions that must be met before you're ready to advance.",
          "You can manage design problems, decisions, playtest sessions, and team tasks — with dependency linking, templates, snapshot-based revert, and an AI digest for your notes — all without switching to external tools.",
          "You can generate concept art for your game's components anchored to a single visual style you define once, export formatted rulebooks and publisher pitch decks, and share feedback links with playtesters who don't need an account.",
        ],
      },
      {
        heading: "Three things to learn first",
        points: [
          "The left sidebar is your project list. Inside a project, the tab bar along the top switches between sections: Overview, Research, Entities, Rules, Players, Ontology, Notes, Tasks, and more. Getting comfortable with this two-level navigation is the first step to moving around quickly.",
          "The chat panel on the right side of the screen is your AI co-designer. It maintains a separate conversation for each tab, so your chat about Rules won't tangle with your chat about Assets. The AI reads your entire project context — entities, rules, metadata, narrative — before every response. A richly filled project yields richly specific suggestions.",
          "Almost every list in GameForge has a small sparkle icon button next to each item. That's the AI Enhance button — it suggests improvements to that specific item, shows you a structured preview, and saves nothing until you explicitly accept each change. It's safe to explore.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "How GameForge works with the AI",
        points: [
          "Every time you ask the AI anything, it first reads a summary of your entire project: name, description, type, player count, narrative seed, and your most important entities and rules. This context is what separates a useful AI co-designer from a generic chatbot.",
          "Most AI actions in GameForge follow a 'preview-first' approach — the AI proposes changes and you review each suggestion individually before anything is saved. You're always the final decision-maker.",
          "If you have your own API key from an AI provider — Anthropic, OpenAI, or Google — you can paste it into your workspace settings. Once you do, every AI call from your workspace uses your own key instead of the platform's shared default.",
        ],
      },
      {
        heading: "What GameForge is not",
        points: [
          "GameForge is not a live digital game platform. It does not let real players log in and play your game online. The Simulator runs automated scenarios based on your rules, but it cannot replicate social dynamics, table talk, and genuine human unpredictability.",
          "GameForge is not a replacement for human playtesters. The Simulator is a useful early signal for structural problems, but five friends around a table will always catch things an algorithm misses — especially anything related to feel and fun.",
          "GameForge does not manufacture or ship physical games. Its export tools produce files you can take to a print-and-play service or include in a publisher pitch, not fulfilled games.",
        ],
      },
    ],
    pitfalls: [
      "Skipping the Overview metadata. If the AI doesn't know your game's player count, playing time, and overall tone, it defaults to completely generic suggestions. Filling out your overview is the single highest-return action you can take before your first AI conversation.",
      "Treating the chat history as a permanent record. Any important conclusion you reach in chat should be copied to Notes or promoted into a formal Rule, because chat threads can be cleared and are not searchable.",
    ],
    tips: [
      "Collapse the chat panel by clicking its header whenever you need more working space. The panel remembers its collapsed state across sessions.",
      "Configure your AI providers in workspace settings before you invite collaborators, so everyone starts with the same model defaults.",
    ],
    starters: [
      "What's the fastest path from a blank project to a playable prototype?",
      "Which AI provider should I try first and why?",
      "How does the AI Enhance button differ from just asking in chat?",
    ],
  },
  {
    id: "overview",
    title: "Overview tab",
    icon: Target,
    blurb: "Your project's home screen — split into two views. Game Dashboard gives you a health snapshot, design-phase tracker, and live metrics. Game Identity holds the creative DNA: elevator pitch, game bible, mechanic fingerprint, and publisher-facing metadata.",
    body: [
      {
        heading: "Game Dashboard",
        points: [
          "The Dashboard opens with the Design Phase tracker (left column) and Project at a Glance stats (right column). The phase tracker lets you click to advance your project through Concept, Prototype, Alpha, Beta, and Release Candidate, and shows a progress bar indicating how far along you are.",
          "Below the phase row sits the Phase Guide — a collapsible card that shows phase-specific action lists for This Week and This Month, plus a data-driven checklist of the conditions required to advance to the next phase. Items marked 'auto' update in real time from your actual project data (balance score, rule count, playtest sessions). Items without the 'auto' tag are manual checkboxes you tick yourself.",
          "The Game Status Widget follows, surfacing live metrics: entity definition rate, experimental rules count, playtest history, design blockers and concerns, balance score, and a single highlighted 'next step' that tells you the most important thing to do right now.",
          "Further down are the Mechanic Fingerprint radar chart (luck, strategy, interaction, complexity, replayability), Design Complexity score, Design Problems kanban, Decision Log, and the Next Playtest card.",
        ],
      },
      {
        heading: "Game Identity",
        points: [
          "Switch to the Identity tab for the creative soul of the project. This is where you write the elevator pitch — the one or two sentences that describe your game's core experience — along with the narrative seed that the AI weaves into every rule it generates and every enhance it performs.",
          "The metadata fields here — theme, mechanic types, target audience, designer name, publisher notes, age range, complexity tier — give the AI a richer vocabulary to work with and populate your exported publisher pitch deck automatically.",
          "The Game Bible section holds your turn phases, win condition, and elimination rule. These structured fields go into the AI's context alongside your narrative, so generated rules will reference the correct phase names and win conditions.",
        ],
      },
      {
        heading: "Design Problems board",
        points: [
          "The Design Problems section in the Dashboard is a three-column kanban: Blockers (red), Concerns (amber), and Watch (blue). Type a problem and click the appropriate severity icon to add it. Problems you've resolved are automatically tracked and counted.",
          "Blockers appear in the Game Status Widget's risk indicator and affect the Phase Guide's checklist. If you have any open blockers, the widget surfaces them as your highest-priority next step above everything else.",
          "The Decision Log below it is your design journal of record — a timestamped list of choices you made and why, always visible on the Dashboard so collaborators can catch up on your reasoning without digging through notes.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Using the Game Status Widget as a daily health check",
        points: [
          "The Widget's five metrics are all derived from live data — nothing requires manual updates. Entity definition rate shows what percentage of your entities have both a description and at least one property. A low percentage means you've named a lot of things but not given them any mechanical weight.",
          "The balance score displayed in the Widget is the same score computed by the Ontology tab's balance checker. Green means your entity stats are well-distributed across types; red means significant outliers exist. Clicking through to the Ontology tab shows you exactly which entities are pulling the score down.",
          "The 'next step' suggestion at the bottom of the Widget computes a priority order: critical blockers first, then missing foundational content (entities, rules, players), then playtest scheduling, then balance tuning, then experimental rule cleanup. It's a shortcut to the most valuable thing to work on right now.",
        ],
      },
    ],
    pitfalls: [
      "Leaving the description and narrative fields with one-liners. These fields feed every AI response in the project. A three-sentence description produces suggestions that could apply to any game; a three-paragraph description produces suggestions tailored to yours.",
      "Treating the Phase tracker as a vanity milestone and clicking ahead before the checklist is satisfied. The Phase Guide's checklist isn't bureaucracy — its conditions (balance score thresholds, stable rules, playtest counts) are the specific signals that a real phase transition has been earned.",
    ],
    tips: [
      "Open the Dashboard at the start of every session. The Game Status Widget's 'next step' line is the fastest way to decide where to spend the next hour.",
      "Use the Identity tab to write the narrative seed before doing anything else on a new project. Even a rough two-sentence world description unlocks narrative-grounded AI generation across every other tab.",
    ],
    starters: [
      "What should a strong elevator pitch look like for a publisher pitch?",
      "How does the narrative seed change what the AI generates?",
      "What does the balance score in the Status Widget actually measure?",
    ],
  },
  {
    id: "design-phases",
    title: "Design Phases & Phase Guide",
    icon: Flag,
    blurb: "GameForge tracks your game through five design phases — Concept, Prototype, Alpha, Beta, and Release Candidate. The Phase Guide gives you a phase-specific roadmap of what to do this week, this month, and what conditions must be true before you've genuinely earned the next phase.",
    body: [
      {
        heading: "The five phases",
        points: [
          "Concept is where a game begins — an idea with a theme, a rough player count, and a sense of what you want players to feel. No rules need to be written yet. The Phase Guide at this stage focuses on writing your elevator pitch, identifying two or three reference games, and sketching the core loop on paper.",
          "Prototype means you have a first playable version — rough rules, makeshift components, something you can put in front of people and get through a full game. The Guide shifts to logging your first playtests, stabilizing core rules, and defining your entity vocabulary.",
          "Alpha is active iteration. The core loop works; you're tuning balance, resolving design blockers, and running multiple playtest groups. The Guide's This Week list focuses on playtesting and blocker resolution. The Beta Checklist — balance score 70+, zero experimental rules, three or more playtest sessions — defines exactly when you've finished Alpha.",
          "Beta is polish mode. You're running blind tests, tightening rule text, and resolving edge cases. The Phase Guide tracks whether your balance score has reached 80, whether all components are fully defined, and whether you've eliminated every placeholder.",
          "Release Candidate means you're print-ready. The Guide checks for a 90+ balance score, zero open blockers, fully defined entities, and external sign-off. When all conditions pass, the 'Jump to Launch' button becomes active.",
        ],
      },
      {
        heading: "How the Phase Guide checklist works",
        points: [
          "The Next Phase Checklist in the Phase Guide has two kinds of items. Items tagged 'auto' are computed in real time from your project data — balance score thresholds, rule counts, playtest totals, entity completion percentage. They turn green automatically when the condition is met without you doing anything.",
          "Items without the 'auto' tag are manual checkboxes. They require human judgment that can't be derived from the data — things like 'core loop fun (player feedback > 6/10)' or 'rulebook signed off by external testers.' You check these yourself when you've genuinely satisfied them.",
          "The progress bar below the checklist shows the ratio of completed to total items and changes color from blue to lime to emerald as you complete more conditions. The 'Jump to [Next Phase]' button only becomes active when all items are checked — auto or manual — making it a meaningful gate rather than a ceremonial click.",
        ],
      },
      {
        heading: "This Week and This Month",
        points: [
          "Each phase's guide shows two columns of editorial action items: This Week (three high-priority tasks for the current session week) and This Month (three broader goals to complete before phase transition). These are interactive checkboxes stored per phase — ticking them off as you complete them gives you a tangible sense of momentum.",
          "The week and month lists reset per phase, not per calendar week. When you advance to the next phase, you get a fresh set of checkboxes appropriate to that phase. The old phase's checked state is preserved if you ever need to look back.",
          "Think of This Week as your sprint backlog and This Month as your milestone targets. They're designed to feel achievable from wherever you are in the phase, not as exhaustive checklists of everything that could possibly be done.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Why phase gates matter",
        points: [
          "Many games stall because their designers move on to polish work before the core design is stable. Entering Beta with three open design blockers and a balance score of 35 means the polish work is built on a shaky foundation. When the blockers surface in playtesting, the polish has to be undone. Phase gates prevent this.",
          "The Alpha-to-Beta gate is particularly important. The conditions — zero experimental rules, balance score 70+, three or more playtests — force you to confront whether the game is actually ready for polish. Meeting them with real data rather than good intentions is the difference between a confident Beta and a wishful one.",
          "The 'Jump to [Next Phase]' button calling a real save to your project means advancing is a recorded decision, not a casual click. Your design phase history is part of your project's record.",
        ],
      },
    ],
    pitfalls: [
      "Advancing phases before all checklist items are genuinely satisfied, just because the button is accessible. The Phase Guide's conditions are the distilled wisdom of what separates games that ship from games that stay in eternal development. The conditions exist for a reason.",
      "Ignoring the This Week tasks in favor of working on whatever feels interesting. Interesting work is not always the highest-leverage work. The week tasks are ordered by impact at the current phase, not by how exciting they are.",
    ],
    tips: [
      "At the start of each design session, open the Phase Guide and check off any This Week items you completed since last time. Spending two minutes updating the guide gives you a clear sense of where you are before diving into work.",
      "If you're stuck on a design problem and not sure what to do, read the Phase Guide's This Week list. It's likely telling you exactly what the highest-value next action is.",
    ],
    starters: [
      "How do I know when I'm genuinely ready to move from Alpha to Beta?",
      "What does 'balance score 70+' mean and how do I improve it?",
      "Is there a minimum number of playtests before entering Alpha?",
    ],
  },
  {
    id: "research",
    title: "Research & Design Inspiration",
    icon: Compass,
    blurb: "The Research tab is your design intelligence center. It houses your reference game shelf, competitive analysis, AI-powered deep dives into any game's mechanics, and Design Connection — a feature that bridges your inspiration directly into your rulebook.",
    body: [
      {
        heading: "The Inspiration Shelf",
        points: [
          "The Inspiration Shelf is where you build a list of reference games that inform your design. Each game can hold notes on what you're borrowing from it and what you're deliberately avoiding. The shelf is drag-to-reorder, so you can prioritize the games most central to your design.",
          "Once a game is on your shelf, the AI Research button triggers an in-depth AI analysis that populates a structured breakdown: overview, core loop, key mechanics, player count, play time, complexity, design strengths, design weaknesses, and a designer takeaway. This data is stored on the game card and forms the basis for everything else you can do with that reference.",
          "After researching a game, you can expand its card to see the full breakdown, preview a detailed design critique in a dialog, or use Clone / Synthesize to reverse-engineer the game's design DNA into your own project.",
        ],
      },
      {
        heading: "Use This Mechanic — Design Connection",
        points: [
          "Every mechanic listed in a researched game's 'Key Mechanics' section has a [Use this] button. Clicking it triggers Design Connection: the AI reads the mechanic name and the source game, generates a draft rule description tailored to your game's context (drawing on your narrative seed and project metadata), and creates two things automatically.",
          "First, a placeholder rule is added to your Rules tab with the title '[Placeholder] From [Game]: [Mechanic Name]', category set to 'Imported', and the AI-generated rule content in the body. The Imported category gets an orange badge in the rules list, making all your borrowed mechanics visually distinct from original ones.",
          "Second, a task is created and linked to the rule: 'Implement [Mechanic] from [Game].' The task description references the rule ID so you can navigate directly from your task list to the draft rule. Both items are created in one click, with a toast confirmation.",
        ],
      },
      {
        heading: "Competitive Analysis and Similar Games",
        points: [
          "The Competitive Analysis section lets you log games with structured ratings: complexity (1–5), fun factor (1–10), what you love about them, what you'd do better, and free-form notes. This creates a scored comparison table you can refer to when positioning your game against the existing market.",
          "The Similar Games button asks the AI to suggest five published games in the same genre and design space as your project, based on your metadata. These suggestions appear as a dialog with the option to add any of them directly to your Inspiration Shelf.",
          "The Reverse Engineer / Clone dialog lets you select one or more researched games, describe how you want to adapt their design DNA, and have the AI generate a full game concept — entities, core loop, and rules scaffold — synthesizing patterns from your selection. Clone mode preserves names and mechanics faithfully; Synthesize mode creates an original combination.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Getting the most from AI Research",
        points: [
          "AI Research works best for games the AI has strong training data on — well-known hobby titles, classics, games with extensive online discussion. For niche or very recent releases, the AI's breakdown may be thin or slightly inaccurate. Always read the generated content critically and correct any errors before relying on it for design decisions.",
          "The 'Designer Takeaway' section in the AI breakdown is specifically tuned to extract lessons relevant to your project — not generic praise, but design principles you could apply. It reads your project metadata before generating the takeaway, so a game analyzed in the context of a co-op dungeon crawler will produce a different takeaway than the same game analyzed for a competitive trading game.",
          "Use Re-research to refresh a game's breakdown when you've updated your project significantly. The AI will re-analyze the same game against your new metadata and may draw different connections than the first time.",
        ],
      },
      {
        heading: "Design Connection workflow",
        points: [
          "When you click [Use this] on a mechanic, the created rule is intentionally marked as a placeholder — not a finished rule. The Imported category badge is a visual reminder that this rule needs development. Open it, read the AI-generated content, edit it to match your specific game design, and change the category to its permanent home (Combat, Economy, etc.) when you're satisfied.",
          "The linked task is your follow-through mechanism. It sits in your Tasks tab as a concrete reminder that this mechanic still needs to be properly designed and tested, not just named. Check it off when you've promoted the placeholder rule to a finished one.",
          "Use Design Connection as a rapid prototyping tool: import three or four mechanics from different reference games in one session, creating a set of draft rules to react to. It's much faster to iterate on AI-generated starting points than to write rules from scratch.",
        ],
      },
    ],
    pitfalls: [
      "Treating AI Research summaries as authoritative facts. The AI has seen a lot of board game content, but its knowledge of specific rules may have gaps or slight inaccuracies. Verify mechanical details against the actual rulebook before building design decisions around them.",
      "Importing mechanics without adapting them. A mechanic from one game transplanted unchanged into yours will often feel out of place — it was tuned for a different entity vocabulary, player count, and game arc. The [Placeholder] tag exists to remind you that adapting the mechanic is the actual work.",
    ],
    tips: [
      "Start a new project by adding three to five reference games to your shelf before writing any rules. Having analyzed references gives the AI a concrete vocabulary of influences to draw on when you ask for suggestions.",
      "Use the 'borrowing' and 'avoiding' notes on each shelf card as constraint documents. 'Borrowing: the worker placement structure. Avoiding: the downtime during other players' turns.' These notes appear in AI context and actively shape generated suggestions.",
    ],
    starters: [
      "Which of my reference games' mechanics could I adapt most directly?",
      "How do I write 'borrowing' notes that actually change the AI's suggestions?",
      "What's the difference between Clone and Synthesize in reverse engineering?",
    ],
  },
  {
    id: "entities",
    title: "Entities & Component Templates",
    icon: Layers,
    blurb: "The place where you build the vocabulary of your game — every item, faction, location, event, and character that exists in your design. Includes Quick-Create Templates for instantly generating populated, statistically coherent entity batches in one click.",
    body: [
      {
        heading: "Four ways to create entities",
        points: [
          "Manual creation via the Add Entity button gives you full control — name, type, subtype, properties, description, lore, and design notes from scratch. Use this when you have a specific piece clearly in mind.",
          "The Templates button opens the Quick-Create panel, where you select an archetype (Enemy, Item, Location, Faction, Resource, Ability) and configure it by tier and quantity. GameForge generates statistically scaled entities with appropriate stats for the selected tier — a Tier 3 Enemy is meaningfully stronger than a Tier 1 Enemy without you doing any math. Generate 1, 3, or 5 at once.",
          "AI generation via the chat panel: describe what you need and the AI creates a batch as a starting point. Excellent for rapidly building out categories — generate 10 items, keep the 4 that fit, delete the rest.",
          "Duplication via the copy icon on any entity card creates a new entity with all the same fields pre-filled. Useful for building a family of related pieces that share most properties but differ in one or two values.",
        ],
      },
      {
        heading: "Quick-Create Templates in depth",
        points: [
          "Each template archetype comes with a predefined set of stat ranges calibrated to that role in a typical game. Enemies have health, attack, defense, and speed ranges. Items have cost, effect, and durability. Locations have capacity, resource output, and defense. Factions have strength, influence, and member count.",
          "Tier controls the statistical scaling: Tier 1 entities are starter-level, Tier 5 are endgame-level. The generator applies a scaling formula with a small amount of intentional variance — entities at the same tier and archetype are similar but not identical, giving you a realistic spread of values to tune from.",
          "After generating entities from a template, review each one in the list and adjust stats that feel out of range for your game's specific economy. Templates give you a statistically sane starting point; you're expected to tune from there, not treat the generated values as final.",
        ],
      },
      {
        heading: "Properties: giving entities meaning",
        points: [
          "Properties are the numbers and descriptions that turn an entity from a name into a game piece. Numeric properties are especially important because they're what the Simulator and Balance tab use to compare entities. The more consistently you apply properties across your entities, the more useful the analytical tools become.",
          "Properties should contain game data, not storytelling. Use the entity's description field for lore and flavor text. Use properties for numbers and labels that affect how the entity works during play. Mixing these up makes it harder to use balance and simulation tools effectively.",
          "The AI Enhance button on any entity looks at the entity's current fields and suggests missing properties, a tighter name, a clearer description, and related entity ideas. Nothing changes until you accept each suggestion.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "A useful property checklist",
        points: [
          "Cost — what does a player spend to acquire or use this entity? Having a cost property on every entity is the single most important thing you can do for balance analysis.",
          "Effect — what does the entity do, expressed as a number where possible? A weapon that deals 3 damage is more useful to the Simulator than one whose description says 'deals a moderate amount of damage.'",
          "Duration — is the entity's effect instant, persistent, or limited? This affects how the Simulator models the entity's contribution to a game state.",
          "Rarity or tier — how often does this entity appear? This tells the balance tools how much weight to give the entity when computing averages.",
          "Constraints — who can use it, under what conditions, and how often? A constraint property can be text: 'warriors only,' 'once per round,' 'requires adjacent castle.'",
        ],
      },
    ],
    pitfalls: [
      "Generating a large batch from templates and keeping all of them without review. Template-generated entities are a starting point for triage. Five entities you've thought through carefully will do more for your game than fifty the system padded out.",
      "Using property fields for flavor text and storytelling. That's what the description field is for. Properties should contain data the game and its tools can use.",
    ],
    tips: [
      "If you're building a large category — 20 item cards — use Quick-Create Templates to generate a tier-spread first, then add and delete until the set feels right. This workflow is faster than creating each entity manually from scratch.",
      "Add a cost property to every entity, even if your game doesn't use gold. Cost is the foundation the Balance tab uses to compare entities — without it, the chart is incomplete.",
    ],
    starters: [
      "Which properties should every entity have, regardless of type?",
      "How do I use Quick-Create Templates for a game with unusual stat dimensions?",
      "When should I merge two similar entities into one?",
    ],
  },
  {
    id: "players",
    title: "Players tab",
    icon: Users,
    blurb: "Where you define in-game player roles with their starting resources, unique abilities, and progression paths — plus your real-world target audience. The Players tab includes resource progression editing, ability tagging, and asymmetry validation to keep your roles balanced.",
    body: [
      {
        heading: "In-game roles vs. real-world audiences",
        points: [
          "An in-game role describes who the player is inside the fiction — Merchant, Smuggler, Tax Collector, each with distinct starting conditions, unique abilities, or different win conditions. These are the game design choices that affect your rules and balance work.",
          "A real-world audience description — a persona — describes the actual human being who will sit down and play your game. Their gaming experience, patience for rulebook complexity, preferred game length, and group dynamic are design constraints as real as any mechanical one.",
          "You need both, and they answer different questions. In-game roles tell you what to design mechanically. Audience personas tell you how complex the mechanics can be, how long the rulebook can run, and what kind of learning curve is acceptable.",
        ],
      },
      {
        heading: "Resource progression editor",
        points: [
          "Each player role has a Resource Progression section where you define how their core resource (gold, energy, influence, or whatever currency drives your game) accumulates over the course of the game. You set a starting value and define how it grows turn by turn — linear, accelerating, or custom per-turn values.",
          "The progression editor renders a sparkline chart for each role so you can visually compare their resource curves. Two roles with identical starting resources but different growth rates will play very differently — the fast-growing role can afford expensive options early but may be easier to slow down; the slow-growing role may feel constrained early but reach a strong late-game position.",
          "Asymmetry validation runs automatically as you edit progressions. If two roles diverge by more than a configurable threshold at any point in the game arc, the validator flags the specific turns where the gap exceeds balance tolerance. Use this to make informed decisions about whether the asymmetry is intentional and interesting, or accidental and unfair.",
        ],
      },
      {
        heading: "Ability tags and resource naming",
        points: [
          "Each player role's abilities can be tagged by type: Passive, Active, Triggered, Reactive. Tags appear as colored badges in the role view and in the Ontology tab's entity browser. Clicking a tag type in the filter bar shows all roles that have that ability type, making it easy to see whether your design has a mix of ability styles or is weighted toward one pattern.",
          "The resource naming validation ensures each role's resource name is consistent with how that resource is referenced in your rules. If a role calls its currency 'Influence' but your rules say 'Gold,' the validator flags the mismatch so you can decide which name to standardize on before the inconsistency reaches players.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Symmetric vs. asymmetric player roles",
        points: [
          "A symmetric game means every player starts with the same capabilities. These games are generally easier to design, easier to teach, and easier to balance, because every comparison is between identical starting conditions.",
          "A heavily asymmetric game means each player type has meaningfully different rules — different turn structures, different win conditions, different action menus. This creates extremely high replay value but multiplies your design and balance work substantially, because every faction must be tested against every other combination. The asymmetry validator in GameForge is specifically designed to make this work tractable.",
          "The practical limit is how many hours of playtesting you can realistically invest. Design only as many roles as you're willing to fully develop and test.",
        ],
      },
    ],
    pitfalls: [
      "Designing more player types than your game can seat. If your game plays 4, design 4 roles — not 8. The extra ones rarely get fully tested.",
      "Ignoring the asymmetry validator flags. A gap that looks small in the early game often compounds significantly by turns 8–12. The validator's turn-by-turn breakdown is worth reading carefully.",
    ],
    tips: [
      "Name your personas after real people you know whose taste matches your target audience. It's much easier to ask 'would Jamie read this rulebook?' than 'would a mid-tier hobbyist gamer read this rulebook?'",
      "After editing any role's resource progression, switch to the comparison chart view to see all roles' curves simultaneously. Outliers are much more obvious in the comparative view than looking at one role at a time.",
    ],
    starters: [
      "Should my first game be symmetric or asymmetric?",
      "How many player roles is a sustainable number to design and test?",
      "What does the asymmetry validator flag, and when should I ignore it?",
    ],
  },
  {
    id: "ontology",
    title: "Ontology tab",
    icon: Network,
    blurb: "A bird's-eye map of how your entities and rules connect — with a relationship editor, property templates, and a live balance checker that computes a 0–100 balance score and verdict for your entity stat distribution.",
    body: [
      {
        heading: "Relationships with verbs",
        points: [
          "The Ontology tab's relationship editor lets you draw explicit connections between entities and annotate them with a relationship verb: contains, requires, produces, counters, triggers, modifies, grants, costs. These verbs transform a generic 'these two things are connected' into a design statement: 'Castle contains Knight,' 'Spell triggers Event,' 'Resource produces Gold.'",
          "Relationships with verbs are read by the AI during chat and enhance interactions. When you ask the AI to suggest a rule involving Castles, it sees that Castles contain Knights and are produced by Settlements — and can reason about those dependencies rather than treating each entity in isolation.",
          "The visual graph renders relationships as labeled arrows. Clicking any arrow shows the verb and lets you change or delete it. Entities with many incoming arrows are hub pieces — the components most other things depend on. Entities with no arrows are candidates for either development or removal.",
        ],
      },
      {
        heading: "Property templates",
        points: [
          "The Property Templates panel offers one-click scaffolding for common entity types. Selecting 'Weapon' populates a template with cost, damage, range, and weight. Selecting 'Location' gives capacity, resource output, and defense. Selecting 'Faction' gives strength, influence, and member count. You apply a template to an entity and then customize the generated values.",
          "Templates are starting points, not specifications. Every template is editable after application, and you can add or remove properties freely. They save the time of remembering what properties a particular entity type typically needs and typing them out from scratch.",
          "Custom templates can be created by saving any entity's current property set as a template. If you've carefully defined a 'Dungeon Room' entity with exactly the right properties for your game, you can save that as a template and apply it to every room entity in one click.",
        ],
      },
      {
        heading: "Balance checker",
        points: [
          "The Run Balance Check button sends your entity stat distributions to the AI for analysis, returning a 0–100 balance score, a plain-English verdict, and a stat series breakdown showing which entity types are under- or over-powered relative to the group.",
          "The balance score flows back to the Overview tab's Game Status Widget and is used by the Phase Guide's checklist — Alpha requires 70+, Beta requires 80+, RC requires 90+. Running the balance checker regularly keeps those phase conditions in sight.",
          "The stat series charts show you the spread of each key stat (cost, power, speed, etc.) across all entities. A healthy spread has entities distributed across the range. A collapsed spread — everything clustered at the same value — means your entities aren't differentiated enough to create interesting choices.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What the connection patterns tell you",
        points: [
          "Entities that are referenced by many rules are the hub pieces of your design — the components that players interact with constantly. These are your game's core loop made visible. If the 'Resource' entity shows up in 20 rules and the 'Event Card' shows up in 2, your game is fundamentally a resource-management game whether you intended it or not.",
          "When multiple entity types cluster together — when items connect to events, which connect to factions — you've likely found an emergent subsystem: a group of mechanics that interact in ways you may not have fully designed intentionally. These clusters are often what playtesters point to when they say 'that part is really interesting.'",
        ],
      },
    ],
    pitfalls: [
      "Renaming an entity in the Entities tab without also updating every rule that mentions it by name. The connection system matches rule text to entity names as exact text — if you rename 'Iron Sword' to 'Steel Blade' but your rules still say 'Iron Sword,' those rules will lose their connections.",
      "Running the balance checker once, getting a good score, and not running it again as you add entities. Balance is a moving target — adding ten new entities can shift the score significantly without the balance checker telling you until you run it again.",
    ],
    tips: [
      "Keep entity names consistent in spelling and capitalization throughout your rules. The system matches text exactly, so 'Merchant' and 'merchant' are treated as different entities.",
      "Use relationship verbs to document your intended mechanics before you've written the rules for them. Annotating 'City produces Gold' even before you've written the production rule creates a visible design intention that your rule-writing session can fulfill.",
    ],
    starters: [
      "What does it mean if an entity has no linked rules?",
      "How do I interpret the balance score — is 70 good enough?",
      "What's the difference between the Ontology view and the Balance tab charts?",
    ],
  },
  {
    id: "rules",
    title: "Rules tab",
    icon: FileText,
    blurb: "Where you write your game's rulebook — structured by category and section, reorderable by drag-and-drop, with an AI conflict checker, AI generation, section grouping, and visual handling of placeholder rules imported from research.",
    body: [
      {
        heading: "Categories and sections",
        points: [
          "Every rule can be tagged with a category: Movement, Combat, Economy, Turn Structure, Variant, and Imported. Categories receive distinct colored badges in the list. Imported is special — it marks rules created via Design Connection from the Research tab, giving you a visual trail of every mechanic borrowed from a reference game. Once you've adapted a borrowed mechanic fully, change its category to its permanent home.",
          "Sections are a higher-level grouping above categories. You can assign rules to named sections like 'Combat Phase,' 'Setup,' or 'End Game Scoring.' When any rules have sections, the list renders with collapsible section headers, letting you navigate a long rulebook much more quickly. Rules within a section can be dragged to reorder; rules can also be dragged across section boundaries.",
          "Drag-to-reorder works throughout the list regardless of sections. A drag handle appears on the left of each rule card. Dragging a rule above or below another rule reorders them, and if the target rule is in a different section, the dragged rule automatically adopts the target's section.",
        ],
      },
      {
        heading: "AI Generate and AI Enhance",
        points: [
          "The AI Generate button opens a prompt panel where you describe the kind of rules you want and the AI drafts a batch — typically three rules — based on your prompt and your project's narrative seed. Generated rules arrive with categories, priorities, sections, designer notes, and edge cases already populated.",
          "The AI Enhance button on any individual rule opens a preview showing: a tightened rewrite, an improved title, designer's notes explaining the rule's design intent, edge cases the rule doesn't yet address, and suggestions for related rules you may have forgotten to write. Nothing is saved until you accept each change individually.",
          "Narrative-grounded rules — ones where the AI applied your narrative seed to shape the language and tone — receive a purple 'Narrative' badge. This badge persists as a reminder that the rule's wording is tied to your world-building, so you don't strip the flavor out when editing.",
        ],
      },
      {
        heading: "Conflict checker",
        points: [
          "The Conflicts button sends all your rules to the AI for semantic conflict analysis — not keyword matching, but genuine reasoning about whether rules contradict each other, overlap in ambiguous ways, or create unresolvable situations. The AI reads every rule together with your narrative and returns a report with conflict severity (high, medium, low), rule IDs involved, and a suggested resolution.",
          "Conflict checking is most useful after a large rules-writing session or before exporting a rulebook. It catches the kind of 'this rule says A but that rule implies not-A' problems that are easy to introduce when rules are written across multiple sessions.",
          "An empty conflicts report — the AI found no conflicts — is genuinely meaningful because the check is semantic, not syntactic. Zero conflicts means the AI couldn't find logical contradictions in your rule text, which is a stronger signal than a search that wouldn't catch them anyway.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Working with Imported (placeholder) rules",
        points: [
          "Rules created by Design Connection arrive with the '[Placeholder]' prefix and the Imported category. They're fully functional entries in your rules list and will appear in exports if you don't address them — which would give a publisher a rulebook full of placeholder content. Make reviewing and promoting Imported rules part of your pre-export checklist.",
          "A healthy workflow is to let several mechanics accumulate as placeholders across multiple research sessions, then dedicate a focused session to developing them. Open each Imported rule, edit the content to match your specific game design, remove the '[Placeholder]' prefix from the title, and change the category to its permanent home. Check off the corresponding task when done.",
          "The Phase Guide's checklist tracks the count of Imported rules as part of 'All rules stable (0 experimental, 0 placeholders).' Advancing to Beta requires this condition to be satisfied, which means every imported mechanic has been either adapted or deliberately cut.",
        ],
      },
    ],
    pitfalls: [
      "Writing rules as long, flowing paragraphs. Rules that read like prose are difficult to parse under the pressure of a live game. Short sentences and bullet-style clarity are your friends.",
      "Accepting an AI rewrite of your rule without reading it carefully. The AI occasionally clarifies a rule by subtly changing its meaning — introducing a constraint that wasn't there before, or removing one that was intentional. Always compare the AI's version to yours before accepting.",
    ],
    tips: [
      "Assign Priority 5 to any rule that applies during setup or on every turn. Assign Priority 1 to variants and optional rules. Priority ordering determines how exported rulebooks teach your game.",
      "Run the conflict checker before every export, not just when you suspect a problem. The most dangerous conflicts are ones you didn't know existed.",
    ],
    starters: [
      "How do I write a rule that strangers can follow without my help?",
      "What should I do with Imported placeholder rules before exporting?",
      "When should I use AI Generate vs. writing rules manually?",
    ],
  },
  {
    id: "notes",
    title: "Notes tab",
    icon: StickyNote,
    blurb: "Your personal design journal — now with linked notes, topic tagging, a 'look at later' flag, and an AI Digest that synthesizes your entire notes collection into a prioritized action summary.",
    body: [
      {
        heading: "Note linking and topics",
        points: [
          "Every note can be assigned a topic tag — a short label like '#combat,' '#economy,' or '#lore' — and linked to other notes in your collection. The See Also section of each note's edit form shows a multi-picker where you choose related notes by title. When viewing a note, the linked notes appear as clickable chips at the bottom, letting you navigate between connected ideas without searching.",
          "Topics use a structured JSON format internally, which means you can have both a plain-text tag and multiple note links attached to the same note. The display always renders the human-readable tag and the linked note titles — you never interact with the underlying structure.",
          "Use linking to build concept clusters: group your three combat-related notes together, or link your lore notes to the rules they inform. Over time, linked clusters become visible design documents — 'here are all the things I thought about before writing the combat rules.'",
        ],
      },
      {
        heading: "Look at Later flag",
        points: [
          "The clock icon on any note card toggles the 'Look at Later' flag. Flagged notes are visually distinguished in the list and can be filtered to show only flagged items. Use this flag for notes that contain an unresolved idea you don't want to act on immediately but also don't want to lose in the pile.",
          "The AI Digest feature respects the Look at Later flag — it explicitly surfaces flagged notes in its summary, treating them as items that have been waiting for attention. This means the Digest is a useful tool for clearing your backlog: run it, see which flagged notes the AI considers most important, and decide whether to act on or archive each one.",
          "Keep the flagged list short. If you have 15 'look at later' notes, the flag has lost its meaning. It should function as a 'needs attention soon' marker, not a way to avoid making decisions.",
        ],
      },
      {
        heading: "AI Digest",
        points: [
          "The AI Digest button in the Notes header sends all your non-digest notes to the AI with a request to synthesize them into a prioritized summary. The result appears as a pinned blue 'AI Digest — [date]' note at the top of your list.",
          "The Digest is designed to surface three things: the strongest unresolved design tensions across your notes, the most promising ideas that haven't yet become rules or tasks, and any Look at Later items that the AI thinks deserve immediate attention. It reads your notes as a collection, not one by one.",
          "Generate a Digest at the start of major milestone sessions — before exporting, before advancing phases, before a big playtest series. It functions as a curator that tells you which of your scattered thoughts matter most right now.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Notes vs. Rules vs. Tasks — where things belong",
        points: [
          "Rules contain what players do — player-facing text. Notes contain why you made decisions — internal documentation. Tasks contain what you need to do — actionable next steps. The Exports tab pulls rules into your printable rulebook; it does not pull notes or tasks.",
          "If you find yourself writing 'I decided to...' or 'The reason for this is...' or 'We tried X but rejected it because...' — that belongs in Notes. If you're writing 'Players must...' or 'On your turn, you may...' — that belongs in Rules.",
          "Playtest feedback belongs in the Playtesting tab, attached to the session it came from. Notes is your inner monologue and design reasoning, not a feedback archive. Keeping these separate makes it easy to distinguish between what you believe and what players told you.",
        ],
      },
    ],
    pitfalls: [
      "Letting Notes become an undated, untagged pile of one-liners. Two months from now you'll remember you had a great idea but won't be able to find it. Even a brief topic tag per entry makes an enormous difference.",
      "Using the Look at Later flag as a way to avoid making decisions. Flag notes you genuinely intend to return to. Notes you're keeping 'just in case' can be archived or deleted — a smaller notes list is a more useful one.",
    ],
    tips: [
      "Once a week, scan your Notes for entries that have become concrete enough to be promoted to Rules or converted into Tasks. Active, living notes stay useful. Notes that accumulate without being acted on become an archive you never read.",
      "Run the AI Digest before each significant playtest series. It often surfaces an overlooked note that turns out to be exactly the design problem you're about to test.",
    ],
    starters: [
      "What's worth writing in Notes vs. putting directly into Rules?",
      "How should I use note linking to organize my design thoughts?",
      "When should I run the AI Digest and what can I do with the result?",
    ],
  },
  {
    id: "tasks",
    title: "Tasks tab",
    icon: CheckSquare,
    blurb: "A project management hub scoped to your game design. Features dependency linking, task templates for common design workflows, snapshot-based revert for undoing changes since you opened a task, and a changelog that shows what's changed over a task's lifetime.",
    body: [
      {
        heading: "Creating and managing tasks",
        points: [
          "Tasks can be created manually, saved from AI chat replies with one click, or generated automatically by Design Connection (when you use [Use this mechanic] in the Research tab, a linked task is created alongside the placeholder rule). Each task has a title, description, status (To Do, In Progress, Done), priority (Low, Medium, High), category, assignee, and due date.",
          "The Dependencies section of any task's detail drawer lets you add links to other tasks with a relationship type: 'depends on,' 'blocks,' or 'relates to.' A task that is blocked by an open dependency shows a warning banner in its header. The dependency graph prevents you from accidentally closing a task that other tasks are still waiting on.",
          "The task list can be filtered by status and priority. High-priority items appear with a bright indicator; blocked items show their blocking dependency count. This makes it easy to find the tasks that are both ready to work on and most important.",
        ],
      },
      {
        heading: "Task templates",
        points: [
          "The Templates button opens a modal with pre-built task sets for common design workflows: Alpha Sprint (playtest prep, blocker resolution, balance check), Rules Polish (rewrite pass, conflict check, edge case audit), Publisher Prep (pitch deck, one-pager, prototype documentation), and others.",
          "Applying a template creates all tasks in the set at once, with appropriate priorities and placeholder descriptions. Templates are starting points — edit the descriptions to match your specific situation, and delete any tasks that don't apply to your project.",
          "Templates are especially useful when starting a new design phase. After clicking 'Jump to Beta' in the Phase Guide, apply the Beta Sprint template to immediately populate your task list with the right goals for that phase.",
        ],
      },
      {
        heading: "Snapshot-based revert and changelog",
        points: [
          "When you open a task's detail drawer, GameForge takes a snapshot of the task's current state: status, priority, and description. If you make changes during that session and want to undo them, the 'Revert to when opened' button restores all three fields to the snapshot values.",
          "The Changes Since Opened panel appears automatically when any field has drifted from the snapshot. It lists each changed field with its before and after values. This gives you a clear record of what you've edited in the current session before you commit to saving.",
          "The changelog in the task detail drawer shows a timestamped history of changes made by all team members across all sessions — not just the current one. Use it to understand how a task evolved, who changed its priority, and what was in the description before the last edit.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What should be a task",
        points: [
          "A task should describe concrete, completable work — something you can look at in a week and say either 'done' or 'not done.' Good tasks include things like 'generate six enemy entity cards for the mid-game deck,' 'rewrite the economy rules to remove the draw-back-to-four loop,' or 'schedule a playtest session before the end of the month.'",
          "Anything that's blocking your next playtest session deserves a task with high priority. Playtest sessions are your most valuable feedback opportunity, and anything that prevents you from running one effectively costs you real design time.",
          "Tasks created by Design Connection always reference their linked rule in the description (e.g., 'Draft rule created — Rule #42. Review and finalize the Worker Placement mechanic.'). This reference means you can navigate from a task directly to the rule it describes.",
        ],
      },
    ],
    pitfalls: [
      "Treating the Tasks tab as a wish list. A 200-item task backlog isn't a plan — it's a pile that makes you feel overwhelmed every time you open it. Close or delete tasks you no longer believe in. A shorter list you actually use is worth more than a comprehensive list you avoid.",
      "Marking everything as high priority. When every task is urgent, the priority label loses its meaning and you're back to making arbitrary decisions about what to do next.",
    ],
    tips: [
      "At the start of every design session, open the Tasks tab and read through it before doing anything else. Close anything you no longer care about. Move one or two things to In Progress for the session.",
      "Apply a phase template immediately after advancing to a new design phase. It takes 30 seconds and gives you a clear, appropriately scoped task list for the phase you're entering.",
    ],
    starters: [
      "When should I create a task instead of writing a note?",
      "How do task dependencies help me manage a complex design sprint?",
      "What's the best way to use task templates for a new design phase?",
    ],
  },
  {
    id: "simulator",
    title: "Simulator tab",
    icon: FlaskConical,
    blurb: "Run automated playtest scenarios using your entities and rules. The Simulator plays through your game many times on its own, surfacing dominant strategies and pacing problems long before you can get enough human players around a table to catch them.",
    body: [
      {
        heading: "How it works",
        points: [
          "The Simulator reads your current entities and rules and asks the AI to play through your game repeatedly, making decisions at each turn. It runs the game many times — you can choose how many — and collects statistics across all those runs: which strategies won most often, how long games lasted, how wide the score gaps were at the end.",
          "Think of it as a stand-in for playtesting time you don't yet have. Instead of needing 50 friends to play your game 50 times, you can run 100 simulated games in a few minutes and get early signals about structural problems. The results won't replace human feedback, but they'll help you prioritize where to focus your real playtesting.",
          "You can adjust the simulation parameters: how many games to run, how many players to simulate, and the decision-making style of the simulated players. A 'random' style means simulated players make choices essentially at random, which is useful as a baseline. An 'optimal' style means simulated players try to win as effectively as the AI can reason, which reveals what the ceiling of your game's strategy space looks like.",
        ],
      },
      {
        heading: "Reading and acting on results",
        points: [
          "If one strategy is winning a significantly higher proportion of games than others — say, more than 65 to 70 percent of runs — that strategy is dominant. Dominant strategies are a balance problem, because once experienced players discover them, your game's strategic variety collapses. Look at what rules and entities enable that strategy and consider adjusting their costs, effects, or availability.",
          "If games are consistently running much longer than your target duration, there's usually a rule creating a slow loop somewhere — a cycle of acquiring and spending resources that doesn't push the game toward an ending.",
          "If the length of games varies enormously — some ending in 8 turns, others running 40 — your end-game trigger is fragile. It's being activated at wildly different times depending on starting conditions or early decisions, which means players can't tell when the game is winding down and can't plan appropriately.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What the Simulator is genuinely good at vs. what it cannot do",
        points: [
          "Good at: spotting dominant strategies, detecting runaway leader (snowball) effects, estimating game length against your target, and identifying entities that winning players rarely choose.",
          "Cannot do: simulate social dynamics (bluffing, negotiation, table politics), simulate real-time or simultaneous-action mechanics, or capture whether the game feels fun. Simulation results are about structure and math, not about feel.",
          "Always treat simulation results as a starting hypothesis to explore with real players, not as a final verdict. The goal is to use the Simulator to rule out obvious structural problems before putting the game in front of humans, not to replace human testing.",
        ],
      },
    ],
    pitfalls: [
      "Running a small number of simulations and treating the results as reliable. With very few runs, one unusual game can skew your statistics significantly. Run at least 100 games to get a stable signal.",
      "Dismissing the 'optimal play' results because you assume real players won't play that way. The optimal-play scenario represents the ceiling of your game's strategy space. If it's broken at the ceiling, experienced players will eventually find it.",
    ],
    tips: [
      "Before you tune anything, run a baseline simulation with random decision-making. This tells you what your game looks like when no one is trying to win strategically.",
      "Run a simulation, make one targeted change to a rule or entity, then run the simulation again with the same parameters. Comparing the two sets of results tells you whether your change moved things in the right direction.",
    ],
    starters: [
      "How many simulated games do I need to run before I can trust the results?",
      "What does it mean when one strategy wins 80% of the time?",
      "Should I worry about high variation in how long games last?",
    ],
  },
  {
    id: "balance",
    title: "Balance tab",
    icon: BarChart3,
    blurb: "Visualize the numerical relationship between your entities' costs and their effects. This tab turns a vague sense that something might be overpowered into a concrete chart you can point to and act on — and feeds the balance score you see throughout the platform.",
    body: [
      {
        heading: "What the charts show",
        points: [
          "The Balance tab generates charts based on your entities' numeric properties — specifically the relationship between what an entity costs and what effect it produces. For a weapon, that might be the relationship between its gold cost and its damage value. For a spell card, it might be between its energy cost and the points it generates.",
          "The Ontology tab's balance checker provides a companion view: a 0–100 balance score and AI-generated verdict that flows back to the Overview tab's Game Status Widget and into the Phase Guide checklist. Running the balance checker and then visiting the Balance tab gives you both the algorithmic score and the visual chart together.",
          "There's also a category frequency chart that shows how often each rule category was triggered in Simulator runs. This tells you what kind of game your players are actually playing versus what you intended.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Reading the cost-versus-power chart",
        points: [
          "The chart places each entity on a grid with cost on one axis and power on the other. A well-balanced game produces a roughly diagonal line from bottom-left to top-right: things that cost more are roughly more powerful.",
          "An entity that appears significantly above the line — more powerful than its cost justifies — is probably the dominant choice. Players who figure this out will always pick it, which reduces strategic variety.",
          "An entity well below the line is a trap. Players who pick it are wasting resources compared to better alternatives. Over time they'll stop picking it entirely.",
          "A perfectly linear chart is not necessarily the goal. A little intentional variation is what creates interesting strategic choices — the cheaper option with a downside, the expensive option that's occasionally worth it.",
        ],
      },
    ],
    pitfalls: [
      "Trying to make every entity land exactly on the cost curve. Perfect mathematical symmetry often produces a game where every choice feels equally uninteresting. A small amount of intentional variation is what creates strategy.",
      "Treating the charts as the final word on whether something is balanced. Numbers are balanced when the game feels fair to players sitting around a table, not when the chart looks clean.",
    ],
    tips: [
      "Before fully trusting the Balance charts, manually check three or four of your most powerful entities by calculating their cost-to-effect ratio by hand. If the chart matches your intuition, you can trust it more confidently for the others.",
      "When balancing a specific type of entity — say, all your weapon cards — compare them against each other rather than against your entire entity list. Weapons should be balanced relative to other weapons first.",
    ],
    starters: [
      "What does an overpowered entity look like on the cost chart?",
      "Is it a problem if some rule categories rarely trigger?",
      "How do I know when my game's balance is good enough to show to players?",
    ],
  },
  {
    id: "assets",
    title: "Assets tab",
    icon: Image,
    blurb: "Generate visual mockups of your game's components — cards, boards, tokens, character art, box covers — using AI image generation. Useful for making your prototype feel real during playtests and for building a pitch deck.",
    body: [
      {
        heading: "The visual style description",
        points: [
          "At the top of the Assets tab, you'll set a visual style description that applies to everything you generate. Think of it as a shared art direction note: a description of the look and feel you want all your components to share. You set it once, and every image generated from this project uses it as a starting point.",
          "The more specific and evocative your visual style description, the more consistent and usable your results will be. Vague descriptions like 'fantasy' or 'dark and moody' produce generic results. Specific ones — 'hand-painted watercolor, muted earth tones, 1920s expedition aesthetic with aged paper textures' — give the AI a concrete visual vocabulary to work within.",
          "When you generate images across multiple sessions, re-read your visual style description before starting. It's easy for it to drift slightly in your mind over time, and regenerating components with a slightly different mental picture in mind produces a visual inconsistency that can be hard to trace.",
        ],
      },
      {
        heading: "Generating components",
        points: [
          "The Assets tab offers preset component types — Card, Board, Token, Dice, Character, Map, Box Cover, Logo — each tailored to its specific shape and context. Clicking any preset generates an image appropriate to that component type using your visual style description and the context of whichever entity you've selected.",
          "There's also a free-form prompt option for anything the presets don't cover. Generated images attach to the entity they were created for, so if you generate card art for a Merchant entity, you can find that art by opening the Merchant entity later.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Getting usable card and character art",
        points: [
          "Describe the framing of the image the way a photographer or illustrator would. 'Centered subject, head and shoulders, three-quarter angle, simple muted background' tells the AI exactly how to compose the shot.",
          "Specify the artistic finish to avoid generic results. Words like 'matte illustration,' 'watercolor,' 'ink linework,' 'oil painting' direct the AI toward a style. Without them, the AI tends to default to a glossy, photorealistic 3D look that rarely matches the tone of a hand-crafted board game.",
          "Never include readable text in your image prompts. AI image generators consistently produce garbled, illegible text. Design the text layer of your cards separately and overlay it on the generated image.",
        ],
      },
    ],
    pitfalls: [
      "Letting your visual style description drift from session to session. If you add details or change emphasis over time, later-generated images will look slightly different from earlier ones.",
      "Treating AI-generated images as final production art. Build them into your workflow as prototype and pitch assets — they're the sketch, not the painting. Budget for human illustration if you plan to publish.",
    ],
    tips: [
      "Add your own OpenAI API key in workspace settings if you're hitting generation rate limits. This gives you a dedicated quota rather than sharing the platform's pool.",
      "Keep only the best one or two images per concept and delete the rest. A bloated asset library where you've saved every variant makes it slow and confusing to find the images you actually want to use.",
    ],
    starters: [
      "How do I write a visual style description that produces consistent results?",
      "Can I use AI-generated images in a commercially published game?",
      "Which component types should I generate first for a publisher pitch?",
    ],
  },
  {
    id: "playtesting",
    title: "Playtesting tab",
    icon: Beaker,
    blurb: "Where you log your playtest sessions, capture what you observed and heard, and share feedback forms with players who tested your game. Playtesting is the highest-leverage activity in game design — this tab keeps it organized.",
    body: [
      {
        heading: "Shareable feedback links",
        points: [
          "Each playtest session in GameForge can generate a shareable link that opens a feedback form. Your playtesters can fill it out from any device without creating an account. The responses flow back into the session record automatically.",
          "The link is tied to the specific session and stops accepting responses when you close the session. This makes it safe to share on social media or in an email thread.",
          "This feature is especially useful for remote playtesters or for groups that scatter quickly after a game. A short digital form they can complete on the train home often captures more honest and complete feedback than a rushed in-person debrief.",
        ],
      },
      {
        heading: "What to record in each session",
        points: [
          "Each session log captures the basics — date, number of players, total playing time, and how many full turns were completed. Tracking these across sessions reveals whether your game is getting longer or shorter as you make changes.",
          "The free-form notes field is where you capture what you actually saw and heard at the table — moments of confusion, surprising decisions players made, rules they got wrong without asking, and anything that made players laugh or groan.",
          "The most important and most often skipped field in any session log is 'what changed since last time.' Recording what you changed between sessions — even briefly — is what allows you to connect a session's results to a specific decision.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Coached vs. blind playtests — which to run when",
        points: [
          "A coached playtest is one where you teach the rules yourself, answer questions, and guide players through their first turns. This tests the game: the mechanics, the balance, the pacing. It removes the rulebook as a variable, which is useful when the design itself is still evolving.",
          "A blind playtest is one where you hand players only the written rulebook and leave the room. This tests the rulebook: whether your writing is clear enough that strangers can follow it without help.",
          "Run coached playtests for the first several sessions, until the game itself feels fundamentally solid. Then switch to blind playtesting to refine the rulebook. The Phase Guide's Beta checklist specifically requires blind test evidence.",
        ],
      },
    ],
    pitfalls: [
      "Asking 'did you have fun?' at the end of a session. Almost everyone answers yes, because they don't want to hurt your feelings. Ask instead: 'What's the first thing you'd change?' or 'When did you feel most frustrated?'",
      "Redesigning a rule or mechanic after one playtest session in which players complained about it. One complaint is a data point. The same complaint from three independent sessions is a pattern worth acting on.",
    ],
    tips: [
      "Write down how long your rules teach took in every session log. If it's consistently creeping past eight or ten minutes for a game that should take 45 minutes to play, your rulebook structure needs work.",
      "For in-person sessions, consider bringing printed feedback forms that players fill out at the table right after the game ends. Paper forms get filled out before the debrief conversation, rather than being shaped by it.",
    ],
    starters: [
      "What questions should I always ask my playtesters after a session?",
      "How many playtest sessions before I should trust a balance change?",
      "When is the right time to switch from coached to blind playtests?",
    ],
  },
  {
    id: "storyboard",
    title: "Storyboard tab",
    icon: Film,
    blurb: "A tool for mapping the emotional journey of your game — the progression from setup to finale, beat by beat. Board games rarely get this treatment, and it shows in games that feel either too flat or too chaotic.",
    body: [
      {
        heading: "Why map the arc of a board game",
        points: [
          "Most game designers think in rules, but players experience games as a sequence of emotional moments. Storyboarding forces you to articulate those moments explicitly — the first big decision, the moment when a strategy comes together, the crisis where everything is in play, the final push.",
          "It also reveals pacing problems that rules alone won't show you. A game might have excellent individual mechanics and still feel flat in the middle or anticlimactic at the end, because the rules don't naturally create rising tension or a satisfying climax.",
          "The Storyboard tab pairs naturally with the Simulator. Once you have a sense of your intended emotional arc, you can compare it against what the Simulator tells you about actual game length and pacing, and close the gap between intention and reality.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "A five-beat arc that works in most board games",
        points: [
          "Beat one — Setup: quiet and instructional, with minimal meaningful decisions. Keep this short — a setup phase that runs more than five minutes starts to feel like work before the fun begins.",
          "Beat two — Opening: the first real decisions appear. Players start acquiring resources, staking out territory, or building toward their strategy. The emotional tone is curiosity and optimism.",
          "Beat three — Midgame escalation: strategies have taken shape, conflicts are beginning, and the gap between players is becoming visible. The emotional tone is tension and commitment.",
          "Beat four — Endgame trigger: a visible countdown begins. Players can see the end coming and start making decisions with urgency. The emotional tone is urgency and focus.",
          "Beat five — Final scoring: short, decisive, and clean. The result should feel earned — either satisfying or surprising, but not arbitrary.",
        ],
      },
    ],
    pitfalls: [
      "Building the storyboard at the beginning of a project and never updating it. Pacing drifts as rules are added and removed. Revisit your storyboard after every major rules change.",
      "Planning only the moments you're excited about and ignoring the transitions. Setup, downtime between turns, and final scoring are where games lose players.",
    ],
    tips: [
      "Label each beat with a target emotion — 'curiosity,' 'tension,' 'urgency,' 'relief.' Then, in your playtest sessions, observe whether the table actually feels that emotion at that point in the game.",
      "If two adjacent beats in your storyboard have the same target emotion, you may have a flat stretch — a portion of the game where the experience doesn't change or escalate.",
    ],
    starters: [
      "What does a healthy emotional arc look like for a 60-minute strategy game?",
      "How do I fix a midgame that players describe as slow?",
      "Should my endgame trigger be a hard turn limit or something more dynamic?",
    ],
  },
  {
    id: "exports",
    title: "Exports tab",
    icon: Download,
    blurb: "Generate shareable documents from your project — printable rulebooks, component sheets for print-and-play production, and presentation decks for pitching to publishers or crowdfunding backers.",
    body: [
      {
        heading: "What you can export",
        points: [
          "A formatted rulebook that pulls all your rules organized by category, section, and priority, followed by an entity glossary built from your Entities tab. Rules with the Imported (placeholder) category are highlighted in the export — a reminder to resolve them before sending the document to anyone.",
          "A pitch deck for publishers or crowdfunding, generated as a presentation that covers your game's concept, mechanics, player count, target audience, and visual style. This pulls from your Game Identity metadata — theme, mechanic types, audience, elevator pitch — and is much richer when those fields are filled in.",
          "Print-and-play layout files that combine your generated asset images with your entity data into sheets players can print, cut, and use at the table.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Before you export: a quick checklist",
        points: [
          "Have you given every rule a category and a priority? Rules without categories export in an unordered group. Rules without priorities all appear with equal weight.",
          "Are any rules still marked Imported (placeholder)? These will appear in the export with their placeholder prefix, which looks unfinished to a publisher.",
          "Does every entity have at least a brief description? The entity glossary in the exported rulebook looks thin if entities are defined only by their properties.",
          "Is your project metadata — name, description, player count, duration, game type, theme — fully filled in? This information becomes the cover page and introduction of your exported rulebook.",
          "What does the Phase Guide say about readiness? Exporting a rulebook while the Phase Guide shows 8 unchecked items is a signal that the design isn't ready for external eyes.",
        ],
      },
    ],
    pitfalls: [
      "Exporting repeatedly without making substantive changes in between. Exports are useful as milestones and checkpoints, not as a weekly ritual.",
      "Leading with the rulebook when approaching a publisher for the first time. Send the pitch hook and the one-page summary first, and offer to send the full rulebook if they're interested.",
    ],
    tips: [
      "Use the act of exporting as a forcing function — if the resulting PDF reveals missing descriptions, uncategorized rules, or placeholder rules, add those gaps to your task list before doing anything else.",
      "Maintain one export that you think of as your pitch packet: the hook paragraph, the one-page summary, and a table setup image. Keep it updated and immediately shareable.",
    ],
    starters: [
      "What should I include in a first pitch to a publisher?",
      "How polished does the game need to be before my first export?",
      "What's the difference between a publisher pitch deck and a rulebook export?",
    ],
  },
  {
    id: "chat",
    title: "Chat panel",
    icon: MessageSquare,
    blurb: "Your AI co-designer, always one panel away. It maintains separate conversation histories for each tab, reads your complete project context before every response, and lets you save any reply to Notes or Tasks in one click.",
    body: [
      {
        heading: "Choosing which AI provider to use",
        points: [
          "The chat panel lets you switch between AI providers — Claude, GPT, Gemini, and Grok — from a dropdown menu. Claude tends to excel at long, structured outputs — detailed rule analyses, comprehensive suggestions, careful reasoning through complex problems. Gemini tends to be fast and good for rapid brainstorming. GPT tends toward crisp, well-edited prose. Grok tends toward more playful, unexpected suggestions, useful when you're stuck and want something genuinely different.",
          "You don't have to commit to one provider for everything. Switching mid-project — or even mid-session — is normal and often productive. If one model isn't giving you useful answers on a particular problem, try a different one.",
        ],
      },
      {
        heading: "What you can do with each message",
        points: [
          "Hover over any message from the AI to reveal action buttons. The most useful are Save to Notes and Save to Tasks, which let you capture the AI's response in the appropriate tab with one click. This makes it easy to capture useful ideas without losing your place in the conversation.",
          "Each tab in GameForge maintains its own separate chat history. The conversation you have on the Rules tab won't appear in the Ontology tab's chat. This keeps context organized naturally.",
          "You can collapse the chat panel entirely by clicking the chevron button in its header. The panel remembers this state, so it will still be collapsed the next time you open the project.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "How to write prompts that get useful answers",
        points: [
          "Be specific about the constraints your answer needs to satisfy. Instead of asking 'how should my combat work?', try 'suggest three combat resolution options for a 2–4 player game targeting 45 minutes, with no dice, where the active player always acts first.'",
          "Give the AI a perspective to take. 'You are a skeptical playtester who has been burned by confusing rules — identify every potential ambiguity in this rule' is more productive than 'check this rule.' A defined perspective gives the AI a lens to look through.",
          "Ask for structured output when you need to compare options. 'Give me five alternative mechanics for resource acquisition, each with one advantage and one drawback' is much easier to work with than 'what are some ideas for resource acquisition?'",
          "When an answer isn't useful, close the conversation and start a new one with a more precise prompt. AI models do not get better through debate — they get better through clearer instructions.",
        ],
      },
    ],
    pitfalls: [
      "Treating AI responses as authoritative facts about game design. The AI is a brainstorming partner — it produces plausible-sounding suggestions, not verified truths. Playtest every mechanic the AI suggests before building around it.",
      "Letting a single chat thread grow to 50 or more messages. Very long threads tend to produce lower-quality responses. Start a fresh conversation per topic, and save the useful outputs to Notes or Tasks before clearing the thread.",
    ],
    tips: [
      "Save the AI's best responses to Notes immediately, before the thread gets longer. Replies that feel useful now are easy to lose track of five pages of conversation later.",
      "If a conversation stalls, switch to a different AI provider. A different model often approaches the same problem from a completely different angle, which can break through a creative block.",
    ],
    starters: [
      "Which AI provider tends to be best for which kind of task?",
      "How do I write a prompt that gets a specific, useful answer?",
      "When should I use the Enhance button instead of the chat panel?",
    ],
  },
  {
    id: "ai-providers",
    title: "AI Providers",
    icon: KeyRound,
    blurb: "Workspace-level settings for which AI providers your team has access to, and the option to connect your own account with any of the supported providers to manage your own usage and billing.",
    body: [
      {
        heading: "Enabling and disabling providers",
        points: [
          "The AI Providers settings let workspace owners and administrators control which AI providers — Claude, GPT, Gemini, Grok — are available to anyone in the workspace. Disabling a provider removes it from the dropdown in the chat panel and prevents any AI calls from routing to it.",
          "This is useful when your team has a budget or policy that restricts certain external services. Disabling a provider does not delete any previous conversations — chat history from that provider remains readable.",
        ],
      },
      {
        heading: "Connecting your own AI account",
        points: [
          "Each major AI provider — Anthropic (Claude), OpenAI (GPT), Google (Gemini) — lets you create an account and generate an API key. You can paste that key into GameForge's provider settings, and from that point on, all AI calls from your workspace use your account rather than the platform's shared pool.",
          "Your key is encrypted and stored securely — not in plain text anywhere. You can replace it or delete it from your settings at any time. When you replace a key, the old one stops being used immediately.",
          "You can have keys configured for multiple providers simultaneously, so the workspace can access Claude through your Anthropic account, GPT through your OpenAI account, and Gemini through your Google account, all at the same time.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "When connecting your own account makes sense",
        points: [
          "You're hitting usage limits on the platform's shared pool. Every GameForge account has access to a shared quota of AI calls — when that quota is being used by many people simultaneously, you may occasionally get rate-limited. Connecting your own account gives you a dedicated quota.",
          "Your organization requires AI usage to be billed to a specific account for accounting or compliance reasons.",
          "You want to access a specific model version that isn't available through the platform's default. AI providers regularly release new model versions, and your own account may give you access to versions that aren't yet available through GameForge's shared integration.",
        ],
      },
    ],
    pitfalls: [
      "Locking your workspace into one provider for all tasks. Different kinds of work genuinely benefit from different models. Leaving all providers available and choosing based on the task at hand produces better results.",
      "Forgetting to rotate a key if it's ever accidentally exposed — for example, on a shared screen during a video call. Rotating a key is a two-minute task: generate a new one from your provider's account dashboard, paste it into GameForge, and the old one stops working immediately.",
    ],
    tips: [
      "Only workspace owners and administrators can see and modify the AI Providers settings. If you're a collaborator and don't see the menu item, ask whoever created the workspace to configure it.",
    ],
    starters: [
      "When does it make sense to connect my own AI provider account?",
      "Which provider tends to be most affordable for brainstorming tasks?",
      "What happens to my chat history if I disable a provider?",
    ],
  },
];

export function BibleContent({ initialChapterId }: { initialChapterId?: string }) {
  const [activeIdx, setActiveIdx] = useState(() => {
    if (!initialChapterId) return 0;
    const idx = CHAPTERS.findIndex((c) => c.id === initialChapterId);
    return idx >= 0 ? idx : 0;
  });
  // Per-user bible completion artifact: { completed: string[] }
  const { state: bibleArtifact, setState: setBibleArtifact } = useUserArtifact<{ completed: string[] }>(
    "learn-bible-completed",
    () => ({ completed: [] }),
    undefined,
    () => {
      try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return null;
        return { completed: (parsed as unknown[]).filter((s): s is string => typeof s === "string") };
      } catch { return null; }
    },
    () => { try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ } },
  );
  const completed = useMemo(() => new Set(bibleArtifact.completed), [bibleArtifact.completed]);

  const toggleComplete = (id: string) => {
    setBibleArtifact((prev) => {
      const next = new Set(prev.completed);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { completed: [...next] };
    });
  };

  const progress = useMemo(() => Math.round((completed.size / CHAPTERS.length) * 100), [completed]);
  const chapter = CHAPTERS[activeIdx];
  const Icon = chapter.icon;
  const isDone = completed.has(chapter.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar */}
      <Card className="bg-card border-border h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Chapters</CardTitle>
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completed.size}/{CHAPTERS.length} read</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
          {CHAPTERS.map((c, i) => {
            const ItemIcon = c.icon;
            const done = completed.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setActiveIdx(i)}
                data-testid={`bible-ch-${c.id}`}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                  i === activeIdx ? "bg-primary/15 text-primary" : "hover:bg-muted text-foreground"
                }`}
              >
                <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="flex-1 truncate">{c.title}</span>
                {done && <Check className="h-3.5 w-3.5 text-emerald-500" />}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Body */}
      <div className="space-y-5">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Badge variant="outline" className="mb-1.5 text-[10px] uppercase tracking-wider">
                  Chapter {activeIdx + 1} of {CHAPTERS.length}
                </Badge>
                <CardTitle className="text-2xl">{chapter.title}</CardTitle>
                <CardDescription className="text-base mt-1.5">{chapter.blurb}</CardDescription>
              </div>
              <Button
                variant={isDone ? "default" : "outline"}
                size="sm"
                onClick={() => toggleComplete(chapter.id)}
                className="gap-1.5"
                data-testid={`bible-mark-${chapter.id}`}
              >
                <Check className="h-3.5 w-3.5" />
                {isDone ? "Read" : "Mark read"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {chapter.body.map((section, i) => (
              <div key={i}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">{section.heading}</h3>
                <ul className="space-y-2">
                  {section.points.map((p, j) => (
                    <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="text-primary mt-1.5 shrink-0">•</span>
                      <span className="text-foreground/90">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {chapter.deepDive && chapter.deepDive.length > 0 && (
              <div className="space-y-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" /> Deep dive
                </div>
                {chapter.deepDive.map((section, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold text-foreground mb-2">{section.heading}</h4>
                    <ul className="space-y-1.5">
                      {section.points.map((p, j) => (
                        <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
                          <span className="text-primary mt-1.5 shrink-0">›</span>
                          <span className="text-foreground/90">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {chapter.pitfalls && chapter.pitfalls.length > 0 && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> Common pitfalls
                </h4>
                <ul className="space-y-1.5">
                  {chapter.pitfalls.map((p, i) => (
                    <li key={i} className="text-sm text-rose-100/90 flex gap-2">
                      <span className="text-rose-400 shrink-0">⚠</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {chapter.tips && chapter.tips.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                  <Wand2 className="h-3 w-3" /> Pro tips
                </h4>
                <ul className="space-y-1.5">
                  {chapter.tips.map((t, i) => (
                    <li key={i} className="text-sm text-amber-100/90 flex gap-2">
                      <span className="text-amber-400 shrink-0">›</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <LearnChat
          topicId={`bible:${chapter.id}`}
          topicTitle={chapter.title}
          starterQuestions={chapter.starters}
        />

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            className="gap-1.5"
            data-testid="bible-prev"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">{activeIdx + 1} / {CHAPTERS.length}</span>
          <Button
            disabled={activeIdx === CHAPTERS.length - 1}
            onClick={() => setActiveIdx((i) => Math.min(CHAPTERS.length - 1, i + 1))}
            className="gap-1.5"
            data-testid="bible-next"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
