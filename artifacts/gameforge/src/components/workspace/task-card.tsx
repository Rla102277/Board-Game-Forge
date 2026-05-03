import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PRIORITY_COLORS, type RichTask, type CollaboratorUser } from "@/lib/collaboration-types";
import { StatusPill } from "./status-pill";
import { Calendar, Clock, MessageSquare, CheckSquare, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: RichTask;
  users: CollaboratorUser[];
  commentCount?: number;
  subtaskCount?: number;
  subtaskCompleted?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onSelectToggle?: () => void;
  draggable?: boolean;
  onDragStart?: (taskId: number) => void;
  onDragEnd?: () => void;
}

export function TaskCard({
  task,
  users,
  commentCount = 0,
  subtaskCount = 0,
  subtaskCompleted = 0,
  isSelected = false,
  onClick,
  onSelectToggle,
  draggable = false,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <Card
      className={cn(
        "bg-card border-border hover:border-primary/40 transition-all cursor-pointer group select-none",
        isSelected && "ring-2 ring-primary border-primary",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
      onClick={onClick}
      draggable={draggable}
      onDragStart={() => onDragStart?.(task.id)}
      onDragEnd={onDragEnd}
    >
      {onSelectToggle && (
        <div
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onSelectToggle();
          }}
        >
          <div
            className={cn(
              "h-4 w-4 rounded border flex items-center justify-center",
              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground bg-background"
            )}
          >
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      )}

      <CardHeader className="p-3 pb-1 space-y-0 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium leading-snug line-clamp-2 pr-1">
          {task.title}
        </CardTitle>
        {draggable && (
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-50 shrink-0" />
        )}
      </CardHeader>

      <CardContent className="p-3 pt-1 space-y-2">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-normal ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </Badge>
          <StatusPill status={task.status} size="sm" />
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((id) => {
              const user = users.find((u) => u.id === id);
              const initial = (user?.firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();
              return (
                <Avatar key={id} className="h-5 w-5 ring-2 ring-card">
                  {user?.imageUrl && <AvatarImage src={user.imageUrl} alt="" />}
                  <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {task.assigneeIds.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center ring-2 ring-card text-[8px] text-muted-foreground">
                +{task.assigneeIds.length - 3}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            {task.dueDate && (
              <div className={cn("flex items-center gap-1 text-[10px]", isOverdue && "text-red-400")}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), "MMM d")}
              </div>
            )}
            {task.estimatedHours && (
              <div className="flex items-center gap-1 text-[10px]">
                <Clock className="h-3 w-3" />
                {task.estimatedHours}h
              </div>
            )}
            {commentCount > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                <MessageSquare className="h-3 w-3" />
                {commentCount}
              </div>
            )}
            {subtaskCount > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                <CheckSquare className="h-3 w-3" />
                {subtaskCompleted}/{subtaskCount}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
