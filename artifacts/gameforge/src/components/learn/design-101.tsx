import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Check, ChevronLeft, ChevronRight, Trophy, Cog, Package,
  Scale, Repeat, Drama, Megaphone, Lightbulb, Dumbbell,
} from "lucide-react";

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
};

const LESSONS: Lesson[] = [
  {
    id: "01-what-is",
    title: "1. What is a board game, really?",
    icon: GraduationCap,
    duration: "8 min",
    intro:
      "Before designing one, it helps to know what the medium does well. A board game is a structured social experience: a small group of people agreeing to follow a fictional ruleset for an evening, often around a physical artifact.",
    concepts: [
      { name: "The magic circle", explanation: "Players voluntarily enter a temporary world with rules separate from real life. Your job is to make that circle worth entering." },
      { name: "Decisions over outcomes", explanation: "Great games are remembered for the decisions they forced, not the dice they rolled. Optimize for interesting choices first." },
      { name: "The social contract", explanation: "Games shape how players treat each other — competitive, cooperative, semi-cooperative, hidden roles. Pick deliberately." },
      { name: "Physicality matters", explanation: "Tactile components (chunky meeples, satisfying flips, dice clatter) carry emotional weight no app can match." },
    ],
    examples: [
      { name: "Catan", note: "Trade-driven decision space; the social contract is constant negotiation." },
      { name: "Pandemic", note: "Pure cooperative play forces table-talk strategy." },
      { name: "Chess", note: "Zero randomness, infinite depth — decisions are everything." },
    ],
    exercise:
      "Write a one-paragraph elevator pitch for your game. Specify: how many players, how long, what they do on their turn, and what makes them want to play it again.",
  },
  {
    id: "02-goals",
    title: "2. Goals & win conditions",
    icon: Trophy,
    duration: "10 min",
    intro:
      "A clear goal anchors every other design choice. Without one, players can't strategize. With multiple competing goals, the game gets richer — but balancing gets harder.",
    concepts: [
      { name: "Single victory condition", explanation: "First to N points / last standing. Simple to teach, easy to balance, can feel one-note." },
      { name: "Multiple paths to victory", explanation: "Multiple scoring tracks (Through the Ages, Terra Mystica). Adds replayability but doubles your balance work." },
      { name: "Variable end triggers", explanation: "Game ends when a deck runs out, a track fills, or a turn limit hits. Each pacing choice changes strategy." },
      { name: "Hidden vs. public victory", explanation: "Hidden objectives (Risk Legacy, Scythe) inject paranoia and surprise endings; public ones invite kingmaking." },
    ],
    examples: [
      { name: "7 Wonders", note: "Six scoring categories — pure point salad with multiple viable strategies." },
      { name: "Catan", note: "First to 10 victory points; only ~3 routes to get there, all visible." },
      { name: "Mafia / Werewolf", note: "Asymmetric hidden goals — the social game IS the game." },
    ],
    exercise:
      "List three different ways a player could win your game. Then ask: are they roughly equally efficient? If one is obviously best, you have a balance bug to fix early.",
  },
  {
    id: "03-mechanics",
    title: "3. Core mechanics",
    icon: Cog,
    duration: "12 min",
    intro:
      "Mechanics are the verbs of your game. Every mechanic should serve the experience you want — not be there because other games do it.",
    concepts: [
      { name: "Worker placement", explanation: "Players place limited tokens on a shared board to claim actions. Creates tension over scarce slots (Agricola, Lords of Waterdeep)." },
      { name: "Deck-building", explanation: "Players grow personal decks during play (Dominion, Star Realms). Engine-building feel; can suffer from runaway leader." },
      { name: "Area control", explanation: "Players compete for territory through majorities or unit counts (Risk, Blood Rage). Easy conflict, hard to keep tight." },
      { name: "Set collection", explanation: "Score by completing sets (Ticket to Ride, Sushi Go!). Highly accessible; flexible to mash up with other systems." },
      { name: "Action selection", explanation: "Each turn, pick from a small menu (Race for the Galaxy, Puerto Rico). Drives planning and prediction." },
      { name: "Push your luck", explanation: "Risk-vs-reward escalation (Can't Stop, Quacks of Quedlinburg). Cheap fun, hard to make deep." },
    ],
    examples: [
      { name: "Wingspan", note: "Engine-building + set collection + a touch of dice — classic mash-up of three." },
      { name: "Root", note: "Asymmetric area control where every faction plays a different game." },
    ],
    exercise:
      "Pick two mechanics from above and write down how they'd interact in your game. Most great games are 2–3 mechanics in tight conversation.",
  },
  {
    id: "04-components",
    title: "4. Components & physicality",
    icon: Package,
    duration: "9 min",
    intro:
      "Components carry meaning. A custom meeple feels different from a wooden cube; a thick chipboard token feels different from a card. Cost rises fast — design with that in mind.",
    concepts: [
      { name: "Information layers", explanation: "What's hidden, what's public, what's secret-to-some? Components physicalize this — face-down decks vs. open boards." },
      { name: "Iconography vs. text", explanation: "Icons scale to non-English audiences and look cleaner. Text is unambiguous but slower to read. Most pro games use both." },
      { name: "Production tiers", explanation: "Print-and-play / linen-finish cards / custom plastic minis / wooden meeples / dual-layer boards. Pick what serves the experience, not what looks fanciest." },
      { name: "Table presence", explanation: "How does it look set up? Photos sell games on social media — design for the table snapshot." },
    ],
    examples: [
      { name: "Spirit Island", note: "Dual-layer player boards keep tokens snug; signals quality." },
      { name: "Wingspan", note: "Custom dice tower (the birdfeeder) is iconic AND functional." },
    ],
    exercise:
      "Sketch your game's table layout. Where is each component? Can two players reach the central board without standing up? Test the ergonomics on paper first.",
  },
  {
    id: "05-balance",
    title: "5. Balance & math",
    icon: Scale,
    duration: "14 min",
    intro:
      "Balance is the discipline of making sure no single strategy is obviously best. It's part math, part feel, part playtesting. The Simulator tab in GameForge is built for this.",
    concepts: [
      { name: "Cost curves", explanation: "The cheaper an option, the weaker it should be — usually. Plot every entity's cost vs. effect; outliers are bugs." },
      { name: "Dominance check", explanation: "Is there a strategy that wins >60% of games? It dominates. Either weaken it or buff its counters." },
      { name: "Variance vs. determinism", explanation: "Dice swing the game; cards smooth over time. Decide how much randomness fits your audience." },
      { name: "Catch-up vs. snowball", explanation: "Engine-builders snowball — the rich get richer. Catch-up mechanisms (rubber-banding) keep last place engaged." },
      { name: "Action economy", explanation: "Count actions per turn × turns per game. That's your design budget — every rule competes for it." },
    ],
    examples: [
      { name: "Magic: The Gathering", note: "Mana cost vs. card power is balance distilled — billions of dollars in tuning data." },
      { name: "Chess", note: "Pieces are perfectly imbalanced; the elegance is in their interaction." },
    ],
    exercise:
      "Open the Simulator tab on your project. Run 100 games. Look at win-rates and turn counts. Anything >65% win or <50% of target turns is a balance issue worth investigating.",
  },
  {
    id: "06-iteration",
    title: "6. Iteration & playtesting",
    icon: Repeat,
    duration: "12 min",
    intro:
      "You will not get it right the first time. Or the tenth. Great designers playtest weekly and aren't precious about throwing things out.",
    concepts: [
      { name: "Solo playtesting", explanation: "Play every faction yourself first. Catches the obvious bugs before wasting friends' time." },
      { name: "Blind playtesting", explanation: "Hand a stranger only your rulebook. If they can't play correctly, your rules need work — not their reading." },
      { name: "The 5-game rule", explanation: "Don't change a mechanic on the first complaint. Wait for the same issue to appear in 3+ different sessions." },
      { name: "Capture, don't react", explanation: "Take notes during play; resist the urge to redesign live. Patterns emerge from notes, not feelings." },
      { name: "Ship to fail fast", explanation: "Print-and-play prototypes within hours, not weeks. Cheap iteration beats polished prototypes." },
    ],
    examples: [
      { name: "Spirit Island", note: "Reportedly 200+ playtest sessions before publishing — and it shows." },
      { name: "Wingspan", note: "The author's blog details years of solo playtesting before it left the table." },
    ],
    exercise:
      "Schedule three playtest sessions over the next month. Use the Playtesting tab in GameForge to log them — including what you changed between sessions.",
  },
  {
    id: "07-theme",
    title: "7. Theme & narrative",
    icon: Drama,
    duration: "9 min",
    intro:
      "A great theme makes mechanics easier to teach, decisions feel meaningful, and the box memorable. The best designs marry theme and mechanism so tightly you can't separate them.",
    concepts: [
      { name: "Theme-first vs. mechanic-first", explanation: "Some designers start from a feeling (\"Victorian seance\"), some from a verb (\"draft and build\"). Both work — know which you're doing." },
      { name: "Mechanical flavor", explanation: "When the rule and the theme reinforce each other (\"draw a card = research a clue\"), the game teaches itself." },
      { name: "Narrative beats", explanation: "Setup → opening tension → midgame escalation → endgame catharsis. Storyboard your game's pacing like a film." },
      { name: "Avoid generic re-skins", explanation: "Pasting fantasy art on a euro doesn't make it thematic. Theme has to influence at least one mechanic to count." },
    ],
    examples: [
      { name: "Pandemic", note: "Cure spread = card draw, infection = cube placement. Mechanic IS theme." },
      { name: "Sherlock Holmes Consulting Detective", note: "Theme drives every mechanic — investigating IS gameplay." },
    ],
    exercise:
      "Pick one of your game's mechanics and rewrite its description in pure thematic language — no game terms. If it still makes sense, the theme is doing real work.",
  },
  {
    id: "08-publishing",
    title: "8. Publishing & next steps",
    icon: Megaphone,
    duration: "10 min",
    intro:
      "Once your game is working, you have three paths: self-publish, license to a publisher, or crowdfund. Each has different upsides and risks.",
    concepts: [
      { name: "Self-publish", explanation: "Maximum control, maximum financial risk. Need to handle manufacturing, fulfillment, marketing." },
      { name: "License to a publisher", explanation: "Pitch at conventions like Spiel or Origins. Royalty is typically 4–8% of wholesale. Lower upside, lower risk." },
      { name: "Crowdfund (Kickstarter / Gamefound)", explanation: "Pre-sell to your audience. Validates demand, funds the print run. Marketing is everything; expect 12+ months of work." },
      { name: "Build an audience early", explanation: "BoardGameGeek presence, BGG hot list, social posts during playtesting. Audiences take years to grow, not weeks." },
      { name: "Know your costs", explanation: "MSRP ÷ 5 ≈ landed cost ceiling. If your game can't be made at that cost, redesign components or accept a higher price." },
    ],
    examples: [
      { name: "Wingspan (Stonemaier)", note: "Self-published; built audience over a decade before launch." },
      { name: "Root (Leder)", note: "Kickstarter-funded; tightly themed art carried marketing." },
    ],
    exercise:
      "Use the Exports tab in GameForge to generate a draft pitch deck. Read it as if you were a publisher hearing about the game for the first time. What would you cut? What's missing?",
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

            <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5" /> Exercise
              </h4>
              <p className="text-sm text-emerald-100/90 leading-relaxed">{lesson.exercise}</p>
            </section>
          </CardContent>
        </Card>

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
