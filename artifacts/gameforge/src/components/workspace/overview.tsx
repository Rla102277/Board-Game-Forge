import { useState, useRef, useEffect } from "react";
import { useGetProject, useUpdateProject, useGetProjectStats, getGetProjectStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { Folder, LayoutDashboard, Activity, Users, FileText, CheckSquare, MessageSquare, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface OverviewProps {
  projectId: number;
  onPromptSend: (prompt: string) => void;
}

export function Overview({ projectId, onPromptSend }: OverviewProps) {
  const queryClient = useQueryClient();
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats, isLoading: statsLoading } = useGetProjectStats(projectId);
  const updateProject = useUpdateProject();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    gameType: "",
    genre: "",
    playerCount: "",
    targetDuration: ""
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
        targetDuration: project.targetDuration || ""
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
      targetDuration: debouncedDuration
    };

    const hasChanged = Object.keys(currentData).some(
      key => currentData[key as keyof typeof currentData] !== lastSavedRef.current[key as keyof typeof lastSavedRef.current]
    );

    if (hasChanged && currentData.name) {
      updateProject.mutate({
        projectId,
        data: currentData
      });
      lastSavedRef.current = currentData;
    }
  }, [debouncedName, debouncedDesc, debouncedType, debouncedGenre, debouncedPlayers, debouncedDuration, projectId, updateProject]);

  if (projectLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full"/><Skeleton className="h-64 w-full"/></div>;
  }

  const QUICK_PROMPTS = [
    "Brainstorm core mechanics for this genre.",
    "Suggest 5 unique player roles.",
    "Draft a quick summary of the rulebook.",
    "What are some interesting twists for the endgame?"
  ];

  return (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Entities", count: stats?.entityCount, icon: LayoutDashboard },
          { label: "Rules", count: stats?.ruleCount, icon: Activity },
          { label: "Players", count: stats?.playerCount, icon: Users },
          { label: "Notes", count: stats?.noteCount, icon: FileText },
          { label: "Tasks", count: stats?.taskCount, icon: CheckSquare },
          { label: "Messages", count: stats?.chatMessageCount, icon: MessageSquare }
        ].map((stat, i) => (
          <Card key={i} className="bg-card border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-6 w-12" /> : <div className="text-2xl font-bold">{stat.count || 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Metadata</CardTitle>
              <CardDescription>Changes save automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" className="min-h-[100px]" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gameType">Game Type</Label>
                  <Input id="gameType" value={formData.gameType} onChange={e => setFormData({ ...formData, gameType: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input id="genre" value={formData.genre} onChange={e => setFormData({ ...formData, genre: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerCount">Player Count</Label>
                  <Input id="playerCount" value={formData.playerCount} onChange={e => setFormData({ ...formData, playerCount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDuration">Target Duration</Label>
                  <Input id="targetDuration" value={formData.targetDuration} onChange={e => setFormData({ ...formData, targetDuration: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Zap className="h-5 w-5" /> AI Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  className="justify-start text-left h-auto py-3 px-4 whitespace-normal border-primary/20 hover:border-primary/50 hover:bg-primary/10"
                  onClick={() => onPromptSend(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
