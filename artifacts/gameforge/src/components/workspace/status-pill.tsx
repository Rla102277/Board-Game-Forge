import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TaskStatus } from "@/lib/collaboration-types";
import { cn } from "@/lib/utils";

export const MONDAY_STATUS_ORDER: TaskStatus[] = [
  "backlog",
  "in_progress",
  "review",
  "blocked",
  "done",
];

export const MONDAY_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Not Started",
  in_progress: "Working on it",
  review: "Up for Review",
  blocked: "Stuck",
  done: "Done",
};

// Solid Monday-style colors. Bold backgrounds, white text, no border.
export const MONDAY_STATUS_BG: Record<TaskStatus, string> = {
  backlog: "bg-slate-500 hover:bg-slate-600 text-white",
  in_progress: "bg-blue-500 hover:bg-blue-600 text-white",
  review: "bg-amber-500 hover:bg-amber-600 text-white",
  blocked: "bg-red-500 hover:bg-red-600 text-white",
  done: "bg-emerald-500 hover:bg-emerald-600 text-white",
};

// Pure color (no hover) for static contexts like dashboard donuts.
export const MONDAY_STATUS_HEX: Record<TaskStatus, string> = {
  backlog: "#64748b",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  blocked: "#ef4444",
  done: "#10b981",
};

interface StatusPillProps {
  status: TaskStatus;
  size?: "sm" | "md";
  onChange?: (next: TaskStatus) => void;
  className?: string;
}

/**
 * Monday.com-style status pill. When `onChange` is provided, clicking opens a
 * Popover with all 5 status swatches. Otherwise renders as a static pill.
 */
export function StatusPill({
  status,
  size = "md",
  onChange,
  className,
}: StatusPillProps) {
  const sizeClasses =
    size === "sm"
      ? "h-5 px-2 text-[10px]"
      : "h-7 px-3 text-xs";
  const base = cn(
    "inline-flex items-center justify-center font-semibold rounded-md whitespace-nowrap transition-colors",
    sizeClasses,
    MONDAY_STATUS_BG[status],
    !onChange && "cursor-default",
    onChange && "cursor-pointer",
    className,
  );

  if (!onChange) {
    return <span className={base}>{MONDAY_STATUS_LABEL[status]}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={base}
          data-testid={`status-pill-${status}`}
        >
          {MONDAY_STATUS_LABEL[status]}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-44 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          {MONDAY_STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (s !== status) onChange(s);
              }}
              className={cn(
                "h-7 px-3 rounded-md text-xs font-semibold text-left transition-colors",
                MONDAY_STATUS_BG[s],
                s === status && "ring-2 ring-offset-1 ring-offset-background ring-foreground/40",
              )}
            >
              {MONDAY_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
