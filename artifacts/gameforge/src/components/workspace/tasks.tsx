import { useState, useMemo } from "react";
import {
  useListRichTasks,
  useCreateRichTask,
  useUpdateRichTask,
  useDeleteRichTask,
  useListProjectUsers,
  getListRichTasksQueryKey,
} from "@/hooks/use-collaboration";
import { useGetMe } from "@workspace/api-client-react";
import { useDesignerArtifact } from "@/hooks/use-designer-artifact";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Edit2, Trash2, CheckSquare, MoreHorizontal, X, CalendarDays,
  Table as TableIcon, Columns3, LayoutDashboard, UserCheck,
  Check, XCircle, BookTemplate, Loader2, Bookmark, Save,
  GanttChartSquare, Users, ChevronRight, ChevronDown,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "./task-card";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { TaskFiltersBar } from "./task-filters";
import { TasksDashboard } from "./tasks-dashboard";
import {
  StatusPill,
  MONDAY_STATUS_LABEL,
  MONDAY_STATUS_ORDER,
} from "./status-pill";
import { TASK_TEMPLATES, type TaskTemplate } from "@/lib/task-templates";
import {
  PRIORITY_COLORS,
  type RichTask,
  type TaskFilter,
  type TaskSort,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/collaboration-types";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, addDays, isWeekend, subDays } from "date-fns";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { MONDAY_STATUS_BG } from "./status-pill";
import { useListSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from "@/hooks/use-collaboration";

interface TasksProps {
  projectId: number;
}

type ViewMode = "kanban" | "table" | "calendar" | "dashboard" | "timeline" | "workload";
type GroupBy = "status" | "priority" | "assignee" | "category" | "none";

const PRIORITY_ORDER: TaskPriority[] = ["urgent", "high", "medium", "low"];
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface TaskGroup {
  id: string;
  label: string;
  tasks: RichTask[];
  // Optional Monday-style status header for the column.
  statusKey?: TaskStatus;
}

interface SavedView {
  id: string;
  name: string;
  view: ViewMode;
  groupBy: GroupBy;
  myWorkOnly: boolean;
  filter: TaskFilter;
  sort: TaskSort;
}

interface BoardPrefs {
  groupBy: GroupBy;
  myWorkOnly: boolean;
  view: ViewMode;
  views?: SavedView[];
  activeViewId?: string | null;
}

const DEFAULT_PREFS: BoardPrefs = {
  groupBy: "status",
  myWorkOnly: false,
  view: "kanban",
  views: [],
  activeViewId: null,
};

export function Tasks({ projectId }: TasksProps) {
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const currentUserId = me?.id ?? null;

  // Persisted board prefs (group-by, my-work, view) per project.
  const { state: prefs, setState: setPrefs } = useDesignerArtifact<BoardPrefs>(
    projectId,
    "tasks-board-prefs",
    () => DEFAULT_PREFS,
  );
  const view = prefs.view;
  // Use updater form so rapid sequential toggles (e.g. My-work then Group-by)
  // don't clobber each other through stale closure refs to `prefs`.
  const setView = (v: ViewMode) => setPrefs((p) => ({ ...p, view: v }));
  const groupBy = prefs.groupBy;
  const setGroupBy = (g: GroupBy) => setPrefs((p) => ({ ...p, groupBy: g }));
  const myWorkOnly = prefs.myWorkOnly;
  const setMyWorkOnly = (b: boolean) => setPrefs((p) => ({ ...p, myWorkOnly: b }));

  const [filter, setFilter] = useState<TaskFilter>({});
  const [sort, setSort] = useState<TaskSort>({ field: "createdAt", direction: "desc" });
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [detailTask, setDetailTask] = useState<RichTask | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", status: "backlog" as TaskStatus });

  const { data: tasks, isLoading } = useListRichTasks(projectId, filter, sort);
  const { data: users } = useListProjectUsers(projectId);
  const createTask = useCreateRichTask();
  const updateTask = useUpdateRichTask();
  const deleteTask = useDeleteRichTask();

  // Apply "My work" filter on top of server-filtered tasks.
  const visibleTasks = useMemo<RichTask[]>(() => {
    if (!tasks) return [];
    if (!myWorkOnly || !currentUserId) return tasks;
    return tasks.filter((t) => t.assigneeIds.includes(currentUserId));
  }, [tasks, myWorkOnly, currentUserId]);

  const myWorkCount = useMemo(() => {
    if (!tasks || !currentUserId) return 0;
    return tasks.filter((t) => t.assigneeIds.includes(currentUserId)).length;
  }, [tasks, currentUserId]);

  // Quickly change a task's status from the board / table.
  const handleQuickStatus = (task: RichTask, next: TaskStatus) => {
    updateTask.mutate(
      { projectId, taskId: task.id, data: { status: next } },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getListRichTasksQueryKey(projectId) }),
      },
    );
  };

  // ─── Drag & drop on Kanban board ─────────────────────────────────────────
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const handleDropOnGroup = (group: TaskGroup) => {
    const taskId = draggedTaskId;
    setDraggedTaskId(null);
    setDragOverGroupId(null);
    if (taskId == null || groupBy === "none") return;
    const task = visibleTasks.find((t) => t.id === taskId);
    if (!task) return;

    let data: Partial<RichTask> | null = null;
    if (groupBy === "status" && group.statusKey && task.status !== group.statusKey) {
      data = { status: group.statusKey };
    } else if (groupBy === "priority" && task.priority !== group.id) {
      data = { priority: group.id as TaskPriority };
    } else if (groupBy === "assignee") {
      if (group.id === "unassigned") {
        if (task.assigneeIds.length > 0) data = { assigneeIds: [] };
      } else {
        const uid = parseInt(group.id.slice(1), 10);
        if (!Number.isNaN(uid) && !task.assigneeIds.includes(uid)) {
          data = { assigneeIds: [...task.assigneeIds, uid] };
        }
      }
    } else if (groupBy === "category") {
      const newCat = group.id === "Uncategorized" ? null : group.id;
      if ((task.category ?? null) !== newCat) data = { category: newCat };
    }
    if (!data) return;
    updateTask.mutate(
      { projectId, taskId, data },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getListRichTasksQueryKey(projectId) }),
      },
    );
  };

  // ─── Expanded subtasks in table view ─────────────────────────────────────
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const toggleExpanded = (id: number) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Saved Views ─────────────────────────────────────────────────────────
  const savedViews = prefs.views ?? [];
  const activeViewId = prefs.activeViewId ?? null;

  const handleSaveView = () => {
    const name = window.prompt("Name this view (e.g. 'My open work')")?.trim();
    if (!name) return;
    const newView: SavedView = {
      id: `v_${Date.now()}`,
      name,
      view,
      groupBy,
      myWorkOnly,
      filter,
      sort,
    };
    setPrefs((p) => ({
      ...p,
      views: [...(p.views ?? []), newView],
      activeViewId: newView.id,
    }));
  };

  const handleApplyView = (v: SavedView) => {
    setFilter(v.filter);
    setSort(v.sort);
    setPrefs((p) => ({
      ...p,
      view: v.view,
      groupBy: v.groupBy,
      myWorkOnly: v.myWorkOnly,
      activeViewId: v.id,
    }));
  };

  const handleDeleteView = (id: string) => {
    setPrefs((p) => ({
      ...p,
      views: (p.views ?? []).filter((v) => v.id !== id),
      activeViewId: p.activeViewId === id ? null : p.activeViewId,
    }));
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks?.forEach((t) => t.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags);
  }, [tasks]);

  const assigneeOptions = useMemo(() => {
    return (users ?? []).map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User ${u.id}`,
    }));
  }, [users]);

  const handleCreate = async () => {
    if (!formData.title) return;
    await createTask.mutateAsync({ projectId, data: formData });
    setShowAdd(false);
    setFormData({ title: "", description: "", status: "backlog" });
    qc.invalidateQueries({ queryKey: getListRichTasksQueryKey(projectId) });
  };

  const handleApplyTemplate = async (template: TaskTemplate) => {
    setApplyingTemplate(template.id);
    try {
      for (const t of template.tasks) {
        await createTask.mutateAsync({
          projectId,
          data: {
            title: t.title,
            description: t.description ?? "",
            status: (t.status === "in-progress" ? "in_progress" : t.status) as TaskStatus,
            priority: t.priority,
          },
        });
      }
      qc.invalidateQueries({ queryKey: getListRichTasksQueryKey(projectId) });
      setShowTemplates(false);
    } finally {
      setApplyingTemplate(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.size} tasks?`)) return;
    for (const id of selectedTasks) {
      await deleteTask.mutateAsync({ projectId, taskId: id });
    }
    setSelectedTasks(new Set());
    qc.invalidateQueries({ queryKey: getListRichTasksQueryKey(projectId) });
  };

  const handleBulkStatus = async (status: TaskStatus) => {
    for (const id of selectedTasks) {
      await updateTask.mutateAsync({ projectId, taskId: id, data: { status } });
    }
    setSelectedTasks(new Set());
    qc.invalidateQueries({ queryKey: getListRichTasksQueryKey(projectId) });
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTasks(next);
  };

  const selectAll = () => {
    if (!tasks) return;
    const allIds = tasks.map((t) => t.id);
    const allSelected = allIds.every((id) => selectedTasks.has(id));
    setSelectedTasks(new Set(allSelected ? [] : allIds));
  };

  // Dynamic grouping driven by `groupBy`. Each group has an id + label + tasks
  // and (for status mode) a `statusKey` so the column header can render the
  // colored Monday pill.
  const groups = useMemo<TaskGroup[]>(() => {
    if (groupBy === "status") {
      return MONDAY_STATUS_ORDER.map((s) => ({
        id: s,
        label: MONDAY_STATUS_LABEL[s],
        statusKey: s,
        tasks: visibleTasks.filter((t) => t.status === s),
      }));
    }
    if (groupBy === "priority") {
      return PRIORITY_ORDER.map((p) => ({
        id: p,
        label: PRIORITY_LABEL[p],
        tasks: visibleTasks.filter((t) => t.priority === p),
      }));
    }
    if (groupBy === "assignee") {
      const userMap = new Map<number, RichTask[]>();
      const unassigned: RichTask[] = [];
      visibleTasks.forEach((t) => {
        if (t.assigneeIds.length === 0) {
          unassigned.push(t);
        } else {
          t.assigneeIds.forEach((uid) => {
            const cur = userMap.get(uid) ?? [];
            cur.push(t);
            userMap.set(uid, cur);
          });
        }
      });
      const userGroups: TaskGroup[] = Array.from(userMap.entries()).map(
        ([uid, ts]) => {
          const u = users?.find((x) => x.id === uid);
          const name =
            (u && [u.firstName, u.lastName].filter(Boolean).join(" ")) ||
            u?.email ||
            `User ${uid}`;
          return { id: `u${uid}`, label: name, tasks: ts };
        },
      );
      return [
        ...userGroups.sort((a, b) => b.tasks.length - a.tasks.length),
        { id: "unassigned", label: "Unassigned", tasks: unassigned },
      ];
    }
    if (groupBy === "category") {
      const map = new Map<string, RichTask[]>();
      visibleTasks.forEach((t) => {
        const key = t.category || "Uncategorized";
        const cur = map.get(key) ?? [];
        cur.push(t);
        map.set(key, cur);
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cat, ts]) => ({ id: cat, label: cat, tasks: ts }));
    }
    return [{ id: "all", label: "All tasks", tasks: visibleTasks }];
  }, [groupBy, visibleTasks, users]);

  const calendarDays = useMemo(() => {
    const now = new Date();
    return eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  }, []);

  return (
    <div className="h-full flex flex-col pb-8">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Project Tasks</h2>
            {tasks && <Badge variant="secondary" className="text-xs">{tasks.length} total</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={myWorkOnly ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setMyWorkOnly(!myWorkOnly)}
              data-testid="my-work-toggle"
              disabled={!currentUserId}
              title={currentUserId ? undefined : "Sign in to filter to your tasks"}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              My work
              {myWorkCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-background/30">
                  {myWorkCount}
                </span>
              )}
            </Button>
            {view !== "dashboard" && view !== "calendar" && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Group by
                </span>
                <Select
                  value={groupBy}
                  onValueChange={(v) => setGroupBy(v as GroupBy)}
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs" data-testid="group-by-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="assignee">Assignee</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  data-testid="saved-views-button"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {savedViews.find((v) => v.id === activeViewId)?.name ?? "Views"}
                  {savedViews.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      ({savedViews.length})
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {savedViews.length === 0 && (
                  <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                    No saved views yet.
                  </div>
                )}
                {savedViews.map((v) => (
                  <DropdownMenuItem
                    key={v.id}
                    className="flex items-center justify-between gap-2 group"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleApplyView(v);
                    }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {v.id === activeViewId && (
                        <Check className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{v.name}</span>
                    </span>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteView(v.id);
                      }}
                      title="Delete view"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleSaveView();
                  }}
                  className="border-t mt-1 pt-1.5 text-primary font-medium"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save current view…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("kanban")}
                title="Board"
              >
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("table")}
                title="Table"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("calendar")}
                title="Calendar"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "timeline" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("timeline")}
                title="Timeline"
                data-testid="view-timeline-button"
              >
                <GanttChartSquare className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "workload" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("workload")}
                title="Workload"
                data-testid="view-workload-button"
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "dashboard" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("dashboard")}
                title="Dashboard"
              >
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates((v) => !v)}
              className={showTemplates ? "bg-muted" : ""}
            >
              <BookTemplate className="h-4 w-4 mr-1" /> Templates
            </Button>
            {!showAdd && (
              <Button onClick={() => setShowAdd(true)} size="sm" data-testid="add-task-button">
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            )}
          </div>
        </div>

        {showTemplates && (
          <div className="border border-border rounded-xl bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Apply Task Template</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTemplates(false)}><X className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Choose a template to batch-create a set of related tasks in Backlog.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {TASK_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="border border-border rounded-lg p-3 bg-background hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-sm font-medium">{tmpl.name}</p>
                      <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">{tmpl.tasks.length} tasks</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 mb-3 pl-2">
                    {tmpl.tasks.slice(0, 3).map((t) => (
                      <li key={t.title} className="list-disc list-inside truncate">{t.title}</li>
                    ))}
                    {tmpl.tasks.length > 3 && <li className="list-disc list-inside text-muted-foreground/60">+{tmpl.tasks.length - 3} more…</li>}
                  </ul>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => handleApplyTemplate(tmpl)}
                    disabled={applyingTemplate !== null}
                  >
                    {applyingTemplate === tmpl.id ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Creating…</>
                    ) : (
                      <><Plus className="h-3 w-3 mr-1" /> Apply</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <TaskFiltersBar
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          availableTags={allTags}
          availableAssignees={assigneeOptions}
        />

        {selectedTasks.size > 0 && (
          <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
            <span className="text-xs text-muted-foreground">{selectedTasks.size} selected</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>
              {tasks && tasks.length > 0 && selectedTasks.size === tasks.length ? "Deselect all" : "Select all"}
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              {MONDAY_STATUS_ORDER.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] px-2"
                  onClick={() => handleBulkStatus(s)}
                >
                  Move to {MONDAY_STATUS_LABEL[s]}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setSelectedTasks(new Set())}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <Card className="bg-card border-primary/40 mb-4" data-testid="task-form-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Add Task</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Design combat icons" autoFocus /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!formData.title}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-full w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {view === "dashboard" && (
            <TasksDashboard
              tasks={visibleTasks}
              users={users ?? []}
              onSelectTask={setDetailTask}
            />
          )}

          {view === "kanban" && (
            <div className="flex gap-4 flex-1 items-start overflow-x-auto pb-2">
              {groups.map((group) => {
                const doneCount = group.tasks.filter((t) => t.status === "done").length;
                const pct = group.tasks.length > 0 ? Math.round((doneCount / group.tasks.length) * 100) : 0;
                const isDropTarget = dragOverGroupId === group.id && groupBy !== "none";
                return (
                  <div
                    key={group.id}
                    className={cn(
                      "bg-sidebar rounded-xl p-3 flex flex-col gap-3 max-h-full border min-w-[260px] w-[260px] shrink-0 transition-colors",
                      isDropTarget
                        ? "border-primary border-2 bg-primary/5"
                        : "border-border",
                    )}
                    onDragOver={(e) => {
                      if (draggedTaskId == null || groupBy === "none") return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverGroupId !== group.id) setDragOverGroupId(group.id);
                    }}
                    onDragLeave={(e) => {
                      // Only clear when leaving the column entirely (not a child).
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverGroupId === group.id) setDragOverGroupId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnGroup(group);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 min-w-0">
                        {group.statusKey ? (
                          <StatusPill status={group.statusKey} size="sm" />
                        ) : (
                          <span className="truncate">{group.label}</span>
                        )}
                        <span className="bg-background text-muted-foreground text-xs px-2 py-0.5 rounded-full border border-border shrink-0">
                          {group.tasks.length}
                        </span>
                      </h3>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-background shrink-0" onClick={() => setShowAdd(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {group.tasks.length > 0 && (
                      <div className="h-1 bg-background/60 rounded-full overflow-hidden -mt-1">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                          title={`${pct}% done`}
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 min-h-[60px]">
                      {group.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          users={users ?? []}
                          isSelected={selectedTasks.has(task.id)}
                          onClick={() => setDetailTask(task)}
                          onSelectToggle={() => toggleSelect(task.id)}
                          draggable={groupBy !== "none"}
                          onDragStart={(id) => setDraggedTaskId(id)}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverGroupId(null);
                          }}
                        />
                      ))}
                      {group.tasks.length === 0 && (
                        <div
                          className={cn(
                            "border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors",
                            isDropTarget
                              ? "border-primary text-primary opacity-100"
                              : "border-border opacity-50",
                          )}
                        >
                          <CheckSquare className="h-6 w-6 text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">
                            {isDropTarget ? "Drop here" : "No tasks"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "table" && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-2 w-8">
                      <button onClick={selectAll} className="flex items-center justify-center w-4 h-4">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          tasks && tasks.length > 0 && selectedTasks.size === tasks.length
                            ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                        }`}>
                          {tasks && tasks.length > 0 && selectedTasks.size === tasks.length && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      </button>
                    </th>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Task</th>
                    <th className="p-2 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="p-2 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Priority</th>
                    <th className="p-2 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Assignees</th>
                    <th className="p-2 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Due</th>
                    <th className="p-2 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Tags</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tasks?.map((task) => (
                    <Fragment key={task.id}>
                    <tr
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedTasks.has(task.id) ? "bg-primary/5" : ""}`}
                      onClick={() => setDetailTask(task)}
                    >
                      <td className="p-2" onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedTasks.has(task.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                        }`}>
                          {selectedTasks.has(task.id) && <Check className="h-3 w-3" />}
                        </div>
                      </td>
                      <td className="p-1" onClick={(e) => { e.stopPropagation(); toggleExpanded(task.id); }}>
                        <button
                          className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
                          title="Show sub-items"
                          data-testid={`task-expand-${task.id}`}
                        >
                          {expandedTaskIds.has(task.id)
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="p-2">
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && <div className="text-xs text-muted-foreground line-clamp-1">{task.description}</div>}
                      </td>
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <StatusPill
                          status={task.status}
                          size="sm"
                          onChange={(next) => handleQuickStatus(task, next)}
                        />
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex -space-x-1">
                          {task.assigneeIds.slice(0, 3).map((id) => {
                            const u = users?.find((x) => x.id === id);
                            const initial = (u?.firstName?.[0] ?? u?.email?.[0] ?? "?").toUpperCase();
                            return (
                              <div key={id} className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] ring-1 ring-background">
                                {initial}
                              </div>
                            );
                          })}
                          {task.assigneeIds.length > 3 && (
                            <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[9px] ring-1 ring-background">
                              +{task.assigneeIds.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[9px] px-1 h-4">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailTask(task)}><Edit2 className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { deleteTask.mutate({ projectId, taskId: task.id }); qc.invalidateQueries({ queryKey: getListRichTasksQueryKey(projectId) }); }} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {expandedTaskIds.has(task.id) && (
                      <tr className="bg-muted/20">
                        <td colSpan={9} className="p-0">
                          <SubtaskRow taskId={task.id} projectId={projectId} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "timeline" && (() => {
            const start = subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 0);
            const days = eachDayOfInterval({ start, end: addDays(start, 13) });
            const datedTasks = (visibleTasks ?? []).filter((t) => t.dueDate);
            const inWindow = datedTasks.filter((t) => {
              const d = new Date(t.dueDate!);
              return days.some((x) => isSameDay(x, d));
            });
            const outOfWindow = datedTasks.length - inWindow.length;
            const undated = (visibleTasks?.length ?? 0) - datedTasks.length;
            return (
              <div className="border rounded-lg overflow-auto bg-card">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `260px repeat(14, minmax(54px, 1fr))` }}
                >
                  <div className="bg-muted/50 border-b border-r p-2 text-[11px] uppercase text-muted-foreground font-medium sticky left-0 z-10">
                    Task
                  </div>
                  {days.map((d) => (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "border-b border-r p-1 text-center",
                        isToday(d) && "bg-primary/10",
                        isWeekend(d) && !isToday(d) && "bg-muted/30",
                      )}
                    >
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {format(d, "EEE")}
                      </div>
                      <div
                        className={cn(
                          "text-sm font-semibold",
                          isToday(d) && "text-primary",
                        )}
                      >
                        {format(d, "d")}
                      </div>
                    </div>
                  ))}
                  {inWindow.length === 0 && (
                    <div className="col-span-full p-10 text-center text-sm text-muted-foreground">
                      No tasks with due dates in this window.
                    </div>
                  )}
                  {inWindow.map((task) => {
                    const dueIdx = days.findIndex((d) =>
                      isSameDay(d, new Date(task.dueDate!)),
                    );
                    return (
                      <Fragment key={task.id}>
                        <button
                          onClick={() => setDetailTask(task)}
                          className="border-b border-r p-2 text-left text-xs hover:bg-muted/30 sticky left-0 bg-card z-10 min-w-0"
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="mt-1">
                            <StatusPill status={task.status} size="sm" />
                          </div>
                        </button>
                        {days.map((d, i) => (
                          <div
                            key={i}
                            className={cn(
                              "border-b border-r relative h-14",
                              isToday(d) && "bg-primary/5",
                              isWeekend(d) && !isToday(d) && "bg-muted/20",
                            )}
                          >
                            {i === dueIdx && (
                              <button
                                onClick={() => setDetailTask(task)}
                                className={cn(
                                  "absolute inset-1 rounded-md text-[10px] text-white px-2 py-1 truncate text-left font-medium hover:opacity-90 transition-opacity shadow-sm",
                                  MONDAY_STATUS_BG[task.status],
                                )}
                                title={task.title}
                              >
                                {task.title}
                              </button>
                            )}
                          </div>
                        ))}
                      </Fragment>
                    );
                  })}
                </div>
                {(outOfWindow > 0 || undated > 0) && (
                  <div className="px-3 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground flex gap-3">
                    {outOfWindow > 0 && <span>{outOfWindow} dated task{outOfWindow === 1 ? "" : "s"} outside this window</span>}
                    {undated > 0 && <span>{undated} task{undated === 1 ? "" : "s"} without a due date</span>}
                  </div>
                )}
              </div>
            );
          })()}

          {view === "workload" && (() => {
            const start = startOfWeek(new Date(), { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end: addDays(start, 13) });
            // Active people = anyone assigned to at least one visible task
            const activeUserIds = Array.from(
              new Set((visibleTasks ?? []).flatMap((t) => t.assigneeIds)),
            );
            const activeUsers = activeUserIds
              .map((id) => users?.find((u) => u.id === id))
              .filter((u): u is NonNullable<typeof u> => !!u);
            const intensityClass = (n: number) => {
              if (n === 0) return "bg-card text-muted-foreground/50";
              if (n === 1) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
              if (n === 2) return "bg-emerald-500/40 text-emerald-900 dark:text-emerald-100";
              if (n === 3) return "bg-amber-500/50 text-amber-900 dark:text-amber-100";
              if (n === 4) return "bg-orange-500/60 text-white";
              return "bg-red-500/80 text-white";
            };
            return (
              <div className="border rounded-lg overflow-auto bg-card">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `220px repeat(14, minmax(48px, 1fr))` }}
                >
                  <div className="bg-muted/50 border-b border-r p-2 text-[11px] uppercase text-muted-foreground font-medium sticky left-0 z-10">
                    Person
                  </div>
                  {days.map((d) => (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "border-b border-r p-1 text-center",
                        isToday(d) && "bg-primary/10",
                        isWeekend(d) && !isToday(d) && "bg-muted/30",
                      )}
                    >
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {format(d, "EEE")}
                      </div>
                      <div className={cn("text-sm font-semibold", isToday(d) && "text-primary")}>
                        {format(d, "d")}
                      </div>
                    </div>
                  ))}
                  {activeUsers.length === 0 && (
                    <div className="col-span-full p-10 text-center text-sm text-muted-foreground">
                      No assigned tasks to show workload for.
                    </div>
                  )}
                  {activeUsers.map((u) => {
                    const initial = (u.firstName?.[0] ?? u.email?.[0] ?? "?").toUpperCase();
                    const totalLoad = (visibleTasks ?? []).filter(
                      (t) => t.assigneeIds.includes(u.id) && t.status !== "done",
                    ).length;
                    return (
                      <Fragment key={u.id}>
                        <div className="border-b border-r p-2 sticky left-0 bg-card z-10 flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">
                              {u.firstName || u.email}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {totalLoad} open
                            </div>
                          </div>
                        </div>
                        {days.map((d) => {
                          const dayTasks = (visibleTasks ?? []).filter(
                            (t) =>
                              t.assigneeIds.includes(u.id) &&
                              t.dueDate &&
                              isSameDay(new Date(t.dueDate), d),
                          );
                          const n = dayTasks.length;
                          return (
                            <button
                              key={d.toISOString()}
                              type="button"
                              disabled={n === 0}
                              onClick={() => n === 1 && setDetailTask(dayTasks[0])}
                              title={
                                n === 0
                                  ? ""
                                  : dayTasks.map((t) => t.title).join("\n")
                              }
                              className={cn(
                                "border-b border-r h-14 flex items-center justify-center text-sm font-semibold transition-colors",
                                intensityClass(n),
                                n > 0 && "hover:opacity-80 cursor-pointer",
                              )}
                            >
                              {n > 0 ? n : ""}
                            </button>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </div>
                <div className="px-3 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-3">
                  <span>Workload</span>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={cn(
                          "h-3 w-6 rounded text-[9px] flex items-center justify-center",
                          intensityClass(n),
                        )}
                      >
                        {n === 5 ? "5+" : n}
                      </div>
                    ))}
                  </div>
                  <span className="ml-auto">Click a single-task cell to open it</span>
                </div>
              </div>
            );
          })()}

          {view === "calendar" && (
            <div className="flex flex-col h-full">
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1 font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 flex-1">
                {calendarDays.map((day) => {
                  const dayTasks = tasks?.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day)) ?? [];
                  return (
                    <div
                      key={day.toISOString()}
                      className={`border rounded-md p-1.5 min-h-[100px] ${isToday(day) ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}
                    >
                      <div className={`text-xs font-medium mb-1 ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => setDetailTask(task)}
                            className={`text-[10px] w-full text-left px-1.5 py-0.5 rounded truncate block ${PRIORITY_COLORS[task.priority]} border`}
                          >
                            {task.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <TaskDetailDrawer
        task={detailTask}
        open={!!detailTask}
        onOpenChange={(open) => !open && setDetailTask(null)}
        projectId={projectId}
      />
    </div>
  );
}

// ─── SubtaskRow: inline expandable sub-items panel for the table view ─────
interface SubtaskRowProps {
  taskId: number;
  projectId: number;
}

function SubtaskRow({ taskId, projectId }: SubtaskRowProps) {
  const { data: subtasks, isLoading } = useListSubtasks(taskId, projectId);
  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtask();
  const deleteSubtask = useDeleteSubtask();
  const [input, setInput] = useState("");

  const handleAdd = async () => {
    const title = input.trim();
    if (!title) return;
    setInput("");
    await createSubtask.mutateAsync({ taskId, title, projectId });
  };

  const completed = subtasks?.filter((s) => s.completed).length ?? 0;
  const total = subtasks?.length ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="px-10 py-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Sub-items
        </span>
        {total > 0 && (
          <>
            <span className="text-[11px] text-muted-foreground">
              {completed}/{total}
            </span>
            <div className="h-1 flex-1 max-w-[120px] bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>
      {isLoading && (
        <div className="text-xs text-muted-foreground py-1">Loading…</div>
      )}
      <div className="space-y-1">
        {subtasks?.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-2 group rounded px-1 py-0.5 hover:bg-background/60"
          >
            <button
              onClick={() =>
                toggleSubtask.mutate({ subtaskId: sub.id, taskId, projectId })
              }
              className={cn(
                "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                sub.completed
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-muted-foreground hover:border-primary",
              )}
              data-testid={`subtask-toggle-${sub.id}`}
            >
              {sub.completed && <Check className="h-3 w-3" />}
            </button>
            <span
              className={cn(
                "text-xs flex-1",
                sub.completed && "line-through text-muted-foreground",
              )}
            >
              {sub.title}
            </span>
            <button
              onClick={() =>
                deleteSubtask.mutate({ subtaskId: sub.id, taskId, projectId })
              }
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
              title="Delete sub-item"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="+ Add sub-item"
          className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none text-xs py-1"
          data-testid={`subtask-input-${taskId}`}
        />
        {input.trim() && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAdd}
            className="h-7 text-xs"
          >
            Add
          </Button>
        )}
      </div>
    </div>
  );
}
