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
import { useUserArtifact } from "@/hooks/use-user-artifact";

const LEGACY_STORAGE_KEY = "gameforge.learn.design101.completed";

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
      "Before designing a board game, it helps to understand what the medium is actually good at — and what it genuinely can't compete with. A board game is a structured social experience: a small group of people voluntarily agreeing to follow a fictional set of rules for an evening, often gathered around a physical object. Get specific about which part of that experience your game is meant to deliver — because designing for the wrong part is how games end up feeling like they belong in a different format.",
    concepts: [
      { name: "The magic circle", explanation: "When players sit down to play, they're voluntarily stepping into a temporary world with its own rules, separate from real life. Designers sometimes call this 'the magic circle.' Your job is to make that temporary world worth entering — and worth returning to the next time game night comes around. If the rules feel arbitrary or the world feels uninhabited, players won't step back in." },
      { name: "Decisions over outcomes", explanation: "Great games are remembered for the decisions they forced players to make, not for the dice that happened to roll well. A game where you made three fascinating, difficult choices and lost is more satisfying than a game where you made no interesting choices and won by luck. When you're designing, optimize for interesting choices first; let the math and the randomness serve those choices rather than driving the experience independently." },
      { name: "The social contract", explanation: "Every game carries an implicit agreement between the players about how they'll treat each other during play. Competitive games say 'we're trying to beat each other.' Cooperative games say 'we're working together against the game.' Hidden-role games say 'we might be lying to each other.' Choose your social contract deliberately. A game that presents as cooperative but actually has a hidden traitor mechanic will feel like a betrayal to players who came for a cooperative experience — not in the fun, designed way." },
      { name: "Physicality is part of the experience", explanation: "Tactile components — the weight of a chunky wooden meeple, the satisfying sound of dice rolling, the tactile decision of placing a tile — carry emotional weight that no screen can fully replicate. The physical interaction between players and your game's components is part of the design, not just a delivery mechanism. The best components feel meaningful to touch and to use." },
      { name: "Time is not free", explanation: "Every minute of gameplay is a minute the player has chosen not to spend on something else. A 90-minute game has to earn 90 minutes of attention. A two-hour game has to earn two hours. This isn't an argument for short games — some experiences need time to develop — but it is an argument for respecting the player's time at every moment, cutting anything that isn't contributing to the experience they came for." },
    ],
    examples: [
      { name: "Catan", note: "Built around negotiation and trade. The social contract is constant bargaining — every deal is both cooperation and competition." },
      { name: "Pandemic", note: "Pure cooperative play forces players to communicate and strategize together openly. The 'enemy' is the game itself." },
      { name: "Chess", note: "Zero randomness, infinite strategic depth — every outcome is a consequence of decisions. Proof that games don't need components or themes to be compelling." },
      { name: "Codenames", note: "Minimal rules, minimal components, endlessly replayable. Proof that elegance is more powerful than complexity." },
    ],
    deepDive: [
      {
        heading: "What board games genuinely do better than video games",
        points: [
          "Face-to-face social dynamics — reading faces, applying social pressure, negotiating in person. These are things video games cannot replicate in the same way, and they're often what makes a game night memorable.",
          "A shared, physical, visible game state that everyone at the table can see and touch simultaneously. There's no private screen, no hidden interface layer. Everyone is looking at the same thing, which creates a fundamentally different kind of collective experience.",
          "Pacing controlled by the players themselves, not by a software engine. Players can pause to argue, celebrate, explain their last move, or take a snack break. The game waits for them. This human pacing is one of the things that makes board games feel more social.",
          "House rules and customization. Players modify board games freely — house rules, variant setups, custom scoring. Players co-author the experience in a way that's much harder with a video game. This flexibility is a feature of the medium.",
        ],
      },
      {
        heading: "What board games genuinely do worse",
        points: [
          "Enforcing hidden information. Computers don't let humans cheat or peek. Humans definitely do. Any hidden information mechanic — a hand of cards, a secret role, a face-down tile — requires players to agree not to look. Most do, but it's a social contract, not an enforcement mechanism.",
          "Real-time and reflex-based gameplay. If your game requires players to react faster than others or perform precise physical movements, you're fighting against what tabletop does naturally. There are exceptions, but they're difficult to design well.",
          "Complex bookkeeping. Board games that require players to track many simultaneous moving numbers — scores, resources, timers, buffs — create cognitive overhead that exhausts the table. Video games handle this invisibly. Board games have to either simplify it or build physical tracking tools into the components.",
          "Solitary play. Solo modes for board games exist and can be excellent, but they're typically added after the fact, not designed from the ground up for one player. If you want to build something primarily for solo play, there are better-suited formats.",
        ],
      },
      {
        heading: "Five questions worth answering before you write a single rule",
        points: [
          "Who is at the table? How many people, what's their age range, and how much experience do they have with board games? A game designed for three veteran strategy players is a fundamentally different design problem from one designed for a family with kids aged 8–14.",
          "How long do they want to play? Not just in minutes, but in experience length. A 20-minute game should be the same 20 minutes, session after session. A 2-hour game needs enough variety and pacing to sustain 2 hours of attention.",
          "What feeling do you want players to leave with? Cleverness after a satisfying strategic sequence? Laughter from absurd chaos? Tension from a close competitive finish? Warmth from cooperative success? This feeling should be the north star that every design decision is tested against.",
          "What's the shortest version of this experience that still delivers that feeling? This question forces you to identify the core of your game — the part that absolutely must exist — versus everything else, which is optional.",
          "Why a board game and not something else? Not as a challenge, but as a genuine question. Some ideas are better as video games, or party activities, or role-playing experiences. If the answer is 'because board games are what I want to design,' that's enough — but it's still worth asking.",
        ],
      },
    ],
    pitfalls: [
      "'It's like X but with Y' is a marketing pitch, not a design direction. It tells you the surface without the substance. Get specific about why the combination is interesting and what new experience it creates that neither X nor Y produces on its own.",
      "Designing primarily for yourself and your gaming group. Your group's tastes, experience level, and tolerance for complexity are not universal. The most successful games are designed for a specific audience that the designer has thought about carefully, even if that audience includes them.",
      "Confusing complexity with depth. A game with 200 rules can be shallow and repetitive. A game with five rules can produce infinite interesting situations. Depth comes from interesting interactions between simple elements, not from adding more rules.",
    ],
    furtherReading: [
      "'Characteristics of Games' by Elias, Garfield, and Gutschera — a textbook-level analysis of what games are and how they work, written by actual game designers.",
      "Stonemaier Games' free design articles — Jamey Stegmaier has blogged in detail about every step of his design and publishing process, and the archive is an extraordinary free resource.",
    ],
    exercise:
      "Write a single paragraph that describes your game to someone who has never heard of it. Include: how many players, how long it takes, what a player does on their turn, and — most importantly — what feeling they're supposed to leave with. Then read it back and cut every adjective. What remains should still make a curious person want to know more. If it doesn't, the core idea needs more specificity.",
    starters: [
      "What feeling is my game supposed to leave players with?",
      "When is a board game the wrong format for an idea?",
      "How short can a great game be?",
    ],
  },
  {
    id: "02-goals",
    title: "2. Goals & win conditions",
    icon: Trophy,
    duration: "14 min",
    intro:
      "A clear victory condition is the anchor of your entire game. Without one, players can't form strategies — they don't know what they're working toward. The win condition is arguably the single most important sentence in your rulebook, and it's worth spending serious time on before you write much else.",
    concepts: [
      { name: "Single victory condition", explanation: "The simplest structure: the first player to reach a specific number of points wins, or the last player still standing wins. Single conditions are easy to teach, easy for players to track, and relatively easy to balance. The tradeoff is that the game can feel one-dimensional — if there's only one way to win, there's only one real strategy to pursue." },
      { name: "Multiple paths to victory", explanation: "Some games offer several different routes to the same finish line — different scoring tracks, different win strategies, different resource engines. Games like Through the Ages and Terra Mystica do this well. The benefit is significantly higher replayability; players can approach the game differently each session. The cost is that every path must be genuinely viable, which requires more careful balance work." },
      { name: "Variable end triggers", explanation: "The game ending is a separate design decision from who wins. The game might end when a card deck runs out, when a scoring track fills to a certain point, when a timer expires, or when a specific event is triggered by player action. Each of these creates different strategic incentives. A depleting deck rewards players who accelerate toward the end; a hard turn limit rewards consistency and long-term planning." },
      { name: "Hidden vs. public victory conditions", explanation: "In some games, every player's objective is visible to everyone — you know exactly what your opponents are working toward. In others, players have secret objectives that are only revealed at the end. Games like Scythe use hidden objectives to inject paranoia and produce surprising final reveals. Public objectives invite tactical alliances and give players something concrete to block. Both work; choose based on the social experience you want." },
      { name: "Win conditions are separate from scoring", explanation: "These two things are easy to conflate, but they're different. The win condition determines how the game ends. Scoring determines who is declared the winner. Some games end when a threshold is reached but score the winner by a completely different metric — Brass: Birmingham ends when the card deck is exhausted but the winner is whoever has accumulated the most points in a specific scoring structure, which is separate from what caused the game to end." },
      { name: "The two-minute rule", explanation: "Every player should fully understand the win condition within the first two minutes of the rules explanation. If they don't, they can't form a strategy — and without a strategy, early turns feel arbitrary and random. A win condition that takes five minutes to explain may need to be simplified." },
    ],
    examples: [
      { name: "7 Wonders", note: "Six different scoring categories, all contributing to a single total — the classic 'point salad' structure with multiple genuinely viable strategies." },
      { name: "Catan", note: "First to 10 victory points wins. Only three or four meaningful paths to those points, all publicly visible — easy to teach and easy for players to track relative to each other." },
      { name: "Mafia / Werewolf", note: "Completely asymmetric hidden goals — the innocents and the mafia are trying to win in opposite ways, and neither side knows for certain who the other is. The social deduction IS the game." },
      { name: "Spirit Island", note: "Cooperative game with two separate win conditions: either fill the fear track, or exhaust the invader card deck. Players can pursue different paths to victory depending on how the game unfolds." },
    ],
    deepDive: [
      {
        heading: "Why most first designs have weak victory conditions",
        points: [
          "The goal is implicit rather than measurable. 'Build the most powerful engine' sounds like a win condition, but it gives players no way to assess whether they're winning or losing during play. If players can't read their own position relative to others, they can't make strategic decisions.",
          "Multiple paths exist on paper but one is substantially better than the others in practice. This is only discovered through testing, but it's almost universal in early designs. If one path consistently wins, there's effectively only one path — the game just doesn't advertise that.",
          "The end trigger is invisible or surprising. If players can't see the game approaching its end, they can't make the final decisions that make a game's conclusion feel climactic. The best end triggers give players at least a turn or two of warning.",
          "Scoring is entirely deferred to the end. Games where nothing is scored until the final moment give players no feedback during play about how they're doing relative to others. Intermediate scoring, visible point tracks, or any mechanism that lets players compare positions during the game produces more engaged, strategic play.",
        ],
      },
      {
        heading: "What makes an end trigger work well",
        points: [
          "It should be visible as it approaches. A depleting card deck that players can see getting smaller, a countdown track on the board, a filling tableau — players need to see the end coming so they can adjust their strategy accordingly.",
          "It should give at least one or two turns of warning before it fires. A completely surprise ending feels arbitrary. Players need a brief window to sprint, block, or make a final meaningful decision.",
          "The final turn should feel climactic, not administrative. If the last few turns of your game are essentially just players completing transactions that no longer affect the outcome, the ending feels flat. Aim for an end trigger that fires while the result is still genuinely in question.",
          "It should be difficult for one player to deliberately delay. If a single player can hold off the game's end trigger indefinitely to their benefit, you have a design problem. End triggers should be largely outside any one player's unilateral control.",
        ],
      },
      {
        heading: "Kingmaking — and how to prevent it",
        points: [
          "Kingmaking happens when a player who cannot win is in a position to choose which other player does. In a four-player game where two players are competing for first place, the trailing third and fourth players may have enough resources or actions left to tip the balance — and whichever leader they decide to help or hurt will win or lose based on their choice. This feels bad for everyone.",
          "The most reliable way to avoid kingmaking is to keep the final score uncertain until the very end. Hidden score totals, simultaneous final actions, or end-of-game objectives that aren't fully tallied until scoring closes all reduce a trailing player's ability to identify and influence who wins.",
          "Some games deliberately embrace kingmaking as a feature — Diplomacy's entire design rests on players negotiating alliances with full knowledge that these alliances can be betrayed. If you choose to embrace kingmaking, make sure your audience knows to expect it before they sit down.",
        ],
      },
    ],
    pitfalls: [
      "Offering multiple paths to victory that are only theoretically equal. Test each path by trying to win with it deliberately — play through solo or mentally simulate a full game following only that strategy. If one path consistently produces better results than the others, it will be discovered by players and will collapse strategic variety.",
      "Designing an end trigger that players can't see coming. If the game ends abruptly and players feel they didn't get a chance to make their last meaningful choices, the ending will feel arbitrary and unsatisfying regardless of who wins.",
      "Creating hidden objectives that conflict in ways that produce chaos rather than interesting tension. Hidden objectives work best when they overlap enough to create competition without making every player's goal directly contradictory to everyone else's.",
    ],
    furtherReading: [
      "Mark Rosewater's design columns on win conditions — his experience designing Magic: The Gathering translates directly to board game structure.",
      "GMT Games' designer diaries — GMT publishes detailed notes from their designers on how they approached end-game triggers and balance.",
    ],
    exercise:
      "Write down three genuinely different ways a player could win your game. For each one, describe in two sentences the strategy a player would follow to pursue that path. Then compare the three strategies: are they roughly equally demanding? Equally likely to succeed? If one is obviously easier or more powerful than the others, you have an early balance problem worth addressing before you develop the game much further.",
    starters: [
      "How do I make multiple victory paths feel equally worth pursuing?",
      "What makes an end-game trigger feel satisfying rather than arbitrary?",
      "How do I prevent kingmaking in a competitive game?",
    ],
  },
  {
    id: "03-mechanics",
    title: "3. Core mechanics",
    icon: Cog,
    duration: "16 min",
    intro:
      "Mechanics are the verbs of your game — the actions players take and the systems those actions create. Every mechanic you include should earn its place by serving the experience you want players to have. Most beloved board games are built around two or three well-chosen mechanics working in close conversation with each other, not a long list of features. The art is in finding the right combination and refusing to add more.",
    concepts: [
      { name: "Worker placement", explanation: "Players place a limited number of tokens on a shared action board to claim those actions, blocking others from using them. The scarcity of slots creates natural tension — what you claim stops your opponents from claiming it. Agricola and Lords of Waterdeep are classic examples. Watch carefully for first-player advantage: whoever places first each round has access to all the best spots." },
      { name: "Deck-building", explanation: "Players begin with a small, weak personal deck of cards and spend their turns acquiring better cards, which shuffle into the deck and become available in future turns. Over time, the deck becomes more powerful — this is called 'building an engine.' Dominion pioneered this mechanic. The challenge is preventing one player from building an overwhelming engine and running away with the game." },
      { name: "Area control", explanation: "Players compete to dominate territories on a shared map by placing units, tokens, or influence. The player with the most presence in a territory at key moments scores for it. Risk and Blood Rage are well-known examples. Area control creates conflict naturally, because the board is finite and territories can't be owned by multiple players simultaneously." },
      { name: "Set collection", explanation: "Players score points by assembling matching sets of cards, tiles, or components. The scoring incentivizes collecting specific combinations, which creates indirect competition as players race to complete the same sets. Ticket to Ride uses route sets; Sushi Go uses food card combinations. Set collection is one of the most accessible mechanics for new players." },
      { name: "Action selection", explanation: "On their turn, a player chooses from a defined menu of available actions. The menu is the same for everyone; what differs is which options each player finds most valuable given their current position. Race for the Galaxy and Puerto Rico use variants of this. The main risk is 'analysis paralysis' — a menu with too many options can cause players to spend their whole turn thinking instead of deciding." },
      { name: "Push your luck", explanation: "Players repeatedly perform an action that grows increasingly risky over time, choosing when to stop and collect their winnings or keep going for more — knowing that going too far forfeits everything. Can't Stop and Quacks of Quedlinburg are prominent examples. This mechanic generates excitement and tension cheaply, but it rarely sustains an entire game on its own. It works best as a sub-system within a larger design." },
      { name: "Hand management", explanation: "Players hold a set of cards in hand and must decide when and how to play them. The timing of plays matters — a card played too early may be wasted; held too long, the moment may pass. Concordia and Race for the Galaxy are built heavily around this. Hand management creates high decision density without requiring a physical board." },
      { name: "Dice drafting", explanation: "A shared pool of dice is rolled at the start of a round, and players take turns selecting individual dice from the pool to use as resources or actions. Sagrada and Roll Player use this approach. It creates visible randomness — everyone can see what's available — while giving players control over which random outcome they take. The result feels unpredictable but not unfair." },
    ],
    examples: [
      { name: "Wingspan", note: "Engine-building through bird cards, set collection through habitats and goals, and dice drafting for food. A clean example of three mechanics working in tight harmony." },
      { name: "Root", note: "Asymmetric area control — every player faction uses the same board but follows completely different rules. A landmark in asymmetric design." },
      { name: "Splendor", note: "One mechanic — card-driven engine-building — executed without a single unnecessary addition. Proof that restriction makes games better." },
    ],
    deepDive: [
      {
        heading: "Choosing mechanics that fit your theme",
        points: [
          "Start from the verb you want players to feel, not from the mechanic. Ask: when my players are having the most fun, what are they doing? 'I'm building something.' 'I'm exploring.' 'I'm negotiating.' 'I'm outwitting my opponents.' Each of these points toward different mechanic families.",
          "Match the verb to a mechanic: 'building' points toward engine-building or worker placement; 'exploring' toward movement and area control; 'negotiating' toward market, auction, or trading mechanics; 'outwitting' toward hidden information or hand management.",
          "Test whether the marriage works by rewriting a key rule using only thematic language — no game terms. 'The merchant pays 2 gold to acquire a trade route' makes sense both as a rule and as a piece of story. If the rewrite sounds silly or arbitrary, the mechanic may not fit the theme.",
        ],
      },
      {
        heading: "Mechanic combinations that tend to work well",
        points: [
          "Worker placement combined with resource conversion — players claim actions to gather resources, then spend resources to build engines. Agricola and Caverna both use this to great effect. The combination creates constant scarcity and decision pressure.",
          "Deck-building combined with area control — the deck produces the currency or units that drive a map-based conflict. The engine and the board give each other stakes. Trains uses this combination.",
          "Action selection combined with variable player powers — everyone chooses from the same action menu, but each player type optimizes differently based on their unique abilities. Race for the Galaxy and Tzolk'in both demonstrate this well.",
          "Set collection combined with card drafting — players pass cards around a table and each choose one, building toward their sets while blocking others from completing theirs. 7 Wonders and Sushi Go! are both excellent examples of how this creates indirect conflict without direct confrontation.",
        ],
      },
      {
        heading: "Mechanic combinations that often create problems",
        points: [
          "Deep area control combined with heavy hand management tends to split player attention in ways that exhaust the table. Area control demands spatial awareness of the whole board; hand management demands careful attention to a personal card economy. Players doing both simultaneously often do neither well.",
          "Hidden roles combined with very long playing times. Social deduction — the central mechanic of hidden role games — requires players to stay emotionally engaged with each other for the entire game. This kind of sustained social pressure is difficult to maintain over three or four hours. Hidden role games work best when they're short.",
          "Push-your-luck as the sole mechanic of an entire game. The tension of risk-versus-reward diminishes quickly without other strategic layers to support it. It's a powerful tool for a sub-system but rarely strong enough to carry a full design on its own.",
        ],
      },
      {
        heading: "A short vocabulary guide",
        points: [
          "Drafting — players select items one at a time from a shared pool, often passing the remaining items to the next player afterward. Common in card games.",
          "Tableau — a player's personal play area, typically built up over the course of the game by adding cards or tiles. 'Building your tableau' means building your individual engine.",
          "Engine — a self-reinforcing system that produces more outputs over time. In Wingspan, your bird cards eventually generate so many resources that you can play more bird cards, which generate more resources.",
          "Bag-building — like deck-building, but using chips or tokens drawn from a personal bag instead of cards from a deck. Quacks of Quedlinburg popularized this variant.",
        ],
      },
    ],
    pitfalls: [
      "Adding a mechanic because it's popular in the current market, not because it serves your specific game. Trends produce games that feel like derivatives; intention produces games that feel necessary.",
      "Cramming four or five major mechanics into one game. Each mechanic you add increases the time needed to teach the game and the cognitive load on players. Two or three mechanics in deep conversation with each other will almost always produce a better experience than five mechanics that barely interact.",
      "Choosing mechanics before you know the feeling you're designing toward. Mechanics should serve the experience; they shouldn't drive it. If you choose a mechanic and then fit the experience around it, the result often feels forced.",
    ],
    furtherReading: [
      "BoardGameGeek's mechanic browser — searchable by mechanic type, with examples of every published game that uses each one. Reading five examples of a mechanic before choosing it will teach you its design space quickly.",
      "Gil Hova's 'Choose Your Mechanic' talk — available on YouTube, covering how to evaluate and select mechanics for specific design goals.",
    ],
    exercise:
      "Write down the two or three mechanics you're considering for your game. For each combination, describe in one paragraph how a typical turn would feel. Which combination produces the clearest, most interesting turn? Then write down one mechanic you considered and decided against, and why you rejected it. Knowing what you cut is as important as knowing what you kept.",
    starters: [
      "I want players to feel like they're running a trading operation — which mechanics fit that experience?",
      "How many mechanics can I combine before a game becomes too hard to teach?",
      "When should I choose deck-building over hand management?",
    ],
  },
  {
    id: "04-components",
    title: "4. Components & physicality",
    icon: Package,
    duration: "11 min",
    intro:
      "Components carry meaning that rules alone cannot. The weight of a token, the sound of dice, the tactile satisfaction of placing a wooden meeple — these physical qualities are part of your game's experience, not decoration applied afterward. At the same time, component costs rise fast, and the best component for your game is almost always the one your design actually needs, not the fanciest one you can imagine.",
    concepts: [
      { name: "What's visible and what's hidden", explanation: "One of your most important design decisions is what information players can see and what they can't. Components make these distinctions physical. A face-down deck means hidden information. An open scoring track means public information. A hand of cards held close means private information visible only to you. Before designing specific components, map out what each player should know at each moment — then choose components that make those distinctions naturally clear." },
      { name: "Icons vs. text", explanation: "Almost every professional board game uses both icons and text, but in different places. Icons work well for frequently referenced information — resource types, action costs, categories — because experienced players recognize them instantly without reading. Text is unambiguous and precise, which matters for rules and exceptions that need to be fully understood before acting. Non-English players can use an icon-heavy game more easily; English-dominant text makes the game inaccessible to them." },
      { name: "Production tiers", explanation: "Components exist in a range of quality and cost tiers: printed paper (cheapest, for prototyping), standard card stock with a linen finish, wooden cubes and meeples, plastic miniatures, and custom-shaped premium components. Each tier costs more to manufacture and signals more quality to a buyer or player. You don't need the highest tier everywhere — you need it where it matters most to your specific game." },
      { name: "Table presence", explanation: "Table presence is how your game looks when it's fully set up on a table in the middle of play. Photos of beautiful game setups sell games on social media and at conventions before anyone has read a rule. If your game looks compelling when photographed from above, it has strong table presence. This is worth designing for intentionally, not treating as an afterthought." },
      { name: "The insert", explanation: "The insert is the tray inside the box that holds all the components in place. A well-designed insert turns five minutes of setup into one minute. A poor insert — or no insert — means players shake everything into bags or spend time sorting before every session. Games with frustrating setup get left on the shelf; games with fast setup get played. The insert is not glamorous, but it's one of the highest-leverage components you can design." },
      { name: "How much components get handled", explanation: "It matters not just how many components your game has but how often each one gets touched, moved, or manipulated. Two hundred tiles that each get placed once and then stay put are manageable. Fifty tokens that every player handles dozens of times per game create constant physical activity — which can be fun or exhausting depending on how it's designed. When budgeting components, think about handling frequency, not just count." },
    ],
    examples: [
      { name: "Spirit Island", note: "Dual-layer player boards with inset spaces for tokens — tokens stay where you put them and don't slide around during play. A small detail that signals serious quality." },
      { name: "Wingspan", note: "The bird feeder dice tower is iconic and functional simultaneously. Rolling dice into a tower and collecting them from the bottom became a recognizable signature of the game's identity." },
      { name: "Brass: Birmingham", note: "Heavy chipboard industry tiles convey strategic permanence. When you place one, it feels like a commitment. The weight of the component reinforces the weight of the decision." },
    ],
    deepDive: [
      {
        heading: "Approximate production costs for common components",
        points: [
          "Standard playing cards with a linen finish: roughly $0.02 to $0.05 per card at mass production volumes. Cards are one of the most economical ways to deliver lots of information.",
          "Wooden meeples and cubes: roughly $0.05 to $0.20 per piece. The most cost-effective way to give players a physical token they'll actually enjoy handling.",
          "Small plastic miniatures: roughly $0.20 to $0.50 each. A significant step up in cost and visual impact over wooden pieces.",
          "Large or painted plastic miniatures: roughly $1 to $5 each. These are reserved for centerpiece components — player characters, boss enemies — where the visual impact justifies the cost.",
          "Dual-layer player boards: roughly $1 to $3 each. Expensive but dramatic in perceived quality — they hold tokens in place and feel like a premium product.",
          "Custom engraved dice: roughly $0.50 to $2 each. A meaningful upgrade when dice are central to your game's identity or when standard pip dice would feel out of place.",
        ],
      },
      {
        heading: "Designing for ergonomics — the things players will notice without naming",
        points: [
          "Reach: every player at the table should be able to interact with the central shared components without standing up. If your board is too large for a standard table, you have a design problem that no insert or rule change will fix.",
          "Visibility under typical lighting: small text, dark backgrounds, and low-contrast color combinations are difficult to read under living-room or convention lighting. Test your prototype under dim, warm light before finalizing any text or color decisions.",
          "Color-blind accessibility: roughly 8% of men and 0.5% of women have some form of color vision deficiency. Never use color alone to communicate important game information. Pair every color with a distinct icon or shape so the information is accessible to everyone at the table.",
          "Card hand comfort: if players routinely hold seven or more cards in their hands, thin, flexible cards are more comfortable. Cards that are too thick or too large become physically tiring to hold for a two-hour session.",
        ],
      },
      {
        heading: "When to invest in a higher-quality component",
        points: [
          "When a component is interacted with on every single turn — worker tokens, currency chips, resource cubes — the quality of that interaction compounds over hundreds of touches. A component that feels good to pick up and place makes the act of playing feel more satisfying.",
          "When a component is the physical embodiment of your game's central experience — chunky gold coins in a trading game, heavy diplomatic tiles in a political game. These components don't just convey information; they reinforce the feeling you want players to have.",
          "When the component will be the first thing photographed and shared on social media. The components that appear in the first unboxing photos and setup shots shape the game's public image before anyone plays it.",
        ],
      },
    ],
    pitfalls: [
      "Finalizing component design before the mechanics are stable. You will almost certainly need to change components as rules evolve — component counts change, information needs shift, physical layouts turn out not to work. Design component specifications after the rules are settled, not before.",
      "Using premium materials for everything because it 'feels more professional.' A box full of plastic miniatures and premium boards that costs $120 to manufacture and must retail at $60 is not a product — it's a financial problem. Budget each component tier based on where it actually adds value.",
      "Not designing an insert until manufacturing. Publishers and manufacturers have standard insert options, but they're designed for generic games. An insert designed specifically for your component layout, with labeled zones for each type, dramatically improves setup speed and player experience.",
    ],
    furtherReading: [
      "Panda Game Manufacturing's blog on component costs and production realities — free and highly practical.",
      "Stonemaier Games' crowdfunding best practices guide — covers how to handle component stretch goals without destroying your margin.",
    ],
    exercise:
      "Draw a rough layout of your game's table during play. Where does the central board sit? Where does each player's personal area go? Can every player reach the components they interact with without standing up? Then identify the single component players will touch most often — their worker tokens, their hand of cards, their resource cubes — and ask whether its current material tier matches how important it is to the experience.",
    starters: [
      "Which components are worth upgrading first when budget is limited?",
      "How do I decide between using icons or text on a card?",
      "How large a board can comfortably fit on a typical table?",
    ],
  },
  {
    id: "05-balance",
    title: "5. Balance & math",
    icon: Scale,
    duration: "18 min",
    intro:
      "Balance is the discipline of making sure no single strategy is obviously and always the best choice. It's part mathematics, part intuition, and part playtesting — and you genuinely need all three. The Simulator and Balance tabs in GameForge handle the mathematical part. The feel part can only come from real players at a real table. Neither alone is enough.",
    concepts: [
      { name: "Cost curves", explanation: "The core principle: options that cost more should generally produce more powerful effects. If you map every card or entity on a chart — cost on one side, power on the other — the result should be a rough diagonal line. Anything far above the line is probably the dominant choice; anything far below it is probably never worth picking." },
      { name: "Dominant strategies", explanation: "A dominant strategy is one that wins significantly more often than alternatives — not because of player skill, but because of how the game is structured. Once players discover a dominant strategy, strategic variety collapses. A rough warning threshold: if one approach wins more than 60% of games consistently, investigate it." },
      { name: "Randomness vs. skill", explanation: "Every game sits somewhere between pure skill — where the better player always wins — and pure chance — where the winner is decided by luck. Where your game lands on this range should be a deliberate design choice. It shapes who the game is for and how satisfying it feels to play and replay." },
      { name: "Snowballing vs. catch-up", explanation: "In many games, getting ahead makes it easier to stay ahead — resources compound, advantages grow. This is called a snowball effect. Left unchecked, it makes games feel decided long before they end. Catch-up mechanisms are tools that give trailing players a way to stay competitive — not by penalizing the leader, but by giving everyone a plausible path to winning." },
      { name: "Total decision space", explanation: "Every rule you write competes for a share of the total number of meaningful decisions in your game. Rules that almost never come up, or that produce no interesting choice when they do, are consuming space without contributing value. Good balance means every rule earns its place." },
      { name: "Expected value", explanation: "Expected value is the average outcome of a random element over many repetitions. Players don't calculate this consciously, but they develop a feel for what a random draw or roll typically produces. When that feel is frequently violated — when results seem consistently better or worse than they should be — the randomness feels broken, even if the math is technically correct." },
      { name: "Close vs. runaway finishes", explanation: "Some games are designed to produce close, tense finishes. Others reward skillful early play with commanding late positions. Both can be excellent, but whichever you intend, design for it deliberately. Accidental blowouts feel unfair; intentional dominant finishes feel earned." },
    ],
    examples: [
      { name: "Magic: The Gathering", note: "The relationship between card cost and power is one of the most studied balance systems in game design — refined over 30 years and billions of cards." },
      { name: "Chess", note: "Each piece type is deliberately imbalanced — a queen is vastly more powerful than a pawn. The balance lies in how these different pieces interact, not in making them equal." },
      { name: "Race for the Galaxy", note: "Six different action types, all viable. The selection mechanic creates indirect competition as players simultaneously try to benefit from their own choice and anticipate others'." },
    ],
    deepDive: [
      {
        heading: "Understanding your cost curve",
        points: [
          "The most useful early balance exercise is comparing every entity's cost to its effect on a single chart. The rule of thumb: something that costs twice as much should be roughly twice as powerful. Choose one entity as your benchmark — a card or piece that feels right at its price — and compare everything else to it.",
          "Some variation above and below the line is not just acceptable — it's necessary. The options that are slightly overpriced because they have a hidden limitation, or slightly underpriced because they're situational, are what create interesting strategic choices. Perfect symmetry paradoxically produces a game where every choice feels equivalent.",
          "When something sits far from the line, be honest: is it a design bug, or an intentional trade-off? A high-cost, low-power item might be there because it offers strategic flexibility or a special synergy. An item that's just undertuned because you forgot to balance it needs to be fixed.",
          "Sketch this comparison before major playtesting. Human intuition breaks down once you have more than 15 entities — the mind can't reliably hold that many relative comparisons simultaneously.",
        ],
      },
      {
        heading: "Thinking about your game's total decision space",
        points: [
          "A useful way to think about balance: roughly multiply your average actions per turn by player count by expected turns per game. A four-player game with three actions per turn and eight turns has around 96 total decision moments. Every rule competes for a share of those moments.",
          "Rules that almost never come up — because their situation is too rare, or because no one finds them worth choosing — consume rulebook space and player mindshare without contributing to those moments. Cut them, simplify them, or make them relevant more often.",
          "Not every action needs to be a dramatic decision. The rhythm of larger and smaller decisions is part of what makes a game satisfying across its full length. Some turns should be about consolidating or preparing.",
        ],
      },
      {
        heading: "Catch-up mechanisms that feel fair to everyone",
        points: [
          "The best catch-up mechanisms give trailing players more options or lower costs, without directly penalizing the leader. Giving a trailing player cheaper access to development options lets them close the gap through their own effort, which feels earned.",
          "Hidden score information is a softer catch-up tool. If trailing players can't see exactly how far behind they are, they may keep playing aggressively rather than conceding mentally — which keeps more players engaged for longer.",
          "Avoid explicit penalties on whoever is winning. Taking resources from the leader, or adding negative effects to being in first place, feels arbitrary and punishing to the player doing well. It rewards playing just behind the leader rather than playing to win.",
        ],
      },
      {
        heading: "How much randomness fits your audience",
        points: [
          "A game with almost no randomness demands skill investment and produces outcomes that feel completely earned — but also completely unforgiving. It's deeply satisfying for dedicated players and alienating for casual ones.",
          "Low randomness — where skill determines most outcomes but surprises still happen — is where most modern strategy games live. The better player usually wins, but anyone can have a great session.",
          "Medium randomness opens the game to a broader audience. Players who aren't as experienced still have real chances to win, which keeps sessions competitive across different levels of experience.",
          "High randomness produces games that are more about shared experience and storytelling than strategic competition. These games are excellent for bringing different people together without the barrier of a steep learning curve.",
          "Decide where your game sits on this range and tune everything toward that position consistently. A game trying to be a skill game that keeps introducing large random swings will frustrate its intended audience.",
        ],
      },
      {
        heading: "Signs that balance is good enough to move on",
        points: [
          "No single strategy wins more than about 60% of games across a meaningful sample of both simulated and human-played sessions.",
          "No entity or option is consistently avoided to the point where it might as well not exist. If something is available but rarely or never chosen, it's either a trap or a dead piece.",
          "The game runs within roughly 25% of your target playing time consistently — not always exactly, but close enough that the rhythm feels predictable to players.",
          "The player in last place with a few turns remaining still has at least one plausible path to winning. If even the best-case scenario for the trailing player can't threaten the leader, the game has effectively ended early.",
        ],
      },
    ],
    pitfalls: [
      "Doing all your balance work mathematically without validating it with real players. Numbers can be balanced in ways that still feel completely wrong at the table — the math doesn't capture social dynamics, player psychology, or whether a mechanism is actually enjoyable to use.",
      "Chasing perfect mathematical symmetry. A game where every option is exactly equally optimal is also a game with no interesting choices — because when everything is equivalent, nothing stands out. Intentional, well-designed imbalance is what creates strategic depth.",
      "Adjusting the weak option upward and the strong option downward without checking whether the problem was actually imbalance, or whether the strong option was simply more enjoyable to play. Fix the less fun option before nerfing the one people actually like using.",
    ],
    furtherReading: [
      "'Designing Games' by Tynan Sylvester — written by a video game developer but deeply applicable to tabletop, covering emergent systems, player psychology, and balance.",
      "Mark Rosewater's design columns on Magic: The Gathering — three decades of public thinking about cost, power, and strategic variety, freely available online.",
    ],
    exercise:
      "Open the Simulator tab in your GameForge project and run at least 100 games. Look at which strategies won most often and how long the games ran. If one strategy won more than 65% of the time, identify the entity or rule that enables it and reduce its power by about 20%. Run the simulator again with the same settings and compare the results. Did the win distribution become more even? This adjust-simulate-compare loop is the core rhythm of balance work.",
    starters: [
      "How do I build a cost curve for my game's entities?",
      "When does randomness become too high for the audience I'm designing for?",
      "What's a good catch-up mechanism for a four-player competitive game?",
    ],
  },
  {
    id: "06-iteration",
    title: "6. Iteration & playtesting",
    icon: Repeat,
    duration: "15 min",
    intro:
      "You will not get it right the first time. Or the fifth time. The best game designers in the world still spend the majority of their time playtesting and revising, not designing. The game you've designed in your head is a hypothesis; only playtests give you real data about whether the hypothesis is correct.",
    concepts: [
      { name: "Solo playtesting", explanation: "Before bringing in anyone else, play through your game yourself — every faction, every path, every side. You'll catch the obvious crashes, the rules that don't make sense on paper, and the moments where nothing interesting happens. This step is inexpensive and saves everyone else's time." },
      { name: "Blind playtesting", explanation: "A blind playtest is one where you hand players only the written rulebook and give them no additional help. This tests the rulebook, not the game. If players make errors following the written rules, those errors are the rulebook's problem to fix. Blind testing is uncomfortable and invaluable." },
      { name: "The three-session rule", explanation: "Don't redesign a mechanic because one person complained about it once. Wait for the same issue to appear in three or more independent sessions with different groups. One complaint is a data point. Three is a pattern. Reacting to every individual complaint is how games improve in one area while getting worse in three others." },
      { name: "Observe, don't fix on the fly", explanation: "During a playtest, your job is to watch and take notes — not to explain things, clarify rules, or redirect players who are doing something 'wrong.' The moment you intervene, you're corrupting the data. Write down everything you see, no matter how minor. Patterns emerge from notes over sessions, not from feelings in the moment." },
      { name: "Cheap and fast prototypes", explanation: "A prototype made from printed cards, handwritten text, and borrowed tokens takes a few hours to build and can be iterated overnight. A polished prototype takes weeks and creates a psychological resistance to changing things. The cheaper your prototype, the more willing you'll be to cut, replace, and redesign — which is exactly what you need to do." },
      { name: "The fresh-eyes window", explanation: "The first time any player encounters your game, they experience it as a stranger — with no context, no assumptions, and no knowledge of your intentions. This window closes the moment they've played once. Ask first-time players to think aloud during their first turn: what do they think is happening, what are they trying to do, what confuses them. You will never be able to see your game this way again." },
    ],
    examples: [
      { name: "Spirit Island", note: "Reportedly over 200 playtest sessions before the game was published. The depth and tightness of the final product reflects that investment directly." },
      { name: "Wingspan", note: "The designer's public blog details years of solo playtesting and iteration before the game was ever shown to anyone outside her immediate circle." },
      { name: "Pandemic", note: "Matt Leacock playtested extensively with his family over years. The cooperative tension that makes Pandemic memorable was discovered and refined through repeated play, not designed from scratch." },
    ],
    deepDive: [
      {
        heading: "A realistic playtesting schedule",
        points: [
          "Weeks 1–4: solo playtesting daily if possible, in short sessions. Your goal at this stage is simply for the game to run from start to finish without crashing — rules contradicting each other, missing game states, players having nothing to do on their turn. Fix those crashes before anything else.",
          "Weeks 5–10: weekly sessions with friends or your regular gaming group. Your goal now is for the game to be playable end to end by people other than you. Track how long it takes to teach, how long it runs, and where players get confused or disengaged.",
          "Weeks 11–20: regular game group plus one or two strangers per month. Strangers are essential — they haven't been conditioned by your explanations, they have no social incentive to be nice about problems, and they encounter your rulebook without any prior context. Your goal now is for the game to be genuinely fun, not just functional.",
          "Weeks 21 and beyond: blind playtests at game design meetups, local conventions, or online groups. Your goal now is for the rulebook to be independently teachable. If you can't be there, can a stranger figure it out from the written rules alone?",
        ],
      },
      {
        heading: "Questions worth asking after every session",
        points: [
          "'What's the first thing you'd change?' — This question forces specificity. 'I'd change X' is useful. 'I'd make it more fun' is not.",
          "'When did you feel most in control of the game? When did you feel least?' — This reveals whether your designed moments of agency are actually landing as you intended.",
          "'Did the game feel like it ended at the right moment, or did it drag on or end too soon?' — This is pacing feedback that players rarely volunteer on their own.",
          "'Was there any moment where you weren't sure what the rules said?' — This identifies ambiguities. If one player was uncertain, others were too but didn't mention it.",
          "'Would you play this game again?' — Save this one for last. After hearing their honest answers to the other questions, their answer to this one will be much more meaningful.",
        ],
      },
      {
        heading: "What to watch for during a session",
        points: [
          "A quiet table is a warning sign. When people are engaged and having fun, they talk — they celebrate good moves, complain about bad luck, trash talk each other. Silence usually means analysis paralysis, boredom, or confusion. Note which phase of the game it occurs in.",
          "'I forgot to do my thing' — when a player misses an action or rule they should have known about, that rule hasn't been internalized. Either it's too easy to forget, or the rulebook doesn't emphasize it sufficiently.",
          "The same question asked by multiple players at different times is a definite rulebook ambiguity. Write down the exact phrasing of the question, not just the subject matter.",
          "Moments where one player is essentially deciding who wins among two others — these are kingmaking situations. Note the game state when they occur, because they're usually pointing to a balance or end-game trigger problem.",
        ],
      },
      {
        heading: "When to cut something you love",
        points: [
          "A mechanic receives the same substantive complaint in three or more independent sessions with different groups. Not variations on a theme — the same core problem, described differently by different people.",
          "Removing the mechanic doesn't break the rest of the game. The best way to test this is to actually try removing it for a session and see what happens.",
          "You can't find a note or research item that explains why you added it in the first place. If you can't remember the reasoning, the reasoning may not have been strong enough to justify keeping it.",
          "Your instinct tells you it's a 'darling' — something you love disproportionately to its actual contribution to the game. The best designers are ruthless about their own darlings. Cut them, or at least put them in a drawer labeled 'for the next game.'",
        ],
      },
    ],
    pitfalls: [
      "Playtesting only with friends who are also designers or who know you well. These people are inclined to be supportive, which is wonderful in life but counterproductive in playtesting. You need people who will tell you honestly that something isn't working, which strangers do far more reliably.",
      "Changing your game based on the results of a single session. One playtest is anecdotal. Three independent sessions pointing in the same direction is a signal worth acting on.",
      "Investing heavily in prototype quality before the rules are stable. Beautiful prototypes create reluctance to make the cuts and changes that early-stage games need. Stay cheap and rough until the design is solid.",
    ],
    furtherReading: [
      "'The Kobold Guide to Board Game Design' — an anthology of essays by working professional designers, covering both design principles and the practical realities of the development process.",
      "BoardGameGeek's designers forum — the postmortem threads where published designers discuss what went wrong and what they learned are some of the most useful free reading in the field.",
    ],
    exercise:
      "Schedule three playtest sessions over the next month — with at least one session involving people you haven't played with before. Use the Playtesting tab in GameForge to log each session, and write down what changed between them. After the third session, look at all three logs and identify anything that appeared in more than one: a confusion, a complaint, a rule question, a moment where someone disengaged. That recurring item is your real bug list.",
    starters: [
      "How do I find playtesters who aren't my friends?",
      "What's a realistic playtesting schedule for someone with a full-time job?",
      "How do I know when to cut a mechanic I've spent weeks developing?",
    ],
  },
  {
    id: "07-theme",
    title: "7. Theme & narrative",
    icon: Drama,
    duration: "12 min",
    intro:
      "A great theme makes mechanics easier to teach, gives decisions emotional weight, and makes the game memorable long after the session ends. The best designs weave theme and mechanics together so tightly that you can't remove one without unraveling the other. Theme isn't decoration — it's a teaching tool, a memory anchor, and often the reason someone picks your game off the shelf in the first place.",
    concepts: [
      { name: "Theme-first vs. mechanic-first", explanation: "There are two legitimate starting points for a design. You can start from a feeling or world — a Victorian seance, a dying star system, a family of traveling merchants — and find mechanics that express it. Or you can start from a verb you want players to feel — drafting, building, racing — and find a theme that gives those verbs meaning. Both approaches produce great games. The important thing is to know which one you're doing, so you don't end up in the middle with neither." },
      { name: "When mechanics and theme reinforce each other", explanation: "The most elegant designs are those where understanding the theme teaches you the rules, almost automatically. In Pandemic, the mechanic of placing disease cubes works the same way a real outbreak spreads — exponentially, from contact points, harder to stop if you delay. You don't need to memorize the rule; you already understand infection. When rule and theme speak the same language, the game teaches itself." },
      { name: "The game's narrative arc", explanation: "Every game tells a story, even if no one writes any fiction for it. The story is: setup, opening tension, midgame escalation, endgame crisis, resolution. Thinking about your game as a series of narrative beats — rather than just a series of turns — helps you design for pacing and emotional experience, not just for mechanical correctness." },
      { name: "Theme as surface vs. theme as structure", explanation: "Applying a theme as surface means giving your mechanics a coat of paint — trading resources are now 'spices,' scoring tracks are now 'influence.' The game plays exactly the same regardless of the theme. Applying theme as structure means letting the fictional premise determine what mechanics exist and how they work. The difference is what makes some games feel generic and others feel inevitable." },
      { name: "Theme as memory", explanation: "Players remember stories, not scores. 'The time I used my last diplomat to broker a peace treaty with two turns left' is a story. 'The time I scored 47 points' is not. Theme is the frame that turns a sequence of mechanical decisions into a narrative that people tell at the table and retell afterward. A memorable theme is one of the most powerful marketing tools a game can have, because players who loved the experience will describe it in thematic terms." },
    ],
    examples: [
      { name: "Pandemic", note: "Disease cube placement mirrors real infection spread; card draw represents disease research. The mechanic and the theme are the same thing expressed differently." },
      { name: "Sherlock Holmes Consulting Detective", note: "Every single mechanic exists to serve the theme of investigation. There is no abstraction — consulting maps, reading newspapers, and interviewing witnesses IS the game." },
      { name: "Brass: Birmingham", note: "The industrial revolution theme makes network-building feel not just logical but emotionally right. You're building a canal network that will become obsolete when the railways arrive — the theme makes the rule feel inevitable." },
    ],
    deepDive: [
      {
        heading: "Three levels of how deeply a theme can be integrated",
        points: [
          "Level one — surface theme: the game's rules could apply to any setting, and the theme is applied as art direction, component naming, and flavor text. A worker placement game where workers are 'monks' instead of 'workers' but all the rules are the same. This is the most common type of theme integration, and the most forgettable. It's not wrong — many successful games work this way — but it's rarely what makes a game iconic.",
          "Level two — flavored theme: the theme genuinely influences some of the mechanics, giving specific rules a thematic reason to exist. Wingspan's birds each have real behaviors that are reflected in their card powers — birds that build nests in large flocks have abilities that trigger when you play many birds. The theme hasn't determined the core mechanics, but it has shaped their details in a meaningful way.",
          "Level three — structural theme: the theme has determined the fundamental structure of the game. You cannot swap the theme without rewriting the rules from scratch. Pandemic couldn't be a space exploration game without becoming a completely different design. Spirit Island couldn't be a trading game. The mechanics and the premise are inseparable.",
        ],
      },
      {
        heading: "Tests you can run to check thematic integrity",
        points: [
          "Rewrite one of your key rules using only thematic language — no game terms at all. Instead of 'the active player draws two cards,' write 'the investigator discovers two new clues.' If the rewritten version still makes complete sense as a description of something happening in your game's world, the mechanic and the theme are aligned. If the rewrite sounds silly or arbitrary, the mechanic may not fit the world you've built.",
          "Ask whether you could change your game's theme to something completely unrelated — cats and dogs, gardening, outer space — without changing any of your rules. If you could do that swap without any rule needing to change, your theme is currently functioning as surface decoration. That might be fine, but you should know it.",
          "Check whether different mechanics share the same thematic action. If two different rules both represent your character 'fighting,' but they use completely different game systems, the theme is pulling in two directions at once. Thematically unified games use the same mechanic for the same kind of activity throughout.",
        ],
      },
      {
        heading: "Choosing and developing a theme that works",
        points: [
          "Specificity makes themes memorable and marketable. 'Space exploration' is generic — it describes hundreds of games. 'A crew of four specialists on a one-way mission to establish the first human colony on an uninhabitable moon' is specific — it creates immediate questions and emotional investment. Specific themes also constrain your mechanics in useful ways, because not everything fits the premise.",
          "Themes that already resonate with your target audience are easier to pitch and easier to sell than novel themes that require explanation. Dragons, heists, historical periods, and nature themes all have built-in audiences. This doesn't mean you should avoid original themes — it means you should be aware that original themes require more marketing work to explain.",
          "A theme's visualizability matters. Can the key premise of your game be captured in a single compelling image — the kind you'd put on a box cover? A game about negotiating political alliances might be difficult to visualize; a game about building a fantastical city is easier. Strong box art is often a proxy for a visualizable theme, and box art is frequently what gets someone to pick a game up in a store.",
        ],
      },
    ],
    pitfalls: [
      "Designing a full set of mechanics and then 'finding a theme' to apply afterward. Themes added at the end often feel like they're wearing the rules rather than being expressed by them — the fit is always slightly off. The best time to think about theme is at the very beginning, as a partner to mechanic development.",
      "Building a theme so dense with its own lore and backstory that the rulebook needs three pages of fiction before a player can understand what they're doing. Players will not read it, and the lore will become an obstacle rather than an asset. Theme should make rules easier to understand, not add a prerequisite reading assignment.",
      "Creating a tone mismatch between your art direction and your mechanical experience. Bright, cheerful art signals a light-hearted game. Dark, serious art signals a weighty one. When a player sits down expecting one and finds the other, the disconnect is jarring — not pleasantly surprising.",
    ],
    furtherReading: [
      "Cole Wehrle's design diaries for Root and Pax Pamir — detailed public reflections on how he thinks about the relationship between historical and political themes and game mechanics.",
      "'The Art of Game Design' by Jesse Schell — his chapters on resonance and the lens of theme are among the clearest writing on what theme actually does in a game.",
    ],
    exercise:
      "Choose the mechanic you're most proud of in your current design. Write a paragraph describing what happens when a player uses it, using only the language of your game's world — no terms like 'action,' 'resource,' 'points,' or 'turn.' If the paragraph makes sense as a description of something happening in the fictional setting, the theme is doing real work. If the paragraph sounds odd or arbitrary, you have a theme-mechanic mismatch worth addressing.",
    starters: [
      "How do I tell if my theme is actually doing anything, or just decorating the surface?",
      "Should I start with a theme or with a mechanic?",
      "What makes some themes feel fresh and others feel overdone?",
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

export function Design101Content({ initialChapterId }: { initialChapterId?: string }) {
  const [activeIdx, setActiveIdx] = useState(() => {
    if (!initialChapterId) return 0;
    const idx = LESSONS.findIndex((l) => l.id === initialChapterId);
    return idx >= 0 ? idx : 0;
  });
  // Per-user design-101 completion artifact: { completed: string[] }
  const { state: designArtifact, setState: setDesignArtifact } = useUserArtifact<{ completed: string[] }>(
    "learn-design101-completed",
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
  const completed = useMemo(() => new Set(designArtifact.completed), [designArtifact.completed]);

  const toggleComplete = (id: string) => {
    setDesignArtifact((prev) => {
      const next = new Set(prev.completed);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { completed: [...next] };
    });
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
