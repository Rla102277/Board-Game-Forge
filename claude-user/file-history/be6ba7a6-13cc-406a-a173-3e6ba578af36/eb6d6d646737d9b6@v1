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
          "What makes an entity truly useful in GameForge is giving it properties. Properties are the numbers and descriptions that define what an entity actually does — its cost, its power, its rarity, its duration, whatever dimensions matter in your game. A Sword entity with no properties is just a name floating in space. A Sword entity with a damage value of 3, a cost of 2 gold, and a rarity of 'uncommon' is something the AI can compare, the Simulator can compute, and the Balance tab can chart. Properties turn ideas into mechanics.",
        ],
      },
      {
        heading: "What does 'ontology' mean?",
        points: [
          "Ontology is a word borrowed from philosophy, where it means 'the study of what exists and how things relate to each other.' In GameForge, your game's ontology is simply the complete picture of everything that exists in your design — all your entities, all your rules — and the web of connections between them. It sounds grand, but it's really just a map.",
          "Here's how that map gets built: when you write a rule that says 'the Merchant may sell any Item to any City for gold equal to the Item's value,' your ontology records that this rule connects three things — the Merchant entity, the Item entity, and the City entity. Over time, as you add more rules and entities, those connections accumulate into a network. The Ontology tab in GameForge draws that network for you visually, so you can see which entities are central to your design and which are sitting untouched on the edges.",
          "The reason ontology matters is that it reveals things about your design that are very hard to see by just reading your rules. An entity with no rules attached to it is a design orphan — you've named something, perhaps even imagined it vividly, but you haven't given players anything to do with it yet. A rule that doesn't reference any named entity may be too abstract, or it may point to an entity you forgot to add. The ontology view turns those invisible problems visible, which is why it's one of the most diagnostic tools in the whole application.",
        ],
      },
      {
        heading: "How GameForge uses entities and ontology",
        points: [
          "When you ask the AI anything — whether through the chat panel or through the Enhance button on a rule or entity — it reads your entire ontology behind the scenes before it responds. It knows your entity names, their properties, and which rules connect to which pieces. This is why building out your entities and properties before chatting with the AI produces dramatically richer responses. You're not just having a conversation; you're giving the AI a vocabulary to work in.",
          "The Simulator tab — which runs automated playtest scenarios to check your game's balance — depends almost entirely on your entities having numeric properties. It needs to know what things cost, what effects they produce, and how they're likely to appear during play. A game with richly defined entities and clear properties will give the Simulator enough to work with for meaningful results. A game where entities are just names without properties will produce only guesses.",
          "Think of building your ontology as laying down a foundation. Every other tool in GameForge — the AI chat, the Simulator, the Balance tab, the Export engine — reads from that same foundation. The more carefully you define your entities and the rules that connect them, the more useful every other feature becomes. It's worth taking the time to do this well.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "An example: building a simple medieval game's ontology",
        points: [
          "Imagine a game where players are knights competing to control territories. You might start by defining four entities: Knight (the player role), Castle (a location), Sword (an item), and Peasant (a resource). You'd give each one properties — a Knight might have a movement range of 2 and starting gold of 10; a Sword might have a damage value of 3 and a cost of 4 gold.",
          "Then you'd write rules like 'a Knight may move to any adjacent Castle on their turn' and 'a Knight carrying a Sword deals double damage in combat.' Your ontology automatically connects Knight to Castle through the first rule, and Knight to Sword through the second. If the Peasant entity appears in your list but no rule mentions it, the Ontology tab will highlight it as unconnected — a useful prompt that you've defined something you haven't used yet.",
          "This example shows the core idea: entities are the nouns of your game, rules are the verbs, and the ontology is the grammar that shows whether your nouns and verbs are forming coherent sentences. A game with many nouns but few verbs is a collection of interesting pieces with nothing to do with them. A game with many verbs but few nouns is a set of abstract procedures with nothing to apply them to. A healthy ontology has both, and they fit together naturally.",
        ],
      },
      {
        heading: "Why this matters before you do anything else",
        points: [
          "Many first-time designers jump straight to writing rules. This isn't wrong, but it often leads to rules that are slightly disconnected from each other, because there's no shared vocabulary holding them together. If you define your core entities first — even just a rough list of 5 to 8 things — then the rules you write will naturally reference those same named things, and your design will be more coherent from the start.",
          "It also helps your collaborators, including the AI. When you ask the AI 'how should combat work in my game?' without any entities defined, it can only make generic suggestions. When you ask the same question with a Knight, a Castle, and a Sword already defined with properties, the AI can propose a combat system that's specifically tailored to those pieces and their values. The difference in quality is significant.",
        ],
      },
    ],
    pitfalls: [
      "Thinking entities can only be physical game components. An 'alliance' between factions, a 'seasonal phase,' or a 'market event' can all be entities if your rules refer to them by name and treat them as distinct things with behaviors.",
      "Building a list of entity names without adding any properties. Even one or two numeric properties per entity — a cost and an effect — is enough to unlock the Simulator and Balance tools. Names alone give the AI very little to reason about.",
      "Waiting until your design feels 'finished' before defining entities. Start with a rough list early and refine it over time. The act of naming your core entities will clarify your thinking in ways that are hard to predict until you try it.",
    ],
    tips: [
      "Start by asking yourself: what are the five or six things players will interact with most often on a typical turn? Those are almost certainly your core entities. List them first before writing any rules.",
      "After writing any new rule, pause and check: does every entity this rule mentions exist in my Entities tab? If not, add it right then. This simple habit keeps your ontology accurate without requiring a separate cleanup session.",
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
          "You can capture your game's vision — its theme, its player count, its target playing time, and its overall tone — in one central place that the AI always has in view. The AI's suggestions will only be as good as the information you give it, so a richly described project yields richly specific suggestions, while a two-word description yields generic ones.",
          "You can build a structured vocabulary of entities (the things in your game), rules (how those things interact), and player roles, which the AI can reason about rather than guessing. Think of this as teaching the AI the specific language of your game — its pieces, its verbs, its characters — so every conversation stays grounded in your actual design.",
          "You can brainstorm with multiple AI providers — Claude, GPT, Gemini, and Grok — and switch between them at any time without losing your conversation history. Each provider has different strengths, and having them all available means you can choose the right one for each task as your needs shift.",
          "You can run automated balance simulations that play through your game many times and surface dominant strategies or timing problems before you invest in a physical prototype. This can save you dozens of wasted playtests by catching structural issues early.",
          "You can generate concept art for your game's components — cards, boards, tokens, character illustrations — all anchored to a single visual style you define once, so the aesthetic stays consistent across everything you create.",
          "You can track playtests, design notes, and to-do items the way a real game studio would, including shareable feedback links that let outside playtesters submit responses without needing an account.",
        ],
      },
      {
        heading: "Three things to learn first",
        points: [
          "The left sidebar is your project list — click any project to open it. Inside a project, the tab bar along the top switches between the different sections: Overview, Research, Entities, Rules, and so on. Getting comfortable with this two-level navigation is the first step to moving around quickly.",
          "The chat panel on the right side of the screen is your AI co-designer. It stays with you as you move between tabs and keeps a separate conversation for each tab, so your chat about Rules won't get tangled up with your chat about Assets. You can collapse the panel entirely by clicking the small arrow in its header when you need more working space.",
          "Almost every list in GameForge — rules, entities, notes, assets — has a small sparkle icon button next to each item. That's the AI Enhance button, and it's the most powerful single feature in the application. Clicking it asks the AI to suggest improvements to that specific item, shows you a structured preview of those suggestions, and saves nothing until you explicitly accept each change. It's safe to explore.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "How GameForge works with the AI",
        points: [
          "Every time you ask the AI anything — whether through the chat panel or through the Enhance button — it first reads a summary of your entire project: the name, description, type, player count, and your most important entities and rules. This context is what separates a useful AI co-designer from a generic chatbot. A well-filled project produces answers that feel like they were written for your specific game.",
          "Most AI actions in GameForge follow a 'preview-first' approach, which means the AI proposes changes and you review each suggestion individually before anything is saved. This is intentional — it keeps you in control of your design and prevents the AI from overwriting work you care about. You're always the final decision-maker.",
          "If you have your own API key from an AI provider — such as Anthropic, OpenAI, or Google — you can paste it into your workspace settings. Once you do, every AI call from your workspace uses your own key instead of the platform's shared default. This is useful if you're running into usage limits, if your organization wants AI costs billed to a specific account, or if you want access to model versions that aren't available by default.",
        ],
      },
      {
        heading: "What GameForge is not",
        points: [
          "GameForge is not a live digital game platform. It does not let real players log in and play your game against each other online. The Simulator runs automated scenarios based on your rules, but it cannot replicate the social dynamics, table talk, and genuine human unpredictability of a real game night.",
          "GameForge is not a replacement for human playtesters. The Simulator is a useful early signal for structural problems, but five friends around a table will always catch things an algorithm misses — especially anything related to feel, fun, and the social experience of playing together.",
          "GameForge does not manufacture or ship physical games. Its export tools are designed to produce files you can take to a print-and-play service or include in a publisher pitch, not to fulfill finished games directly to customers.",
        ],
      },
    ],
    pitfalls: [
      "Skipping the Overview metadata. If the AI doesn't know your game's player count, playing time, and overall tone, it defaults to completely generic suggestions that could apply to any game. Filling out your overview is the single highest-return action you can take before your first AI conversation.",
      "Treating the chat history as a permanent record. Chat threads are not designed as long-term storage. Any important conclusion you reach in chat — a mechanic you want to keep, a rule you've agreed on — should be copied to Notes or promoted into a formal Rule, because chat threads can be cleared and are not searchable.",
    ],
    tips: [
      "Collapse the chat panel by clicking its header whenever you need more working space. The panel remembers its collapsed state across sessions, so you won't have to do it again next time.",
      "Hover over any message from the AI in the chat panel to reveal quick-save buttons. You can send the AI's reply directly to your Notes or Tasks with one click, without copying and pasting.",
      "Configure your AI providers in workspace settings before you invite collaborators, so everyone on your team starts with the same model defaults rather than having to configure their own.",
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
    blurb: "Your project's home screen. It shows the health of your design at a glance, holds the core metadata the AI reads before every response, and offers pre-built AI prompts to get you moving quickly when you're not sure where to start.",
    body: [
      {
        heading: "Stat tiles",
        points: [
          "The Overview displays live counts for each section of your project: how many entities you've defined, how many rules you've written, how many players, notes, tasks, and chat messages exist. These numbers aren't just for show — they're a quick diagnostic of whether your design is growing in a balanced way or tilting in one direction.",
          "Tile colors dim when a section is empty, so gaps jump out without requiring you to click into every tab. A faded Entities tile next to a full Rules tile is a prompt to go add some structure — you may be writing rules about things you haven't formally defined yet.",
          "Checking the Overview at the start of each design session takes about five seconds and is one of the simplest ways to stay oriented. Watching the numbers change over time also gives you a sense of progress that can be hard to feel when you're deep in the details.",
        ],
      },
      {
        heading: "Project metadata",
        points: [
          "The metadata fields — name, description, game type, genre, player count, and target playing time — are saved automatically as you type them. There's no Save button to forget. More importantly, these fields are read by the AI every single time it responds to you, anywhere in the project. They are the foundation of everything context-aware the AI does.",
          "Treat the description field like the first paragraph of a pitch to a stranger. Be specific: instead of 'a trading game set in space,' try 'a 2–4 player asymmetric trading game set in a dying solar system, where players balance resource scarcity against sabotage, targeting a 45-minute play time.' The AI will respond to your description the way a human co-designer would — vague descriptions get vague suggestions, specific ones get specific ones.",
          "The Duration field is your target playing time, not how long your current prototype actually runs. The Simulator later compares its estimated game length against this target to tell you whether your game is running long or short. If you set an unrealistically short target for a complex game, the Simulator will flag every test as 'too slow' even if the pacing is perfectly reasonable.",
        ],
      },
      {
        heading: "AI Quick Actions",
        points: [
          "The Overview includes a set of pre-built AI prompts — Generate Hook, Suggest Mechanics, Critique Pitch, and others. Clicking one sends a carefully worded prompt to your chat panel using your current project context as background. These are designed to get you moving quickly, especially at the beginning of a session when you're not sure what to work on.",
          "Quick Actions work particularly well before you've filled out all your entities and rules, because they only need a title and a description to produce useful results. They're often the right first move on a brand-new project — better to react to and refine an AI suggestion than to face a blank page.",
          "Each Quick Action is automatically routed to the AI provider best suited for that type of task: long structured analysis goes to Claude, rapid idea generation goes to Gemini, and so on. You don't need to choose a provider manually for Quick Actions — the routing happens behind the scenes.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Reading the stat tiles like a designer",
        points: [
          "If you have more than 30 rules but fewer than 8 entities, your game is likely under-componented. Most successful modern board games in the strategy genre — the kind with resource management and meaningful choices — sit around 30 rules supported by 15 or more distinct entity types. If rules are vastly outnumbering your entities, your design may be top-heavy, with lots of verbs and not enough nouns for them to act on.",
          "If you have player roles defined in the Players tab but none of them have any unique properties — meaning every player starts with the same capabilities — it's worth asking whether your Players section is doing real design work yet. You may have a symmetric game where everyone plays identically, which is a valid choice, but it should be a deliberate one rather than a default.",
          "If your Notes count greatly exceeds your Rules count, your design is still in an exploratory phase. Notes are where you keep fuzzy ideas; Rules are where you make commitments that players can actually follow. Converting your most confident notes into formal rules is one of the clearest signals that a design is maturing.",
        ],
      },
    ],
    pitfalls: [
      "Leaving the description field as something generic like 'a board game about X.' This is the single most common mistake, and it results in the AI generating suggestions that could apply to any game about X — not to your specific vision. A detailed description is the highest-return thing you can write in the entire application.",
      "Setting an overly optimistic target duration for the complexity of your game. If your game has 15-minute turns but you've set a 20-minute total target, the Simulator will flag every run as running long even if the pacing is completely intentional. Set the duration to what you genuinely believe a finished, well-taught version of your game should take.",
    ],
    tips: [
      "Open the Overview at the start of every design session, not just when you first create the project. A quick scan of the tiles reminds you where gaps exist and helps you decide where to spend your time that day.",
      "Use Quick Actions before you start writing rules. It's far easier to react to a starting point the AI has given you than to generate original ideas from scratch on an empty screen.",
    ],
    starters: [
      "What should a strong project description look like?",
      "Which stat tile imbalances usually signal a design problem?",
      "When should I use a Quick Action instead of typing in the chat directly?",
    ],
  },
  {
    id: "research",
    title: "Research tab",
    icon: ScrollText,
    blurb: "Your designer's notebook for reference material from the outside world. Drop in summaries of other games, notes from design articles, or feedback from early playtesters, and let the AI draw on that material when making suggestions.",
    body: [
      {
        heading: "Why this tab exists",
        points: [
          "Every game designer draws on things they've read, played, and been told. The Research tab is where you store those external inputs in a structured way so the AI can reference them when answering your questions. Without it, you're relying on the AI's general knowledge of board games; with it, you're giving it specific knowledge of the games and feedback that matter to your project.",
          "When you've added research items and ask the AI something like 'how should I handle turn order in my game?', it can draw on a breakdown of how another game handles the same problem — if you've pasted that breakdown in here. The response moves from generic advice to targeted analysis of something you've already found relevant.",
          "Research also serves as an audit trail for your design decisions over time. Three months into development, when you're wondering why you made a particular structural choice, you can look back at your research items and often trace which game comparison, article, or playtest report motivated it. This institutional memory is easy to lose without a dedicated place to keep it.",
        ],
      },
      {
        heading: "What to add and how",
        points: [
          "The most useful research items are specific and mechanical rather than general impressions. 'Wingspan's four main actions in fixed order: play a bird, gain food, lay eggs, draw cards. Each bird card has a unique power that fires when that action phase occurs' is something the AI can compare directly against your own turn structure. 'I like Wingspan' is not.",
          "Playtest reports from outside your own head belong here, not in Notes. Notes are for your personal thoughts and internal design reasoning. Research is for things that came from other people — feedback from a session, a quote from a BGG forum thread, a published designer's reflection on their own process. Keeping these separate makes it easier to distinguish between what you believe and what you've been told.",
          "Short, clearly labeled entries are far more useful than long unprocessed text dumps. If you want to include content from a long rulebook or article, summarize it first to its most relevant two or three paragraphs. The discipline of summarizing also forces you to decide what's actually useful about the material.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What makes a research item useful vs. not",
        points: [
          "A useful research item is specific enough to be referenced in a concrete answer. Something like 'Root's faction asymmetry: the Marquise de Cat plays a standard action-selection game; the Eyrie Dynasties follows a rondel with mandatory escalation; the Woodland Alliance spends sympathy tokens to spread influence. All three are playing different games on the same board' gives the AI a structured comparison it can draw on when discussing asymmetry for your game.",
          "A poor research item is a vague impression or an emotional reaction. 'Terraforming Mars is amazing' tells the AI nothing actionable. If you want Terraforming Mars to inform your design, add a specific note about what mechanic you're drawing from: 'Terraforming Mars's project card engine — players build permanent tableau effects over 10–14 rounds, with card costs paid in resources generated by previous cards. Late-game acceleration is the core feel.'",
          "Very long pastes — full rulebooks, lengthy forum threads, multi-page articles — are difficult for the AI to use effectively because it can only hold so much in mind at once. A well-written 200-word summary of a 50-page rulebook will produce better AI responses than the full 50 pages pasted in. Summarize first, then save.",
        ],
      },
    ],
    pitfalls: [
      "Treating the Research tab as a dumping ground. If you paste in 40 items without clear labels and can't find what you're looking for by skimming, you'll stop using the tab entirely. A curated list of 10 well-chosen, clearly labeled items is worth far more than a pile of 50 vague ones.",
      "Pasting entire published rulebooks verbatim. Beyond creating a wall of text the AI can't easily use, pasting full copyrighted documents raises intellectual property concerns. Quote the specific sections relevant to your design, paraphrase the rest, and give credit to the source.",
    ],
    tips: [
      "After pasting any long piece of text into a research item, immediately ask the AI in the chat panel to summarize it for you. Then replace the raw text with the summary. You'll use the summary in future conversations far more than the original wall of text.",
    ],
    starters: [
      "What kinds of research items give the AI the most to work with?",
      "How do I use research to compare two existing games?",
      "Should I paste an entire rulebook or just the parts that matter?",
    ],
  },
  {
    id: "ontology",
    title: "Ontology tab",
    icon: Network,
    blurb: "A bird's-eye map of how your entities and rules connect to each other. This is not a place to build your game — it's a place to step back and read it, spotting gaps, isolated pieces, and structural imbalances before they cause problems during playtesting.",
    body: [
      {
        heading: "Entity taxonomy",
        points: [
          "The Ontology tab organizes all your entities into categories — items, factions, locations, events, characters — and shows you how many of each type you've defined. This is useful because most games need a mix of entity types working together. A game with 25 items but only 1 location is probably skewed in a way worth examining, even if it doesn't feel obvious from inside the design.",
          "Clicking on any entity type opens a short explanation of what that category typically represents in board game design and what properties entities of that type commonly have. If you're uncertain whether something should be an item or a faction, clicking into both will help you decide.",
          "The count next to each type is also a signal. A type with only one entity is often a placeholder — you've started a category but haven't developed it yet. A type with 30 or more entities may benefit from subcategories so the list doesn't become unwieldy to navigate or reason about.",
        ],
      },
      {
        heading: "How rules and entities connect",
        points: [
          "GameForge automatically scans your rule text and highlights any entity names it finds mentioned there. Each match creates a visual connection between that rule and that entity in the Ontology view — building the web we described in the first chapter. You don't have to do anything to create these connections; they appear on their own as you write.",
          "An entity with no rule connections is called an orphan — something you've defined but that your rulebook doesn't yet give players a reason to interact with. Orphans aren't always mistakes. Sometimes they represent planned features you haven't written yet. But they are always worth reviewing, because in a finished game, everything a player can see should have at least one rule that gives it meaning.",
          "A rule with no entity connections is similarly worth examining. It might be describing a game state abstractly ('the player with the most points wins') without naming any of the pieces involved, or it might reference entities you've described in the rule text but haven't formally added to your Entities tab. Both cases point to something that can be made more precise.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What the connection patterns tell you",
        points: [
          "Entities that are referenced by many rules are the hub pieces of your design — the components that players interact with constantly. These are your game's core loop made visible. If the 'Resource' entity shows up in 20 rules and the 'Event Card' entity shows up in 2, your game is fundamentally a resource-management game whether you intended it or not. Knowing this lets you make an informed decision: lean into it or rebalance.",
          "Entities touched by only one or two rules are the edges of your design — pieces that exist but barely participate. Sometimes these are deliberately minimal, adding flavor without adding complexity. Other times they represent systems you started building and never finished. Looking at these edge pieces with fresh eyes is a good way to identify what's worth developing and what's worth cutting.",
          "When multiple entity types cluster together — when items connect to events, which connect to factions — you've likely found an emergent subsystem: a group of mechanics that interact in ways you may not have fully designed intentionally. These clusters are often what playtesters point to when they say 'that part is really interesting.' They're worth protecting and deliberately developing.",
        ],
      },
      {
        heading: "Ontology vs. Entities vs. Rules — when to use each",
        points: [
          "Think of the three tabs as serving three different purposes. The Entities tab is where you create things — you define each entity, name it, and give it properties. The Rules tab is where you write your game's verbs — the actions and interactions players can take. The Ontology tab is where you step back and read the grammar — you see whether the things you've created and the verbs you've written are forming a coherent, complete design.",
          "A healthy workflow visits all three regularly. Write in Entities and Rules during focused design sessions, then open Ontology to review what you've built. The review often reveals something you couldn't see while you were in the middle of writing — a cluster that needs development, an orphan that needs attention, or a hub that's becoming so central it risks breaking the design if it ever changes.",
        ],
      },
    ],
    pitfalls: [
      "Renaming an entity in the Entities tab without also updating every rule that mentions it by name. The connection system matches rule text to entity names as exact text — if you rename 'Iron Sword' to 'Steel Blade' but your rules still say 'Iron Sword,' those rules will lose their connections in the Ontology view.",
      "Adding entities to your list without giving them any numeric properties. They'll appear in the taxonomy view as names, but the Simulator and Balance tab depend on numeric properties to do their calculations. An entity without properties is invisible to your game's math.",
    ],
    tips: [
      "Keep entity names consistent in spelling and capitalization throughout your rules. The system matches text exactly, so 'Merchant' and 'merchant' are treated as different entities.",
      "After any major rules-writing session, open the Ontology tab and look for anything that's become newly disconnected. Those isolated pieces are your design questions for the next session.",
    ],
    starters: [
      "What does it mean if an entity has no linked rules?",
      "How do I identify my game's core loop from this view?",
      "Should I worry if one entity type has far more connections than the others?",
    ],
  },
  {
    id: "entities",
    title: "Entities tab",
    icon: Layers,
    blurb: "The place where you build the vocabulary of your game — every item, faction, location, event, and character that exists in your design. Everything else in GameForge — the rules, the AI responses, the simulations — hangs off the entities you define here.",
    body: [
      {
        heading: "Three ways to create entities",
        points: [
          "You can add an entity manually by clicking the Add Entity button. This is the right approach when you have a specific piece clearly in mind and want to define its name, type, and properties yourself from scratch. It's the most controlled method and the easiest way to be precise.",
          "You can ask the AI to generate entities by describing what you need in the chat panel. For example, typing 'create three mid-tier weapon entities with interesting trade-offs between cost and effect' will produce a set of entities as a starting point. AI generation is excellent for rapidly building out categories — generating 10 items, then reading through them and keeping the 4 that actually fit your game.",
          "You can also promote entity references from your rules. When you write a rule that mentions a piece by name — say, 'Iron Dagger' — GameForge notices and can surface that name as a candidate for a formal entity. This is useful for catching things you've already started to define implicitly in your writing but haven't yet made official.",
        ],
      },
      {
        heading: "Properties: giving entities meaning",
        points: [
          "Properties are the numbers and descriptions that turn an entity from a name into a game piece. A property can be a number — a damage value, a cost in coins, a movement range — or it can be text — a rarity label, a category tag, a flavor note. You can add as many properties as an entity needs, though simpler is usually better.",
          "Numeric properties are especially important because they're what the Simulator and Balance tab use to compare entities against each other. If your game has ten items but only one of them has a cost property, the balance analysis can only work with that one. The more consistently you apply properties across your entities, the more useful the analytical tools become.",
          "Properties should contain game data, not storytelling. Use the entity's description field for lore, flavor text, and narrative context. Use properties for numbers and labels that affect how the entity works during play. Mixing these up makes it harder to use the balance and simulation tools effectively.",
        ],
      },
      {
        heading: "AI Enhance per entity",
        points: [
          "The small sparkle icon next to any entity opens an AI Enhance preview specifically for that entity. The AI looks at the entity's current name, description, and properties, and then suggests improvements: a tighter name, a clearer description, missing properties it thinks you should have, and related entity ideas that might complement it.",
          "This preview is non-destructive — nothing changes until you explicitly accept each suggestion. You can accept the name change, reject the description rewrite, and accept two of the three suggested properties all independently. This makes it safe to explore even on entities you're satisfied with.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Naming entities well",
        points: [
          "Entity names work best as short, unambiguous noun phrases — 'Iron Gauntlet,' 'Merchant Guild,' 'Forest Path.' Avoid sentence-style names like 'A Gauntlet Made of Iron' or 'The Path Through the Forest.' Short names are easier for the system to match in rule text and easier for the AI to reference in conversation.",
          "Choose a capitalization convention and apply it everywhere. Title Case for named entities, lowercase for generic categories — whatever you decide, consistency matters because the system matches entity names by exact text. If half your rules call it 'Sword' and half call it 'sword,' the Ontology connections will be inconsistent.",
          "Be careful when two entities have names that overlap, such as 'Sword' and 'Greatsword.' When scanning your rules for entity names, the system may match 'Sword' inside the word 'Greatsword' and create unintended connections. Distinctive names prevent this kind of ambiguity.",
        ],
      },
      {
        heading: "A useful property checklist",
        points: [
          "Cost — what does a player spend to acquire or use this entity? Express it in whatever currency your game uses: gold, action points, energy, cards spent. Having a cost property on every entity is the single most important thing you can do for balance analysis.",
          "Effect — what does the entity do, expressed as a number where possible? A weapon that deals 3 damage is more useful to the Simulator than one whose description says 'deals a moderate amount of damage.'",
          "Duration — is the entity's effect instant (use it once), persistent (stays on the table), or limited (lasts for three turns)? This affects how the Simulator models the entity's contribution to a game state.",
          "Rarity or tier — how often does this entity appear? Common, uncommon, rare? Starting equipment or late-game acquisition? This tells the balance tools how much weight to give the entity when computing averages.",
          "Constraints — who can use it, under what conditions, and how often? A constraint property can be text: 'warriors only,' 'once per round,' 'requires adjacent castle.'",
        ],
      },
      {
        heading: "When to split one entity into two, and when to merge two into one",
        points: [
          "If two entities differ only in a single number — say 'Basic Sword' with damage 2 and 'Sharp Sword' with damage 3 — consider making them one entity with a quality or tier property instead. This simplifies your list and often makes the design easier to balance, since you're tuning one entity rather than two.",
          "If one entity has accumulated ten or more properties and some of them seem to belong to a completely different concept, it may actually be two entities that got merged by accident. Split it, name each part clearly, and see if your rules need to be updated to reference the new separate pieces.",
        ],
      },
    ],
    pitfalls: [
      "Generating a large batch of entities from the AI and keeping all of them without reading through carefully. AI-generated entities are a starting point for triage, not a finished list. Five entities you've thought through carefully will do more for your game than fifty the AI padded out.",
      "Using property fields for flavor text and storytelling. That's what the description field is for. Properties should contain data the game and its tools can use — numbers and categorical labels, not paragraphs.",
    ],
    tips: [
      "If you're building a large category of entities — say, 20 item cards — use AI to generate a draft batch, then read through them and delete everything that doesn't feel like it genuinely belongs. This 'generate and prune' workflow is faster than creating each entity manually from scratch.",
      "Add a cost property to every entity, even if your game doesn't use gold or a traditional payment system. The cost property is the foundation the Balance tab uses to compare entities — without it, the chart is incomplete.",
    ],
    starters: [
      "Which properties should every entity have, regardless of type?",
      "How many entities is too many for a 60-minute game?",
      "When should I merge two similar entities into one?",
    ],
  },
  {
    id: "players",
    title: "Players tab",
    icon: Users,
    blurb: "Where you define two distinct things: the in-game roles players can take on, and the real-world audience your game is designed for. Both matter, and conflating them is one of the most common early design mistakes.",
    body: [
      {
        heading: "In-game roles vs. real-world audiences",
        points: [
          "An in-game role — sometimes called a player type or faction — describes who the player is inside the fiction of your game. In a trading game, a role might be Merchant, Smuggler, or Tax Collector. Each role usually has distinct starting conditions, unique abilities, or different win conditions. These are the game design choices that affect your rules and your balance work.",
          "A real-world audience description — sometimes called a persona — describes the actual human being who will sit down and play your game on a Friday night. This person's gaming experience, patience for rulebook complexity, preferred game length, and the kind of group they play with are all design constraints as real as any mechanical one. A game designed for veteran strategy gamers can be built very differently from one designed for families with kids.",
          "You need both, and they answer different questions. In-game roles tell you what to design mechanically. Audience personas tell you how complex the mechanics can be, how long the rulebook can run, and what kind of learning curve is acceptable. Use them together, but don't confuse one for the other.",
        ],
      },
      {
        heading: "Symmetric vs. asymmetric player roles",
        points: [
          "A symmetric game means every player starts with the same capabilities and follows the same set of rules — the only difference is their choices and their luck. Games like Catan and Carcassonne are symmetric. These games are generally easier to design, easier to teach, and easier to balance, because every comparison is between identical starting conditions.",
          "A lightly asymmetric game means everyone follows the same rules, but players start with different bonuses, different special cards, or different one-time abilities. Seven Wonders works this way — everyone uses the same card-drafting rules, but each player's starting wonder gives them a slightly different optimization target.",
          "A heavily asymmetric game means each player type has meaningfully different rules — different turn structures, different win conditions, different action menus. Root and Spirit Island are famous examples. This kind of design creates extremely high replay value, because playing a different faction genuinely feels like a different game. But it multiplies your design and balance work substantially, because every faction must be tested against every other combination.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Writing audience personas that actually shape your design",
        points: [
          "A useful persona is specific enough to create concrete design constraints. 'A mid-30s couple who play one game night per week, own Splendor and Wingspan, and absolutely will not read a rulebook longer than eight pages' is a useful persona. It tells you your game needs to teach in under ten minutes, should reward casual strategic thinking rather than deep optimization, and needs a reasonable component count.",
          "A poor persona is too broad to constrain anything. 'Gamers' or 'board game enthusiasts' or 'people who like strategy' gives you no useful constraints at all, because those descriptions include everything from someone who plays Candy Land to someone who owns Twilight Imperium. If your persona could describe almost anyone, it's not doing its job.",
          "The best way to make a persona useful is to name it after a real person you know. Think of someone in your life who you'd want to play this game. Would they read the rulebook? Would they like the theme? How long before they'd lose interest during a slow midgame? Keeping a real person in mind while making design decisions is much more powerful than a vague demographic description.",
        ],
      },
      {
        heading: "When asymmetric roles are worth the extra work",
        points: [
          "Asymmetric roles make the most sense when your theme genuinely demands that different participants in the fiction behave differently. A heist game where the Mastermind, the Safecracker, and the Driver all have different job descriptions practically writes asymmetric rules for you — the theme is already asymmetric.",
          "Asymmetric roles also shine when your target audience is a regular gaming group that will play the same game many times. Different roles each session means it effectively becomes a new game with every play, which dramatically extends the lifespan of a single game design.",
          "The practical limit is how many hours of playtesting you can realistically invest. Every player type needs to be tested against every other type in every possible combination, and then tuned. For a 4-player game with 4 asymmetric roles, that's a substantial undertaking. Design only as many roles as you're willing to fully develop and test.",
        ],
      },
    ],
    pitfalls: [
      "Designing more player types than your game can seat. If your game plays 4, design 4 roles — not 8. The first 4 will get refined through playtesting; the extra 4 rarely do, and they'll feel half-finished compared to the core set.",
      "Writing audience personas as a marketing task and then ignoring them when making design decisions. If your personas aren't actively changing choices about complexity, rule length, and component count, they're not doing their job. Revisit them before every major decision.",
    ],
    tips: [
      "Name your personas after real people you know whose taste fits what you're going for. It's much easier to ask 'would Jamie read this rulebook?' than to ask 'would a mid-tier hobbyist gamer read this rulebook?'",
      "Re-read your persona descriptions before every significant design decision. They function as a gentle veto on ideas that might be interesting but wrong for your audience.",
    ],
    starters: [
      "Should my first game be symmetric or asymmetric?",
      "How many player roles is a sustainable number to design and test?",
      "What makes an audience persona actually useful in practice?",
    ],
  },
  {
    id: "rules",
    title: "Rules tab",
    icon: FileText,
    blurb: "Where you write your game's rulebook — structured, categorized, and enhanced by AI. Rules are the verbs of your game, and this tab is where the gap between 'the game makes sense in my head' and 'strangers can follow it' gets closed.",
    body: [
      {
        heading: "Categories",
        points: [
          "Every rule you write can be tagged with a category: Movement, Combat, Economy, Turn Structure, Variant, and others. Each category gets a distinct colored badge in the list, making it easy to see at a glance how your rulebook is structured — whether it's heavy on combat mechanics, light on economy rules, or balanced across everything.",
          "Categories also affect how your rules are ordered in the exported rulebook. When you generate a printable PDF from the Exports tab, the rules are grouped by category and arranged in a logical teaching sequence. This means a few minutes spent categorizing now saves you manual reorganization later.",
          "When a rule feels like it belongs to two categories, choose whichever category is most relevant to the decision the player is making when they need to consult the rule. If a 'trade during combat' rule could be Economy or Combat, ask yourself: when would a player look this up? Probably during a combat, so tag it Combat.",
        ],
      },
      {
        heading: "What you can do with each rule",
        points: [
          "Clicking the sparkle icon on any rule opens an AI Enhance preview for that rule specifically. The AI suggests a tighter version of the wording, adds designer's notes explaining why the rule exists, surfaces potential edge cases — situations the rule doesn't explicitly handle — and recommends related rules you might be missing. Everything is shown as a preview and nothing is saved until you accept each change individually.",
          "The copy icon duplicates a rule as a starting point for a closely related one. This is useful when you're building a family of rules that follow the same structure but apply to different entities — for example, several rules about different types of combat that all share the same resolution sequence.",
          "The pencil icon opens the rule for in-place editing of its text, category, and priority. You don't need to navigate away from the list to make changes.",
        ],
      },
      {
        heading: "Priority levels",
        points: [
          "Each rule can be assigned a priority from 1 to 5 that represents how often it comes up during actual play. Priority 5 is for rules that apply during setup or on every single turn — the absolute foundations. Priority 1 is for rarely-triggered variants or optional rules that only matter in unusual situations.",
          "Priority levels affect two things: the order rules appear in exports (higher priority rules come first, so the rulebook teaches the most important things early), and the emphasis the AI gives to rules when you ask it questions about your game. If the AI doesn't know which rule matters most, it can't give appropriately weighted advice.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Writing rules that strangers can follow",
        points: [
          "Aim for one complete action per rule. If you find yourself writing the word 'and' more than once to connect different things happening, that's a signal the rule is actually two rules being compressed into one. Split it. Each rule should describe a single thing a player can or must do.",
          "Use the same verb every time you mean the same thing. If players can discard cards, always say 'discard' — never 'remove,' 'trash,' 'put aside,' or 'get rid of' as synonyms. Inconsistent vocabulary is the most common cause of playtester confusion, and it's entirely fixable at the writing stage.",
          "Every rule should clearly state three things: who it applies to (the active player, all players, the player to your left), when it applies (at the start of your turn, when you enter combat, once per round), and what happens (draw 2 cards, lose 1 resource, take the first player token). A rule missing any of these will generate questions at the table.",
          "Include the exception case explicitly whenever something can fail. If a rule says 'draw a card,' always answer: what if the deck is empty? If a rule says 'attack the nearest opponent,' always answer: what if two opponents are equidistant? Players will encounter these edge cases and your rulebook should address them before the question arises.",
          "Never use the word 'normally.' It implies there are exceptions without naming them, which creates ambiguity. If there's an exception, name it in the same sentence. If there isn't, drop the word entirely.",
        ],
      },
      {
        heading: "What the AI Enhance preview shows you",
        points: [
          "Tightened wording: an alternative version of your rule that aims to be clearer and more unambiguous, without being longer. The AI tries to maintain your voice while removing potential sources of confusion.",
          "Designer's notes: a short explanation of why this rule exists from a design perspective — what problem it solves, what it prevents, what experience it enables. These are invaluable for your future self and for any collaborators, but players never see them.",
          "Edge cases: specific situations your rule doesn't explicitly address — things like simultaneous triggers, empty resource pools, or blocked actions. These are the questions playtesters will ask at the table. Better to answer them now in the rulebook than to improvise at game night.",
          "Related rule suggestions: rules the AI thinks you may have forgotten to write, usually about resolution order, simultaneous play, or the reverse of an action you've defined. If the AI suggests something you've already covered elsewhere, ignore it. If the suggestion reveals a genuine gap, add it.",
        ],
      },
    ],
    pitfalls: [
      "Writing rules as long, flowing paragraphs. Rules that read like prose are difficult to parse under the pressure of a live game. Short sentences and bullet-style clarity are your friends, even if they feel less elegant on the page.",
      "Accepting an AI rewrite of your rule without reading it carefully. The AI occasionally clarifies a rule by subtly changing its meaning — introducing a constraint that wasn't there before, or removing one that was intentional. Always compare the AI's version to yours before accepting.",
      "Leaving all your rules at the default priority. Without priorities, your exported rulebook will be unordered and your AI interactions will lack useful context about which rules are foundational versus peripheral.",
    ],
    tips: [
      "Assign Priority 5 to any rule that applies during setup or on every turn — these are your game's heartbeat rules. Assign Priority 1 to variants and optional rules. Everything else falls in between.",
      "Sort your rules by category when you want to proofread for completeness. Reading all your Combat rules together often reveals gaps or inconsistencies that aren't visible when rules are mixed in with everything else.",
      "When you use AI Enhance, consider accepting the Designer's Notes even if you reject the rewritten rule text. The notes are almost always useful as internal documentation, regardless of whether you wanted the wording changed.",
    ],
    starters: [
      "How do I write a rule that strangers can follow without my help?",
      "When should I split one rule into two separate rules?",
      "What does the priority field actually affect?",
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
          "If games are consistently running much longer than your target duration, there's usually a rule creating a slow loop somewhere — a cycle of acquiring and spending resources that doesn't push the game toward an ending. Look for rules that let players draw, earn, or recover indefinitely without a hard cap or countdown.",
          "If the length of games varies enormously — some ending in 8 turns, others running 40 — your end-game trigger is fragile. It's being activated at wildly different times depending on starting conditions or early decisions, which means players can't tell when the game is winding down and can't plan appropriately.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What the Simulator is genuinely good at",
        points: [
          "Spotting dominant strategies — situations where one path to victory wins significantly more often than others. These are structural problems in the game's mathematics that human playtesters might not catch for many sessions, especially if they don't naturally gravitate toward optimal play.",
          "Detecting runaway leader effects — patterns where the player who gets ahead early tends to stay ahead. This is also called a 'snowball' problem. If whoever scores first wins most of the time, your game may need a catch-up mechanism: a way for trailing players to close the gap.",
          "Estimating game length against your target. The Simulator won't be perfectly accurate — real players play differently from simulated ones — but it will tell you whether your game is fundamentally running in the right ballpark or is structurally too long or too short.",
          "Identifying unused entities — pieces that appear in your design but which winning players rarely use. If an entity is chosen in fewer than 5 percent of winning games when it's available, it may be priced too high, too weak, or redundant with something better.",
        ],
      },
      {
        heading: "What the Simulator genuinely cannot do",
        points: [
          "Simulate social dynamics. Games that involve bluffing, negotiation, voting, or reading other players' faces depend on things that only happen between real human beings. The Simulator has no concept of trust, intimidation, or table politics.",
          "Simulate real-time mechanics. If your game involves speed, reflexes, or simultaneous action, the Simulator can't represent that — it plays turn by turn.",
          "Capture player experience. Whether a game is fun, tense, funny, or satisfying is entirely invisible in the data. Simulation results are about structure and math, not about feel. Always treat them as a starting hypothesis to explore with real players, not as a final verdict.",
        ],
      },
      {
        heading: "Understanding the results charts",
        points: [
          "The win-rate chart shows how often each strategy or player type won across all simulated games. A healthy chart shows relatively similar bars — no single strategy towering over the others. A dominant bar is your first priority to fix.",
          "The turn-count chart shows the distribution of how many turns games lasted. A healthy chart clusters around your target duration. A very wide spread — some games ending in a few turns, others going on much longer — means the end-game condition is inconsistent.",
          "The score-spread chart shows how wide the gap was between the winning player and the others at the end of each game. A tight spread — everyone close to the same score — suggests a competitive, close-fought feel. A wide spread — the winner running away — suggests winners are over-rewarded or losers lack meaningful catch-up options.",
        ],
      },
    ],
    pitfalls: [
      "Running a small number of simulations and treating the results as reliable. With very few runs, one unusual game can skew your statistics significantly. Run at least 100 games to get a stable signal, and more if you're making an important design decision based on the results.",
      "Dismissing the 'optimal play' results because you assume real players won't play that way. The optimal-play scenario represents the ceiling of your game's strategy space. If it's broken at the ceiling, experienced players will eventually find it — and when they do, it will feel unfair to everyone else at the table.",
    ],
    tips: [
      "Before you tune anything, run a baseline simulation with random decision-making. This tells you what your game looks like when no one is trying to win strategically, and gives you a reference point to compare against after you make changes.",
      "Run a simulation, make one targeted change to a rule or entity, then run the simulation again with the same parameters. Comparing the two sets of results tells you whether your change moved things in the right direction.",
    ],
    starters: [
      "How many simulated games do I need to run before I can trust the results?",
      "What does it mean when one strategy wins 80% of the time?",
      "Should I worry about high variation in how long games last?",
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
          "The more specific and evocative your visual style description, the more consistent and usable your results will be. Vague descriptions like 'fantasy' or 'dark and moody' produce generic results. Specific ones — 'hand-painted watercolor, muted earth tones, 1920s expedition aesthetic with aged paper textures' — give the AI a concrete visual vocabulary to work within, and your generated images will look like they belong to the same game.",
          "When you generate images across multiple sessions, re-read your visual style description before starting. It's easy for it to drift slightly in your mind over time, and regenerating components with a slightly different mental picture in mind produces a visual inconsistency that can be hard to trace.",
        ],
      },
      {
        heading: "Generating components",
        points: [
          "The Assets tab offers preset component types — Card, Board, Token, Dice, Character, Map, Box Cover, Logo — each tailored to its specific shape and context. Clicking any preset generates an image appropriate to that component type using your visual style description and the context of whichever entity you've selected.",
          "There's also a free-form prompt option for anything the presets don't cover. If you need a specific scene, a particular prop, or a layout mockup, you can describe it directly.",
          "Generated images attach to the entity they were created for, so if you generate card art for a Merchant entity, you can find that art by opening the Merchant entity later. This keeps your asset library organized as it grows.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Getting usable card and character art",
        points: [
          "Describe the framing of the image the way a photographer or illustrator would. 'Centered subject, head and shoulders, three-quarter angle, simple muted background' tells the AI exactly how to compose the shot. Without framing guidance, AI-generated art often produces unexpected angles and compositions that don't work on a card layout.",
          "Specify the artistic finish to avoid generic results. Words like 'matte illustration,' 'watercolor,' 'ink linework,' 'oil painting' direct the AI toward a style. Without them, the AI tends to default to a glossy, photorealistic 3D look that rarely matches the tone of a hand-crafted board game.",
          "Never include readable text in your image prompts. AI image generators consistently produce garbled, illegible text — letters and words that look plausible from a distance but are nonsense up close. Design the text layer of your cards separately and overlay it on the generated image.",
          "Generate several variants of each concept and compare them before deciding which to keep. Selecting the most consistent image from a set of five is much faster than trying to get a single perfect result on the first attempt.",
        ],
      },
      {
        heading: "Honest expectations for AI-generated art",
        points: [
          "AI-generated art is excellent for prototypes, pitch decks, and communicating visual direction to collaborators. It's fast, cheap, and flexible. For these purposes, it genuinely changes what's possible for an independent designer on a limited budget.",
          "If you eventually self-publish or license your game, you will almost certainly need a human illustrator for the final production art. Matching a consistent style across 100 or more cards, covers, boards, and tokens is currently beyond what AI generation does reliably, and publishers have high visual standards.",
          "Before using any AI-generated image commercially, check the terms of service of the image generation tool you're using. Licensing rules vary between providers and change over time, and what's acceptable for personal use during development may have different rules for commercial publication.",
        ],
      },
    ],
    pitfalls: [
      "Letting your visual style description drift from session to session. If you add details or change emphasis over time, later-generated images will look slightly different from earlier ones. Re-read and reaffirm the description at the start of each assets session to keep everything cohesive.",
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
          "Each playtest session in GameForge can generate a shareable link that opens a feedback form. Your playtesters can fill it out from any device without creating an account. The responses flow back into the session record automatically, so you don't have to collect and re-enter them.",
          "The link is tied to the specific session and stops accepting responses when you close the session. This makes it safe to share on social media or in an email thread — you're not leaving a permanent open door to your project.",
          "This feature is especially useful for remote playtesters or for groups that scatter quickly after a game and wouldn't fill out a long form in person. A short digital form they can complete on the train home often captures more honest and complete feedback than a rushed in-person debrief.",
        ],
      },
      {
        heading: "What to record in each session",
        points: [
          "Each session log captures the basics — date, number of players, total playing time, and how many full turns were completed. These numbers matter more than they seem: tracking them across sessions reveals whether your game is getting longer or shorter as you make changes, and whether the turn count is consistent or wildly variable.",
          "The free-form notes field is where you capture what you actually saw and heard at the table — moments of confusion, surprising decisions players made, rules they got wrong without asking, and anything that made players laugh or groan. These observational notes are often more valuable than post-game feedback forms, because players don't always consciously notice the things that matter most.",
          "The most important and most often skipped field in any session log is 'what changed since last time.' Recording what you changed between sessions — even briefly — is what allows you to connect a session's results to a specific decision. Without it, a month later you won't remember whether the change to the combat rule was before or after that frustrating session, and you can't learn from the data.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Getting the most from a playtest session",
        points: [
          "If at all possible, don't play in the session yourself — observe instead. When you're playing, you're making decisions and paying attention to your own game state, which means you're missing the moments of confusion, hesitation, and frustration that are your most valuable data. Sit outside the game and watch.",
          "Time specific things during the session: how long did teaching the rules take? How long was the first player's first turn? How much time did players spend waiting for their next turn? These measurements catch problems that are hard to articulate — 'something felt slow' becomes 'the rules teach took 18 minutes and the first turn averaged 6 minutes' which is actionable.",
          "After the game, ask for the worst part first. People are socially conditioned to offer praise, and if you let them start there, they'll sometimes run out of time or enthusiasm before getting to the honest criticism. Open with 'what's the first thing you'd change if you could?' or 'what felt most unfair?' to get to the useful information faster.",
          "Ask the same questions at every session, in the same order — something like: Would you play again? What was the most interesting decision? What felt unfair? What would you change first? Consistent questions make sessions comparable. If you ask different things each time, the data can't be aggregated.",
        ],
      },
      {
        heading: "Coached vs. blind playtests — which to run when",
        points: [
          "A coached playtest is one where you teach the rules yourself, answer questions, and guide players through their first turns. This tests the game: the mechanics, the balance, the pacing. It removes the rulebook as a variable, which is useful when the design itself is still evolving and you don't want teaching failures to obscure mechanical problems.",
          "A blind playtest is one where you hand players only the written rulebook and leave the room — or at least commit to not answering any questions. This tests the rulebook: whether your writing is clear enough that strangers can follow it without help. It will reveal every ambiguity, missing definition, and assumed piece of knowledge in your writing.",
          "Run coached playtests for the first several sessions, until the game itself feels fundamentally solid. Then switch to blind playtesting to refine the rulebook. Trying to do blind playtests too early is demoralizing — rules failures make it impossible to assess whether the underlying game is good.",
        ],
      },
    ],
    pitfalls: [
      "Asking 'did you have fun?' at the end of a session. Almost everyone answers yes, because they don't want to hurt your feelings. The question gives you no useful information. Ask instead: 'What's the first thing you'd change?' or 'When did you feel most frustrated?' These questions require an actual answer.",
      "Redesigning a rule or mechanic after one playtest session in which players complained about it. One complaint is a data point. The same complaint from three independent sessions is a pattern worth acting on. Reacting too quickly to individual feedback is how games get worse through iteration instead of better.",
      "Not recording what changed between sessions. This seems minor until you're three months in and trying to understand why the game felt better six weeks ago. Keep a brief change log for every session, even if it's just two sentences.",
    ],
    tips: [
      "Write down how long your rules teach took in every session log. If it's consistently creeping past eight or ten minutes for a game that should take 45 minutes to play, your rulebook structure needs work — not necessarily the rules themselves, but how they're taught and ordered.",
      "For in-person sessions, consider bringing printed feedback forms that players fill out at the table right after the game ends. People often give more honest written feedback than verbal feedback, and paper forms get filled out before the debrief conversation, rather than being shaped by it.",
    ],
    starters: [
      "What questions should I always ask my playtesters after a session?",
      "How many playtest sessions before I should trust a balance change?",
      "When is the right time to switch from coached to blind playtests?",
    ],
  },
  {
    id: "notes",
    title: "Notes tab",
    icon: FileText,
    blurb: "Your personal design journal — a long-form scratchpad for ideas, lore, alternatives you considered, and the reasoning behind your decisions. This is the 'why' record that your future self will be genuinely grateful for.",
    body: [
      {
        heading: "Notes vs. Rules: knowing where things belong",
        points: [
          "Rules contain what players do — they're the text a player would read to understand how to play your game. Notes contain why you made the decisions you made — they're internal documentation for yourself and your collaborators. The distinction is worth maintaining, because the Exports tab pulls rules into your printable rulebook but not notes.",
          "If you find yourself writing something that starts with 'I decided to...' or 'The reason for this is...' or 'We tried X but rejected it because...', that belongs in Notes. If you find yourself writing something that starts with 'Players must...' or 'On your turn, you may...', that belongs in Rules.",
          "A thought that might influence future design decisions, but that players will never read, is a Note. An alternative you considered and rejected is a Note. A piece of lore that establishes the world without affecting mechanics is a Note. When in doubt, ask: is this something a player needs to know? If yes, it's a Rule. If no, it's a Note.",
        ],
      },
      {
        heading: "Making your notes useful over time",
        points: [
          "You can save any AI reply from the chat panel directly to Notes by hovering over the message and clicking the bookmark icon. This is the fastest way to capture a useful AI brainstorm or analysis without copying and pasting. The saved note lands in your Notes tab with a reference to which chat thread it came from.",
          "Date every note, even if the format is casual. Six months into a project, the phrase 'this morning's idea' is meaningless. A date makes the note searchable and placeable in your design timeline — you'll know whether it came before or after a major change.",
          "Use tags to group related notes without renaming them. A simple system like #combat, #economy, #v2-cut, or #lore added to the end of an entry makes it possible to quickly find all notes on a specific topic without building a formal folder structure.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "The decision log: the most valuable habit in design",
        points: [
          "Every time you make a non-trivial design decision — changing a rule, cutting a mechanic, restructuring a phase — write a short decision log entry. A good one has three parts: what changed, why you made the change now, and what the rejected alternative was.",
          "This habit pays for itself the first time a playtester or collaborator asks 'why didn't you just do X instead?' Because you wrote it down, you have the actual answer: what X was, why you considered it, and why you decided against it. Without the log, that institutional memory disappears.",
          "Decision logs are also invaluable when a design change turns out to be wrong. If you can read back through why you made a change, you can often identify the faulty assumption and correct it more precisely than if you're rebuilding the reasoning from scratch.",
        ],
      },
      {
        heading: "What should not go in Notes",
        points: [
          "Player-facing rule text does not belong in Notes. If you draft a rule in Notes and never copy it to the Rules tab, it won't appear in your exported rulebook, and it won't be visible to the Ontology view or the Simulator. Notes is invisible to the game's tools.",
          "Component math — calculations about entity costs and effects — belongs in the Entities and Balance tabs, where the tools can work with it. Notes can reference those numbers in the context of a decision, but the numbers themselves should live where they can be updated and tracked.",
          "Playtest feedback belongs in the Playtesting tab, attached to the session it came from. Notes is your inner monologue, not your feedback archive. Mixing the two makes it hard to distinguish between your own thinking and what players told you.",
        ],
      },
    ],
    pitfalls: [
      "Letting Notes become an undated, untagged pile of one-liners that you can't search through effectively. Two months from now you'll remember you had a great idea but won't be able to find it. Even a brief date and a single tag per entry makes an enormous difference.",
      "Writing rule drafts in Notes instead of the Rules tab. When the time comes to export a rulebook, Notes entries don't appear — only formal rules do. Any rule text that lives only in Notes is a gap in your official rulebook waiting to cause confusion.",
    ],
    tips: [
      "Once a week, scan your Notes for entries that have become concrete enough to be promoted to Rules or converted into Tasks. Active, living notes stay useful. Notes that just accumulate without being acted on become an archive you never read.",
      "Start every note with a one-sentence summary, even if the entry is long. This lets you skim 50 notes in a couple of minutes without opening each one, which is exactly what you'll want to do when you're looking for something specific under time pressure.",
    ],
    starters: [
      "What's worth writing in Notes vs. putting directly into Rules?",
      "How do I keep my Notes from becoming an unmanageable pile?",
      "Can you show me an example of a good decision log entry?",
    ],
  },
  {
    id: "tasks",
    title: "Tasks tab",
    icon: CheckSquare,
    blurb: "A simple to-do list scoped to your project. It captures concrete next actions without requiring you to switch to a separate tool, and lets you save action items directly from AI conversations with one click.",
    body: [
      {
        heading: "How to use it",
        points: [
          "You can create a task manually by clicking the Add Task button and writing a description. Keep task descriptions concrete and completable — 'rewrite the combat rule to clarify simultaneous attacks' is a task; 'think about combat' is not.",
          "You can also save a task directly from the AI chat panel. Hover over any assistant message and click the Save to Tasks button. This is especially useful when the AI suggests something specific you want to follow up on — a rule to add, a mechanic to test, a balance change to try — and you don't want to lose it in the chat thread.",
          "Tasks move through three statuses — To Do, In Progress, and Done — and can be assigned a priority of low, medium, or high. The intent is to give you a simple picture of what you're currently working on and what's waiting, without the complexity of a full project management system.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "What should be a task",
        points: [
          "A task should describe concrete, completable work — something you can look at in a week and say either 'done' or 'not done.' Good tasks include things like 'generate six enemy entity cards for the mid-game deck,' 'rewrite the economy rules to remove the draw-back-to-four loop,' or 'schedule a playtest session before the end of the month.' These are finishable.",
          "Anything that's blocking your next playtest session deserves a task with high priority. Playtest sessions are your most valuable feedback opportunity, and anything that prevents you from running one effectively costs you real design time.",
          "If you find yourself thinking about the same design problem for more than a day without writing it down somewhere, that's a sign it should be a task. Writing it down gets it out of your head and into a place where you can decide to act on it or consciously deprioritize it.",
        ],
      },
      {
        heading: "What should not be a task",
        points: [
          "Open-ended exploration that doesn't have a clear end state — 'think about how combat should feel' — belongs in Notes, not Tasks. A task is something you can finish; an exploration is something you develop over time through thinking and writing.",
          "Long-term dreams without a near-term action — 'run a Kickstarter campaign someday' — are not tasks. They might eventually become tasks once they're specific enough ('research crowdfunding options and write a one-page cost estimate'), but a vague aspiration doesn't belong in a list of next actions.",
        ],
      },
    ],
    pitfalls: [
      "Treating the Tasks tab as a wish list. A 200-item task backlog isn't a plan — it's a pile that makes you feel overwhelmed every time you open it. Close or delete tasks you no longer believe in, even if you spent time adding them. A shorter list you actually use is worth more than a comprehensive list you avoid.",
      "Marking everything as high priority. When every task is urgent, the priority label loses its meaning and you're back to making arbitrary decisions about what to do next. Reserve high priority for the five or so things you genuinely need to do before your next session or milestone.",
    ],
    tips: [
      "At the start of every design session, open the Tasks tab and read through it before doing anything else. Close anything you no longer care about. Move one or two things to In Progress for the session. This takes three minutes and dramatically reduces the chance of spending a session on the wrong thing.",
      "When you set a task to high priority, try to also attach a target date to its description — even an informal one like 'before Saturday's playtest.' A flag with a deadline is far more motivating than a flag alone.",
    ],
    starters: [
      "When should I create a task instead of writing a note?",
      "How do I keep my task list from becoming unmanageable?",
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
          "Most game designers think in rules, but players experience games as a sequence of emotional moments. Storyboarding forces you to articulate those moments explicitly — the first big decision, the moment when a strategy comes together, the crisis where everything is in play, the final push. Rules describe what's possible; the storyboard describes what players actually feel.",
          "It also reveals pacing problems that rules alone won't show you. A game might have excellent individual mechanics and still feel flat in the middle or anticlimactic at the end, because the rules don't naturally create rising tension or a satisfying climax. The storyboard view lets you identify these gaps before playtesting, when they're cheapest to fix.",
          "The Storyboard tab pairs naturally with the Simulator. Once you have a sense of your intended emotional arc, you can compare it against what the Simulator tells you about actual game length and pacing, and close the gap between intention and reality.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "A five-beat arc that works in most board games",
        points: [
          "Beat one — Setup: quiet and instructional, with minimal meaningful decisions. Players are learning the physical layout and the basic rules. The emotional tone is anticipation, not action. Keep this short — a setup phase that runs more than five minutes starts to feel like work before the fun begins.",
          "Beat two — Opening: the first real decisions appear. Players start acquiring resources, staking out territory, or building toward their strategy. Everyone feels possibility — no one is behind yet, and the full range of outcomes feels open. The emotional tone is curiosity and optimism.",
          "Beat three — Midgame escalation: strategies have taken shape, conflicts are beginning, and the gap between players is becoming visible. Engines — meaning self-reinforcing systems that produce more outputs over time — are starting to run. The emotional tone is tension and commitment.",
          "Beat four — Endgame trigger: a visible countdown begins, or a visible threshold approaches. Players can see the end coming and start making decisions with urgency. This is where priorities shift dramatically — things that seemed important a few turns ago become irrelevant. The emotional tone is urgency and focus.",
          "Beat five — Final scoring and resolution: short, decisive, and clean. The game ends quickly after the endgame trigger fires. The winner is revealed and the result should feel earned — either satisfying or surprising, but not arbitrary. The emotional tone is relief and reflection.",
        ],
      },
      {
        heading: "Pacing failures and how to spot them",
        points: [
          "An endless midgame is the most common pacing problem. It happens when there's no visible signal that the game is progressing toward an end, so players don't know when to shift from accumulation to aggression. The fix is usually a visible countdown or depleting resource that players can all see and reference.",
          "An anticlimactic endgame happens when the winner is effectively decided several turns before the game actually ends. The final turns feel like paperwork — everyone is just completing transactions that no longer affect the outcome. The fix is usually to ensure the endgame trigger fires while the result is still genuinely uncertain.",
          "An overlong setup — anything past about five minutes — causes the table to go cold before the first interesting decision. Players who aren't engaged at setup often aren't engaged when the game starts. The fix is usually to streamline or parallelize setup tasks, or to fold some of the setup into the first few turns.",
        ],
      },
    ],
    pitfalls: [
      "Building the storyboard at the beginning of a project and never updating it. Pacing drifts as rules are added and removed. Revisit your storyboard after every major rules change and ask whether the beats still hold — what was a five-turn opening might now be eight turns with the new rules.",
      "Planning only the moments you're excited about and ignoring the transitions. Setup, downtime between turns, and final scoring are where games lose players — they're boring by nature but worth designing with care.",
    ],
    tips: [
      "Label each beat with a target emotion — 'curiosity,' 'tension,' 'urgency,' 'relief.' Then, in your playtest sessions, observe whether the table actually feels that emotion at that point in the game. The gap between intended and actual emotional tone is usually a design note.",
      "If two adjacent beats in your storyboard have the same target emotion, you may have a flat stretch — a portion of the game where the experience doesn't change or escalate. Consider whether those beats could be combined or whether one of them needs to be redesigned to create contrast.",
    ],
    starters: [
      "What does a healthy emotional arc look like for a 60-minute strategy game?",
      "How do I fix a midgame that players describe as slow?",
      "Should my endgame trigger be a hard turn limit or something more dynamic?",
    ],
  },
  {
    id: "balance",
    title: "Balance tab",
    icon: BarChart3,
    blurb: "Visualize the numerical relationship between your entities' costs and their effects. This tab turns a vague sense that something might be overpowered into a concrete chart you can point to and act on.",
    body: [
      {
        heading: "What the charts show",
        points: [
          "The Balance tab generates charts based on your entities' numeric properties — specifically the relationship between what an entity costs and what effect it produces. For a weapon, that might be the relationship between its gold cost and its damage value. For a spell card, it might be between its energy cost and the points it generates.",
          "There's also a category frequency chart that shows how often each rule category was triggered in Simulator runs. This tells you what kind of game your players are actually playing versus what you intended — if Combat rules trigger three times more than any other category, your game is effectively a combat game whether you designed it that way or not.",
          "Use the Balance tab in combination with Simulator results, not as a standalone source of truth. The charts show you mathematical relationships; the Simulator shows you behavioral patterns. Together they give you a much more complete picture than either does alone.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Reading the cost-versus-power chart",
        points: [
          "The chart places each entity on a grid with cost on one axis and power on the other — where 'power' is whatever numeric effect property you've defined (damage, points generated, resource produced). A well-balanced game produces a roughly diagonal line from bottom-left to top-right: things that cost more are roughly more powerful.",
          "An entity that appears significantly above the line — more powerful than its cost justifies — is probably the dominant choice. Players who figure this out will always pick it, which reduces strategic variety. Consider raising its cost, lowering its effect, or adding a constraint that makes it situational rather than always-optimal.",
          "An entity that appears well below the line — less powerful than its cost justifies — is a trap. Players who pick it are essentially wasting resources compared to better alternatives. Over time they'll stop picking it entirely. Consider lowering its cost, boosting its effect, or giving it a unique secondary benefit that makes it worth considering in specific situations.",
          "A perfectly linear chart is not necessarily the goal. A little intentional variation is what creates interesting strategic choices — the cheaper option with a downside, the expensive option that's occasionally worth it. Balance is about making sure no entity is so obviously dominant or so obviously useless that the choice is never interesting.",
        ],
      },
      {
        heading: "Reading the category frequency chart",
        points: [
          "This chart shows how often each rule category — Combat, Economy, Movement, and so on — triggered during Simulator runs. It answers the question: what is your game, from the rules' point of view?",
          "If one category fires three times more than every other, your game is predominantly that type of game in practice. This might match your intent — a game designed around combat should have high combat frequency. But if it doesn't match your intent, it's a signal that your other categories aren't being triggered enough, either because those rules aren't good enough to choose or because the game's incentives push players toward one path.",
          "If a category fires very rarely — in fewer than one in twenty turns — ask whether those rules are earning the space they take up in the rulebook. Rules that almost never come up still cost teaching time and create cognitive load for players. Either find ways to make those rules more relevant, or cut them.",
        ],
      },
    ],
    pitfalls: [
      "Trying to make every entity land exactly on the cost curve. Perfect mathematical symmetry often produces a game where every choice feels equally uninteresting, because nothing is notably good or notably bad. A small amount of intentional variation — the item that's slightly underpriced because it has a significant restriction — is what creates strategy.",
      "Treating the charts as the final word on whether something is balanced. Numbers are balanced when the game feels fair to players sitting around a table, not when the chart looks clean. Always verify what the math suggests with actual human playtest sessions.",
    ],
    tips: [
      "Before fully trusting the Balance charts, manually check three or four of your most powerful entities by calculating their cost-to-effect ratio by hand. If the chart matches your intuition, you can trust it more confidently for the others.",
      "When you're trying to balance a specific type of entity — say, all your weapon cards — compare them against each other rather than against your entire entity list. Weapons should be balanced relative to other weapons first.",
    ],
    starters: [
      "What does an overpowered entity look like on the cost chart?",
      "Is it a problem if some rule categories rarely trigger?",
      "How do I know when my game's balance is good enough to show to players?",
    ],
  },
  {
    id: "exports",
    title: "Exports tab",
    icon: Download,
    blurb: "Generate shareable documents from your project — printable rulebooks, component sheets for print-and-play production, and presentation decks for pitching to publishers or crowdfunding backers. The bridge between design tool and physical world.",
    body: [
      {
        heading: "What you can export",
        points: [
          "A formatted rulebook that pulls all your rules organized by category and priority, followed by an entity glossary built from your Entities tab. This is the closest thing to a real rulebook you can produce in minutes, and it's immediately usable for playtesting.",
          "A pitch deck for publishers or crowdfunding, generated as a presentation that covers your game's concept, mechanics, player count, target audience, and visual style. This requires a connected account with the presentation service, which you can set up in your account settings.",
          "Print-and-play layout files that combine your generated asset images with your entity data into sheets players can print, cut, and use at the table. These won't be publication-quality but are more than sufficient for prototype testing.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "Before you export: a quick checklist",
        points: [
          "Have you given every rule a category and a priority? Rules without categories export in a random order; rules without priorities all appear with equal weight. Five minutes spent categorizing rules before exporting saves significant manual reorganization of the resulting document.",
          "Does every entity have at least a brief description? The entity glossary in the exported rulebook looks thin and unprofessional if entities are defined only by their properties with no explanatory text. Even a single sentence per entity makes a meaningful difference.",
          "Is your project metadata — name, description, player count, duration, game type — fully filled in? This information becomes the cover page and introduction of your exported rulebook. An incomplete cover page is the first thing a publisher or reader sees.",
          "Have you run the Simulator recently enough that you're not exporting a design you know has a balance problem? Exporting doesn't mean the game is ready — it means you're creating a snapshot. Make sure that snapshot reflects your current best understanding of the design.",
        ],
      },
      {
        heading: "What publishers actually want to see",
        points: [
          "A one-paragraph hook — the elevator pitch. This is the single sentence or short paragraph that makes a publisher or backer curious enough to read further. It should answer: what is this game about, who is it for, and why is it interesting? Write this before anything else.",
          "A one-page summary covering the core mechanics, player count, playing time, target audience, and what makes this game different from what's already on the market. Publishers see hundreds of submissions — the summary is where they decide whether to read further.",
          "A short rulebook — ideally something that takes no more than ten minutes to read. A publisher receiving a first pitch is not going to read 40 pages. Get the rules down to the essential structure, with variants and edge cases handled after the core flow is established.",
          "Evidence of playtesting. A statement that you've run 15 sessions, addressed the three most common complaints, and have specific player quotes is worth more than claiming the game is polished. It shows you've done the real work.",
        ],
      },
    ],
    pitfalls: [
      "Exporting repeatedly without making substantive changes in between. Exports are useful as milestones and checkpoints, not as a weekly ritual. Each export should represent a meaningful change in the state of the design.",
      "Leading with the rulebook when approaching a publisher for the first time. Send the pitch hook and the one-page summary first, and offer to send the full rulebook if they're interested. Publishers are much more likely to read a short pitch than a 30-page document from a designer they don't know.",
    ],
    tips: [
      "Use the act of exporting as a forcing function — if the resulting PDF reveals missing descriptions, uncategorized rules, or incomplete entity glossary entries, add those gaps to your task list before doing anything else. The export often reveals what's missing more clearly than looking at the editor does.",
      "Maintain one export that you think of as your pitch packet: the hook paragraph, the one-page summary, and a table setup image from your assets. Keep it updated and immediately shareable, so you're never caught unprepared when an opportunity to pitch comes up.",
    ],
    starters: [
      "What should I include in a first pitch to a publisher?",
      "How polished does the game need to be before my first export?",
      "When is the right time to move from print-and-play to professional printing?",
    ],
  },
  {
    id: "chat",
    title: "Chat panel",
    icon: MessageSquare,
    blurb: "Your AI co-designer, always one panel away. It maintains separate conversation histories for each tab in your project, so your design conversations stay organized without any effort on your part.",
    body: [
      {
        heading: "Choosing which AI provider to use",
        points: [
          "The chat panel lets you switch between AI providers — Claude, GPT, Gemini, and Grok — from a dropdown menu. Each provider has different strengths that become apparent as you use them for different kinds of work. Claude tends to excel at long, structured outputs — detailed rule analyses, comprehensive suggestions, careful reasoning through complex problems. Gemini tends to be fast and good for rapid brainstorming when you need lots of options quickly. GPT tends toward crisp, well-edited prose, which is useful for writing descriptions or rulebook text. Grok tends toward more playful, unexpected suggestions, useful when you're stuck and want something genuinely different.",
          "You don't have to commit to one provider for everything. Switching mid-project — or even mid-session — is normal and often productive. If one model isn't giving you useful answers on a particular problem, try a different one.",
        ],
      },
      {
        heading: "What you can do with each message",
        points: [
          "Hover over any message from the AI to reveal action buttons. The most useful are Save to Notes and Save to Tasks, which let you capture the AI's response in the appropriate tab with one click, without copying and pasting. This makes it easy to capture useful ideas without losing your place in the conversation.",
          "Each tab in GameForge maintains its own separate chat history. The conversation you have on the Rules tab won't appear in the Assets tab's chat, and vice versa. This keeps context organized naturally — your rules discussions stay with the rules, your asset discussions stay with assets.",
          "You can collapse the chat panel entirely by clicking the chevron button in its header. The panel remembers this state, so it will still be collapsed the next time you open the project. Collapsing it when you need to focus on writing or reviewing is a common workflow.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "How to write prompts that get useful answers",
        points: [
          "Be specific about the constraints your answer needs to satisfy. Instead of asking 'how should my combat work?', try 'suggest three combat resolution options for a 2–4 player game targeting 45 minutes, with no dice, where the active player always takes an action first.' The more specific your constraints, the more tailored the answer.",
          "Give the AI a perspective to take. 'You are a skeptical playtester who has been burned by confusing rules before — identify every potential ambiguity in this rule' is a more productive framing than 'check this rule.' A defined perspective gives the AI a lens to look through.",
          "Ask for structured output when you need to compare options. 'Give me five alternative mechanics for resource acquisition, each with one advantage and one drawback' is much easier to work with than 'what are some ideas for resource acquisition?' The structure helps you compare and decide.",
          "When an answer isn't useful, don't argue with the AI about why it's wrong. The best response is to close the conversation and start a new one with a more precise prompt. AI models do not get better through debate — they get better through clearer instructions.",
        ],
      },
      {
        heading: "Chat vs. AI Enhance — when to use each",
        points: [
          "Use AI Enhance when you want structured, targeted improvements to a specific rule or entity. Enhance is scoped to a single item, shows you exactly what it proposes to change, and gives you granular control over what to accept. Use it when you have something concrete you want to improve in a controlled way.",
          "Use the chat panel when you want to explore ideas, ask analytical questions, get comparisons, or have a multi-turn conversation about your design at a higher level. Chat is open-ended and conversational. Use it when the question is too broad or exploratory for the Enhance flow.",
        ],
      },
    ],
    pitfalls: [
      "Treating AI responses as authoritative facts about game design. The AI is a brainstorming partner — it produces plausible-sounding suggestions, not verified truths. Playtest every mechanic the AI suggests before building around it, and bring your own design judgment to every interaction.",
      "Letting a single chat thread grow to 50 or more messages. Very long threads tend to produce lower-quality responses because the AI has to balance too many prior messages at once. Start a fresh conversation per topic, and save the useful outputs to Notes or Tasks before clearing the thread.",
    ],
    tips: [
      "Save the AI's best responses to Notes immediately, before the thread gets longer. Replies that feel useful now are easy to lose track of five pages of conversation later.",
      "If a conversation stalls or the AI keeps giving you variations of the same unhelpful answer, switch to a different AI provider. A different model often approaches the same problem from a completely different angle, which can break through a creative block.",
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
          "This is useful when your team has a budget or policy that restricts certain external services. For example, an organization might have a policy that only approved AI tools can be used for design work, or a studio might want to limit costs by restricting usage to one provider.",
          "Disabling a provider does not delete any previous conversations. Chat history from that provider remains readable — it just can't receive new messages while the provider is disabled.",
        ],
      },
      {
        heading: "Connecting your own AI account",
        points: [
          "Each major AI provider — Anthropic (Claude), OpenAI (GPT), Google (Gemini) — lets you create an account and generate an API key that identifies your usage for billing purposes. You can paste that key into GameForge's provider settings, and from that point on, all AI calls from your workspace use your account rather than the platform's shared pool.",
          "Your key is encrypted and stored securely — it's not stored in plain text anywhere. You can replace it or delete it from your settings at any time. When you replace a key, the old one stops being used immediately.",
          "You can have keys configured for multiple providers simultaneously, so the workspace can access Claude through your Anthropic account, GPT through your OpenAI account, and Gemini through your Google account, all at the same time.",
        ],
      },
    ],
    deepDive: [
      {
        heading: "When connecting your own account makes sense",
        points: [
          "You're hitting usage limits on the platform's shared pool. Every GameForge account has access to a shared quota of AI calls — when that quota is being used by many people simultaneously, you may occasionally get rate-limited. Connecting your own account gives you a dedicated quota.",
          "Your organization requires AI usage to be billed to a specific account for accounting or compliance reasons. If your studio needs to track AI spending separately, your own API key sends all usage directly to your provider account where you can monitor and control it.",
          "You want to access a specific model version that isn't available through the platform's default. AI providers regularly release new and updated versions of their models, and your own account may give you access to versions that aren't yet available through GameForge's shared integration.",
        ],
      },
      {
        heading: "Understanding AI provider costs",
        points: [
          "Each AI provider charges for usage based on how much text is sent to and received from the model. These costs vary significantly between providers and between different versions of the same provider's model. As a rough guide: Claude tends to offer the best results for long, detailed tasks but at a moderate price; GPT tends to be strong for concise, well-edited text output; Gemini Flash tends to be the most affordable option for rapid back-and-forth brainstorming.",
          "Costs for the same task can vary considerably between providers — sometimes by a factor of five or more. If you're doing a large volume of AI work, it's worth running your typical workflow with two different providers to compare the actual cost before committing. Most providers offer usage dashboards where you can see what each session cost.",
          "If you're on a personal project with a modest budget, the platform's shared pool may be all you need. If you're running a studio or doing production-level design work with many AI calls per day, your own account gives you better visibility and control over those costs.",
        ],
      },
    ],
    pitfalls: [
      "Locking your workspace into one provider for all tasks. Different kinds of work genuinely benefit from different models. Leaving all providers available and choosing based on the task at hand — rather than habit — produces better results across the board.",
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
