import { useParams, Link } from "wouter";
import { useState, useMemo, lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { useGetProject, useGetProjectStats, useDeleteProject, useUpdateProject, getListProjectsQueryKey, useGetMe } from "@workspace/api-client-react";
import type { Project, ProjectStats } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import {
  Layout, Users, FileText, CheckSquare, ChevronLeft, Gamepad2, Activity, MoreVertical, Trash2,
  BookOpen, Dice5, ImageIcon, Scale, Download, User as UserIcon, LogOut, Shield, GraduationCap,
  MessageSquare, History, Share2, Clock, BarChart3, EyeOff, Grid3X3, TrendingUp, ChevronRight,
  Pencil, ClipboardList, Lock, Target, SlidersHorizontal, Zap, Inbox, Settings2, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { DesignBriefHeader } from "@/components/workspace/design-brief-header";
import { WorkspaceTour, TourTriggerButton } from "@/components/workspace/workspace-tour";
import { useWorkspaceTour } from "@/hooks/use-workspace-tour";
import { useMyProjectRole } from "@/hooks/use-collaboration";
import { useAblyPresence } from "@/hooks/use-ably-presence";

// Lazy load workspace components for code splitting
const Overview = lazy(() => import("@/components/workspace/overview").then(m => ({ default: m.Overview })));
const GameIdentity = lazy(() => import("@/components/workspace/overview").then(m => ({ default: m.GameIdentity })));
const Research = lazy(() => import("@/components/workspace/research").then(m => ({ default: m.Research })));
const AssetsEntities = lazy(() => import("@/components/workspace/assets-entities").then(m => ({ default: m.AssetsEntities })));
const GamePiecesOverview = lazy(() => import("@/components/workspace/game-pieces-overview").then(m => ({ default: m.GamePiecesOverview })));
const CanvasTab = lazy(() => import("@/components/canvas-tab").then(m => ({ default: m.default })));
const Players = lazy(() => import("@/components/workspace/players").then(m => ({ default: m.Players })));
const Rules = lazy(() => import("@/components/workspace/rules").then(m => ({ default: m.Rules })));
const Simulator = lazy(() => import("@/components/workspace/simulator").then(m => ({ default: m.Simulator })));
const Playtesting = lazy(() => import("@/components/workspace/playtesting").then(m => ({ default: m.Playtesting })));
const Notes = lazy(() => import("@/components/workspace/notes").then(m => ({ default: m.Notes })));
const Tasks = lazy(() => import("@/components/workspace/tasks").then(m => ({ default: m.Tasks })));
const Balance = lazy(() => import("@/components/workspace/balance").then(m => ({ default: m.Balance })));
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
const ActivityFeed = lazy(() => import("@/components/collaboration/activity-feed").then(m => ({ default: m.ActivityFeed })));
const CommentsPanel = lazy(() => import("@/components/collaboration/comments-panel").then(m => ({ default: m.CommentsPanel })));
const VersionHistory = lazy(() => import("@/components/collaboration/version-history").then(m => ({ default: m.VersionHistory })));
const ShareDialog = lazy(() => import("@/components/collaboration/share-dialog").then(m => ({ default: m.ShareDialog })));
const NotificationBell = lazy(() => import("@/components/collaboration/notification-bell").then(m => ({ default: m.NotificationBell })));
const CollaborationDashboard = lazy(() => import("@/components/collaboration/collaboration-dashboard").then(m => ({ default: m.CollaborationDashboard })));
const UnifiedInbox = lazy(() => import("@/components/workspace/unified-inbox").then(m => ({ default: m.UnifiedInbox })));
const WorkspaceSettings = lazy(() => import("@/components/workspace/workspace-settings").then(m => ({ default: m.WorkspaceSettings })));
const AuditLog = lazy(() => import("@/components/workspace/audit-log").then(m => ({ default: m.AuditLog })));
const ConflictBanner = lazy(() => import("@/components/workspace/conflict-banner").then(m => ({ default: m.ConflictBanner })));

// ─── Stage configuration ────────────────────────────────────────────────────

type StageItem = { id: string; label: string; icon: React.ComponentType<{ className?: string }> };

type Stage = {
  id: number;
  label: string;
  shortLabel: string;
  color: string;
  what: string;
  time: string;
  items: StageItem[];
};

const STAGES: Stage[] = [
  {
    id: 1, label: "Conceptualize", shortLabel: "Concept", color: "#3B82F6",
    what: "Define your game concept, research inspiration, and establish core identity.",
    time: "30 min",
    items: [
      { id: "overview",  label: "Overview",   icon: Layout },
      { id: "identity",  label: "Game Brief", icon: Gamepad2 },
      { id: "research",  label: "Research",   icon: BookOpen },
    ],
  },
  {
    id: 2, label: "Build Components", shortLabel: "Build", color: "#A855F7",
    what: "Create your game pieces, cards, tokens, and define player roles.",
    time: "45 min",
    items: [
      { id: "game-pieces",     label: "Game Pieces",       icon: Layers },
      { id: "assets-entities", label: "All Components",    icon: ImageIcon },
      { id: "canvas",          label: "Visual Canvas",     icon: Grid3X3 },
      { id: "players",         label: "Players",           icon: Users },
    ],
  },
  {
    id: 3, label: "Define Rules", shortLabel: "Rules", color: "#F59E0B",
    what: "Write your rules, design turn structure, and build the rulebook.",
    time: "45 min",
    items: [
      { id: "rules",          label: "Rules",          icon: Activity },
      { id: "rulebook",       label: "Rulebook",       icon: BookOpen },
      { id: "turn-structure", label: "Turn Structure", icon: Clock },
      { id: "layout",         label: "Layout",         icon: Grid3X3 },
    ],
  },
  {
    id: 4, label: "Test & Balance", shortLabel: "Test", color: "#EF4444",
    what: "Simulate gameplay, check balance scores, and fix mechanical issues.",
    time: "30 min",
    items: [
      { id: "simulator",     label: "Simulator",     icon: Dice5 },
      { id: "balance",       label: "Balance",       icon: Scale },
      { id: "scaling",       label: "Scaling",       icon: BarChart3 },
      { id: "scoring-curve", label: "Scoring Curve", icon: TrendingUp },
    ],
  },
  {
    id: 5, label: "Playtest", shortLabel: "Playtest", color: "#10B981",
    what: "Schedule playtests, gather player feedback, and iterate.",
    time: "Ongoing",
    items: [
      { id: "playtesting",      label: "Playtest Kit", icon: Users },
      { id: "blind-playtest",   label: "Blind Test",   icon: EyeOff },
      { id: "playtest-reports", label: "Reports",      icon: ClipboardList },
    ],
  },
  {
    id: 6, label: "Publish & Share", shortLabel: "Publish", color: "#6366F1",
    what: "Export your game, collaborate with your team, and share with players.",
    time: "Varies",
    items: [
      { id: "inbox",               label: "Inbox",      icon: Inbox },
      { id: "comments",            label: "Comments",   icon: MessageSquare },
      { id: "activity",            label: "Activity",   icon: Activity },
      { id: "members",             label: "Members",    icon: Users },
      { id: "workspace-settings",  label: "Settings",   icon: Settings2 },
      { id: "audit-log",           label: "Audit Log",  icon: ClipboardList },
    ],
  },
];

// Tools always accessible in advanced mode
const TOOL_ITEMS: StageItem[] = [
  { id: "tasks", label: "Tasks",  icon: CheckSquare },
  { id: "notes", label: "Notes",  icon: FileText },
  { id: "export", label: "Exports", icon: Download },
  { id: "versions", label: "Versions", icon: History },
];

// Flat map: section id → stage id
const SECTION_TO_STAGE: Record<string, number> = Object.fromEntries(
  STAGES.flatMap(s => s.items.map(i => [i.id, s.id]))
);

// All section labels for breadcrumb
const ALL_SECTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(STAGES.flatMap(s => s.items.map(i => [i.id, i.label]))),
  tasks: "Tasks",
  notes: "Notes",
  export: "Exports",
  versions: "Version History",
  inbox: "Inbox",
};

// ─── Completion calculation ──────────────────────────────────────────────────

type ChecklistEntry = { id: string; label: string; done: boolean; sectionId: string };

function getStageChecklist(stageId: number, project: Project, stats: ProjectStats | undefined): ChecklistEntry[] {
  const s = stats ?? { entityCount: 0, ruleCount: 0, playerCount: 0, noteCount: 0, taskCount: 0, chatMessageCount: 0, researchCount: 0, assetCount: 0, playtestCount: 0 };
  switch (stageId) {
    case 1: return [
      { id: "name",     label: "Name your game",       done: !!project.name,          sectionId: "identity" },
      { id: "gameType", label: "Set game type",         done: !!project.gameType,      sectionId: "identity" },
      { id: "genre",    label: "Pick a genre",          done: !!project.genre,         sectionId: "identity" },
      { id: "players",  label: "Set player count",      done: !!project.playerCount,   sectionId: "identity" },
      { id: "duration", label: "Set target duration",   done: !!project.targetDuration, sectionId: "identity" },
    ];
    case 2: return [
      { id: "entities",  label: "Add 5+ components",   done: s.assetCount >= 5,  sectionId: "assets-entities" },
      { id: "playersObj", label: "Define player roles", done: (s.playerCount ?? 0) >= 1, sectionId: "players" },
    ];
    case 3: return [
      { id: "rules",    label: "Add 3+ rules",          done: s.ruleCount >= 3,        sectionId: "rules" },
      { id: "winCon",   label: "Define win condition",  done: !!project.winCondition,  sectionId: "rules" },
    ];
    case 4: return [
      { id: "entities3", label: "Have 3+ components",  done: s.assetCount >= 3,   sectionId: "simulator" },
      { id: "rules3",    label: "Have 3+ rules",       done: s.ruleCount >= 3,    sectionId: "simulator" },
    ];
    case 5: return [
      { id: "pt1",  label: "Schedule a playtest",  done: s.playtestCount >= 1,  sectionId: "playtesting" },
      { id: "pt2",  label: "Gather feedback",       done: s.playtestCount >= 2,  sectionId: "playtest-reports" },
    ];
    case 6: return [
      { id: "pt3",  label: "Complete 2+ playtests", done: s.playtestCount >= 2, sectionId: "export" },
    ];
    default: return [];
  }
}

function calcStageCompletion(stageId: number, project: Project, stats: ProjectStats | undefined): number {
  const checklist = getStageChecklist(stageId, project, stats);
  if (!checklist.length) return 0;
  return Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StageProgressBar({ stages, completions, activeStage, onStageClick, project, stats, onNavigateToSection }: {
  stages: Stage[];
  completions: number[];
  activeStage: number;
  onStageClick: (stageId: number) => void;
  project: Project;
  stats: ProjectStats | undefined;
  onNavigateToSection: (sectionId: string) => void;
}) {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  return (
    <div className="border-b border-border bg-card px-4 py-2 flex flex-col shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto">
        {stages.map((stage, i) => {
          const checklist = getStageChecklist(stage.id, project, stats);
          const isExpanded = expandedStage === stage.id;
          return (
            <div key={stage.id} className="flex items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (activeStage === stage.id) {
                        setExpandedStage(isExpanded ? null : stage.id);
                      } else {
                        onStageClick(stage.id);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                      activeStage === stage.id
                        ? "bg-sidebar-accent text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: completions[i] > 0 ? stage.color : "#374151" }}
                    >
                      {completions[i] >= 100 ? "✓" : stage.id}
                    </div>
                    <span className="hidden md:inline">{stage.shortLabel}</span>
                    {activeStage === stage.id && (
                      <span className="ml-0.5 text-[10px]">{isExpanded ? "▼" : "▶"}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="space-y-1">
                    <div>{stage.label} — {completions[i]}% complete</div>
                    <div className="text-[10px] text-muted-foreground">
                      Click {activeStage === stage.id ? "to expand tasks" : "to navigate"}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
              {i < stages.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
            </div>
          );
        })}
        <div className="ml-auto pl-2 text-xs text-muted-foreground shrink-0">
          {Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)}% overall
        </div>
      </div>

      {/* Expanded checklist items */}
      {expandedStage !== null && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const checklist = getStageChecklist(expandedStage, project, stats);
              return checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigateToSection(item.sectionId)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors ${
                    item.done
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  }`}
                  title={`${item.label} → ${ALL_SECTION_LABELS[item.sectionId] || item.sectionId}`}
                >
                  <span>{item.done ? "✓" : "○"}</span>
                  <span className="truncate max-w-[150px]">{item.label}</span>
                  <span className="opacity-60">→</span>
                </button>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function NextStepBanner({ checklist, onNavigate, onDismiss }: {
  checklist: ChecklistEntry[];
  onNavigate: (id: string) => void;
  onDismiss: () => void;
}) {
  const next = checklist.find(c => !c.done);
  if (!next) return null;
  return (
    <div className="border-b border-border bg-amber-950/20 px-4 py-2 flex items-center gap-2 text-sm shrink-0">
      <Target className="h-4 w-4 text-amber-400 shrink-0" />
      <span className="text-amber-300 font-medium">Next:</span>
      <span className="text-muted-foreground">{next.label}</span>
      <button
        onClick={() => onNavigate(next.sectionId)}
        className="ml-auto text-xs px-2.5 py-1 bg-amber-600/20 text-amber-300 rounded hover:bg-amber-600/30 transition-colors shrink-0"
      >
        Go →
      </button>
      <button onClick={onDismiss} className="text-muted-foreground/50 hover:text-muted-foreground text-xs px-1">✕</button>
    </div>
  );
}

function LockWarningDialog({ stageId, stageCompletions, project, stats, onClose, onNavigate }: {
  stageId: number | null;
  stageCompletions: number[];
  project: Project;
  stats: ProjectStats | undefined;
  onClose: () => void;
  onNavigate: (sectionId: string) => void;
}) {
  if (stageId === null) return null;
  const prevStage = STAGES[stageId - 2];
  const prevCompletion = stageCompletions[stageId - 2] ?? 0;
  const missing = prevStage ? getStageChecklist(prevStage.id, project, stats).filter(c => !c.done) : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Stage Locked
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Complete at least 70% of <strong>{prevStage?.label}</strong> to unlock this stage.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-sidebar-accent overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${prevCompletion}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">{prevCompletion}%</span>
          </div>
          {missing.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Remaining:</p>
              <ul className="space-y-1">
                {missing.map(item => (
                  <li key={item.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-amber-400">○</span> {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Go Back</Button>
          {prevStage && (
            <Button onClick={() => onNavigate(prevStage.items[0].id)}>
              Go to Stage {prevStage.id}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Workspace ──────────────────────────────────────────────────────────

export default function Workspace({ projectId: projectIdProp }: { projectId?: number } = {}) {
  const queryClient = useQueryClient();
  const params = useParams();
  const { user } = useUser();
  const { data: me } = useGetMe();
  const { signOut } = useClerk();
  const projectId = useMemo(
    () => projectIdProp ?? parseInt(params.projectId || "0", 10),
    [projectIdProp, params.projectId],
  );
  const { data: project, isLoading: projectLoading, error: projectError } = useGetProject(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const { data: myRole } = useMyProjectRole(projectId);
  const canManageProject = myRole?.canManageMembers ?? false;
  const canEditProject = myRole?.canEdit ?? true;

  const [activeSection, setActiveSection] = useState<string>("overview");
  const [chatPrompt, setChatPrompt] = useState<string | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [nextStepDismissed, setNextStepDismissed] = useState(false);
  const [teamPanelOpen, setTeamPanelOpen] = useState(false);
  const [lockWarningStage, setLockWarningStage] = useState<number | null>(null);
  const [conflictDismissed, setConflictDismissed] = useState<Record<string, boolean>>({});
  const [showAdvancedConfirm, setShowAdvancedConfirm] = useState(false);
  const { showTour, startTour, completeTour, dismissTour } = useWorkspaceTour(projectId);

  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(() => {
    try { return localStorage.getItem("gameforge.advancedMode") === "true"; } catch { return false; }
  });

  const currentUserName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress || "You"
    : "You";
  const presentUsers = useAblyPresence({
    projectId,
    userId: user?.id ? parseInt(user.id, 10) : 0,
    userName: currentUserName,
    avatarUrl: user?.imageUrl ?? null,
    section: activeSection,
    enabled: !!user?.id && projectId > 0,
  });
  const otherPresentUsers = presentUsers.filter((p) => p.userId !== (user?.id ? parseInt(user.id, 10) : 0));

  // Keyboard shortcuts
  useKeyboardShortcuts({
    quickActions: () => setChatPrompt(""),
    search: () => {
      const el = document.querySelector('input[type="search"]') as HTMLInputElement | null;
      el?.focus();
    },
    escape: () => {
      setIsDeleteDialogOpen(false);
      setIsShareDialogOpen(false);
      setIsRenameDialogOpen(false);
      setLockWarningStage(null);
      setShowAdvancedConfirm(false);
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

  // Stage completions
  const stageCompletions = useMemo(
    () => project ? STAGES.map(s => calcStageCompletion(s.id, project, stats)) : Array(6).fill(0) as number[],
    [project, stats],
  );

  const activeStage = SECTION_TO_STAGE[activeSection] ?? 1;
  const activeStageConfig = STAGES[activeStage - 1];
  const activeChecklist = useMemo(
    () => project ? getStageChecklist(activeStage, project, stats) : [],
    [activeStage, project, stats],
  );

  const isStageUnlocked = (stageId: number): boolean => {
    if (isAdvancedMode || stageId === 1) return true;
    return stageCompletions[stageId - 2] >= 70;
  };

  const navigateTo = (sectionId: string) => {
    const stageId = SECTION_TO_STAGE[sectionId] ?? 1;
    if (!isStageUnlocked(stageId)) {
      setLockWarningStage(stageId);
      return;
    }
    setActiveSection(sectionId);
    setNextStepDismissed(false);
  };

  const handleStageProgressClick = (stageId: number) => {
    if (!isStageUnlocked(stageId)) {
      setLockWarningStage(stageId);
      return;
    }
    const stage = STAGES[stageId - 1];
    setActiveSection(stage.items[0].id);
    setNextStepDismissed(false);
  };

  const confirmAdvancedMode = () => {
    setIsAdvancedMode(true);
    try { localStorage.setItem("gameforge.advancedMode", "true"); } catch { /* ignore */ }
    setShowAdvancedConfirm(false);
  };

  const disableAdvancedMode = () => {
    setIsAdvancedMode(false);
    try { localStorage.setItem("gameforge.advancedMode", "false"); } catch { /* ignore */ }
  };

  if (projectLoading || (!project && !projectError)) {
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

  const loadingFallback = (
    <div className="flex items-center justify-center h-full">
      <Skeleton className="h-32 w-64" />
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <ErrorBoundary><Suspense fallback={loadingFallback}><Overview projectId={projectId} onPromptSend={setChatPrompt} /></Suspense></ErrorBoundary>;
      case "identity": return <ErrorBoundary><Suspense fallback={loadingFallback}><GameIdentity projectId={projectId} onPromptSend={setChatPrompt} /></Suspense></ErrorBoundary>;
      case "research": return <ErrorBoundary><Suspense fallback={loadingFallback}><Research projectId={projectId} onPromptSend={setChatPrompt} workspaceSlug={params.workspaceSlug} /></Suspense></ErrorBoundary>;
      case "game-pieces": return <ErrorBoundary><Suspense fallback={loadingFallback}><GamePiecesOverview projectId={projectId} onChatPrompt={setChatPrompt} onNavigate={navigateTo} /></Suspense></ErrorBoundary>;
      case "assets-entities": return <ErrorBoundary><Suspense fallback={loadingFallback}><AssetsEntities projectId={projectId} onChatPrompt={setChatPrompt} /></Suspense></ErrorBoundary>;
      case "canvas": return <ErrorBoundary><Suspense fallback={loadingFallback}><CanvasTab projectId={projectId} /></Suspense></ErrorBoundary>;
      case "players": return <ErrorBoundary><Suspense fallback={loadingFallback}><Players projectId={projectId} /></Suspense></ErrorBoundary>;
      case "rules": return <ErrorBoundary><Suspense fallback={loadingFallback}><Rules projectId={projectId} /></Suspense></ErrorBoundary>;
      case "rulebook": return <ErrorBoundary><Suspense fallback={loadingFallback}><RulebookEditor projectId={projectId} /></Suspense></ErrorBoundary>;
      case "layout": return <ErrorBoundary><Suspense fallback={loadingFallback}><LayoutEditor projectId={projectId} /></Suspense></ErrorBoundary>;
      case "turn-structure": return <ErrorBoundary><Suspense fallback={loadingFallback}><TurnStructure projectId={projectId} /></Suspense></ErrorBoundary>;
      case "scaling": return <ErrorBoundary><Suspense fallback={loadingFallback}><ScalingMatrix projectId={projectId} /></Suspense></ErrorBoundary>;
      case "simulator": return <ErrorBoundary><Suspense fallback={loadingFallback}><Simulator projectId={projectId} /></Suspense></ErrorBoundary>;
      case "playtesting": return <ErrorBoundary><Suspense fallback={loadingFallback}><Playtesting projectId={projectId} /></Suspense></ErrorBoundary>;
      case "blind-playtest": return <ErrorBoundary><Suspense fallback={loadingFallback}><BlindPlaytest projectId={projectId} /></Suspense></ErrorBoundary>;
      case "playtest-reports": return <ErrorBoundary><Suspense fallback={loadingFallback}><PlaytestReports projectId={projectId} /></Suspense></ErrorBoundary>;
      case "notes": return <ErrorBoundary><Suspense fallback={loadingFallback}><Notes projectId={projectId} /></Suspense></ErrorBoundary>;
      case "tasks": return <ErrorBoundary><Suspense fallback={loadingFallback}><Tasks projectId={projectId} /></Suspense></ErrorBoundary>;
      case "scoring-curve": return <ErrorBoundary><Suspense fallback={loadingFallback}><ScoringCurve projectId={projectId} /></Suspense></ErrorBoundary>;
      case "balance": return <ErrorBoundary><Suspense fallback={loadingFallback}><Balance projectId={projectId} /></Suspense></ErrorBoundary>;
      case "export": return <ErrorBoundary><Suspense fallback={loadingFallback}><Exports projectId={projectId} /></Suspense></ErrorBoundary>;
      case "inbox": return <ErrorBoundary><Suspense fallback={loadingFallback}><UnifiedInbox projectId={projectId} /></Suspense></ErrorBoundary>;
      case "comments": return <ErrorBoundary><Suspense fallback={loadingFallback}><CommentsPanel projectId={projectId} currentUserId={me?.id} /></Suspense></ErrorBoundary>;
      case "activity": return <ErrorBoundary><Suspense fallback={loadingFallback}><ActivityFeed projectId={projectId} /></Suspense></ErrorBoundary>;
      case "versions": return <ErrorBoundary><Suspense fallback={loadingFallback}><VersionHistory projectId={projectId} /></Suspense></ErrorBoundary>;
      case "members": return <ErrorBoundary><Suspense fallback={loadingFallback}><MembersDirectory projectId={projectId} canManage={canManageProject} /></Suspense></ErrorBoundary>;
      case "workspace-settings": return <ErrorBoundary><Suspense fallback={loadingFallback}><WorkspaceSettings projectId={projectId} projectName={project.name} /></Suspense></ErrorBoundary>;
      case "audit-log": return <ErrorBoundary><Suspense fallback={loadingFallback}><AuditLog projectId={projectId} /></Suspense></ErrorBoundary>;
      default: return null;
    }
  };

  // Stages visible in sidebar
  const visibleStages = isAdvancedMode
    ? STAGES
    : STAGES.filter(s => s.id <= activeStage + 1);

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">

      {/* ── Icon bar ──────────────────────────────────────────────────── */}
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
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                    {(user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || "U").toUpperCase()}
                  </div>
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
                    try { sessionStorage.setItem("gameforge.learn.returnTo", window.location.pathname + window.location.search); } catch { /* ignore */ }
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

      {/* ── Navigation sidebar ────────────────────────────────────────── */}
      <div className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0 z-10">

        {/* Project header */}
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-start mb-2">
            <h1 className="font-bold text-base leading-tight line-clamp-2 pr-2">{project.name}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-2 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEditProject && <DropdownMenuItem onClick={openRenameDialog}><Pencil className="h-4 w-4 mr-2" /> Rename</DropdownMenuItem>}
                {canManageProject && <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}><Share2 className="h-4 w-4 mr-2" /> Share</DropdownMenuItem>}
                {canManageProject && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Game meta tags */}
          <div className="flex gap-1 flex-wrap text-xs text-muted-foreground mb-2">
            {project.gameType && <span className="px-2 py-0.5 bg-sidebar-accent rounded-full">{project.gameType}</span>}
            {project.playerCount && <span className="px-2 py-0.5 bg-sidebar-accent rounded-full">{project.playerCount}</span>}
            {project.targetDuration && <span className="px-2 py-0.5 bg-sidebar-accent rounded-full">{project.targetDuration}</span>}
          </div>

          {/* Mini progress strip */}
          <div className="flex gap-0.5 mb-1">
            {STAGES.map((stage, i) => (
              <div key={stage.id} className="flex-1 h-1.5 rounded-full bg-sidebar-accent overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${stageCompletions[i]}%`, background: stage.color }}
                />
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round(stageCompletions.reduce((a, b) => a + b, 0) / 6)}% complete
          </div>

          <div className="mt-2">
            <Suspense fallback={null}><CollaborationPresence users={otherPresentUsers} /></Suspense>
          </div>
        </div>

        {/* Stage navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleStages.map((stage) => {
            const unlocked = isStageUnlocked(stage.id);
            const isCurrent = activeStage === stage.id;
            const completion = stageCompletions[stage.id - 1];

            return (
              <div key={stage.id}>
                {/* Stage row */}
                <button
                  onClick={() => handleStageProgressClick(stage.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    isCurrent ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                  }`}
                  style={{ borderLeft: isCurrent ? `2px solid ${stage.color}` : "2px solid transparent" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: unlocked ? (completion > 0 ? stage.color : `${stage.color}60`) : "#374151" }}
                  >
                    {completion >= 100 ? "✓" : stage.id}
                  </div>
                  <span className={`flex-1 text-xs font-semibold uppercase tracking-wide ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">{completion}%</span>
                  {!unlocked && <Lock className="h-3 w-3 text-muted-foreground/40" />}
                </button>

                {/* Stage tabs (expanded when current stage or advanced mode) */}
                {(isCurrent || isAdvancedMode) && unlocked && (
                  <div className="ml-3 space-y-0.5 mb-1 mt-0.5">
                    {stage.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigateTo(item.id)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                        </button>
                      );
                    })}

                    {/* "Ready for next stage?" hint in normal mode at 70%+ */}
                    {!isAdvancedMode && completion >= 70 && stage.id < 6 && (
                      <button
                        onClick={() => handleStageProgressClick(stage.id + 1)}
                        className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-950/30 transition-colors"
                      >
                        <Zap className="h-3 w-3" />
                        Ready for Stage {stage.id + 1}?
                      </button>
                    )}
                  </div>
                )}

                {/* Locked stage preview in normal mode */}
                {!isCurrent && !isAdvancedMode && !unlocked && (
                  <div className="ml-3 px-3 py-1 mb-1">
                    <p className="text-[10px] text-muted-foreground/50">
                      Unlock when Stage {stage.id - 1} is 70%+
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tool items (advanced mode only) */}
          {isAdvancedMode && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Tools</div>
              {TOOL_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeSection === item.id
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => isAdvancedMode ? disableAdvancedMode() : setShowAdvancedConfirm(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{isAdvancedMode ? "Normal Mode" : "Advanced Mode"}</span>
          </button>
          <TourTriggerButton onClick={startTour} />
          <div className="flex items-center gap-1 px-3 pt-1">
            <kbd className="px-1.5 py-0.5 bg-sidebar-accent rounded text-[10px] font-mono">⌘K</kbd>
            <span className="text-xs text-muted-foreground">Quick actions</span>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-background min-w-0">

        {/* Top bar */}
        <div className="h-12 border-b border-border flex items-center px-6 bg-card text-muted-foreground gap-2 shrink-0 text-sm">
          <span className="font-medium text-foreground">{project.name}</span>
          <span>/</span>
          <span className="text-primary">{ALL_SECTION_LABELS[activeSection] ?? activeSection}</span>
          <div className="ml-auto flex items-center gap-2">
            {otherPresentUsers.length > 0 && (
              <div className="flex items-center -space-x-2">
                {otherPresentUsers.slice(0, 5).map((p) => (
                  <Tooltip key={p.userId}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-green-500/60 cursor-default">
                        {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.userName} />}
                        <AvatarFallback className="text-[10px] bg-green-900 text-green-300">
                          {(p.userName[0] ?? "?").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="font-medium">{p.userName}</span>
                      {p.section && <span className="text-muted-foreground ml-1">· {p.section}</span>}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {otherPresentUsers.length > 5 && (
                  <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">
                    +{otherPresentUsers.length - 5}
                  </div>
                )}
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 relative"
                  onClick={() => setTeamPanelOpen(true)}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Team &amp; Collaboration</TooltipContent>
            </Tooltip>
            <Suspense fallback={null}><NotificationBell /></Suspense>
          </div>
        </div>

        {/* 6-stage progress bar */}
        <StageProgressBar
          stages={STAGES}
          completions={stageCompletions}
          activeStage={activeStage}
          onStageClick={handleStageProgressClick}
          project={project}
          stats={stats}
          onNavigateToSection={navigateTo}
        />

        {/* Next step guidance (normal mode only) */}
        {!isAdvancedMode && !nextStepDismissed && activeChecklist.length > 0 && (
          <NextStepBanner
            checklist={activeChecklist}
            onNavigate={navigateTo}
            onDismiss={() => setNextStepDismissed(true)}
          />
        )}

        <DesignBriefHeader project={project} />

        <div className="flex-1 p-6 overflow-y-auto">
          {!conflictDismissed[activeSection] && (
            <Suspense fallback={null}>
              <ConflictBanner
                projectId={projectId}
                section={activeSection}
                onDismiss={() => setConflictDismissed(prev => ({ ...prev, [activeSection]: true }))}
              />
            </Suspense>
          )}
          {renderSection()}
        </div>
      </div>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <ChatPanel projectId={projectId} defaultPrompt={chatPrompt} onPromptClear={() => setChatPrompt(undefined)} activeTab={activeSection} />
      </Suspense>

      {/* ── Collaboration Dashboard ───────────────────────────────────── */}
      <Suspense fallback={null}>
        <CollaborationDashboard
          open={teamPanelOpen}
          onOpenChange={setTeamPanelOpen}
          projectId={projectId}
          projectName={project.name}
          onOpenShare={() => { setIsShareDialogOpen(true); setTeamPanelOpen(false); }}
          onNavigate={(section) => { navigateTo(section); setTeamPanelOpen(false); }}
          presentUsers={presentUsers}
        />
      </Suspense>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}

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

      <Suspense fallback={null}>
        <ShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          projectId={projectId}
          projectName={project.name}
          canManage={canManageProject}
        />
      </Suspense>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename project</DialogTitle></DialogHeader>
          <form onSubmit={handleRenameProject} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename-project-name">Project name</Label>
              <Input id="rename-project-name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!renameValue.trim()}>Rename</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Advanced mode confirmation */}
      <Dialog open={showAdvancedConfirm} onOpenChange={setShowAdvancedConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Switch to Advanced Mode?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Advanced Mode removes guided checklists and "Next Step" prompts, and lets you jump to any stage directly.
            You can switch back to Normal Mode anytime from the sidebar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvancedConfirm(false)}>Stay in Normal Mode</Button>
            <Button onClick={confirmAdvancedMode}>Enable Advanced Mode</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage locked warning */}
      <LockWarningDialog
        stageId={lockWarningStage}
        stageCompletions={stageCompletions}
        project={project}
        stats={stats}
        onClose={() => setLockWarningStage(null)}
        onNavigate={(sectionId) => { navigateTo(sectionId); setLockWarningStage(null); }}
      />

      {/* Collaborators */}
      <Suspense fallback={null}>
        <CursorIndicators users={otherPresentUsers} />
      </Suspense>

      {/* Onboarding tour */}
      <AnimatePresence>
        {showTour && (
          <WorkspaceTour
            onNavigate={(sectionId) => setActiveSection(sectionId)}
            onComplete={() => completeTour(projectId)}
            onDismiss={() => dismissTour(projectId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
