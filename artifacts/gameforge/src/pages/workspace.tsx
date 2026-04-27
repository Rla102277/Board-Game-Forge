import { useParams, Link } from "wouter";
import { useState } from "react";
import { useGetProject, useGetProjectStats, useDeleteProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import {
  Layout, Users, FileText, CheckSquare, ChevronLeft, Gamepad2, Activity, MoreVertical, Trash2,
  BookOpen, Network, Dice5, ImageIcon, MapPin, Scale, Download, User as UserIcon, LogOut, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

import { Overview } from "@/components/workspace/overview";
import { Research } from "@/components/workspace/research";
import { Ontology } from "@/components/workspace/ontology";
import { Entities } from "@/components/workspace/entities";
import { Players } from "@/components/workspace/players";
import { Rules } from "@/components/workspace/rules";
import { Simulator } from "@/components/workspace/simulator";
import { Assets } from "@/components/workspace/assets";
import { Playtesting } from "@/components/workspace/playtesting";
import { Notes } from "@/components/workspace/notes";
import { Tasks } from "@/components/workspace/tasks";
import { Balance } from "@/components/workspace/balance";
import { Storyboard } from "@/components/workspace/storyboard";
import { Exports } from "@/components/workspace/exports";
import { ChatPanel } from "@/components/workspace/chat-panel";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: Layout, statKey: null },
  { id: "research", label: "Research", icon: BookOpen, statKey: "researchCount" },
  { id: "ontology", label: "Ontology", icon: Network, statKey: "entityCount" },
  { id: "entities", label: "Entities", icon: Layout, statKey: "entityCount" },
  { id: "players", label: "Players", icon: Users, statKey: "playerCount" },
  { id: "rules", label: "Rules Sandbox", icon: Activity, statKey: "ruleCount" },
  { id: "simulator", label: "Simulator", icon: Dice5, statKey: null },
  { id: "assets", label: "Assets", icon: ImageIcon, statKey: "assetCount" },
  { id: "playtesting", label: "Playtesting", icon: Users, statKey: "playtestCount" },
  { id: "notes", label: "Notes", icon: FileText, statKey: "noteCount" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, statKey: "taskCount" },
  { id: "storyboard", label: "Storyboard", icon: MapPin, statKey: null },
  { id: "balance", label: "Balance", icon: Scale, statKey: null },
  { id: "export", label: "Export", icon: Download, statKey: null },
] as const;

export default function Workspace() {
  const queryClient = useQueryClient();
  const params = useParams();
  const { user } = useUser();
  const { signOut } = useClerk();
  const projectId = parseInt(params.projectId || "0", 10);
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const deleteProject = useDeleteProject();

  const [activeSection, setActiveSection] = useState<string>("overview");
  const [chatPrompt, setChatPrompt] = useState<string | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (projectLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground"><Skeleton className="h-32 w-64" /></div>;
  }
  if (!project) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">Project not found</div>;
  }

  const handleDeleteProject = async () => {
    await deleteProject.mutateAsync({ projectId });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    window.location.href = import.meta.env.BASE_URL;
  };

  const getSectionCount = (key: string | null): number | null => {
    if (!key || !stats) return null;
    const v = (stats as unknown as Record<string, unknown>)[key];
    return typeof v === "number" ? v : null;
  };

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <Overview projectId={projectId} onPromptSend={setChatPrompt} />;
      case "research": return <Research projectId={projectId} />;
      case "ontology": return <Ontology projectId={projectId} />;
      case "entities": return <Entities projectId={projectId} />;
      case "players": return <Players projectId={projectId} />;
      case "rules": return <Rules projectId={projectId} />;
      case "simulator": return <Simulator projectId={projectId} />;
      case "assets": return <Assets projectId={projectId} />;
      case "playtesting": return <Playtesting projectId={projectId} />;
      case "notes": return <Notes projectId={projectId} />;
      case "tasks": return <Tasks projectId={projectId} />;
      case "storyboard": return <Storyboard projectId={projectId} />;
      case "balance": return <Balance projectId={projectId} />;
      case "export": return <Exports projectId={projectId} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
      <div className="w-14 border-r border-border bg-sidebar flex flex-col items-center py-4 gap-3 shrink-0 z-10">
        <div className="bg-primary text-primary-foreground p-2 rounded-lg mb-2 shadow-lg">
          <Gamepad2 className="h-6 w-6" />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/" className="p-2.5 hover:bg-sidebar-accent rounded-md text-sidebar-foreground transition-colors group">
              <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Back to projects</TooltipContent>
        </Tooltip>

        <div className="mt-auto flex flex-col items-center gap-2 w-full pt-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full hover:ring-2 hover:ring-primary/40 transition-all">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="h-7 w-7 rounded-full" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">{(user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || "U").toUpperCase()}</div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem asChild><Link href="/account"><UserIcon className="h-4 w-4 mr-2" /> Account</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/admin"><Shield className="h-4 w-4 mr-2" /> Admin</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0 z-10">
        <div className="p-5 border-b border-border">
          <div className="flex justify-between items-start mb-2">
            <h1 className="font-bold text-lg leading-tight line-clamp-2 pr-2">{project.name}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-2 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.gameType && <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30">{project.gameType}</span>}
            {project.genre && <span className="text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border">{project.genre}</span>}
          </div>
        </div>

        <div className="flex-1 py-3 overflow-y-auto px-3 space-y-0.5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const count = getSectionCount(section.statKey);
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all ${isActive ? 'bg-primary/10 text-primary font-medium border border-primary/20' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground border border-transparent'}`}
              >
                <div className="flex items-center gap-3 text-sm">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {section.label}
                </div>
                {count !== null && (
                  <span className={`text-xs px-1.5 py-0 rounded-full ${isActive ? 'bg-primary/20 text-primary' : 'bg-background border border-border text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background min-w-0">
        <div className="h-12 border-b border-border flex items-center px-6 bg-card text-muted-foreground gap-2 shrink-0 text-sm">
          <span className="font-medium text-foreground">{project.name}</span>
          <span>/</span>
          <span className="text-primary">{SECTIONS.find(s => s.id === activeSection)?.label}</span>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {renderSection()}
        </div>
      </div>

      <ChatPanel projectId={projectId} defaultPrompt={chatPrompt} onPromptClear={() => setChatPrompt(undefined)} activeTab={activeSection} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
