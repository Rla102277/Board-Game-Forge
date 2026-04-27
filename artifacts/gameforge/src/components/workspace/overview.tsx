import { useEffect, useRef, useState } from "react";
import { useGetProject, useUpdateProject, useGetProjectStats, getGetProjectStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { AiEditTextarea } from "@/components/workspace/ai-edit-textarea";
import {
  LayoutDashboard, Activity, Users, FileText, CheckSquare, MessageSquare,
  Zap, Sparkles, Settings, MessageCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface OverviewProps {
  projectId: number;
  onPromptSend: (prompt: string) => void;
}

const QUICK_QUESTIONS = [
  "What are the biggest design risks in this game?",
  "How can I improve player interaction?",
  "What rules might conflict with each other?",
  "Suggest a unique mechanic based on my entities",
  "How does the complexity compare to similar games?",
];

const QUICK_PROMPTS = [
  "Brainstorm core mechanics for this genre.",
  "Suggest 5 unique player roles.",
  "Draft a quick summary of the rulebook.",
  "What are some interesting twists for the endgame?",
];

export function Overview({ projectId, onPromptSend }: OverviewProps) {
  const queryClient = useQueryClient();
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats, isLoading: statsLoading } = useGetProjectStats(projectId);
  const updateProject = useUpdateProject();

  const [formData, setFormData] = useState({
    name: "", description: "", gameType: "", genre: "", playerCount: "", targetDuration: "",
  });

  const debouncedName = useDebounce(formData.name, 1000);
  const debouncedDesc = useDebounce(formData.description, 1000);
  const debouncedType = useDebounce(formData.gameType, 1000);
  const debouncedGenre = useDebounce(formData.genre, 1000);
  const debouncedPlayers = useDebounce(formData.playerCount, 1000);
  const debouncedDuration = useDebounce(formData.targetDuration, 1000);

  const initRef = useRef(false);
  const lastSavedRef = useRef({ ...formData });

  useEffect(() => {
    if (project && !initRef.current) {
      const initialData = {
        name: project.name || "",
        description: project.description || "",
        gameType: project.gameType || "",
        genre: project.genre || "",
        playerCount: project.playerCount || "",
        targetDuration: project.targetDuration || "",
      };
      setFormData(initialData);
      lastSavedRef.current = initialData;
      initRef.current = true;
    }
  }, [project]);

  useEffect(() => {
    if (!initRef.current) return;

    const currentData = {
      name: debouncedName,
      description: debouncedDesc,
      gameType: debouncedType,
      genre: debouncedGenre,
      playerCount: debouncedPlayers,
      targetDuration: debouncedDuration,
    };

    const hasChanged = Object.keys(currentData).some(
      (key) => currentData[key as keyof typeof currentData] !== lastSavedRef.current[key as keyof typeof lastSavedRef.current],
    );

    if (hasChanged && currentData.name) {
      updateProject.mutate({ projectId, data: currentData });
      lastSavedRef.current = currentData;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, debouncedDesc, debouncedType, debouncedGenre, debouncedPlayers, debouncedDuration, projectId]);

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const STATS = [
    { label: "Entities", count: stats?.entityCount, icon: LayoutDashboard, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Rules", count: stats?.ruleCount, icon: Activity, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Players", count: stats?.playerCount, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Notes", count: stats?.noteCount, icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Tasks", count: stats?.taskCount, icon: CheckSquare, color: "text-rose-400", bg: "bg-rose-500/10" },
    { label: "Messages", count: stats?.chatMessageCount, icon: MessageSquare, color: "text-sky-400", bg: "bg-sky-500/10" },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* AI Design Advisor — Quick Questions */}
      <Card className="bg-card border-border border-blue-500/20">
        <CardHeader className="border-b border-border py-4 px-5 flex-row items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              AI Design Advisor
              <span className="text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">QUICK START</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Tap a question to send it to the chat panel — your AI co-designer will reply on the right.</p>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <p className="text-xs text-muted-foreground mb-2.5 font-medium">Quick questions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => onPromptSend(q)}
                data-testid={`overview-quick-q-${i}`}
                className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg px-2.5 py-1.5 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Project at a glance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATS.map((stat, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-8 w-8 rounded-md ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="text-2xl font-bold leading-none">{stat.count || 0}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metadata */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-4 w-4 text-primary" /> Project metadata
              </CardTitle>
              <CardDescription>Changes save automatically — these fields seed every AI prompt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  data-testid="overview-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <AiEditTextarea
                  projectId={projectId}
                  value={formData.description}
                  onChange={(next) => setFormData((prev) => ({ ...prev, description: next }))}
                  placeholder="A one-paragraph elevator pitch for your game…"
                  rows={4}
                  className="min-h-[100px]"
                  contextLabel="project description"
                  testId="overview-desc"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gameType">Game type</Label>
                  <Input
                    id="gameType"
                    placeholder="e.g. Strategy, Party, Worker placement"
                    value={formData.gameType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gameType: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    placeholder="e.g. Fantasy, Sci-fi, Historical"
                    value={formData.genre}
                    onChange={(e) => setFormData((prev) => ({ ...prev, genre: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerCount">Player count</Label>
                  <Input
                    id="playerCount"
                    placeholder="e.g. 2-5"
                    value={formData.playerCount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, playerCount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDuration">Target duration</Label>
                  <Input
                    id="targetDuration"
                    placeholder="e.g. 45–90 min"
                    value={formData.targetDuration}
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetDuration: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Quick Actions */}
        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary text-base">
                <Zap className="h-4 w-4" /> AI Quick Actions
              </CardTitle>
              <CardDescription>One-click brainstorming prompts.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 whitespace-normal border-primary/20 hover:border-primary/50 hover:bg-primary/10"
                  onClick={() => onPromptSend(prompt)}
                  data-testid={`overview-quick-action-${i}`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mr-2" />
                  <span className="text-sm">{prompt}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
