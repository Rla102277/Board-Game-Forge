import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Sparkles, Target, Layers,
  ScrollText, Users, Network, FileText, CheckSquare, MessageSquare, Image,
  Beaker, BarChart3, Film, Download, KeyRound, FlaskConical, Wand2,
} from "lucide-react";

const STORAGE_KEY = "gameforge.learn.bible.completed";

type Chapter = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  body: { heading: string; points: string[] }[];
  tips?: string[];
};

const CHAPTERS: Chapter[] = [
  {
    id: "welcome",
    title: "Welcome to GameForge",
    icon: Sparkles,
    blurb: "GameForge is a workspace for designing tabletop board games. This guide walks you through every panel, button, and AI feature.",
    body: [
      {
        heading: "What you can do here",
        points: [
          "Capture your game's vision (theme, player count, duration) in one place.",
          "Build a structured ontology of entities, rules, and players that the AI can reason over.",
          "Brainstorm with multiple AI providers (Claude, GPT, Gemini, Grok) — switch any time.",
          "Run Monte Carlo balance simulations before you cut your first prototype.",
          "Generate component art (cards, boards, tokens) from your narrative seed.",
          "Track playtests, notes, and tasks the same way a real studio would.",
        ],
      },
      {
        heading: "The three things to learn first",
        points: [
          "The left rail switches between projects; the section sidebar switches between tabs of the current project.",
          "The right-hand chat panel is your AI co-designer — it follows you across every tab.",
          "Almost every list (rules, entities, notes, assets) has a Sparkles button — that's AI Enhance.",
        ],
      },
    ],
    tips: [
      "Click the chat panel header to collapse it when you need more screen real estate.",
      "Hover an assistant message to save it to Notes or Tasks with one click.",
    ],
  },
  {
    id: "overview",
    title: "Overview tab",
    icon: Target,
    blurb: "Your project's home screen. Stats, metadata, and the AI quick-prompts that kick off your session.",
    body: [
      {
        heading: "Stat tiles",
        points: [
          "Live counts of entities, rules, players, notes, tasks, and chat messages.",
          "Useful for spotting empty parts of your design (e.g. plenty of rules but zero players defined).",
        ],
      },
      {
        heading: "Project metadata",
        points: [
          "Name, description, game type, genre, player count, duration — saved automatically as you type.",
          "These fields seed the AI's context, so fill them in early.",
        ],
      },
      {
        heading: "AI Quick Actions",
        points: [
          "Pre-canned prompts that route through your active chat panel.",
          "Great for getting unstuck or sanity-checking direction.",
        ],
      },
    ],
  },
  {
    id: "research",
    title: "Research tab",
    icon: ScrollText,
    blurb: "Drop reference material — links, PDFs, plain text — and let the AI mine it for inspiration.",
    body: [
      {
        heading: "Why use Research",
        points: [
          "Pin BoardGameGeek pages, mechanic essays, or playtester feedback in one place.",
          "Ask the AI to extract takeaways or compare two references side by side.",
        ],
      },
    ],
  },
  {
    id: "ontology",
    title: "Ontology tab",
    icon: Network,
    blurb: "A bird's-eye map of how your entities and rules connect. Where you spot gaps and overlaps.",
    body: [
      {
        heading: "Entity taxonomy",
        points: [
          "Groups every entity by its type so you can see structural balance at a glance.",
          "Click an entity type to read a primer on what it is and what properties it usually has.",
        ],
      },
      {
        heading: "Rule ↔ Entity links",
        points: [
          "GameForge auto-detects when a rule mentions an entity by name.",
          "Use this to find orphan rules (no entity touches them) or untouched entities (no rule uses them).",
        ],
      },
    ],
    tips: ["Rename your entities consistently — the link detector matches on substrings."],
  },
  {
    id: "entities",
    title: "Entities tab",
    icon: Layers,
    blurb: "The atoms of your game: items, factions, locations, events, characters.",
    body: [
      {
        heading: "Create entities three ways",
        points: [
          "Manually with the + Add Entity button.",
          "From AI by describing what you want (e.g. \"three mid-tier weapons with downside trade-offs\").",
          "By importing rules — extracted entity references show up under each rule.",
        ],
      },
      {
        heading: "Properties",
        points: [
          "Each entity can carry properties (cost, hp, damage, rarity…).",
          "Properties feed the Simulator and Balance tabs.",
        ],
      },
    ],
  },
  {
    id: "players",
    title: "Players tab",
    icon: Users,
    blurb: "Define your audience and your in-game player roles.",
    body: [
      {
        heading: "Player types vs. personas",
        points: [
          "Player types describe in-game roles (Merchant, Warlord, Scholar).",
          "Personas describe real-world target audiences (Casual family of 4, BGG hardcore).",
          "Use both — they answer different questions.",
        ],
      },
    ],
  },
  {
    id: "rules",
    title: "Rules tab",
    icon: FileText,
    blurb: "The structured rulebook. Tagged, prioritized, AI-enhanceable.",
    body: [
      {
        heading: "Categories",
        points: [
          "Movement, Combat, Economy, Turn Structure, Variant — each gets a colored badge.",
          "Categories help when exporting a printable rulebook later.",
        ],
      },
      {
        heading: "Per-rule actions",
        points: [
          "Sparkles → AI Enhance: tighten wording, suggest edge cases, propose related rules.",
          "Copy icon → duplicate as a starting point for a sibling rule.",
          "Pencil → edit in place.",
        ],
      },
    ],
    tips: [
      "Use Priority 5 for rules that show up in setup or every turn; Priority 1 for variants.",
      "Sort by category for easier proofreading.",
    ],
  },
  {
    id: "simulator",
    title: "Simulator tab",
    icon: FlaskConical,
    blurb: "Run AI-driven Monte Carlo simulations of your game.",
    body: [
      {
        heading: "How it works",
        points: [
          "Describes your rules + entities to the AI and asks it to play through games at scale.",
          "Surfaces win-rate skew, dominant strategies, and turn-count distribution.",
        ],
      },
      {
        heading: "What to do with results",
        points: [
          "If one strategy wins >70% of games, look at the rules feeding it.",
          "If games run double the target duration, find the rule causing slow loops.",
        ],
      },
    ],
  },
  {
    id: "assets",
    title: "Assets tab",
    icon: Image,
    blurb: "Generate component mockups (cards, boards, tokens, character art) tied to your narrative.",
    body: [
      {
        heading: "Narrative seed",
        points: [
          "Set the visual tone once at the top — saved on the project.",
          "Every component tile composes its prompt as: narrative + selected entities + component type.",
        ],
      },
      {
        heading: "Component tiles",
        points: [
          "Card, Board, Token, Dice, Character, Map, Box cover, Logo — one click generates each.",
          "Free-form prompt below for anything else.",
        ],
      },
    ],
    tips: ["BYOK an OpenAI key in workspace settings if you're hitting rate limits."],
  },
  {
    id: "playtesting",
    title: "Playtesting tab",
    icon: Beaker,
    blurb: "Track sessions, capture feedback, share public links to playtester forms.",
    body: [
      {
        heading: "Public feedback links",
        points: [
          "Each session can spawn a tokenized URL — playtesters fill it out without an account.",
          "Responses flow back into the session record.",
        ],
      },
    ],
  },
  {
    id: "notes",
    title: "Notes tab",
    icon: FileText,
    blurb: "Long-form scratchpad for ideas, lore, and design rationale.",
    body: [
      {
        heading: "Tips",
        points: [
          "Save AI replies straight from chat with the bookmark icon — they land here.",
          "Use Notes for the \"why\" — Rules for the \"what\".",
        ],
      },
    ],
  },
  {
    id: "tasks",
    title: "Tasks tab",
    icon: CheckSquare,
    blurb: "Lightweight task tracker scoped to this project.",
    body: [
      {
        heading: "Workflow",
        points: [
          "Create tasks from chat with one click (\"Save to Tasks\" on assistant messages).",
          "Statuses: todo → in-progress → done. Priorities: low / medium / high.",
        ],
      },
    ],
  },
  {
    id: "storyboard",
    title: "Storyboard tab",
    icon: Film,
    blurb: "Sequence the player journey beat by beat — from setup through endgame.",
    body: [
      {
        heading: "Why storyboard a board game",
        points: [
          "Helps you spot dead time, missing onboarding, or lopsided endgame tension.",
          "Pairs naturally with the Simulator for pacing analysis.",
        ],
      },
    ],
  },
  {
    id: "balance",
    title: "Balance tab",
    icon: BarChart3,
    blurb: "Visualize numerical balance across entities and rules.",
    body: [
      {
        heading: "What gets charted",
        points: [
          "Cost-vs-power curves, frequency of category usage, expected value of each entity.",
          "Use it after Simulator runs to confirm your hunches.",
        ],
      },
    ],
  },
  {
    id: "exports",
    title: "Exports tab",
    icon: Download,
    blurb: "Generate printable rulebooks, PnP assets, and Kickstarter pitch decks.",
    body: [
      {
        heading: "Outputs",
        points: [
          "Markdown rulebook with categorized rules and entity glossary.",
          "Gamma-powered Kickstarter deck (needs a Gamma API key in your account).",
        ],
      },
    ],
  },
  {
    id: "chat",
    title: "Chat panel",
    icon: MessageSquare,
    blurb: "Your AI co-designer, always one panel away.",
    body: [
      {
        heading: "Multi-provider routing",
        points: [
          "Switch between Claude, GPT, Gemini, and Grok from the model dropdown.",
          "Each provider has different strengths — Claude for long structured outputs, Gemini for fast brainstorming, GPT for crisp writing.",
        ],
      },
      {
        heading: "Per-message actions",
        points: [
          "Hover any assistant reply for Save-to-Notes / Save-to-Tasks buttons.",
          "Collapse the panel via the chevrons in the header — state persists across reloads.",
        ],
      },
    ],
  },
  {
    id: "ai-providers",
    title: "AI Providers (admin)",
    icon: KeyRound,
    blurb: "Workspace-level controls for which AI providers your team can use.",
    body: [
      {
        heading: "Disable providers",
        points: [
          "Switch any provider off and members of the workspace can no longer route to it.",
          "Useful when your org has policy or cost constraints.",
        ],
      },
      {
        heading: "BYOK (Bring Your Own Key)",
        points: [
          "Paste your own provider API key — encrypted at rest with AES-256-GCM.",
          "All AI calls from this workspace then use your key, not the platform default.",
        ],
      },
    ],
    tips: ["Only owners and admins of the workspace see the AI Providers menu item."],
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

            {chapter.tips && chapter.tips.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                  <Wand2 className="h-3 w-3" /> Pro tips
                </h4>
                <ul className="space-y-1.5">
                  {chapter.tips.map((t, i) => (
                    <li key={i} className="text-sm text-amber-100/90 flex gap-2">
                      <span className="text-amber-400">›</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

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
