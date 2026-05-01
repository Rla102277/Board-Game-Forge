import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Search,
  Filter,
  X,
  CalendarDays,
} from "lucide-react";
import type { TaskFilter, TaskSort, TaskStatus, TaskPriority } from "@/lib/collaboration-types";
import { STATUS_LABELS, PRIORITY_COLORS } from "@/lib/collaboration-types";

interface TaskFiltersProps {
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  sort: TaskSort;
  onSortChange: (sort: TaskSort) => void;
  availableTags: string[];
  availableAssignees: { id: number; name: string }[];
}

export function TaskFiltersBar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  availableTags,
  availableAssignees,
}: TaskFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const toggleStatus = (status: TaskStatus) => {
    const current = filter.status ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ ...filter, status: next.length ? next : undefined });
  };

  const togglePriority = (priority: TaskPriority) => {
    const current = filter.priority ?? [];
    const next = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onFilterChange({ ...filter, priority: next.length ? next : undefined });
  };

  const toggleTag = (tag: string) => {
    const current = filter.tags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onFilterChange({ ...filter, tags: next.length ? next : undefined });
  };

  const toggleAssignee = (id: number) => {
    const current = filter.assigneeIds ?? [];
    const next = current.includes(id)
      ? current.filter((a) => a !== id)
      : [...current, id];
    onFilterChange({ ...filter, assigneeIds: next.length ? next : undefined });
  };

  const activeCount =
    (filter.status?.length ?? 0) +
    (filter.priority?.length ?? 0) +
    (filter.tags?.length ?? 0) +
    (filter.assigneeIds?.length ?? 0) +
    (filter.search ? 1 : 0) +
    (filter.dueBefore || filter.dueAfter ? 1 : 0);

  const statuses: TaskStatus[] = ["backlog", "in_progress", "review", "blocked", "done"];
  const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filter.search ?? ""}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value || undefined })}
            className="pl-9 text-sm h-9"
          />
        </div>
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Filter className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Sort by</h4>
                <div className="flex gap-2 flex-wrap">
                  {(["dueDate", "priority", "createdAt", "title"] as const).map((field) => (
                    <button
                      key={field}
                      onClick={() =>
                        onSortChange({
                          field,
                          direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc",
                        })
                      }
                      className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                        sort.field === field
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {field === "dueDate" ? "Due Date" : field === "createdAt" ? "Created" : field === "title" ? "Title" : "Priority"}
                      {sort.field === field && (sort.direction === "asc" ? " ↑" : " ↓")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Status</h4>
                <div className="flex flex-wrap gap-1">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        filter.status?.includes(s)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Priority</h4>
                <div className="flex flex-wrap gap-1">
                  {priorities.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        filter.priority?.includes(p)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {availableAssignees.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Assignees</h4>
                  <div className="flex flex-wrap gap-1">
                    {availableAssignees.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => toggleAssignee(a.id)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          filter.assigneeIds?.includes(a.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableTags.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          filter.tags?.includes(tag)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Due Date</h4>
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {filter.dueAfter ? new Date(filter.dueAfter).toLocaleDateString() : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filter.dueAfter ? new Date(filter.dueAfter) : undefined}
                        onSelect={(d) => onFilterChange({ ...filter, dueAfter: d ? d.toISOString() : undefined })}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">—</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {filter.dueBefore ? new Date(filter.dueBefore).toLocaleDateString() : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filter.dueBefore ? new Date(filter.dueBefore) : undefined}
                        onSelect={(d) => onFilterChange({ ...filter, dueBefore: d ? d.toISOString() : undefined })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    onFilterChange({
                      search: undefined,
                      status: undefined,
                      priority: undefined,
                      assigneeIds: undefined,
                      tags: undefined,
                      dueBefore: undefined,
                      dueAfter: undefined,
                    })
                  }
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filter.search && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              Search: {filter.search}
              <button onClick={() => onFilterChange({ ...filter, search: undefined })}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filter.status?.map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] gap-1">
              {STATUS_LABELS[s]}
              <button onClick={() => toggleStatus(s)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {filter.priority?.map((p) => (
            <Badge key={p} variant="secondary" className="text-[10px] gap-1">
              {p}
              <button onClick={() => togglePriority(p)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {filter.assigneeIds?.map((id) => {
            const a = availableAssignees.find((x) => x.id === id);
            return (
              <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                {a?.name ?? id}
                <button onClick={() => toggleAssignee(id)}><X className="h-3 w-3" /></button>
              </Badge>
            );
          })}
          {filter.tags?.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] gap-1">
              {t}
              <button onClick={() => toggleTag(t)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
