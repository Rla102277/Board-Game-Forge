import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Info, TrendingUp, Target, Zap, Shield } from "lucide-react";
import { useState } from "react";

export interface DesignCritique {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  categories: {
    balance: { score: number; notes: string[] };
    clarity: { score: number; notes: string[] };
    engagement: { score: number; notes: string[] };
    innovation: { score: number; notes: string[] };
    completeness: { score: number; notes: string[] };
  };
  priorityActions: string[];
}

interface DesignCritiqueProps {
  projectId: number;
  critique?: DesignCritique;
  onAnalyze?: () => void;
  analyzing?: boolean;
}

export function DesignCritique({ projectId, critique, onAnalyze, analyzing }: DesignCritiqueProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "strengths" | "weaknesses" | "suggestions">("overview");

  if (!critique) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Design Critique
          </CardTitle>
          <CardDescription>
            Get AI-powered analysis of your game design with actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onAnalyze} disabled={analyzing} className="w-full">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Analyze Design
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categoryIcons = {
    balance: TrendingUp,
    clarity: Target,
    engagement: Zap,
    innovation: Sparkles,
    completeness: Shield,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Design Critique
            </div>
            <Button onClick={onAnalyze} disabled={analyzing} size="sm" variant="outline">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Re-analyze
            </Button>
          </CardTitle>
          <CardDescription>
            AI-powered analysis of your game design with actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Overall Score */}
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(critique.overallScore)}`}>
                {critique.overallScore}
              </div>
              <div className="text-sm text-muted-foreground mt-2">Overall Design Score</div>
              <Progress value={critique.overallScore} className="w-48 mx-auto mt-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Category Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(critique.categories).map(([key, data]) => {
            const Icon = categoryIcons[key as keyof typeof categoryIcons];
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">{key}</span>
                  </div>
                  <span className={`font-semibold ${getScoreColor(data.score)}`}>{data.score}%</span>
                </div>
                <Progress value={data.score} className={`h-2 ${getScoreBg(data.score)}`} />
                {data.notes.length > 0 && (
                  <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                    {data.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Priority Actions */}
      {critique.priorityActions.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {critique.priorityActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed analysis */}
      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === "overview" ? "default" : "ghost"}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </Button>
            <Button
              size="sm"
              variant={activeTab === "strengths" ? "default" : "ghost"}
              onClick={() => setActiveTab("strengths")}
            >
              Strengths ({critique.strengths.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "weaknesses" ? "default" : "ghost"}
              onClick={() => setActiveTab("weaknesses")}
            >
              Weaknesses ({critique.weaknesses.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "suggestions" ? "default" : "ghost"}
              onClick={() => setActiveTab("suggestions")}
            >
              Suggestions ({critique.suggestions.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Strengths
                </h4>
                <ul className="space-y-1 text-sm">
                  {critique.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Weaknesses
                </h4>
                <ul className="space-y-1 text-sm">
                  {critique.weaknesses.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === "strengths" && (
            <ul className="space-y-2">
              {critique.strengths.map((item, i) => (
                <li key={i} className="flex items-start gap-2 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          )}
          
          {activeTab === "weaknesses" && (
            <ul className="space-y-2">
              {critique.weaknesses.map((item, i) => (
                <li key={i} className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          )}
          
          {activeTab === "suggestions" && (
            <ul className="space-y-2">
              {critique.suggestions.map((item, i) => (
                <li key={i} className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
