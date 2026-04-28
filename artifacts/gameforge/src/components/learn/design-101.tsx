import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Check, ChevronLeft, ChevronRight, Trophy, Cog, Package,
  Scale, Repeat, Drama, Megaphone, Lightbulb, Dumbbell, AlertTriangle,
  BookOpen,
} from "lucide-react";
import { LearnChat } from "./learn-chat";

const STORAGE_KEY = "gameforge.learn.design101.completed";

type Lesson = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: string;
  intro: string;
  concepts: { name: string; explanation: string }[];
  examples: { name: string; note: string }[];
  exercise: string;
  deepDive?: { heading: string; points: string[] }[];
  pitfalls?: string[];
  furtherReading?: string[];
  starters?: string[];
};

const LESSONS: Lesson[] = [
  {
    id: "01-what-is",
    title: "1. What is a board game, really?",
    icon: GraduationCap,
    duration: "12 min",
    intro:
      "Before designing one, it helps to know what the medium does well — and where it can't compete with video games or sports. A board game is a structured social experience: a small group of people agreeing to follow a fictional ruleset for an evening, often around a physical artifact. Get specific about what part of that experience YOUR game delivers.",
    concepts: [
      { name: "The magic circle", explanation: "Players voluntarily enter a temporary world with rules separate from real life. Your job is to make that circle worth entering — and worth re-entering on game night #2." },
      { name: "Decisions over outcomes", explanation: "Great games are remembered for the decisions they forced, not the dice they rolled. Optimize for interesting choices first; let the math serve the choices." },
      { name: "The social contract", explanation: "Games shape how players treat each other — competitive, cooperative, semi-cooperative, hidden roles. Pick deliberately; mismatched contracts (a coop disguised as competitive) feel awful." },
      { name: "Physicality matters", explanation: "Tactile components (chunky meeples, satisfying flips, dice clatter) carry emotional weight no app can match. The 'thunk' is part of the design." },
      { name: "Time is the budget", explanation: "Every minute of gameplay is a minute the player isn't doing something else. A 90-minute game has to earn 90 minutes of attention." },
    ],
    examples: [
      { name: "Catan", note: "Trade-driven decision space; the social contract is constant negotiation." },
      { name: "Pandemic", note: "Pure cooperative play forces table-talk strategy." },
      { name: "Chess", note: "Zero randomness, infinite depth — decisions are everything." },
      { name: "Codenames", note: "Almost no rules, almost no components, infinite replay value — proof that elegance scales." },
    ],
    deepDive: [
      {
        heading: "What board games do BETTER than video games",
        points: [
          "Face-to-face social pressure and reading real humans.",
          "Tactile, shared physical state — everyone sees the same board, not their own screen.",
          "Pacing controlled by humans, not engines — natural breaks for trash talk and snacks.",
          "Customizable house rules — players co-author the experience.",
        ],
      },
      {
        heading: "What board games do WORSE",
        points: [
          "Hidden information enforcement (humans peek; computers don't).",
          "Real-time and reflex-based mechanics.",
          "Massive simulations — bookkeeping kills the table.",
          "Solitary play. (Solo modes exist but are usually bolted on.)",
        ],
      },
      {
        heading: "Five questions to ask before you start",
        points: [
          "Who is at the table? (count, age, experience)",
          "How long do they want to play?",
          "What FEELING do you want them to leave with? (cleverness, betrayal, accomplishment, laughter)",
          "What's the shortest possible version of this experience?",
          "Why a board game and not a video game / role-play / party game?",
        ],
      },
    ],
    pitfalls: [
      "'It's like X but with Y' isn't a design — it's a marketing tagline. Get specific about WHY the swap matters.",
      "Designing for yourself only. Your group's tastes aren't the market.",
      "Confusing complexity with depth. A game with 200 rules can be shallow; a game with 5 rules can be infinitely deep.",
    ],
    furtherReading: [
      "'Characteristics of Games' — Elias, Garfield, Gutschera (textbook depth).",
      "Stonemaier Games' free design articles — Jamey Stegmaier blogs every step.",
    ],
    exercise:
      "Write a one-paragraph elevator pitch for your game. Specify: how many players, how long, what they do on their turn, and what makes them want to play it again. Then re-read it and cut every adjective — what's left should still make someone curious.",
    starters: [
      "What FEELING is my game trying to deliver?",
      "When is a board game the wrong medium for an idea?",
      "How short can a great game be?",
    ],
  },
  {
    id: "02-goals",
    title: "2. Goals & win conditions",
    icon: Trophy,
    duration: "14 min",
    intro:
      "A clear goal anchors every other design choice. Without one, players can't strategize. With multiple competing goals, the game gets richer — but balancing gets harder. The win condition is the single most important sentence in your rulebook.",
    concepts: [
      { name: "Single victory condition", explanation: "First to N points / last standing. Simple to teach, easy to balance, can feel one-note. Great for short or competitive games." },
      { name: "Multiple paths to victory", explanation: "Multiple scoring tracks (Through the Ages, Terra Mystica). Adds replayability but doubles your balance work — every path must feel viable." },
      { name: "Variable end triggers", explanation: "Game ends when a deck runs out, a track fills, or a turn limit hits. Each pacing choice changes strategy: dynamic triggers reward acceleration; hard limits reward consistency." },
      { name: "Hidden vs. public victory", explanation: "Hidden objectives (Risk Legacy, Scythe) inject paranoia and surprise endings; public ones invite kingmaking and tactical alliances." },
      { name: "Win conditions ≠ scoring", explanation: "Some games end when you reach a threshold but determine the winner by another metric (Brass: Lancashire). Don't conflate the two." },
      { name: "The teach-to-finish loop", explanation: "Every player should understand the win condition by minute 2 of the rules teach. If they don't, they can't strategize and the game feels random." },
    ],
    examples: [
      { name: "7 Wonders", note: "Six scoring categories — pure point salad with multiple viable strategies." },
      { name: "Catan", note: "First to 10 victory points; only ~3 routes to get there, all visible — easy to teach, easy to plan against." },
      { name: "Mafia / Werewolf", note: "Asymmetric hidden goals — the social game IS the game." },
      { name: "Spirit Island", note: "Cooperative variable end trigger (you win when fear track fills OR all invader cards exhaust) — multiple win textures." },
    ],
    deepDive: [
      {
        heading: "Why most beginner designs have weak goals",
        points: [
          "The goal is implicit ('build the best engine') but not measurable — players can't tell if they're winning.",
          "Multiple paths exist on paper but one is mathematically dominant.",
          "The end trigger is opaque ('endgame approaches') instead of visible ('when the deck runs out').",
          "Scoring happens entirely at game end — players don't get feedback during play.",
        ],
      },
      {
        heading: "Designing a strong end trigger",
        points: [
          "Visible: players can SEE the end approaching (countdown track, depleting deck, filling tableau).",
          "Anticipated: at least 1–2 turns of warning so players can sprint or block.",
          "Climactic: the final turn should feel meaningful, not anticlimactic admin.",
          "Robust: hard to game — a player can't drag the trigger out indefinitely.",
        ],
      },
      {
        heading: "The kingmaking problem",
        points: [
          "When a non-leading player can choose who wins between two leaders, they become the 'kingmaker' — usually a bad feel.",
          "Avoid by hiding score totals, hiding hands, or making the final play simultaneous.",
          "Some games embrace it (Diplomacy) — make sure your audience expects it.",
        ],
      },
    ],
    pitfalls: [
      "Multiple paths in name only. Test each path solo — if one always wins, fix it before anything else.",
      "End triggers nobody can see coming. Players need warning to make their last decisions matter.",
      "Hidden objectives that contradict each other. 'You win if you have the most gold' + 'You win if you have the LEAST gold' = chaos, not depth.",
    ],
    furtherReading: [
      "Mark Rosewater's Magic articles on win conditions — applies to board games too.",
      "GMT Games' designer diaries on end-game triggers.",
    ],
    exercise:
      "List three different ways a player could win your game. For each one, write the strategy a competent player would follow. Then ask: are they roughly equally efficient? If one is obviously best, you have a balance bug to fix early.",
    starters: [
      "How do I make multiple paths to victory feel equally viable?",
      "What makes an end-game trigger satisfying?",
      "How do I prevent kingmaking in a 4-player game?",
    ],
  },
  {
    id: "03-mechanics",
    title: "3. Core mechanics",
    icon: Cog,
    duration: "16 min",
    intro:
      "Mechanics are the verbs of your game. Every mechanic should serve the experience you want — not be there because other games do it. Most great games are 2–3 well-chosen mechanics in tight conversation, not a bag of features.",
    concepts: [
      { name: "Worker placement", explanation: "Players place limited tokens on a shared board to claim actions. Creates tension over scarce slots (Agricola, Lords of Waterdeep). Watch for first-player advantage." },
      { name: "Deck-building", explanation: "Players grow personal decks during play (Dominion, Star Realms). Engine-building feel; can suffer from runaway leader if catch-up is missing." },
      { name: "Area control", explanation: "Players compete for territory through majorities or unit counts (Risk, Blood Rage). Easy conflict, hard to keep tight without scoring rounds." },
      { name: "Set collection", explanation: "Score by completing sets (Ticket to Ride, Sushi Go!). Highly accessible; flexible to mash up with other systems." },
      { name: "Action selection", explanation: "Each turn, pick from a small menu (Race for the Galaxy, Puerto Rico). Drives planning and prediction; risk of analysis paralysis if menu is huge." },
      { name: "Push your luck", explanation: "Risk-vs-reward escalation (Can't Stop, Quacks of Quedlinburg). Cheap fun, hard to make deep — usually a sub-mechanic, not a whole game." },
      { name: "Hand management", explanation: "Players hold a hand of cards and must time their plays (Race for the Galaxy, Concordia). Pure decision-density without a board." },
      { name: "Dice drafting", explanation: "Roll a shared pool, take turns picking dice to fuel actions (Sagrada, Roll Player). Visible randomness, controllable outcomes." },
    ],
    examples: [
      { name: "Wingspan", note: "Engine-building + set collection + a touch of dice — classic mash-up of three." },
      { name: "Root", note: "Asymmetric area control where every faction plays a different game." },
      { name: "Splendor", note: "One mechanic done flawlessly: card-driven engine-building with no fluff." },
    ],
    deepDive: [
      {
        heading: "How to choose mechanics for a theme",
        points: [
          "Start from the player VERB you want them to feel ('I'm trading', 'I'm hunting', 'I'm building').",
          "Match the verb to a mechanic family ('trading' → market/auction; 'hunting' → push-your-luck or area control).",
          "Test the marriage: rewrite the rule using ONLY thematic words. If it still makes sense, theme and mechanic are aligned.",
        ],
      },
      {
        heading: "Mechanic combinations that usually work",
        points: [
          "Worker placement + resource conversion (Agricola, Caverna) — scarcity + engine.",
          "Deck-building + area control (Trains, Star Realms with maps) — engine drives a board.",
          "Action selection + variable powers (Race for the Galaxy, Tzolk'in) — same menu, different optimization per player.",
          "Set collection + drafting (7 Wonders, Sushi Go!) — players negotiate who 'gets' what set indirectly.",
        ],
      },
      {
        heading: "Mechanic combinations that USUALLY don't",
        points: [
          "Deep area control + heavy hand management — both demand the player's attention; players miss things.",
          "Hidden roles + long playtime — the social tension can't sustain 3 hours.",
          "Push-your-luck as the WHOLE game — depth runs out fast.",
        ],
      },
      {
        heading: "Mechanic vocabulary you should know",
        points: [
          "DRAFTING — pick from a pool, often pass-and-pick.",
          "TRACK / CUBE TOWER — physical scoring or resource path.",
          "TABLEAU — your personal play area you build up.",
          "ENGINE — a system that produces more outputs over time.",
          "RONDEL — circular action selection (Mac Gerdts).",
          "BAG-BUILDER — like deck-building but with chips/tokens (Quacks of Quedlinburg).",
        ],
      },
    ],
    pitfalls: [
      "Adding a mechanic because it's trendy. 2017 was full of bag-builders that didn't need to be bag-builders.",
      "Four 'major' mechanics in one game. You're shipping a teach-time problem.",
      "Choosing mechanics before knowing the player feeling. Mechanics serve feeling, not the other way around.",
    ],
    furtherReading: [
      "BoardGameGeek's mechanic browser — read 5 examples of every mechanic before picking one.",
      "Gil Hova's 'Choose Your Mechanic' talks (YouTube).",
    ],
    exercise:
      "Pick two mechanics from above and write down how they'd interact in your game. Most great games are 2–3 mechanics in tight conversation. Then list one mechanic you considered and rejected — and why. Knowing what you cut sharpens what you keep.",
    starters: [
      "I want a game where players FEEL like merchants — which mechanics fit?",
      "How many mechanics is too many?",
      "When should I use deck-building vs. hand management?",
    ],
  },
  {
    id: "04-components",
    title: "4. Components & physicality",
    icon: Package,
    duration: "11 min",
    intro:
      "Components carry meaning. A custom meeple feels different from a wooden cube; a thick chipboard token feels different from a card. Cost rises fast — design with that in mind, and remember that the BEST component is usually the one your design needs, not the fanciest one you can afford.",
    concepts: [
      { name: "Information layers", explanation: "What's hidden, what's public, what's secret-to-some? Components physicalize this — face-down decks vs. open boards." },
      { name: "Iconography vs. text", explanation: "Icons scale to non-English audiences and look cleaner. Text is unambiguous but slower to read. Most pro games use both." },
      { name: "Production tiers", explanation: "Print-and-play / linen-finish cards / custom plastic minis / wooden meeples / dual-layer boards. Pick what serves the experience, not what looks fanciest." },
      { name: "Table presence", explanation: "How does it look set up? Photos sell games on social media — design for the table snapshot." },
      { name: "Insert design", explanation: "A great insert turns 5-minute setup into 1-minute. Often the difference between 'gets played' and 'sits on the shelf'." },
      { name: "Component count vs. component churn", explanation: "200 components that move 5 times = fine. 50 components that move 200 times = exhausting. Optimize for hand-fatigue, not piece count." },
    ],
    examples: [
      { name: "Spirit Island", note: "Dual-layer player boards keep tokens snug; signals quality." },
      { name: "Wingspan", note: "Custom dice tower (the birdfeeder) is iconic AND functional." },
      { name: "Brass: Birmingham", note: "Heavy chipboard tiles convey strategic permanence — you don't move them lightly." },
    ],
    deepDive: [
      {
        heading: "Cost ladder (rough $ per unit, mass production)",
        points: [
          "Standard cards: $0.02–0.05 each.",
          "Wooden meeple/cube: $0.05–0.20 each.",
          "Plastic mini (small): $0.20–0.50 each.",
          "Plastic mini (large/painted): $1–5 each.",
          "Dual-layer player board: $1–3 each.",
          "Custom dice (engraved): $0.50–2 each.",
          "Insert (vac-formed plastic): $1–4 per box.",
        ],
      },
      {
        heading: "Designing for ergonomics",
        points: [
          "Reach: nobody should stand up to take a turn at a normal table.",
          "Visibility: small text and dark colors fail under living-room lighting.",
          "Color-blind safety: never rely on color alone — pair with shape or icon.",
          "Hand size: 7+ cards in hand needs a thin card or fan-friendly shape.",
        ],
      },
      {
        heading: "When to upgrade a component",
        points: [
          "It's interacted with EVERY turn (worker tokens, currency).",
          "It physicalizes the game's central FEEL (chunky resource tokens for an economic game).",
          "It signals quality on the box / unboxing video — first impressions sell.",
        ],
      },
    ],
    pitfalls: [
      "Designing components before mechanics are stable. You'll redesign and waste prototype budget.",
      "Wood & plastic for everything 'because it feels premium'. Bloated boxes scare retail buyers.",
      "Skipping the insert. Players will repackage — and complain — without it.",
    ],
    furtherReading: [
      "Panda Game Manufacturing's blog on component cost reality.",
      "Stonemaier's 'Crowdfunding Best Practices' — covers stretch-goal pitfalls.",
    ],
    exercise:
      "Sketch your game's table layout. Where is each component? Can two players reach the central board without standing up? Test the ergonomics on paper first. Then pick ONE component to upgrade in tier (e.g. cube → custom meeple) — does the game feel different?",
    starters: [
      "Which components are worth upgrading first on a tight budget?",
      "How many cards is too many cards?",
      "Should I design my own insert or trust the manufacturer's?",
    ],
  },
  {
    id: "05-balance",
    title: "5. Balance & math",
    icon: Scale,
    duration: "18 min",
    intro:
      "Balance is the discipline of making sure no single strategy is obviously best. It's part math, part feel, part playtesting. The Simulator tab in GameForge is built for the math part. Don't skip the feel part.",
    concepts: [
      { name: "Cost curves", explanation: "The cheaper an option, the weaker it should be — usually. Plot every entity's cost vs. effect; outliers are bugs." },
      { name: "Dominance check", explanation: "Is there a strategy that wins >60% of games? It dominates. Either weaken it or buff its counters." },
      { name: "Variance vs. determinism", explanation: "Dice swing the game; cards smooth over time. Decide how much randomness fits your audience." },
      { name: "Catch-up vs. snowball", explanation: "Engine-builders snowball — the rich get richer. Catch-up mechanisms (rubber-banding) keep last place engaged." },
      { name: "Action economy", explanation: "Count actions per turn × turns per game. That's your design budget — every rule competes for it." },
      { name: "Expected value", explanation: "On average, what does a random card draw or dice roll give a player? Players don't do the math consciously, but they feel immediately when the odds seem off." },
      { name: "Swing vs. tightness", explanation: "Swing games (Munchkin) reward big plays; tight games (Chess) reward small advantages. Both can be balanced — you choose which." },
    ],
    examples: [
      { name: "Magic: The Gathering", note: "Mana cost vs. card power is balance distilled — billions of dollars in tuning data." },
      { name: "Chess", note: "Pieces are perfectly imbalanced; the elegance is in their interaction." },
      { name: "Race for the Galaxy", note: "Six action types perfectly balanced via a draft mechanic — none feels dominant." },
    ],
    deepDive: [
      {
        heading: "Reading your cost curve",
        points: [
          "The simplest balance rule: something that costs twice as much should be roughly twice as powerful. Pick one card or entity as your benchmark and compare everything else to it.",
          "A little variation is fine — that's where personality lives. Something wildly above the line is overpowered; wildly below is a trap nobody picks.",
          "Be honest: if something is way off, it's either a bug to fix or an intentional twist. Know which.",
          "Sketch the curve in a spreadsheet before playtesting — eyeballing breaks down once you have more than 15 entities.",
        ],
      },
      {
        heading: "Action economy in plain English",
        points: [
          "Multiply: average actions per turn × number of players × turns per game. That's your game's total activity budget.",
          "Example: 3 actions × 4 players × 8 turns = 96 moments of decision. Every rule is competing for a share of those.",
          "Cut any rule that almost never comes up — unless it creates a genuinely memorable moment when it does.",
        ],
      },
      {
        heading: "Catch-up mechanisms that don't punish leaders",
        points: [
          "Cheaper buys for trailing players (Civilization-style barbarian discounts).",
          "Hidden information — leader doesn't know exact gap.",
          "End-game scoring multipliers for under-developed areas.",
          "AVOID overt punishments ('player in last gets +5 gold per turn') — feels patronizing.",
        ],
      },
      {
        heading: "How much randomness is right?",
        points: [
          "No randomness: Chess. Extremely skill-based, steep learning curve.",
          "Low randomness (10–20%): Most modern strategy games. Skill wins most of the time, but surprises happen.",
          "Medium randomness (30–50%): Catan, Risk. Luck plays a real role — more accessible to casual players.",
          "High randomness (60%+): Munchkin, party games. The fun is in the chaos and the stories, not the outcome.",
          "Pick a level that matches your audience and tune your game toward it consistently.",
        ],
      },
      {
        heading: "When balance is 'good enough' to ship",
        points: [
          "No strategy wins >60% across 100+ simulated and 30+ human games.",
          "No entity is picked <5% of the time when available.",
          "Game length stays within ±25% of the target across all session counts.",
          "Trailing player still has ≥1 plausible win path with 3 turns left.",
        ],
      },
    ],
    pitfalls: [
      "Balancing in the spreadsheet only. Math doesn't capture social dynamics or table feel.",
      "Chasing perfect balance. A game where every option is equally optimal is also a game with no interesting decisions.",
      "Buffing the weak option without checking if anyone WANTS the strong one — sometimes the 'underpowered' option is fine and the 'overpowered' one was just shiny.",
    ],
    furtherReading: [
      "'Designing Games' by Tynan Sylvester (RimWorld dev) — applies to tabletop too.",
      "Mark Rosewater's 'Mark Brown' archives on Magic balance.",
    ],
    exercise:
      "Open the Simulator tab on your project. Run 100 games. Look at win-rates and turn counts. Anything >65% win or <50% of target turns is a balance issue worth investigating. Then pick the single most overpowered entity, nerf it by 20%, and re-simulate. Did the win-rate balance shift?",
    starters: [
      "How do I plot a cost curve for my game?",
      "When is variance too high?",
      "What's a healthy catch-up mechanism?",
    ],
  },
  {
    id: "06-iteration",
    title: "6. Iteration & playtesting",
    icon: Repeat,
    duration: "15 min",
    intro:
      "You will not get it right the first time. Or the tenth. Great designers playtest weekly and aren't precious about throwing things out. The game in your head is a hypothesis; only playtests give you data.",
    concepts: [
      { name: "Solo playtesting", explanation: "Play every faction yourself first. Catches the obvious bugs before wasting friends' time." },
      { name: "Blind playtesting", explanation: "Hand a stranger only your rulebook. If they can't play correctly, your rules need work — not their reading." },
      { name: "The 5-game rule", explanation: "Don't change a mechanic on the first complaint. Wait for the same issue to appear in 3+ different sessions." },
      { name: "Capture, don't react", explanation: "Take notes during play; resist the urge to redesign live. Patterns emerge from notes, not feelings." },
      { name: "Ship to fail fast", explanation: "Print-and-play prototypes within hours, not weeks. Cheap iteration beats polished prototypes." },
      { name: "The fresh-eyes window", explanation: "First-time players catch things you can never see again. Use that window — ask them to think aloud during their first turn." },
    ],
    examples: [
      { name: "Spirit Island", note: "Reportedly 200+ playtest sessions before publishing — and it shows." },
      { name: "Wingspan", note: "The author's blog details years of solo playtesting before it left the table." },
      { name: "Pandemic", note: "Matt Leacock famously playtested obsessively against his kids — discovered cooperative tension by accident." },
    ],
    deepDive: [
      {
        heading: "A playtest cadence that works",
        points: [
          "Week 1–4: solo daily, 30-min sessions. Goal: rules don't crash.",
          "Week 5–10: friends weekly, full sessions. Goal: it's playable end to end.",
          "Week 11–20: regular game group + 1–2 strangers per month. Goal: it's fun.",
          "Week 21+: blind tests at conventions / online. Goal: rulebook is teach-able.",
        ],
      },
      {
        heading: "Questions to ask post-playtest",
        points: [
          "What's the first thing you'd change? (forces specificity)",
          "When did you feel most in control? Least?",
          "Did the game end too early or drag on?",
          "What did you THINK was happening that wasn't?",
          "Would you play again? (ask LAST — the answer to all the others informs this one)",
        ],
      },
      {
        heading: "Reading the room",
        points: [
          "Watch for table chatter — quiet table = analysis paralysis or boredom.",
          "Watch for 'I forgot to do my X' — that's a rule the player didn't internalize.",
          "Watch for repeat questions — that's a rulebook ambiguity.",
          "Watch for 'kingmaker' moments — those usually mean balance, not malice.",
        ],
      },
      {
        heading: "When to throw things out",
        points: [
          "A mechanic gets the same complaint in 3+ unrelated sessions.",
          "Removing it doesn't break the rest of the game (test by trying!).",
          "You can't remember WHY it was added (no Notes entry, no Research link).",
          "Your gut says it's a darling. Kill it.",
        ],
      },
    ],
    pitfalls: [
      "Playtesting only with your designer friends. They're trained to be polite about mechanics. Get civilians.",
      "Reacting to a single playtest. Sample size 1 is gossip, not data.",
      "Polishing components before the rules are stable. Fancy prototypes inhibit your willingness to cut.",
    ],
    furtherReading: [
      "'The Kobold Guide to Board Game Design' — anthology of working pros.",
      "BGG's 'Designers' forum — read the postmortems on shipped games.",
    ],
    exercise:
      "Schedule three playtest sessions over the next month. Use the Playtesting tab in GameForge to log them — including what you changed between sessions. After session 3, compare notes: what showed up in all three? That's your real bug list.",
    starters: [
      "How do I find playtesters who aren't my close friends?",
      "What's the right playtest cadence?",
      "When should I cut a mechanic I love?",
    ],
  },
  {
    id: "07-theme",
    title: "7. Theme & narrative",
    icon: Drama,
    duration: "12 min",
    intro:
      "A great theme makes mechanics easier to teach, decisions feel meaningful, and the box memorable. The best designs marry theme and mechanism so tightly you can't separate them. Theme isn't decoration — it's a teaching tool.",
    concepts: [
      { name: "Theme-first vs. mechanic-first", explanation: "Some designers start from a feeling (\"Victorian seance\"), some from a verb (\"draft and build\"). Both work — know which you're doing." },
      { name: "Mechanical flavor", explanation: "When the rule and the theme reinforce each other (\"draw a card = research a clue\"), the game teaches itself." },
      { name: "Narrative beats", explanation: "Setup → opening tension → midgame escalation → endgame catharsis. Storyboard your game's pacing like a film." },
      { name: "Avoid generic re-skins", explanation: "Pasting fantasy art on a euro doesn't make it thematic. Theme has to influence at least one mechanic to count." },
      { name: "Theme as memory anchor", explanation: "Players remember 'the time I sacrificed my last villager to the volcano' — not 'the time I scored 47 points'. Theme is what gets retold." },
    ],
    examples: [
      { name: "Pandemic", note: "Cure spread = card draw, infection = cube placement. Mechanic IS theme." },
      { name: "Sherlock Holmes Consulting Detective", note: "Theme drives every mechanic — investigating IS gameplay." },
      { name: "Brass: Birmingham", note: "Industrial revolution theme makes the network-building mechanic feel inevitable." },
    ],
    deepDive: [
      {
        heading: "Three levels of theme integration",
        points: [
          "LEVEL 1 (re-skin): generic euro with fantasy art. Theme could be swapped without rule changes. Cheap, common, forgettable.",
          "LEVEL 2 (flavor): specific theme that influences naming and a few iconic mechanics (Wingspan's birds with unique powers).",
          "LEVEL 3 (mechanical theme): the theme determines the mechanics. Pandemic, Spirit Island, Sherlock Holmes. The theme COULDN'T be swapped.",
        ],
      },
      {
        heading: "Tests for thematic integrity",
        points: [
          "Rewrite a rule using ONLY thematic words, no game terms. Does it still make sense?",
          "Could you swap the theme to 'cats and dogs' without changing any rules? If yes, the theme is decoration.",
          "Do two different mechanics share the same thematic action? If a card lets you 'attack' AND 'invest', the theme is broken.",
        ],
      },
      {
        heading: "Theme pitfalls in 2026",
        points: [
          "Colonialism / 'civilization' themes increasingly criticized — be intentional or pick another.",
          "War themes need humanity — pure abstraction (Risk) reads differently than character-driven (Memoir '44).",
          "Cultural appropriation is real — research before lifting from other cultures.",
        ],
      },
      {
        heading: "Choosing a theme that sells",
        points: [
          "Specificity beats generality. 'Space exploration' is generic; 'crew of a doomed first mission to Pluto' sells.",
          "Resonance beats novelty. A theme players already love (zombies, dragons) is easier than inventing one.",
          "Visualizability matters. If the box art can't capture it in one image, marketing struggles.",
        ],
      },
    ],
    pitfalls: [
      "Building mechanics first then 'finding a theme'. The marriage feels arranged, not love.",
      "Theme so dense it requires lore drops in the rulebook. Cut it; players won't read three pages of fiction.",
      "Tone mismatch: light-hearted art on a brutal mechanic. Players come for one, find the other, leave.",
    ],
    furtherReading: [
      "Cole Wehrle's design diaries (Root, Pax Pamir) — masterclass in theme-mechanic integration.",
      "'The Art of Game Design' by Jesse Schell — chapters on resonance and lens of theme.",
    ],
    exercise:
      "Pick one of your game's mechanics and rewrite its description in pure thematic language — no game terms. If it still makes sense, the theme is doing real work. If it sounds silly, you have a theme/mechanic mismatch to fix.",
    starters: [
      "How do I tell if my theme is just decoration?",
      "Should I start theme-first or mechanic-first?",
      "What themes are oversaturated right now?",
    ],
  },
  {
    id: "08-publishing",
    title: "8. Publishing & next steps",
    icon: Megaphone,
    duration: "14 min",
    intro:
      "Once your game is working, you have three paths: self-publish, license to a publisher, or crowdfund. Each has different upsides and risks — and most beginners pick the wrong one for their situation. The right choice depends on your audience, your bankroll, and your appetite for logistics.",
    concepts: [
      { name: "Self-publish", explanation: "Maximum control, maximum financial risk. Need to handle manufacturing, fulfillment, marketing." },
      { name: "License to a publisher", explanation: "Pitch at conventions like Spiel or Origins. Royalty is typically 4–8% of wholesale. Lower upside, lower risk." },
      { name: "Crowdfund (Kickstarter / Gamefound)", explanation: "Pre-sell to your audience. Validates demand, funds the print run. Marketing is everything; expect 12+ months of work." },
      { name: "Build an audience early", explanation: "BoardGameGeek presence, BGG hot list, social posts during playtesting. Audiences take years to grow, not weeks." },
      { name: "Know your costs", explanation: "As a rough rule, your game should cost no more than one-fifth of its retail price to manufacture (a $50 game = ≤$10 to make). If it costs more, redesign components or accept a higher retail price." },
      { name: "The pitch is its own design", explanation: "Publishers see hundreds of pitches. A 30-second hook, 1-page summary, and clean prototype matters more than feature count." },
    ],
    examples: [
      { name: "Wingspan (Stonemaier)", note: "Self-published; built audience over a decade before launch." },
      { name: "Root (Leder)", note: "Kickstarter-funded; tightly themed art carried marketing." },
      { name: "Wavelength (CMYK)", note: "Licensed via established publisher; designers focused on creativity, not logistics." },
    ],
    deepDive: [
      {
        heading: "Decision tree: which path?",
        points: [
          "Have you shipped a game before? → No: license. Yes: any path.",
          "Do you have $30k+ liquid for a print run? → No: license or modest Kickstarter. Yes: any path.",
          "Do you have a pre-existing audience (5k+ engaged followers)? → No: license. Yes: crowdfund possible.",
          "Are you OK with logistics (shipping, customer support)? → No: license. Yes: any path.",
          "Default for first-timers: license.",
        ],
      },
      {
        heading: "The publisher pitch pack",
        points: [
          "30-second elevator pitch (memorize it).",
          "1-page sell sheet: title, players, time, age, mechanics, hook, comp titles.",
          "Clean prototype that plays correctly — not necessarily pretty.",
          "Rulebook draft (≤8 pages).",
          "Evidence of playtesting (session count, themes addressed).",
          "DON'T bring: your dream art. Publishers commission their own.",
        ],
      },
      {
        heading: "Crowdfunding reality check",
        points: [
          "First-time campaigns average ~$15–30k unless you have a pre-existing audience.",
          "Marketing spend often equals 20–30% of campaign target — budget for it.",
          "Fulfillment delays are the #1 source of bad reviews. Promise late, ship early.",
          "Stretch goals can sink margin. Set them carefully.",
        ],
      },
      {
        heading: "Royalty math (licensing)",
        points: [
          "Standard royalty: 4–8% of WHOLESALE (publisher's price, not MSRP).",
          "Wholesale ≈ MSRP × 0.4. So at $50 MSRP, royalty ≈ $1.60–3.20 per unit sold.",
          "First print runs: 2k–5k units. Realistic first-year earnings: $3k–15k.",
          "Don't quit your day job. Most designers license multiple games over years.",
        ],
      },
      {
        heading: "Building an audience before launch",
        points: [
          "Post your design journey on BGG / Reddit r/tabletopgamedesign weekly. Even small followings compound.",
          "Demo at local cons. Recordings of strangers playing > polished trailers.",
          "Newsletter from day one. Email lists outperform every other channel for crowdfunding.",
          "Be a person, not a brand. Designers with personalities outsell anonymous studios.",
        ],
      },
    ],
    pitfalls: [
      "Crowdfunding without an audience. Most failed campaigns underperform by 80%+.",
      "Chasing perfect art before pitching to a publisher. Wasted budget.",
      "Quitting after one publisher rejection. The average pitch is rejected by 5–10 publishers before signing.",
      "Underselling yourself in negotiations. Royalties are negotiable; advances exist; ask.",
    ],
    furtherReading: [
      "Jamey Stegmaier's 'A Crowdfunder's Strategy Guide' — the canonical playbook.",
      "'Going Pro: Lessons from a Decade in Tabletop' — Phil Eklund.",
      "BGG forums on publisher pitches — search 'first pitch experience'.",
    ],
    exercise:
      "Use the Exports tab in GameForge to generate a draft pitch deck. Read it as if you were a publisher hearing about the game for the first time. What would you cut? What's missing? Then write a 30-second pitch out loud — if you can't fit it in 30 seconds, the hook isn't sharp enough.",
    starters: [
      "Should I license, self-publish, or crowdfund my first game?",
      "What does a 30-second elevator pitch actually sound like?",
      "How big does my audience need to be to crowdfund?",
    ],
  },
];

export function Design101Content() {
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

  const progress = useMemo(() => Math.round((completed.size / LESSONS.length) * 100), [completed]);
  const lesson = LESSONS[activeIdx];
  const Icon = lesson.icon;
  const isDone = completed.has(lesson.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar */}
      <Card className="bg-card border-border h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Course outline</CardTitle>
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completed.size}/{LESSONS.length} done</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2 space-y-0.5">
          {LESSONS.map((l, i) => {
            const done = completed.has(l.id);
            return (
              <button
                key={l.id}
                onClick={() => setActiveIdx(i)}
                data-testid={`design101-lesson-${l.id}`}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors ${
                  i === activeIdx ? "bg-primary/15 text-primary" : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="flex-1 truncate">{l.title}</span>
                {done && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Lesson body */}
      <div className="space-y-5">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    Lesson {activeIdx + 1} of {LESSONS.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground">· {lesson.duration} read</span>
                </div>
                <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                <CardDescription className="text-base mt-1.5">{lesson.intro}</CardDescription>
              </div>
              <Button
                variant={isDone ? "default" : "outline"}
                size="sm"
                onClick={() => toggleComplete(lesson.id)}
                className="gap-1.5"
                data-testid={`design101-mark-${lesson.id}`}
              >
                <Check className="h-3.5 w-3.5" />
                {isDone ? "Done" : "Mark done"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> Key concepts
              </h3>
              <div className="space-y-3">
                {lesson.concepts.map((c, i) => (
                  <div key={i} className="border-l-2 border-primary/40 pl-3 py-0.5">
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{c.explanation}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Real-world examples</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {lesson.examples.map((e, i) => (
                  <div key={i} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="font-semibold text-sm">{e.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.note}</div>
                  </div>
                ))}
              </div>
            </section>

            {lesson.deepDive && lesson.deepDive.length > 0 && (
              <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" /> Deep dive
                </div>
                {lesson.deepDive.map((s, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold text-foreground mb-2">{s.heading}</h4>
                    <ul className="space-y-1.5">
                      {s.points.map((p, j) => (
                        <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
                          <span className="text-primary mt-1.5 shrink-0">›</span>
                          <span className="text-foreground/90">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {lesson.pitfalls && lesson.pitfalls.length > 0 && (
              <section className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> Common pitfalls
                </h4>
                <ul className="space-y-1.5">
                  {lesson.pitfalls.map((p, i) => (
                    <li key={i} className="text-sm text-rose-100/90 flex gap-2">
                      <span className="text-rose-400 shrink-0">⚠</span>{p}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {lesson.furtherReading && lesson.furtherReading.length > 0 && (
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Further reading
                </h3>
                <ul className="space-y-1.5">
                  {lesson.furtherReading.map((r, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex gap-2">
                      <span className="text-muted-foreground shrink-0">›</span>{r}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5" /> Exercise
              </h4>
              <p className="text-sm text-emerald-100/90 leading-relaxed">{lesson.exercise}</p>
            </section>
          </CardContent>
        </Card>

        <LearnChat
          topicId={`design101:${lesson.id}`}
          topicTitle={lesson.title}
          starterQuestions={lesson.starters}
        />

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            className="gap-1.5"
            data-testid="design101-prev"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">{activeIdx + 1} / {LESSONS.length}</span>
          <Button
            disabled={activeIdx === LESSONS.length - 1}
            onClick={() => setActiveIdx((i) => Math.min(LESSONS.length - 1, i + 1))}
            className="gap-1.5"
            data-testid="design101-next"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
