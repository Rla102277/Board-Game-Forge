import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Sparkles, Target, Layers,
  ScrollText, Users, Network, FileText, CheckSquare, MessageSquare, Image,
  Beaker, BarChart3, Film, Download, KeyRound, FlaskConical, Wand2, AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { LearnChat } from "./learn-chat";

const STORAGE_KEY = "gameforge.learn.bible.completed";

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
    id: "welcome",
    title: "Welcome to GameForge",
    icon: Sparkles,
    blurb: "GameForge is a workspace for designing tabletop board games. This guide walks you through every panel, button, and AI feature so you can move from blank canvas to printable prototype with confidence.",
    body: [
      {
        heading: "What you can do here",
        points: [
          "Capture your game's vision (theme, player count, duration) in one place that the AI keeps in context.",
          "Build a structured ontology of entities, rules, and players that the AI can reason over instead of guessing.",
          "Brainstorm with multiple AI providers (Claude, GPT, Gemini, Grok) — switch any time without losing your conversation history.",
          "Run balance simulations to spot dominant strategies and win-rate skew before you cut your first prototype.",
          "Generate component art (cards, boards, tokens) tied to a single narrative seed so the look stays cohesive.",
          "Track playtests, notes, and tasks the same way a real studio would — including public feedback links for testers.",
        ],
      },
      {
        heading: "The three things to learn first",
        points: [
          "The left rail switches between projects; the section sidebar inside a project switches between tabs.",
          "The chat panel on the right is your AI co-designer — it stays with you as you move between tabs and remembers each tab's conversation separately.",
          "Almost every list (rules, entities, notes, assets) has a Sparkles button — that's AI Enhance, the single most useful feature in the app.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "How GameForge thinks",
        points: [
          "The AI always sees a summary of your project (name, description, type, key entities, and top rules) so its suggestions stay relevant.",
          "Most AI actions are preview-first: the AI proposes structured changes, you approve or reject before they're saved.",
          "Bring your own API key: paste your provider key at the workspace level and every AI call uses it instead of the platform default.",
        ],
      },
      {
        heading: "What this tool is NOT",
        points: [
          "It is not a digital playtest platform — it does not run live games against real players.",
          "It is not a substitute for human feedback — the Simulator approximates, it doesn't replace 5 friends around a table.",
          "It does not manufacture or fulfill — exports are designed to feed a publisher pitch or a print-and-play loop.",
        ],
      },
    ],
    pitfalls: [
      "Skipping the Overview metadata. The AI quality drops sharply if it doesn't know the game's player count, duration, and tone.",
      "Treating chat history as long-term memory. It isn't — pin important conclusions to Notes or Rules, not chat.",
    ],
    tips: [
      "Click the chat panel header to collapse it when you need more screen real estate.",
      "Hover an assistant message to save it to Notes or Tasks with one click.",
      "Set up workspace-level AI providers BEFORE inviting collaborators so everyone uses the same model defaults.",
    ],
    starters: [
      "What's the fastest path from a blank project to a playable prototype?",
      "Which AI provider should I pick first and why?",
      "How does AI Enhance differ from regular chat?",
    ],
  },
  {
    id: "overview",
    title: "Overview tab",
    icon: Target,
    blurb: "Your project's home screen. Stats, metadata, and the AI quick-prompts that kick off your session and seed every other tab.",
    body: [
      {
        heading: "Stat tiles",
        points: [
          "Live counts of entities, rules, players, notes, tasks, and chat messages — your design surface area at a glance.",
          "Useful for spotting empty parts of your design (e.g. plenty of rules but zero players defined).",
          "Tile colors fade when a section is empty so gaps jump out visually.",
        ],
      },
      {
        heading: "Project metadata",
        points: [
          "Name, description, game type, genre, player count, duration — saved automatically as you type.",
          "These fields seed the AI's context across every tab. Treat them like a one-paragraph design pitch — vague descriptions yield vague AI output.",
          "The duration field is the TARGET, not what your prototype currently plays at; the Simulator compares actual vs. target.",
        ],
      },
      {
        heading: "AI Quick Actions",
        points: [
          "Pre-canned prompts that route through your active chat panel (Generate Hook, Suggest Mechanics, Critique Pitch, etc.).",
          "Great for getting unstuck or sanity-checking direction before sinking time into rules or entities.",
          "Each action chooses a provider best-suited for the task (long structured → Claude, fast brainstorm → Gemini, terse copy → GPT).",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Reading the stats like a designer",
        points: [
          "Rules > 30 with entities < 8: your game is probably under-componented — most successful eurogames sit ~30 rules / 15+ entity types.",
          "Players defined but no asymmetric properties: you may be carrying a 'players' table that doesn't actually do design work yet.",
          "Notes >> Rules: your game is still in fuzzy ideation. Convert Notes into structured Rules to make it testable.",
        ],
      },
    ],
    pitfalls: [
      "Leaving the description as 'A board game about X' — the AI then proposes generic mechanics for any X.",
      "Setting target duration too aggressively (15 min) for a strategy game; the Simulator will flag every iteration as 'too long' and you'll chase a phantom problem.",
    ],
    tips: [
      "Refresh the Overview after a heavy editing session — it's the cheapest health check you have.",
      "Use Quick Actions BEFORE filling rules. It's much easier to refine an AI starting point than to start cold.",
    ],
    starters: [
      "What should a strong project description look like?",
      "Which stat tile imbalances usually mean trouble?",
      "When should I run a Quick Action instead of asking chat directly?",
    ],
  },
  {
    id: "research",
    title: "Research tab",
    icon: ScrollText,
    blurb: "Drop reference material — links, PDFs, plain text — and let the AI mine it for inspiration. This is your designer's notebook of comps and inspiration.",
    body: [
      {
        heading: "Why use Research",
        points: [
          "Pin BoardGameGeek pages, mechanic essays, or playtester feedback in one place that the AI can quote back to you.",
          "Ask the AI to extract takeaways or compare two references side by side ('what does Wingspan do that Everdell doesn't?').",
          "Acts as your design-decision audit log — when you change a rule, you can trace which research item motivated it.",
        ],
      },
      {
        heading: "Workflow patterns",
        points: [
          "Drop in 5–10 competitor games at the start. The AI uses them as anchors when proposing mechanics.",
          "Add playtest reports here, not Notes — Research is intentionally read-only for the AI, so it won't accidentally turn feedback into rules.",
          "Tag entries with short labels (e.g. 'comp', 'mechanic', 'theme', 'art ref') so you can filter them later.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Good vs. bad research items",
        points: [
          "GOOD: 'Wingspan turn structure breakdown — paste of 4 main actions and trigger order.' Specific, mechanical, quotable.",
          "GOOD: 'Players said the midgame felt flat. Here's the table chatter from session 3.' Actionable feedback.",
          "BAD: 'I really like Terraforming Mars.' Too vague — the AI can't extract anything useful.",
          "BAD: A 200-page rulebook PDF dumped raw. Pre-summarize big docs before pasting; the AI's context window is finite.",
        ],
      },
    ],
    pitfalls: [
      "Treating Research as a junk drawer. If you can't find an item by skimming, you'll never use it again — keep it pruned.",
      "Pasting copyrighted full rulebooks. Quote excerpts and paraphrase; respect publisher IP.",
    ],
    tips: [
      "Use the AI to summarize long pastes immediately — store the summary and link the original.",
    ],
    starters: [
      "What kinds of research items are most useful to the AI?",
      "How do I compare two existing games quickly?",
      "Should I paste a full rulebook or just notes?",
    ],
  },
  {
    id: "ontology",
    title: "Ontology tab",
    icon: Network,
    blurb: "A bird's-eye map of how your entities and rules connect. Where you spot gaps, overlaps, and orphan systems before they bite you in playtest.",
    body: [
      {
        heading: "Entity taxonomy",
        points: [
          "Groups every entity by its type (item, faction, location, event, character) so you can see structural balance at a glance.",
          "Click an entity type to read a primer on what it is and what properties it usually has.",
          "Counts in parentheses: a type with 1 entity is suspicious (probably a placeholder), 30+ is a sign you should sub-categorize.",
        ],
      },
      {
        heading: "Rule ↔ Entity links",
        points: [
          "GameForge automatically detects when a rule mentions an entity by name.",
          "Use this to find orphan rules (no entity touches them) or untouched entities (no rule uses them) — both are bugs.",
          "Hover a link to see the exact rule sentence that triggered the match.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Reading the ontology like an architect",
        points: [
          "Hub entities (the ones referenced by many rules) are your game's CORE LOOP — make sure they're polished, not afterthoughts.",
          "Leaf entities (no rule touches them) are either flavor text or design debt. Decide which.",
          "Cross-type clusters (e.g. items linked to events linked to factions) reveal emergent subsystems — usually what playtesters call 'the cool part'.",
        ],
      },
      {
        heading: "Ontology vs. Entities vs. Rules tabs",
        points: [
          "Entities = the WHAT (the nouns of your game).",
          "Rules = the HOW (the verbs).",
          "Ontology = the relationships between WHATs and HOWs. Don't author here — diagnose here.",
        ],
      },
    ],
    pitfalls: [
      "Renaming entities without updating your rules. The system connects rules to entities by name — rename one without updating the other and the link breaks.",
      "Adding entities without properties. They'll show in the taxonomy but the Simulator and Balance tabs will ignore them.",
    ],
    tips: [
      "Keep entity names consistent — the system links rules to entities by matching their names exactly.",
      "After a big rules edit, return here to scan for new orphans.",
    ],
    starters: [
      "What does it mean if an entity has no linked rules?",
      "How do I find my game's core loop on this view?",
      "Should I worry about a hub entity with 20 rules?",
    ],
  },
  {
    id: "entities",
    title: "Entities tab",
    icon: Layers,
    blurb: "The atoms of your game: items, factions, locations, events, characters. Everything mechanical hangs off entities, so this tab pays the most dividends.",
    body: [
      {
        heading: "Create entities three ways",
        points: [
          "Manually with the + Add Entity button — best when you have a specific design in mind.",
          "From AI by describing what you want (e.g. \"three mid-tier weapons with downside trade-offs\") — best for generating breadth fast.",
          "By importing rules — extracted entity references show up under each rule, ready to be promoted into real entities.",
        ],
      },
      {
        heading: "Properties",
        points: [
          "Each entity can carry properties (cost, hp, damage, rarity…) — numeric or text.",
          "Properties feed the Simulator and Balance tabs. No properties = invisible to balance analysis.",
          "Switching a property between numeric and text clears the opposing column so you don't end up with mixed data.",
        ],
      },
      {
        heading: "AI Enhance per entity",
        points: [
          "The Sparkles button on a single entity opens a structured preview: suggested name tweaks, description rewrite, missing properties, related entity ideas.",
          "Preview-first: nothing is saved until you accept individual suggestions.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Naming and consistency",
        points: [
          "Names should be one short noun phrase ('Iron Gauntlet'), not a sentence ('A Gauntlet Made of Iron').",
          "Pick a casing convention (Title Case for proper nouns, lower for generic items) and apply it everywhere — the AI will mirror it.",
          "Avoid two entities whose names overlap ('Sword' / 'Greatsword') — the Ontology view can confuse them when scanning rule text.",
        ],
      },
      {
        heading: "Properties checklist",
        points: [
          "COST — what does the player pay? (gold, action, energy)",
          "EFFECT — what does it do? Numeric where possible (e.g. damage 3, heal 2).",
          "DURATION — instant, persistent, one-shot?",
          "RARITY/TIER — how often does it appear?",
          "CONSTRAINTS — who can use it, when, how often?",
        ],
      },
      {
        heading: "When to split vs. merge entities",
        points: [
          "If two entities differ only in one number, consider making them ONE entity with a tier property.",
          "If one entity has 10+ properties, it's probably actually 2 entities glued together — split it.",
        ],
      },
    ],
    pitfalls: [
      "Generating 50 entities at once and never reading them. Five thoughtful entities beat fifty AI-padded ones.",
      "Putting flavor text in property fields. Use the description; keep properties machine-readable.",
    ],
    tips: [
      "Bulk-create with AI then prune ruthlessly — 80% of generated entities won't survive triage.",
      "Use the cost property religiously; it's the foundation of the Balance tab.",
    ],
    starters: [
      "Which properties should every entity have?",
      "How many entities is too many for a 60-minute game?",
      "When should I merge two similar entities?",
    ],
  },
  {
    id: "players",
    title: "Players tab",
    icon: Users,
    blurb: "Define your audience and your in-game player roles. Two different concepts that both need explicit answers.",
    body: [
      {
        heading: "Player types vs. personas",
        points: [
          "Player types describe in-game roles (Merchant, Warlord, Scholar) — affects mechanics.",
          "Personas describe real-world target audiences (Casual family of 4, BGG hardcore strategy gamer) — affects rules teaching, complexity, art direction.",
          "Use both — they answer different questions. Don't conflate them.",
        ],
      },
      {
        heading: "Asymmetry levels",
        points: [
          "Symmetric: every player has identical capabilities (Catan, Carcassonne).",
          "Lightly asymmetric: same rules, different starting bonuses (7 Wonders).",
          "Heavily asymmetric: each player has unique rules (Root, Vast, Spirit Island).",
          "Asymmetry multiplies your design and balance work geometrically — pick deliberately.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Designing personas that earn their keep",
        points: [
          "A useful persona answers: 'How do they hear about this game? What do they expect from the box weight? How long until they quit a too-hard rulebook?'",
          "Bad persona: 'gamers'. Useful persona: 'Mid-30s couple, 1 game night/week, plays Splendor & Wingspan, will not read a 24-page rulebook.'",
        ],
      },
      {
        heading: "When asymmetric roles are the right call",
        points: [
          "When the THEME demands it (a heist game where the Mastermind and the Thief play differently).",
          "When you want HIGH replayability with the same group (different role each game = different game).",
          "When you can afford the playtesting hours — every role pair needs to be balanced against every other.",
        ],
      },
    ],
    pitfalls: [
      "Designing 8 player types when your game seats 4. The first 4 get loved; the rest never get tuned.",
      "Treating personas as a marketing exercise. They should change your DESIGN — if they don't, delete them.",
    ],
    tips: [
      "Name your personas after real people you know — it forces specificity.",
      "Re-read your personas before every major design decision; they're a free veto on bad ideas.",
    ],
    starters: [
      "Should my first game be symmetric or asymmetric?",
      "How many player types is a sustainable number?",
      "What makes a persona actually useful for design?",
    ],
  },
  {
    id: "rules",
    title: "Rules tab",
    icon: FileText,
    blurb: "The structured rulebook. Tagged, prioritized, AI-enhanceable. Rules are the verbs of your game and this is where most playtester confusion gets fixed.",
    body: [
      {
        heading: "Categories",
        points: [
          "Movement, Combat, Economy, Turn Structure, Variant — each gets a colored badge.",
          "Categories help when exporting a printable rulebook later (the Exports tab respects category order).",
          "If a rule fits two categories, pick the one that affects the player's DECISION the most.",
        ],
      },
      {
        heading: "Per-rule actions",
        points: [
          "Sparkles → AI Enhance: opens a structured preview with tightened wording, designer's notes, edge cases, and related-rule suggestions.",
          "Copy icon → duplicate as a starting point for a sibling rule.",
          "Pencil → edit in place (description and metadata).",
        ],
      },
      {
        heading: "Priority levels",
        points: [
          "1 = optional/variant, 2 = uncommon, 3 = standard, 4 = frequent, 5 = setup or every-turn.",
          "Priority drives which rules appear first in exports and which the AI emphasizes when answering questions.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Writing a rule that survives blind playtest",
        points: [
          "One sentence per atomic action. If you need 'and' twice, split it.",
          "Use the same verb every time for the same action ('discard' not 'remove' / 'trash' / 'put aside' interchangeably).",
          "State the WHO ('the active player'), the WHEN ('at the start of their turn'), and the WHAT ('draws 2 cards').",
          "Include the failure case explicitly ('if the deck is empty, shuffle the discard pile back in').",
          "Never use the word 'normally'. If there's an exception, name it.",
        ],
      },
      {
        heading: "AI Enhance preview anatomy",
        points: [
          "Tightened wording: alternative phrasing in the same voice, never longer than the original.",
          "Designer's notes: WHY this rule exists (good for handover and for your future self).",
          "Edge cases: 'what if two players trigger this simultaneously?' style gotchas.",
          "Related rule suggestions: usually a rule you forgot to write (resolution order, simultaneous play, etc.).",
        ],
      },
    ],
    pitfalls: [
      "Writing rules in paragraph form. Bullet points and short sentences read better at 2am during a playtest.",
      "Letting the AI rewrite your rules without reading the diff. The AI sometimes clarifies by changing meaning.",
      "Skipping priorities. A rulebook without priorities is just a wall of text in shipping.",
    ],
    tips: [
      "Use Priority 5 for rules that show up in setup or every turn; Priority 1 for variants.",
      "Sort by category for easier proofreading.",
      "After AI Enhance, accept Designer's Notes even if you reject the rewrite — the notes are nearly always valuable.",
    ],
    starters: [
      "How do I word a rule so blind playtesters get it right?",
      "When should I split one rule into two?",
      "What does the priority field actually do?",
    ],
  },
  {
    id: "simulator",
    title: "Simulator tab",
    icon: FlaskConical,
    blurb: "Run AI-driven Monte Carlo simulations of your game. Surfaces win-rate skew, dominant strategies, and turn-count distribution — long before you can afford 50 human playtests.",
    body: [
      {
        heading: "How it works",
        points: [
          "Describes your rules + entities to the AI and asks it to play through games at scale.",
          "Surfaces win-rate skew, dominant strategies, and turn-count distribution.",
          "Adjustable parameters: number of games, number of players, AI 'skill level' (random / heuristic / optimal).",
        ],
      },
      {
        heading: "What to do with results",
        points: [
          "If one strategy wins >70% of games, look at the rules feeding it.",
          "If games run double the target duration, find the rule causing slow loops (often a 'discard down to N' rule with no upper bound on draw).",
          "If turn-count variance is huge (some games 8 turns, others 40), your endgame trigger is fragile.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What the Simulator is good at",
        points: [
          "Spotting DOMINANT strategies (one path wins ≥65% of the time).",
          "Detecting RUNAWAY leader effects (whoever scores first wins ~80% of the time).",
          "Estimating GAME LENGTH within ±25% of human play.",
          "Identifying DEAD entities — components that win games less often than chance would suggest.",
        ],
      },
      {
        heading: "What the Simulator is NOT good at",
        points: [
          "Social deduction (lies and tells don't simulate).",
          "Real-time mechanics (AI plays turn-by-turn, not by reflex).",
          "Player-table experience (laughter, frustration, table talk — none of it shows up in the data).",
          "Treat simulator output as a HYPOTHESIS for human playtest, not a final verdict.",
        ],
      },
      {
        heading: "Reading the result charts",
        points: [
          "Win-rate by strategy: bar chart, look for outliers above 60% or below 15%.",
          "Turn-count histogram: target a normal-ish distribution centered on your target duration.",
          "Score spread at game end: tight = competitive feel, blowout = catch-up mechanism missing.",
        ],
      },
    ],
    pitfalls: [
      "Running 10 simulations and trusting the result. 100+ is the minimum for stable estimates; 500+ for confidence.",
      "Ignoring 'optimal play' results because 'no one really plays optimally'. The optimal-play result is your CEILING — if it's broken, casual play eventually finds it too.",
    ],
    tips: [
      "Run a baseline 'random agents' pass first — anything your real rules can't beat is a sign of a missing constraint.",
      "Save simulator runs against rule-version tags so you can A/B compare before/after a balance change.",
    ],
    starters: [
      "How many games should I simulate to trust the result?",
      "What does it mean if one strategy wins 80% of the time?",
      "Should I worry about high turn-count variance?",
    ],
  },
  {
    id: "assets",
    title: "Assets tab",
    icon: Image,
    blurb: "Generate component mockups (cards, boards, tokens, character art) tied to your narrative. Useful for pitch decks and table-presence playtests.",
    body: [
      {
        heading: "Narrative seed",
        points: [
          "Set the visual tone once at the top — saved on the project.",
          "Every component tile composes its prompt as: narrative + selected entities + component type.",
          "Strong seeds are concrete: 'Hand-painted watercolor, muted earth tones, 1920s expedition aesthetic' beats 'fantasy'.",
        ],
      },
      {
        heading: "Component tiles",
        points: [
          "Card, Board, Token, Dice, Character, Map, Box cover, Logo — one click generates each.",
          "Free-form prompt below for anything else.",
          "Generated images attach to the entity that seeded them so you can find them later.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "How to get usable card art",
        points: [
          "Specify camera framing: 'centered subject, head and shoulders, 3/4 angle, simple background'.",
          "Specify finish: 'matte illustration', 'painted', 'inked' — stops AI from defaulting to glossy 3D.",
          "Avoid text in the image — generated text is gibberish. Composite real type later.",
          "Generate 4–6 variants per concept and pick the most consistent one.",
        ],
      },
      {
        heading: "Production reality check",
        points: [
          "AI art is great for pitch decks and prototype prints. Most publishers will commission their own art on signing.",
          "If you self-publish, you'll likely need a human illustrator to match a final style across 100+ cards.",
          "Always check the license terms of your AI provider before commercial use.",
        ],
      },
    ],
    pitfalls: [
      "Letting the seed drift. Re-anchor it every few sessions or your art will gradually lose cohesion.",
      "Generating final-print art. Treat outputs as prototypes; budget human art for shipping.",
    ],
    tips: [
      "Add your own OpenAI API key in workspace settings if you're hitting rate limits.",
      "Save the best 1–2 images per concept and delete the rest — clutter slows down asset selection.",
    ],
    starters: [
      "How do I write a narrative seed that yields consistent art?",
      "Can I use generated art on a commercial print run?",
      "What component types should I generate for a publisher pitch?",
    ],
  },
  {
    id: "playtesting",
    title: "Playtesting tab",
    icon: Beaker,
    blurb: "Track sessions, capture feedback, share public links to playtester forms. The single highest-leverage activity in your design schedule.",
    body: [
      {
        heading: "Public feedback links",
        points: [
          "Each session can generate a unique shareable link — playtesters fill out your feedback form without creating an account.",
          "Responses flow back into the session record automatically.",
          "Token expires when the session is closed; safe to share on social media or BGG.",
        ],
      },
      {
        heading: "Session log structure",
        points: [
          "Date, # of players, total time, count of completed turns.",
          "Free-form notes section for table-talk and observations.",
          "What you changed since the LAST session (this is the most-skipped, most-valuable field).",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Running a playtest like a pro",
        points: [
          "Watch, don't play. You will miss confusion if you're playing — be the silent observer.",
          "Time things: rules teach, first turn, total game, downtime per player.",
          "After the game, ASK for the worst part first. People volunteer praise; you need explicit permission to hear pain.",
          "Score every session against fixed questions ('would you play again?', 'what felt unfair?') — comparable across sessions.",
        ],
      },
      {
        heading: "Blind vs. coached playtests",
        points: [
          "Coached: you teach the rules. Tests the GAME.",
          "Blind: you hand them only the rulebook. Tests the RULEBOOK.",
          "Do coached for the first 5–10 sessions, blind once the design feels stable.",
        ],
      },
    ],
    pitfalls: [
      "Asking 'did you have fun?' Everyone answers yes to be polite. Ask 'what's the first thing you'd change?'",
      "Reacting to one playtester's complaint. Wait for the same complaint to appear in 3+ sessions before redesigning.",
      "Forgetting to log what changed between sessions. Your future self will not remember.",
    ],
    tips: [
      "Time-box rules teach in your notes — if it crept past 8 minutes, the rulebook needs work, not the rules.",
      "Bring printed feedback forms to in-person sessions; people fill out paper more honestly than a phone link.",
    ],
    starters: [
      "What questions should I always ask after a playtest?",
      "How many playtests before I trust a balance change?",
      "When do I switch from coached to blind playtests?",
    ],
  },
  {
    id: "notes",
    title: "Notes tab",
    icon: FileText,
    blurb: "Long-form scratchpad for ideas, lore, and design rationale. The 'why' file — your future self will thank you.",
    body: [
      {
        heading: "What goes here vs. Rules",
        points: [
          "Notes for the WHY — design rationale, alternatives considered, lore.",
          "Rules for the WHAT — the player-facing game text.",
          "If a thought might affect future decisions but isn't player-facing, it's a Note.",
        ],
      },
      {
        heading: "Tips",
        points: [
          "Save AI replies straight from chat with the bookmark icon — they land here.",
          "Date your notes. Six months from now you'll want to know what 'this morning's idea' meant.",
          "Use a # tag system ('#combat #v2-cut') so you can filter without renaming files.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "The decision log pattern",
        points: [
          "Every time you make a non-trivial design choice, write a 3-line note: WHAT changed, WHY now, WHAT was the rejected alternative.",
          "Pays for itself the first time a playtester says 'why didn't you just do X?' — you have the answer ready.",
        ],
      },
      {
        heading: "What does NOT go in notes",
        points: [
          "Player-facing rule text (use Rules).",
          "Component math (use Entities + Balance).",
          "Playtest feedback (use Playtesting). Notes is your inner monologue, not your file system.",
        ],
      },
    ],
    pitfalls: [
      "Letting Notes become a junk drawer of one-liners with no dates or tags — unsearchable in 2 months.",
      "Putting rule text here instead of in Rules. The rulebook export will be incomplete and you'll forget which is canonical.",
    ],
    tips: [
      "Promote stale-but-good notes into Rules or Tasks once a week so the file stays alive, not archival.",
      "Open every entry with a 1-line summary so future-you can skim 50 notes in 2 minutes.",
    ],
    starters: [
      "What's worth writing down here vs. saving for Rules?",
      "How do I avoid Notes becoming a junk drawer?",
      "Show me an example decision log entry.",
    ],
  },
  {
    id: "tasks",
    title: "Tasks tab",
    icon: CheckSquare,
    blurb: "Lightweight task tracker scoped to this project. Captures what to do next without leaving GameForge.",
    body: [
      {
        heading: "Workflow",
        points: [
          "Create tasks from chat with one click ('Save to Tasks' on assistant messages).",
          "Statuses: todo → in-progress → done. Priorities: low / medium / high.",
          "No assignees in v1 — this is a personal-or-pair tool, not a Jira clone.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What deserves a task",
        points: [
          "Concrete, finishable work ('rewrite combat rule', 'generate 6 boss cards').",
          "Things that block playtest ('fix the discard loop bug from session 3').",
          "Anything you keep mentally rolling over for more than a day — write it down to free your brain.",
        ],
      },
      {
        heading: "What does NOT belong",
        points: [
          "Open-ended exploration ('think about combat'). That's a Note.",
          "Long-term ideas without a target ('Kickstarter someday'). That's a roadmap conversation.",
        ],
      },
    ],
    pitfalls: [
      "Treating Tasks like a wishlist. A 200-task backlog is a graveyard, not a plan — close stale items aggressively.",
      "Marking everything 'high' priority. If everything is urgent, nothing is — cap 'high' at ~5 items at a time.",
    ],
    tips: [
      "Review the list at the start of every design session and close anything you no longer believe in.",
      "Pair each high-priority task with a target playtest date so it has a hard deadline, not just a flag.",
    ],
    starters: [
      "When should I file a task vs. a note?",
      "How do I keep this list from becoming overwhelming?",
    ],
  },
  {
    id: "storyboard",
    title: "Storyboard tab",
    icon: Film,
    blurb: "Sequence the player journey beat by beat — from setup through endgame. The pacing tool board games rarely get and need.",
    body: [
      {
        heading: "Why storyboard a board game",
        points: [
          "Helps you spot dead time, missing onboarding, or lopsided endgame tension.",
          "Pairs naturally with the Simulator for pacing analysis.",
          "Forces you to articulate emotional beats ('first big decision', 'crisis moment', 'final sprint') instead of just rules.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "A 5-beat board game arc",
        points: [
          "1. Setup — quiet, instructional, low decisions.",
          "2. Opening — early acquisition, everyone feels possibility.",
          "3. Midgame escalation — engines online, conflicts begin.",
          "4. Endgame trigger — visible countdown that changes priorities.",
          "5. Final scoring — short, decisive, clean.",
        ],
      },
      {
        heading: "Common pacing failures",
        points: [
          "Endless midgame — no visible trigger, players don't know when to push.",
          "Anti-climactic endgame — the winner is decided 4 turns before the actual end.",
          "Overlong setup — table goes cold before the first decision.",
        ],
      },
    ],
    pitfalls: [
      "Storyboarding once and never updating it. Pacing drifts as rules change — re-read it after every major rule edit.",
      "Designing only the 'fun' beats. The boring beats (setup, scoring) are where games actually lose players.",
    ],
    tips: [
      "Tag each beat with an emotion target ('curiosity', 'tension', 'relief') and verify in playtests that the table felt it.",
      "If two adjacent beats have the same emotion target, you have a flat stretch — cut or recombine them.",
    ],
    starters: [
      "What does a healthy game arc look like?",
      "How do I fix a sagging midgame?",
      "Should the endgame trigger be a hard turn limit or dynamic?",
    ],
  },
  {
    id: "balance",
    title: "Balance tab",
    icon: BarChart3,
    blurb: "Visualize numerical balance across entities and rules. Charts that turn fuzzy hunches into actionable bug reports.",
    body: [
      {
        heading: "What gets charted",
        points: [
          "Cost-vs-power curves, frequency of category usage, expected value of each entity.",
          "Use it after Simulator runs to confirm your hunches.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Reading a cost curve",
        points: [
          "Y-axis: power (effect, damage, points generated).",
          "X-axis: cost (gold, action, energy).",
          "Healthy curve: roughly linear with mild diminishing returns at the high end.",
          "RED FLAG: an entity that sits well above the line — it's overpowered for its cost (the dominant pick).",
          "RED FLAG: an entity well below the line — it's a trap, no one will ever pick it. Buff or remove.",
        ],
      },
      {
        heading: "Category frequency",
        points: [
          "Bar chart of how often each rule category triggers in simulated play.",
          "If 'Combat' triggers 3x more than every other category, your game is functionally a combat game — make sure that's intentional.",
          "If a category triggers <5% of the time, ask whether those rules earn their teaching cost.",
        ],
      },
    ],
    pitfalls: [
      "Chasing a perfectly linear cost curve. A little intentional asymmetry is what makes engine-builders interesting.",
      "Balancing in a vacuum. Numbers are right when the GAME feels fair, not when the chart looks pretty.",
    ],
    tips: [
      "Compute expected value by hand for your top 5 cards before trusting the chart — sanity-check the model.",
      "Balance against a target archetype, not 'all players' — perfect symmetry is rarely the goal.",
    ],
    starters: [
      "What does an overpowered entity look like on the cost curve?",
      "Is it bad if some categories barely trigger?",
      "How do I know when balance is 'good enough' to ship?",
    ],
  },
  {
    id: "exports",
    title: "Exports tab",
    icon: Download,
    blurb: "Generate printable rulebooks, PnP assets, and Kickstarter pitch decks. The bridge from design tool to physical world.",
    body: [
      {
        heading: "Outputs",
        points: [
          "Markdown rulebook with categorized rules and entity glossary.",
          "Gamma-powered Kickstarter deck (needs a Gamma API key in your account).",
          "Print-and-play PDFs for cards and tokens (using your generated assets).",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Pre-export checklist",
        points: [
          "Every rule has a category and a priority? (otherwise the export ordering is arbitrary)",
          "Every entity has at least a description? (the glossary will look threadbare otherwise)",
          "Project metadata is filled in? (it becomes the export cover page)",
          "Ran a Simulator pass in the last week? (so you're not exporting a known-broken design)",
        ],
      },
      {
        heading: "What publishers actually want",
        points: [
          "A 1-paragraph hook ('elevator pitch').",
          "A 1-page game summary (mechanics, player count, duration, target audience).",
          "A short rulebook draft (10 minutes to read).",
          "A photo or render of the table set up.",
          "Evidence of playtesting (session count, feedback themes addressed).",
        ],
      },
    ],
    pitfalls: [
      "Exporting weekly with no design changes between exports — busywork.",
      "Sending publishers a 40-page rulebook on first contact. Hook them with the pitch, send the rulebook on request.",
    ],
    tips: [
      "Use exports as a forcing function — if the PDF reveals missing icons or copy, that's the next batch of tasks.",
      "Keep one 'pitch packet' export pinned to the top: 1-paragraph hook + 1-page summary + table photo. It's what publishers actually read.",
    ],
    starters: [
      "What should I include in a pitch deck for a publisher?",
      "How polished should my first export be?",
      "Print-and-play vs. professional print — when do I switch?",
    ],
  },
  {
    id: "chat",
    title: "Chat panel",
    icon: MessageSquare,
    blurb: "Your AI co-designer, always one panel away. Per-tab history means context follows you through your design session.",
    body: [
      {
        heading: "Multi-provider routing",
        points: [
          "Switch between Claude, GPT, Gemini, and Grok from the model dropdown.",
          "Each provider has different strengths — Claude for long structured outputs, Gemini for fast brainstorming, GPT for crisp writing, Grok for irreverent ideation.",
        ],
      },
      {
        heading: "Per-message actions",
        points: [
          "Hover any assistant reply for Save-to-Notes / Save-to-Tasks buttons.",
          "Collapse the panel via the chevrons in the header — state persists across reloads.",
          "Each tab has its OWN chat history, so 'rules chat' won't pollute 'assets chat'.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Prompts that get better answers",
        points: [
          "Be specific about constraints: 'in 2 sentences, no jargon, for a casual audience'.",
          "Give the AI a role: 'you are a hostile playtester — find what's broken in this rule'.",
          "Ask for structured output: 'list 5 options, each with one pro and one con'.",
          "When the answer is bad, don't argue — restart with a tighter prompt.",
        ],
      },
      {
        heading: "When to use chat vs. AI Enhance",
        points: [
          "AI Enhance: structured, scoped to a single rule/entity, preview-first. Use for editorial.",
          "Chat: open-ended, free-form, multi-turn. Use for ideation and analysis.",
        ],
      },
    ],
    pitfalls: [
      "Treating AI replies as ground truth. They're a brainstorming partner, not an authority — verify mechanics yourself.",
      "Letting one chat thread balloon to 50+ turns. Quality degrades; start a fresh thread per topic.",
    ],
    tips: [
      "Save the assistant's best replies to Notes immediately — they're easy to lose in a long thread.",
      "Switch providers mid-task when stuck — a different model often unblocks a stalled brainstorm.",
    ],
    starters: [
      "Which AI provider is best for which task?",
      "How do I write a prompt that doesn't get vague answers?",
      "When should I use chat vs. AI Enhance?",
    ],
  },
  {
    id: "ai-providers",
    title: "AI Providers",
    icon: KeyRound,
    blurb: "Workspace-level controls for which AI providers your team can use, plus the option to bring your own API key for billing or rate-limit control.",
    body: [
      {
        heading: "Disable providers",
        points: [
          "Switch any provider off and no one in the workspace can use it.",
          "Useful when your team has budget or policy constraints on specific services.",
          "Disabling does NOT delete history — past chat with a disabled provider is still readable.",
        ],
      },
      {
        heading: "Bring your own API key",
        points: [
          "Paste your own provider API key — it's encrypted and stored securely.",
          "All AI calls from this workspace then use your key instead of the platform default.",
          "Rotate keys at any time; the old key stops working immediately.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "When to use your own API key",
        points: [
          "You're hitting usage limits on the platform's default key.",
          "Your organization needs AI usage billed to a known account.",
          "You want access to a model version not available by default.",
        ],
      },
      {
        heading: "Cost considerations",
        points: [
          "Claude Sonnet ≈ best long-form quality, mid-tier price.",
          "GPT-4 class ≈ best terse copy, mid-tier price.",
          "Gemini Flash ≈ cheapest fast brainstorm.",
          "Test your typical workload across 2 providers before committing — costs vary 5–10x for the same task.",
        ],
      },
    ],
    pitfalls: [
      "Hardcoding one provider for everything. Different tasks favor different models — leave the router free.",
      "Forgetting to rotate a leaked key. If someone accidentally exposes it on a shared screen, rotate it right away.",
    ],
    tips: [
      "Only owners and admins of the workspace see the AI Providers menu item.",
    ],
    starters: [
      "When should I use my own API key instead of the platform default?",
      "Which provider is cheapest for fast brainstorming?",
      "What happens to chat history if I disable a provider?",
    ],
  },
];

export function BibleContent() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCompleted(new Set(JSON.parse(raw)));
    } catch {/* ignore */}
  }, []);

  const persist = (next: Set<string>) => {
    setCompleted(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {/* ignore */}
  };

  const toggleComplete = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id); else next.add(id);
    persist(next);
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
