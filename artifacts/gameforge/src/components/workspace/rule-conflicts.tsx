import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

export interface Conflict {
  id: string;
  severity: "critical" | "warning" | "info";
  type: "contradiction" | "ambiguity" | "edge_case" | "balance";
  rule1Title: string;
  rule2Title?: string;
  description: string;
  suggestion?: string;
  resolved: boolean;
}

interface RuleConflictsProps {
  conflicts: Conflict[];
  onResolve?: (conflictId: string) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
}

export function RuleConflicts({ conflicts, onResolve, onAnalyze, analyzing }: RuleConflictsProps) {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredConflicts = conflicts.filter(c => 
    filter === "all" || c.severity === filter
  );

  const severityCount = {
    critical: conflicts.filter(c => c.severity === "critical").length,
    warning: conflicts.filter(c => c.severity === "warning").length,
    info: conflicts.filter(c => c.severity === "info").length,
  };

  const severityConfig = {
    critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
    warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    info: { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Rule Conflicts</h3>
          <Badge variant="secondary">{conflicts.length} total</Badge>
        </div>
        <Button onClick={onAnalyze} disabled={analyzing} size="sm" variant="outline">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Analyze Rules
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({conflicts.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "critical" ? "default" : "outline"}
          onClick={() => setFilter("critical")}
          className={filter === "critical" ? "bg-destructive" : ""}
        >
          Critical ({severityCount.critical})
        </Button>
        <Button
          size="sm"
          variant={filter === "warning" ? "default" : "outline"}
          onClick={() => setFilter("warning")}
        >
          Warning ({severityCount.warning})
        </Button>
        <Button
          size="sm"
          variant={filter === "info" ? "default" : "outline"}
          onClick={() => setFilter("info")}
        >
          Info ({severityCount.info})
        </Button>
      </div>

      {/* Conflicts list */}
      <div className="space-y-3">
        {filteredConflicts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No conflicts found. Your rules appear to be consistent.
            </CardContent>
          </Card>
        ) : (
          filteredConflicts.map((conflict) => {
            const config = severityConfig[conflict.severity];
            const Icon = config.icon;
            const isExpanded = expandedId === conflict.id;

            return (
              <Card
                key={conflict.id}
                className={`border ${config.border} ${conflict.resolved ? "opacity-50" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${config.bg} mt-0.5`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {conflict.type === "contradiction" && "Contradiction"}
                          {conflict.type === "ambiguity" && "Ambiguity"}
                          {conflict.type === "edge_case" && "Edge Case"}
                          {conflict.type === "balance" && "Balance Issue"}
                          <Badge variant="outline" className="text-[10px]">
                            {conflict.severity}
                          </Badge>
                          {conflict.resolved && (
                            <Badge variant="secondary" className="text-[10px]">
                              Resolved
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {conflict.rule1Title}
                          {conflict.rule2Title && ` ↔ ${conflict.rule2Title}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : conflict.id)}
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </Button>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <div>
                      <p className="text-sm">{conflict.description}</p>
                    </div>
                    
                    {conflict.suggestion && (
                      <div className={`p-3 rounded-lg ${config.bg}`}>
                        <p className="text-sm font-medium mb-1">Suggestion:</p>
                        <p className="text-sm text-muted-foreground">{conflict.suggestion}</p>
                      </div>
                    )}
                    
                    {!conflict.resolved && onResolve && (
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => onResolve(conflict.id)}>
                          Mark as Resolved
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
