import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Link2, X, CheckCircle2 } from "lucide-react";

interface TaskDependency {
  taskId: number;
  taskTitle: string;
  type: "blocks" | "relates_to" | "duplicate_of";
}

interface TaskDependenciesProps {
  taskId: number;
  dependencies: TaskDependency[];
  allTasks: { id: number; title: string }[];
  onAddDependency: (dependency: TaskDependency) => void;
  onRemoveDependency: (dependencyTaskId: number) => void;
}

export function TaskDependencies({ 
  taskId, 
  dependencies, 
  allTasks, 
  onAddDependency, 
  onRemoveDependency 
}: TaskDependenciesProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<TaskDependency["type"]>("blocks");

  const availableTasks = allTasks
    .filter(t => t.id !== taskId && !dependencies.find(d => d.taskId === t.id))
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const typeLabels = {
    blocks: "Blocks",
    relates_to: "Relates to",
    duplicate_of: "Duplicate of",
  };

  const typeColors = {
    blocks: "bg-red-500/20 text-red-400 border-red-500/30",
    relates_to: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    duplicate_of: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {dependencies.map((dep) => (
          <Badge key={dep.taskId} variant="outline" className={`gap-1 ${typeColors[dep.type]}`}>
            <Link2 className="h-3 w-3" />
            <span className="text-xs">{typeLabels[dep.type]}:</span>
            <span className="truncate max-w-[150px]">{dep.taskTitle}</span>
            <button
              onClick={() => onRemoveDependency(dep.taskId)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Link2 className="h-4 w-4" />
            Add Dependency
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Dependency Type</label>
              <div className="flex gap-2">
                {Object.entries(typeLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={selectedType === key ? "default" : "outline"}
                    onClick={() => setSelectedType(key as TaskDependency["type"])}
                    className="flex-1"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Select Task</label>
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks available
                </p>
              ) : (
                availableTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      onAddDependency({
                        taskId: task.id,
                        taskTitle: task.title,
                        type: selectedType,
                      });
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left"
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{task.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DependencyGraphProps {
  tasks: { id: number; title: string; dependencies: TaskDependency[] }[];
}

export function DependencyGraph({ tasks }: DependencyGraphProps) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <h4 className="font-semibold mb-4">Dependency Graph</h4>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3">
            <div className="w-32 shrink-0 text-sm font-medium truncate">{task.title}</div>
            <div className="flex-1 flex flex-wrap gap-1">
              {task.dependencies.length === 0 ? (
                <span className="text-xs text-muted-foreground">No dependencies</span>
              ) : (
                task.dependencies.map((dep) => (
                  <Badge key={dep.taskId} variant="secondary" className="text-[10px]">
                    {dep.taskTitle}
                  </Badge>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
