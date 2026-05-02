import { useState } from "react";
import { useRunDesignAdvisor, type DesignAdvisorResponse } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Target,
  Clock,
  ArrowRight,
  Lightbulb,
  Trophy,
  RefreshCw,
} from "lucide-react";

interface DesignAdvisorProps {
  projectId: number;
}

const PRIORITY_CONFIG = {
  high: {
    Icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-300 border-red-500/40",
  },
  medium: {
    Icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  low: {
    Icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
} as const;

export function DesignAdvisorButton({ projectId }: DesignAdvisorProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<DesignAdvisorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runAdvisor = useRunDesignAdvisor();

  const isLoading = runAdvisor.isPending;

  const runAnalysis = async () => {
    setError(null);
    try {
      const data = await runAdvisor.mutateAsync({ projectId });
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("providerDisabled") || msg.includes("503")) {
        setError("AI provider is not configured. Set up an AI provider in your workspace settings to use Design Advisor.");
      } else {
        setError(msg);
      }
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!result && !isLoading) {
      runAnalysis();
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        data-testid="design-advisor-btn"
        className="w-full group relative overflow-hidden rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-3.5 text-left transition-all hover:border-primary/60 hover:shadow-md hover:shadow-primary/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Design Advisor</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              AI analyzes your rules, components, balance, and playtests — then gives you a prioritized action plan
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Design Advisor
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  AI-powered analysis of your entire game design
                </DialogDescription>
              </div>
              {result && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={runAnalysis}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                  Re-analyze
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-5">
              {isLoading && !result && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Analyzing your game design...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reading rules, components, feedback, and balance data
                    </p>
                  </div>
                </div>
              )}

              {error && !result && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div className="text-center max-w-sm">
                    <p className="text-sm font-medium text-destructive">Analysis failed</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={runAnalysis} disabled={isLoading}>
                    Try again
                  </Button>
                </div>
              )}

              {result && (
                <>
                  {/* Strengths */}
                  {result.strengths.length > 0 && (
                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <ul className="space-y-1.5">
                          {result.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Issues */}
                  {result.issues.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" /> Issues Found
                      </h3>
                      <div className="space-y-2">
                        {result.issues.map((issue, i) => {
                          const cfg = PRIORITY_CONFIG[issue.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
                          const PIcon = cfg.Icon;
                          return (
                            <div
                              key={i}
                              className={`rounded-lg border p-3 ${cfg.border} ${cfg.bg}`}
                            >
                              <div className="flex items-start gap-2">
                                <PIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold">{issue.title}</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1.5 py-0 h-4 ${cfg.badge}`}
                                    >
                                      {issue.priority}
                                    </Badge>
                                    {issue.estimatedHours != null && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" />
                                        ~{issue.estimatedHours}h
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {issue.description}
                                  </p>
                                  {issue.suggestedTab && (
                                    <span className="text-[10px] text-primary/70 mt-1 inline-flex items-center gap-0.5">
                                      <ArrowRight className="h-2.5 w-2.5" />
                                      Work on this in: {issue.suggestedTab}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Lightbulb className="h-3 w-3" /> Recommendations
                      </h3>
                      <div className="space-y-1.5">
                        {result.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-lg border border-border p-3 bg-card/50 hover:bg-card transition-colors"
                          >
                            <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                              {rec.priority}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{rec.action}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                {rec.why}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {rec.hoursNeeded != null && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    ~{rec.hoursNeeded}h
                                  </span>
                                )}
                                {rec.suggestedTab && (
                                  <span className="text-[10px] text-primary/70 flex items-center gap-0.5">
                                    <ArrowRight className="h-2.5 w-2.5" />
                                    {rec.suggestedTab}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Milestone */}
                  {result.nextMilestone && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-primary" />
                          Next Milestone: {result.nextMilestone.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">{result.nextMilestone.progressPercentage}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-700"
                              style={{ width: `${result.nextMilestone.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                        {result.nextMilestone.requirements.length > 0 && (
                          <ul className="space-y-1">
                            {result.nextMilestone.requirements.map((req, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs">
                                <Target className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {isLoading && (
                    <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Re-analyzing...
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
