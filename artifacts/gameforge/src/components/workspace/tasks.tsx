import { useState } from "react";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, CheckSquare, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Task } from "@workspace/api-client-react";

interface TasksProps {
  projectId: number;
}

const COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" }
];

export function Tasks({ projectId }: TasksProps) {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useListTasks(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ title: "", description: "", status: "backlog" });

  const handleCreate = async () => {
    if (!formData.title) return;
    await createTask.mutateAsync({ projectId, data: formData });
    setIsCreateOpen(false);
    setFormData({ title: "", description: "", status: "backlog" });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
  };

  const handleUpdate = async () => {
    if (!editTaskId || !formData.title) return;
    await updateTask.mutateAsync({ projectId, taskId: editTaskId, data: formData });
    setEditTaskId(null);
    setFormData({ title: "", description: "", status: "backlog" });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
  };

  const handleDelete = async (id: number) => {
    await deleteTask.mutateAsync({ projectId, taskId: id });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
  };

  const setStatus = async (id: number, status: string) => {
    await updateTask.mutateAsync({ projectId, taskId: id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
  };

  const openEdit = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status
    });
    setEditTaskId(task.id);
  };

  const groupedTasks = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks?.filter(t => t.status === col.id) || [];
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="h-full flex flex-col pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Project Tasks</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData({ title: "", description: "", status: "backlog" })}>
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Design combat icons" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  {COLUMNS.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!formData.title}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-6 flex-1">
          {[1,2,3].map(i => <Skeleton key={i} className="h-full w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
          {COLUMNS.map(col => (
            <div key={col.id} className="bg-sidebar rounded-xl p-4 flex flex-col gap-4 max-h-full border border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  {col.label} 
                  <span className="bg-background text-muted-foreground text-xs px-2 py-0.5 rounded-full border border-border">{groupedTasks[col.id].length}</span>
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-background" onClick={() => { setFormData({ title: "", description: "", status: col.id }); setIsCreateOpen(true); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {groupedTasks[col.id].map(task => (
                  <Card key={task.id} className="bg-card border-border hover:border-primary/50 transition-colors group cursor-default">
                    <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between space-y-0">
                      <CardTitle className="text-sm font-medium leading-tight line-clamp-2 pr-2">{task.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(task)}><Edit2 className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{task.description}</p>}
                      <select 
                        className="w-full bg-background border border-border rounded text-xs p-1 mt-auto"
                        value={task.status}
                        onChange={(e) => setStatus(task.id, e.target.value)}
                      >
                        {COLUMNS.map(c => <option key={c.id} value={c.id}>Move to {c.label}</option>)}
                      </select>
                    </CardContent>
                  </Card>
                ))}
                {groupedTasks[col.id].length === 0 && (
                  <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center opacity-50">
                    <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTaskId} onOpenChange={o => !o && setEditTaskId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                {COLUMNS.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdate} disabled={!formData.title}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
