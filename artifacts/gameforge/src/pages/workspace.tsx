import { useParams, Link } from "wouter";
import { useState, useMemo, lazy, Suspense } from "react";
import { useGetProject, useGetProjectStats, useDeleteProject, useUpdateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import {
  Layout, Users, FileText, CheckSquare, ChevronLeft, Gamepad2, Activity, MoreVertical, Trash2,
  BookOpen, Network, Dice5, ImageIcon, MapPin, Scale, Download, User as UserIcon, LogOut, Shield, GraduationCap,
  MessageSquare, History, Share2, Clock, BarChart3, EyeOff, Grid3X3, TrendingUp, ChevronRight, Pencil, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Lazy load workspace components for code splitting
const Overview = lazy(() => import("@/components/workspace/overview").then(m => ({ default: m.Overview })));
const Research = lazy(() => import("@/components/workspace/research").then(m => ({ default: m.Research })));
const Ontology = lazy(() => import("@/components/workspace/ontology").then(m => ({ default: m.Ontology })));
const AssetsEntities = lazy(() => import("@/components/workspace/assets-entities").then(m => ({ default: m.AssetsEntities })));
const Players = lazy(() => import("@/components/workspace/players").then(m => ({ default: m.Players })));
const Rules = lazy(() => import("@/components/workspace/rules").then(m => ({ default: m.Rules })));
const Simulator = lazy(() => import("@/components/workspace/simulator").then(m => ({ default: m.Simulator })));
const Playtesting = lazy(() => import("@/components/workspace/playtesting").then(m => ({ default: m.Playtesting })));
const Notes = lazy(() => import("@/components/workspace/notes").then(m => ({ default: m.Notes })));
const Tasks = lazy(() => import("@/components/workspace/tasks").then(m => ({ default: m.Tasks })));
const Balance = lazy(() => import("@/components/workspace/balance").then(m => ({ default: m.Balance })));
const DesignPipeline = lazy(() => import("@/components/workspace/design-pipeline").then(m => ({ default: m.DesignPipeline })));
const Exports = lazy(() => import("@/components/workspace/exports").then(m => ({ default: m.Exports })));
const MembersDirectory = lazy(() => import("@/components/workspace/members-directory").then(m => ({ default: m.MembersDirectory })));
const ChatPanel = lazy(() => import("@/components/workspace/chat-panel").then(m => ({ default: m.ChatPanel })));
const TurnStructure = lazy(() => import("@/components/workspace/turn-structure").then(m => ({ default: m.TurnStructureVisualizer })));
const ScalingMatrix = lazy(() => import("@/components/workspace/scaling-matrix").then(m => ({ default: m.ScalingMatrixVisualizer })));
const BlindPlaytest = lazy(() => import("@/components/workspace/blind-playtest").then(m => ({ default: m.BlindPlaytestFramework })));
const PlaytestReports = lazy(() => import("@/components/workspace/playtest-reports").then(m => ({ default: m.PlaytestReports })));
const RulebookEditor = lazy(() => import("@/components/workspace/rulebook-editor").then(m => ({ default: m.RulebookEditor })));
const LayoutEditor = lazy(() => import("@/components/workspace/layout-editor").then(m => ({ default: m.LayoutEditor })));
const ScoringCurve = lazy(() => import("@/components/workspace/scoring-curve").then(m => ({ default: m.ScoringCurve })));
const CollaborationPresence = lazy(() => import("@/components/collaboration/cursor-indicators").then(m => ({ default: m.CollaborationPresence })));
const CursorIndicators = lazy(() => import("@/components/collaboration/cursor-indicators").then(m => ({ default: m.CursorIndicators })));
const PresenceAvatars = lazy(() => import("@/components/collaboration/presence-avatars").then(m => ({ default: m.PresenceAvatars })));
const ActivityFeed = lazy(() => import("@/components/collaboration/activity-feed").then(m => ({ default: m.ActivityFeed })));
const CommentsPanel = lazy(() => import("@/components/collaboration/comments-panel").then(m => ({ default: m.CommentsPanel })));
const VersionHistory = lazy(() => import("@/components/collaboration/version-history").then(m => ({ default: m.VersionHistory })));
const ShareDialog = lazy(() => import("@/components/collaboration/share-dialog").then(m => ({ default: m.ShareDialog })));
const NotificationBell = lazy(() => import("@/components/collaboration/notification-bell").then(m => ({ default: m.NotificationBell })));

const NAV_GROUPS = [
  {
    label: "Foundation",
    defaultOpen: true,
    items: [
      { id: "overview",       label: "Game Dashboard",  icon: Layout,       statKey: null,             shortcut: "1" },
      { id: "identity",       label: "Game Identity",   icon: Gamepad2,     statKey: null,             shortcut: null },
      { id: "research",       label: "Research",         icon: BookOpen,     statKey: "researchCount",  shortcut: "2" },
    ],
  },
  {
    label: "Tasks & Tracking",
    defaultOpen: true,
    items: [
      { id: "tasks",          label: "Tasks",            icon: CheckSquare,  statKey: "taskCount",      shortcut: "t" },
      { id: "notes",          label: "Notes",            icon: FileText,     statKey: "noteCount",      shortcut: null },
      { id: "playtest-reports", label: "Playtest Reports", icon: ClipboardList, statKey: "playtestReportCount", shortcut: null },
    ],
  },
  {
    label: "Workshop",
    defaultOpen: true,
    items: [
      { id: "assets-entities", label: "Components",     icon: ImageIcon,    statKey: "assetCount",     shortcut: "4" },
      { id: "players",        label: "Players",          icon: Users,        statKey: "playerCount",    shortcut: "3" },
    ],
  },
  {
    label: "Rules & Flow",
    defaultOpen: true,
    items: [
      { id: "rules",          label: "Rules",            icon: Activity,     statKey: "ruleCount",      shortcut: "5" },
      { id: "rulebook",       label: "Rulebook",         icon: BookOpen,     statKey: null,             shortcut: null },
      { id: "turn-structure", label: "Turn Structure",   icon: Clock,        statKey: null,             shortcut: null },
      { id: "layout",         label: "Layout",           icon: Grid3X3,      statKey: null,             shortcut: null },
    ],
  },
  {
    label: "Simulation",
    defaultOpen: false,
    items: [
      { id: "simulator",      label: "Simulator",        icon: Dice5,        statKey: null,             shortcut: "6" },
      { id: "scaling",        label: "Scaling",          icon: BarChart3,    statKey: null,             shortcut: null },
      { id: "scoring-curve",  label: "Scoring Curve",    icon: TrendingUp,   statKey: null,             shortcut: null },
      { id: "balance",        label: "Balance",          icon: Scale,        statKey: null,             shortcut: null },
    ],
  },
  {
    label: "Playtesting",
    defaultOpen: false,
    items: [
      { id: "playtesting",    label: "Playtesting",      icon: Users,        statKey: "playtestCount",  shortcut: "7" },
      { id: "blind-playtest", label: "Blind Test",       icon: EyeOff,       statKey: null,             shortcut: null },
    ],
  },
  {
    label: "Publish",
    defaultOpen: false,
    items: [
      { id: "export",         label: "Exports",          icon: Download,     statKey: null,             shortcut: "8" },
      { id: "design-pipeline",label: "Design Pipeline",  icon: MapPin,       statKey: null,             shortcut: null },
    ],
  },
  {
    label: "Team",
    defaultOpen: true,
    items: [
      { id: "comments",       label: "Comments",         icon: MessageSquare,statKey: null,             shortcut: null },
      { id: "activity",       label: "Activity",         icon: History,      statKey: null,             shortcut: null },
      { id: "members",        label: "Members",          icon: Users,        statKey: null,             shortcut: null },
    ],
  },
] as const;

const ALL_SECTION_LABELS: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap(g => g.items.map(i => [i.id, i.label]))
);

export default function Workspace({ projectId: projectIdProp }: { projectId?: number } = {}) {
  const queryClient = useQueryClient();
  const params = useParams();
  const { user } = useUser();
  const { signOut } = useClerk();
  const projectId = useMemo(
    () => projectIdProp ?? parseInt(params.projectId || "0", 10),
    [projectIdProp, params.projectId],
  );
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();

  const [activeSection, setActiveSection] = useState<string>("overview");
  const [chatPrompt, setChatPrompt] = useState<string | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map(g => [g.label, g.defaultOpen]))
  );
  const toggleGroup = (label: string) => setOpenGroups(g => ({ ...g, [label]: !g[label] }));

  // Keyboard shortcuts
  useKeyboardShortcuts({
    quickActions: () => setChatPrompt(""),
    search: () => {
      // Focus on search if available, or show search UI
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    },
    escape: () => {
      setIsDeleteDialogOpen(false);
      setIsShareDialogOpen(false);
      setIsRenameDialogOpen(false);
    },
    nav1: () => setActiveSection("overview"),
    nav2: () => setActiveSection("identity"),
    nav3: () => setActiveSection("research"),
    nav4: () => setActiveSection("players"),
    nav5: () => setActiveSection("assets-entities"),
    nav6: () => setActiveSection("rules"),
    nav7: () => setActiveSection("simulator"),
    nav8: () => setActiveSection("playtesting"),
    nav9: () => setActiveSection("playtesting"),
    quickCreateEntity: () => setActiveSection("assets-entities"),
    quickCreateRule: () => setActiveSection("rules"),
    quickCreateTask: () => setActiveSection("tasks"),
  });

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

  const openRenameDialog = () => {
    setRenameValue(project?.name ?? "");
    setIsRenameDialogOpen(true);
  };

  const handleRenameProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    updateProject.mutate({ projectId, data: { name: renameValue.trim() } });
    setIsRenameDialogOpen(false);
  };

  const getSectionCount = (key: string | null): number | null => {
    if (!key || !stats) return null;
    const v = (stats as unknown as Record<string, unknown>)[key];
    return typeof v === "number" ? v : null;
  };

  const renderSection = () => {
    const loadingFallback = (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-32 w-64" />
      </div>
    );

    switch (activeSection) {
      case "overview": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Overview projectId={projectId} onPromptSend={setChatPrompt} />
          </Suspense>
        </ErrorBoundary>
      );
      case "identity": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Overview projectId={projectId} onPromptSend={setChatPrompt} />
          </Suspense>
        </ErrorBoundary>
      );
      case "research": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Research projectId={projectId} onPromptSend={setChatPrompt} workspaceSlug={params.workspaceSlug} />
          </Suspense>
        </ErrorBoundary>
      );
      case "ontology": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Ontology projectId={projectId} onJump={setActiveSection} />
          </Suspense>
        </ErrorBoundary>
      );
      case "assets-entities": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <AssetsEntities projectId={projectId} onChatPrompt={setChatPrompt} />
          </Suspense>
        </ErrorBoundary>
      );
      case "players": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Players projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "rules": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Rules projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "rulebook": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <RulebookEditor projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "layout": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <LayoutEditor projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "turn-structure": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <TurnStructure projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "scaling": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <ScalingMatrix projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "simulator": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Simulator projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "playtesting": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Playtesting projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "blind-playtest": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <BlindPlaytest projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "playtest-reports": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <PlaytestReports projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "notes": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Notes projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "tasks": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Tasks projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "design-pipeline": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <DesignPipeline projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "scoring-curve": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <ScoringCurve projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "balance": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Balance projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "export": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <Exports projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "comments": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <CommentsPanel projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "activity": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <ActivityFeed projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "versions": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <VersionHistory projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
      case "members": return (
        <ErrorBoundary>
          <Suspense fallback={loadingFallback}>
            <MembersDirectory projectId={projectId} />
          </Suspense>
        </ErrorBoundary>
      );
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
              <DropdownMenuItem asChild>
                <Link
                  href="/learn"
                  data-testid="open-learn-from-workspace"
                  onClick={() => {
                    try { sessionStorage.setItem("gameforge.learn.returnTo", window.location.pathname + window.location.search); } catch {/* ignore */}
                  }}
                >
                  <GraduationCap className="h-4 w-4 mr-2" /> Learn
                </Link>
              </DropdownMenuItem>
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
                <DropdownMenuItem onClick={openRenameDialog}>
                  <Pencil className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex gap-1.5 flex-wrap text-xs text-muted-foreground">
            {project.gameType && <span className="px-2 py-0.5 bg-sidebar-accent rounded-full">{project.gameType}</span>}
            {project.genre && <span className="px-2 py-0.5 bg-sidebar-accent rounded-full">{project.genre}</span>}
            {project.playerCount && <span className="px-2 py-0.5 bg-sidebar-accent rounded-full">{project.playerCount}</span>}
          </div>
          <div className="mt-3 pt-3 border-t">
            <CollaborationPresence projectId={projectId} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                {group.label}
                <ChevronRight className={`h-3 w-3 transition-transform ${openGroups[group.label] ? "rotate-90" : ""}`} />
              </button>
              {openGroups[group.label] && (
                <div className="space-y-0.5 mb-1">
                  {group.items.map((section) => {
                    const Icon = section.icon;
                    const statValue = section.statKey && stats ? (stats as any)[section.statKey] : null;
                    return (
                      <Tooltip key={section.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                              activeSection === section.id
                                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left">{section.label}</span>
                            {statValue != null && <span className="text-xs opacity-60">{statValue}</span>}
                            {section.shortcut && <span className="text-xs opacity-40">{section.shortcut}</span>}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{section.label}{section.shortcut ? ` (Press ${section.shortcut})` : ""}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-2">
            <kbd className="px-1.5 py-0.5 bg-sidebar-accent rounded text-[10px] font-mono">⌘K</kbd>
            <span>Quick actions</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-sidebar-accent rounded text-[10px] font-mono">⌘/</kbd>
            <span>Search</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background min-w-0">
        <div className="h-12 border-b border-border flex items-center px-6 bg-card text-muted-foreground gap-2 shrink-0 text-sm">
          <span className="font-medium text-foreground">{project.name}</span>
          <span>/</span>
          <span className="text-primary">{ALL_SECTION_LABELS[activeSection] ?? activeSection}</span>
          <div className="ml-auto flex items-center gap-2">
            <Suspense fallback={null}>
              <PresenceAvatars projectId={projectId} />
            </Suspense>
            <Suspense fallback={null}>
              <NotificationBell />
            </Suspense>
          </div>
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

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        projectId={projectId}
        projectName={project.name}
      />

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename project</DialogTitle></DialogHeader>
          <form onSubmit={handleRenameProject} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename-project-name">Project name</Label>
              <Input
                id="rename-project-name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!renameValue.trim()}>Rename</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <CursorIndicators projectId={projectId} />
      </Suspense>
    </div>
  );
}
