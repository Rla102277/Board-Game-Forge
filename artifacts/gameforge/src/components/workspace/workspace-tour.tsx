import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layout, Gamepad2, BookOpen, CheckSquare, FileText, ClipboardList,
  ImageIcon, Users, Activity, Clock, Dice5,
  Scale, EyeOff, Download, MessageSquare,
  X, ChevronRight, ChevronLeft, Sparkles, GraduationCap, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  id: string;
  group: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    group: "Welcome",
    title: "Welcome to your Game Studio",
    description: "This is your workspace — everything you need to design, test, and publish a board game. Let me show you around.",
    icon: Rocket,
    color: "text-primary",
  },
  {
    id: "overview",
    group: "Foundation",
    title: "Game Dashboard",
    description: "Your command center. See project health, balance scores, design phase progress, and get AI-powered design advice — all at a glance.",
    icon: Layout,
    color: "text-blue-400",
  },
  {
    id: "identity",
    group: "Foundation",
    title: "Game Identity",
    description: "Define what your game is: player count, play time, complexity, theme, mechanics, and your elevator pitch. This shapes everything else.",
    icon: Gamepad2,
    color: "text-violet-400",
  },
  {
    id: "research",
    group: "Foundation",
    title: "Research",
    description: "Study reference games. Track what to borrow, what to avoid, and collect inspiration for your design.",
    icon: BookOpen,
    color: "text-amber-400",
  },
  {
    id: "tasks",
    group: "Tasks & Tracking",
    title: "Tasks",
    description: "Full project management — assign tasks, set priorities, track dependencies, and manage your design workflow like a pro.",
    icon: CheckSquare,
    color: "text-rose-400",
  },
  {
    id: "notes",
    group: "Tasks & Tracking",
    title: "Notes",
    description: "Freeform design notes for ideas, brainstorms, and anything that doesn't fit elsewhere. AI can help you refine your writing.",
    icon: FileText,
    color: "text-amber-400",
  },
  {
    id: "playtest-reports",
    group: "Tasks & Tracking",
    title: "Playtest Reports",
    description: "Log structured playtest results — who attended, what worked, what broke. Action items convert directly into tasks.",
    icon: ClipboardList,
    color: "text-emerald-400",
  },
  {
    id: "assets-entities",
    group: "Workshop",
    title: "Components",
    description: "The heart of your game. Create cards, dice, tokens, tiles, and more. Use Card Studio for decks, Die Face Designer for custom dice, and AI to generate batches.",
    icon: ImageIcon,
    color: "text-blue-400",
  },
  {
    id: "players",
    group: "Workshop",
    title: "Players",
    description: "Define player archetypes — their roles, strategies, motivations, and relationships. See how players interact on the relationship graph.",
    icon: Users,
    color: "text-emerald-400",
  },
  {
    id: "rules",
    group: "Rules & Flow",
    title: "Rules",
    description: "Write and organize your game rules by category. AI can enhance rules with edge cases and design notes.",
    icon: Activity,
    color: "text-violet-400",
  },
  {
    id: "rulebook",
    group: "Rules & Flow",
    title: "Rulebook",
    description: "Auto-generate a structured rulebook from your rules, components, and players. Edit and refine it into a publishable document.",
    icon: BookOpen,
    color: "text-violet-400",
  },
  {
    id: "turn-structure",
    group: "Rules & Flow",
    title: "Turn Structure",
    description: "Visually design your turn flow — phases, steps, and timing. See how a round plays out from start to finish.",
    icon: Clock,
    color: "text-violet-400",
  },
  {
    id: "simulator",
    group: "Simulation",
    title: "Simulator",
    description: "Run Monte Carlo simulations to stress-test your economy. AI Playthroughs narrate full games between your player archetypes.",
    icon: Dice5,
    color: "text-sky-400",
  },
  {
    id: "balance",
    group: "Simulation",
    title: "Balance",
    description: "See your balance score, stat distributions, and find overpowered or underpowered components. AI generates a full balance report.",
    icon: Scale,
    color: "text-sky-400",
  },
  {
    id: "playtesting",
    group: "Playtesting",
    title: "Playtesting",
    description: "Log playtest sessions and share a public feedback link with testers. Collect fun, balance, and clarity scores from real players.",
    icon: Users,
    color: "text-green-400",
  },
  {
    id: "blind-playtest",
    group: "Playtesting",
    title: "Blind Test",
    description: "Run blind playtests — where testers play without you. Set up comprehension checks and friction logs to find clarity issues.",
    icon: EyeOff,
    color: "text-green-400",
  },
  {
    id: "export",
    group: "Publish",
    title: "Exports",
    description: "Export to Tabletop Simulator, generate rulebook PDFs, Kickstarter campaigns, sell sheets, and print-ready card sheets.",
    icon: Download,
    color: "text-orange-400",
  },
  {
    id: "team",
    group: "Team",
    title: "Comments, Activity & Members",
    description: "Collaborate with your team. Leave comments on any element, track all changes in the activity feed, and manage project members.",
    icon: MessageSquare,
    color: "text-pink-400",
  },
  {
    id: "chat",
    group: "AI",
    title: "AI Co-Designer",
    description: "The chat panel on the right is your AI partner. It adapts to whatever tab you're on — ask it about rules, balance, components, or anything else.",
    icon: Sparkles,
    color: "text-primary",
  },
  {
    id: "finish",
    group: "Ready!",
    title: "You're all set!",
    description: "Start with the Dashboard, define your Game Identity, then build out components and rules. The AI is always here to help. You can revisit this tour anytime from the sidebar.",
    icon: GraduationCap,
    color: "text-primary",
  },
];

interface WorkspaceTourProps {
  onNavigate: (sectionId: string) => void;
  onComplete: () => void;
  onDismiss: () => void;
}

const NAV_IDS = new Set(["overview","identity","research","tasks","notes","playtest-reports","assets-entities","players","rules","rulebook","turn-structure","simulator","balance","playtesting","blind-playtest","export","comments","activity","members"]);

function navigateForStep(s: TourStep, onNavigate: (id: string) => void) {
  if (s.id === "team") { onNavigate("comments"); return; }
  if (NAV_IDS.has(s.id)) onNavigate(s.id);
}

export function WorkspaceTour({ onNavigate, onComplete, onDismiss }: WorkspaceTourProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const current = TOUR_STEPS[step]!;
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  const goNext = useCallback(() => {
    if (isLast) { onComplete(); return; }
    setDirection(1);
    navigateForStep(TOUR_STEPS[step + 1]!, onNavigate);
    setStep(step + 1);
  }, [step, isLast, onNavigate, onComplete]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    navigateForStep(TOUR_STEPS[step - 1]!, onNavigate);
    setStep(step - 1);
  }, [step, isFirst, onNavigate]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => { previousFocusRef.current?.focus(); };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onDismiss(); return; }
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); goNext(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); return; }

      if (e.key === "Tab") {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onDismiss]);

  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace tour"
        aria-describedby="tour-step-description"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-md mx-4 outline-none"
      >
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="h-1 bg-muted" aria-hidden="true">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {current.group}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground" aria-live="polite">
                {step + 1} / {TOUR_STEPS.length}
              </span>
              <button
                onClick={onDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Skip tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-6 min-h-[180px] flex flex-col">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${current.color}`} aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold" id="tour-step-title">{current.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed" id="tour-step-description">
                  {current.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-6 pb-5 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={goPrev}
              disabled={isFirst}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>

            <div className="flex gap-1" aria-hidden="true">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step ? "w-4 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            <Button
              size="sm"
              className="text-xs gap-1"
              onClick={isLast ? onComplete : goNext}
            >
              {isLast ? "Start designing!" : "Next"}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface TourTriggerProps {
  onClick: () => void;
}

export function TourTriggerButton({ onClick }: TourTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
    >
      <GraduationCap className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">Workspace Tour</span>
    </button>
  );
}
