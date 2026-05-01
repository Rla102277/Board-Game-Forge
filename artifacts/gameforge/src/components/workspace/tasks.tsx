import { useState, useMemo } from "react";
import {
  useListRichTasks,
  useCreateRichTask,
  useUpdateRichTask,
  useDeleteRichTask,
  useListProjectUsers,
  getListRichTasksQueryKey,
} from "@/hooks/use-collaboration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Edit2, Trash2, CheckSquare, MoreHorizontal, X, CalendarDays,
  Table as TableIcon, Columns3,
  Check, XCircle,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "./task-card";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { TaskFiltersBar } from "./task-filters";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  type RichTask,
  type TaskFilter,
  type TaskSort,
  type TaskStatus,
} from "@/lib/collaboration-types";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";

interface TasksProps {
  projectId: number;
}

type ViewMode = "kanban" | "table" | "calendar";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

export function Tasks({ projectId }: TasksProps) {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [filter, setFilter] = useState<TaskFilter>({});
  const [sort, setSort] = useState<TaskSort>({ field: "createdAt", direction: "desc" });
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [detailTask, setDetailTask] = useState<RichTask | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", status: "backlog" as TaskStatus });

  const { data: tasks, isLoading } = useListRichTasks(projectId, filter, sort);
  const { data: users } = useListProjectUsers(projectId);
  const createTask = useCreateRichTask();
  const updateTask = useUpdateRichTask();
  const deleteTask = useDeleteRichTask();

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

  const groupedTasks = useMemo(() => {
    return COLUMNS.reduce((acc, col) => {
      acc[col.id] = tasks?.filter((t) => t.status === col.id) ?? [];
      return acc;
    }, {} as Record<TaskStatus, RichTask[]>);
  }, [tasks]);

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
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("kanban")}
              >
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("table")}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setView("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            {!showAdd && (
              <Button onClick={() => setShowAdd(true)} size="sm" data-testid="add-task-button">
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            )}
          </div>
        </div>

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
              {COLUMNS.map((col) => (
                <Button
                  key={col.id}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] px-2"
                  onClick={() => handleBulkStatus(col.id)}
                >
                  Move to {col.label}
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
          {view === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1 items-start overflow-x-auto pb-2">
              {COLUMNS.map((col) => (
                <div key={col.id} className="bg-sidebar rounded-xl p-3 flex flex-col gap-3 max-h-full border border-border min-w-[260px]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {STATUS_LABELS[col.id]}
                      <span className="bg-background text-muted-foreground text-xs px-2 py-0.5 rounded-full border border-border">{groupedTasks[col.id].length}</span>
                    </h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-background" onClick={() => setShowAdd(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                    {groupedTasks[col.id].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        users={users ?? []}
                        isSelected={selectedTasks.has(task.id)}
                        onClick={() => setDetailTask(task)}
                        onSelectToggle={() => toggleSelect(task.id)}
                      />
                    ))}
                    {groupedTasks[col.id].length === 0 && (
                      <div className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-center opacity-50">
                        <CheckSquare className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                    <tr
                      key={task.id}
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
                      <td className="p-2">
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && <div className="text-xs text-muted-foreground line-clamp-1">{task.description}</div>}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[task.status]}`}>
                          {STATUS_LABELS[task.status]}
                        </Badge>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
