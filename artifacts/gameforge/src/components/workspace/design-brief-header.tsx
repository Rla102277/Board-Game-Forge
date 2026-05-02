import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Compass, Users, Clock, Sparkles, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const STORAGE_KEY = "designBriefCollapsed";
const MOBILE_QUERY = "(max-width: 640px)";

const FINGERPRINT_AXES = ["luck", "strategy", "interaction", "complexity", "replayability"] as const;
type Axis = typeof FINGERPRINT_AXES[number];
type Fingerprint = Record<Axis, number>;

const AXIS_LABELS: Record<Axis, { high: string; low: string }> = {
  luck:          { high: "Lucky",       low: "Skill-driven" },
  strategy:      { high: "Strategic",   low: "Casual" },
  interaction:   { high: "Interactive", low: "Solo-focused" },
  complexity:    { high: "Complex",     low: "Streamlined" },
  replayability: { high: "Replayable",  low: "One-shot" },
};

const COMPLEXITY_TIER_LABELS: Record<string, string> = {
  filler: "Filler",
  light:  "Light",
  medium: "Medium",
  heavy:  "Heavy",
  expert: "Expert",
};

interface DesignBriefProject {
  gameType?: string | null;
  genre?: string | null;
  playerCount?: string | null;
  targetDuration?: string | null;
  description?: string | null;
  overviewMeta?: Record<string, unknown> | null;
  mechanicFingerprint?: Record<string, unknown> | null;
}

function castFingerprint(raw: Record<string, unknown> | null | undefined): Fingerprint {
  const defaults: Fingerprint = { luck: 3, strategy: 3, interaction: 3, complexity: 3, replayability: 3 };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const clamp = (v: unknown, fb: number) =>
    typeof v === "number" && v >= 1 && v <= 5 ? v : fb;
  const fp = raw as Record<string, unknown>;
  return {
    luck:          clamp(fp["luck"],          3),
    strategy:      clamp(fp["strategy"],      3),
    interaction:   clamp(fp["interaction"],   3),
    complexity:    clamp(fp["complexity"],    3),
    replayability: clamp(fp["replayability"], 3),
  };
}

function getComplexityTier(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)["complexityTier"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function prettifyTier(key: string): string {
  return COMPLEXITY_TIER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function fingerprintHighlights(fp: Fingerprint): string[] {
  const highs = FINGERPRINT_AXES
    .map((axis) => ({ axis, score: fp[axis] }))
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score);
  if (highs.length > 0) return highs.slice(0, 2).map((h) => AXIS_LABELS[h.axis].high);
  const lows = FINGERPRINT_AXES
    .map((axis) => ({ axis, score: fp[axis] }))
    .filter((x) => x.score <= 2)
    .sort((a, b) => a.score - b.score);
  if (lows.length > 0) return lows.slice(0, 1).map((l) => AXIS_LABELS[l.axis].low);
  return ["Balanced"];
}

export interface DesignBriefHeaderProps {
  project: DesignBriefProject;
}

export function DesignBriefHeader({ project }: DesignBriefHeaderProps) {
  // Default to expanded; client mount applies stored pref or mobile default.
  // This avoids any hydration-mismatch risk and matches Vite CSR behavior.
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const hydrated = useRef(false);

  useEffect(() => {
    let initial = false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") initial = true;
      else if (stored === "false") initial = false;
      else initial = window.matchMedia(MOBILE_QUERY).matches;
    } catch { /* ignore */ }
    setCollapsed(initial);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
    } catch { /* ignore */ }
  }, [collapsed]);

  const fingerprint = castFingerprint(project.mechanicFingerprint);
  const tierKey     = getComplexityTier(project.overviewMeta);
  const tierLabel   = tierKey ? prettifyTier(tierKey) : null;
  const highlights  = fingerprintHighlights(fingerprint);

  const summaryParts: string[] = [
    [project.playerCount, project.gameType].filter(Boolean).join(" "),
    project.targetDuration ?? "",
    project.genre ?? "",
    tierLabel ? `${tierLabel} weight` : "",
    highlights.length ? highlights.join(" / ") : "",
  ].filter(Boolean);

  const summary = summaryParts.length > 0
    ? summaryParts.join(" · ")
    : "Set up your design brief in the Game Identity tab";

  const toggle = () => setCollapsed((c) => !c);

  return (
    <div
      className="border-b border-border bg-card/80 backdrop-blur-sm shrink-0 z-[5] relative"
      data-testid="design-brief-header"
    >
      {/* Always-visible compact bar (1 line). */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm">
        <Compass className="h-3.5 w-3.5 text-primary shrink-0" />
        <div
          className="flex-1 min-w-0 truncate text-muted-foreground"
          title={summary}
          data-testid="design-brief-summary"
        >
          {summary}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={toggle}
              aria-label={collapsed ? "Expand design brief" : "Collapse design brief"}
              aria-expanded={!collapsed}
              aria-controls="design-brief-expanded-panel"
              data-testid="design-brief-toggle"
            >
              <motion.span
                animate={{ rotate: collapsed ? 0 : 180 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="inline-flex"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {collapsed ? "Expand design brief" : "Collapse design brief"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Expanded detail panel — animated height, no flicker. */}
      <motion.div
        id="design-brief-expanded-panel"
        initial={false}
        animate={{ height: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden"
        aria-hidden={collapsed}
      >
        <div
          className="px-4 sm:px-6 pb-3 pt-1 flex items-start gap-3 border-t border-border/40"
          data-testid="design-brief-expanded"
        >
          <div className="hidden sm:flex h-8 w-8 rounded-md bg-primary/10 text-primary items-center justify-center shrink-0 mt-0.5">
            <Compass className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-foreground">
              {project.playerCount && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.playerCount}
                </span>
              )}
              {project.gameType && (
                <span className="text-muted-foreground">{project.gameType}</span>
              )}
              {project.targetDuration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.targetDuration}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {project.genre && (
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {project.genre}
                </span>
              )}
              {tierLabel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <Gauge className="h-3 w-3" />
                  {tierLabel} weight
                </span>
              )}
              {highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30"
                >
                  <Sparkles className="h-3 w-3" />
                  {h}
                </span>
              ))}
              {!project.gameType && !project.genre && !project.playerCount && !project.targetDuration && !tierLabel && (
                <span className="text-muted-foreground italic">
                  Add gameType, players, duration, and genre in Game Identity to populate this brief.
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3 pt-0.5" aria-label="Mechanic fingerprint">
              {FINGERPRINT_AXES.map((axis) => (
                <Tooltip key={axis}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-default">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {axis.slice(0, 3)}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={`h-1.5 w-1.5 rounded-full ${
                              n <= fingerprint[axis] ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {axis}: {fingerprint[axis]}/5
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
