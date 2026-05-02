import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layout,
  ImageIcon, Users, Activity,
  Download,
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

// Focused 7-step tour: a 60-second orientation, not a feature inventory.
// Every other tab is one click away from the sidebar; the tour just shows
// the spine of the design loop.
const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    group: "Welcome",
    title: "Welcome to your Game Studio",
    description: "This is your workspace for designing, testing, and publishing a board game. A quick 60-second tour — then you're off.",
    icon: Rocket,
    color: "text-primary",
  },
  {
    id: "overview",
    group: "Start here",
    title: "Game Dashboard",
    description: "Your command center. Project health, balance score, design-phase progress, and AI-powered design advice in one place.",
    icon: Layout,
    color: "text-blue-400",
  },
  {
    id: "assets-entities",
    group: "Build",
    title: "Components",
    description: "Cards, dice, tokens, tiles, boards. Card Studio for decks, Die Face Designer for custom dice, AI to generate batches.",
    icon: ImageIcon,
    color: "text-blue-400",
  },
  {
    id: "rules",
    group: "Build",
    title: "Rules & Rulebook",
    description: "Write your rules by category. The Rulebook tab auto-assembles them — with components and players — into a publishable document.",
    icon: Activity,
    color: "text-violet-400",
  },
  {
    id: "playtesting",
    group: "Test",
    title: "Playtesting",
    description: "Log sessions, share a public feedback link, run blind playtests, and view structured reports. Real players → real fixes.",
    icon: Users,
    color: "text-green-400",
  },
  {
    id: "export",
    group: "Ship",
    title: "Exports & Publish",
    description: "Export to Tabletop Simulator, generate rulebook PDFs, Kickstarter campaigns, sell sheets, and print-ready card sheets.",
    icon: Download,
    color: "text-orange-400",
  },
  {
    id: "finish",
    group: "Ready!",
    title: "AI is on the right — always",
    description: "The chat panel adapts to whatever tab you're on. Ask it about rules, balance, components, or anything else. Re-open this tour from the sidebar anytime.",
    icon: Sparkles,
    color: "text-primary",
  },
];

interface WorkspaceTourProps {
  onNavigate: (sectionId: string) => void;
  onComplete: () => void;
  onDismiss: () => void;
}

// Sidebar section ids that the tour navigates to. Steps without an entry
// here (welcome, finish) don't change the active tab.
const NAV_IDS = new Set(["overview","assets-entities","rules","playtesting","export"]);

function navigateForStep(s: TourStep, onNavigate: (id: string) => void) {
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
