import { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus, ChevronDown, ChevronUp, Star, Trash2, Edit2,
  Users, ThumbsUp, AlertTriangle, ListChecks, ClipboardList, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlaytestReport, PlaytestReportActionItem, CreatePlaytestReportBody } from "@workspace/api-client-react";

async function fetchReports(projectId: number): Promise<PlaytestReport[]> {
  const res = await fetch(`/api/projects/${projectId}/playtest-reports`);
  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
}

async function createReport(projectId: number, body: CreatePlaytestReportBody): Promise<PlaytestReport> {
  const res = await fetch(`/api/projects/${projectId}/playtest-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create report");
  return res.json();
}

async function updateReport(
  projectId: number,
  reportId: number,
  body: Partial<CreatePlaytestReportBody>,
): Promise<PlaytestReport> {
  const res = await fetch(`/api/projects/${projectId}/playtest-reports/${reportId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update report");
  return res.json();
}

async function deleteReport(projectId: number, reportId: number): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/playtest-reports/${reportId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete report");
}

async function createTask(
  projectId: number,
  title: string,
  description?: string,
): Promise<{ id: number }> {
  const res = await fetch(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, status: "backlog", priority: "medium", category: "design" }),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

const REPORTS_KEY = (projectId: number) => [`/api/projects/${projectId}/playtest-reports`] as const;

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`h-4 w-4 transition-colors ${
              s <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

interface ReportFormData {
  date: string;
  attendeesRaw: string;
  rating: number;
  whatWorked: string;
  whatBroke: string;
  actionItemsRaw: string;
}

function emptyForm(): ReportFormData {
  return {
    date: new Date().toISOString().slice(0, 10),
    attendeesRaw: "",
    rating: 0,
    whatWorked: "",
    whatBroke: "",
    actionItemsRaw: "",
  };
}

function formToBody(
  form: ReportFormData,
  originalItems?: PlaytestReportActionItem[],
): CreatePlaytestReportBody {
  const attendees = form.attendeesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origByText = new Map<string, PlaytestReportActionItem>(
    (originalItems ?? []).map((a) => [a.text, a]),
  );

  const actionItems: PlaytestReportActionItem[] = form.actionItemsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => {
      const orig = origByText.get(text);
      return orig
        ? { text, done: orig.done ?? false, linkedTaskId: orig.linkedTaskId }
        : { text, done: false };
    });

  return {
    date: form.date ? new Date(form.date).toISOString() : undefined,
    attendees: attendees.length ? attendees : undefined,
    rating: form.rating || undefined,
    whatWorked: form.whatWorked || undefined,
    whatBroke: form.whatBroke || undefined,
    actionItems: actionItems.length ? actionItems : undefined,
  };
}

function reportToForm(r: PlaytestReport): ReportFormData {
  return {
    date: r.date ? r.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    attendeesRaw: (r.attendees ?? []).join(", "),
    rating: r.rating ?? 0,
    whatWorked: r.whatWorked ?? "",
    whatBroke: r.whatBroke ?? "",
    actionItemsRaw: (r.actionItems ?? []).map((a) => a.text).join("\n"),
  };
}

interface ReportFormProps {
  initial?: ReportFormData;
  originalItems?: PlaytestReportActionItem[];
  onSubmit: (form: ReportFormData, originalItems?: PlaytestReportActionItem[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function ReportForm({ initial, originalItems, onSubmit, onCancel, isSubmitting }: ReportFormProps) {
  const [form, setForm] = useState<ReportFormData>(initial ?? emptyForm());

  const set = (key: keyof ReportFormData, val: string | number) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form, originalItems);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="report-date">Session date</Label>
          <Input
            id="report-date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Overall rating</Label>
          <div className="flex items-center gap-2 h-9">
            <StarRating value={form.rating} onChange={(v) => set("rating", v)} />
            {form.rating > 0 && (
              <button
                type="button"
                onClick={() => set("rating", 0)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-attendees">Attendees (comma-separated)</Label>
        <Input
          id="report-attendees"
          placeholder="Alice, Bob, Charlie"
          value={form.attendeesRaw}
          onChange={(e) => set("attendeesRaw", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="report-worked">What worked</Label>
          <Textarea
            id="report-worked"
            rows={4}
            placeholder="Mechanics that felt good..."
            value={form.whatWorked}
            onChange={(e) => set("whatWorked", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-broke">What broke / confused players</Label>
          <Textarea
            id="report-broke"
            rows={4}
            placeholder="Pain points and confusion..."
            value={form.whatBroke}
            onChange={(e) => set("whatBroke", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-actions">Action items (one per line)</Label>
        <Textarea
          id="report-actions"
          rows={3}
          placeholder="Rewrite the scoring rule&#10;Reduce hand size to 5&#10;Add a timer reminder"
          value={form.actionItemsRaw}
          onChange={(e) => set("actionItemsRaw", e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Log report"}
        </Button>
      </div>
    </form>
  );
}

interface ActionItemRowProps {
  item: PlaytestReportActionItem;
  idx: number;
  projectId: number;
  reportId: number;
  allItems: PlaytestReportActionItem[];
  onUpdated: () => void;
}

function ActionItemRow({ item, idx, projectId, reportId, allItems, onUpdated }: ActionItemRowProps) {
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);

  const updateMut = useMutation({
    mutationFn: (items: PlaytestReportActionItem[]) =>
      updateReport(projectId, reportId, { actionItems: items }),
    onSuccess: onUpdated,
  });

  const toggleDone = () => {
    const updated = allItems.map((a, i) =>
      i === idx ? { ...a, done: !a.done } : a,
    );
    updateMut.mutate(updated);
  };

  const convertToTask = async () => {
    if (item.linkedTaskId || converting || converted) return;
    setConverting(true);
    try {
      const task = await createTask(
        projectId,
        item.text,
        "Created from playtest report action item.",
      );
      const updated = allItems.map((a, i) =>
        i === idx ? { ...a, linkedTaskId: task.id } : a,
      );
      await updateReport(projectId, reportId, { actionItems: updated });
      onUpdated();
      setConverted(true);
    } catch {
      setConverting(false);
    }
  };

  const isLinked = !!item.linkedTaskId;

  return (
    <li className="flex items-start gap-2">
      <Checkbox
        checked={!!item.done}
        onCheckedChange={toggleDone}
        className="mt-0.5 h-4 w-4 shrink-0"
        disabled={updateMut.isPending}
      />
      <span
        className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}
      >
        {item.text}
      </span>
      {isLinked || converted ? (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
          <ExternalLink className="h-3 w-3" />
          Task #{item.linkedTaskId ?? "created"}
        </span>
      ) : (
        <button
          type="button"
          onClick={convertToTask}
          disabled={converting}
          className="flex items-center gap-0.5 text-xs text-primary hover:underline shrink-0 disabled:opacity-50"
          title="Convert to design problem (creates a Task)"
        >
          {converting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "→ Task"
          )}
        </button>
      )}
    </li>
  );
}

interface ReportCardProps {
  report: PlaytestReport;
  projectId: number;
  onDeleted: () => void;
  onUpdated: () => void;
}

function ReportCard({ report, projectId, onDeleted, onUpdated }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const updateMut = useMutation({
    mutationFn: (body: Partial<CreatePlaytestReportBody>) =>
      updateReport(projectId, report.id, body),
    onSuccess: onUpdated,
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteReport(projectId, report.id),
    onSuccess: onDeleted,
  });

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-4">
          <ReportForm
            initial={reportToForm(report)}
            originalItems={report.actionItems ?? []}
            onSubmit={(form, origItems) =>
              updateMut.mutate(formToBody(form, origItems), {
                onSuccess: () => setEditing(false),
              })
            }
            onCancel={() => setEditing(false)}
            isSubmitting={updateMut.isPending}
          />
        </CardContent>
      </Card>
    );
  }

  const dateLabel = (() => {
    try {
      return format(new Date(report.date), "MMM d, yyyy");
    } catch {
      return report.date;
    }
  })();

  const doneCount = (report.actionItems ?? []).filter((a) => a.done).length;
  const totalCount = (report.actionItems ?? []).length;

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-sm">{dateLabel}</span>
            {report.rating != null && report.rating > 0 && (
              <StarRating value={report.rating} />
            )}
            {report.attendees && report.attendees.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {report.attendees.slice(0, 3).join(", ")}
                {report.attendees.length > 3 && ` +${report.attendees.length - 3}`}
              </div>
            )}
            {totalCount > 0 && (
              <Badge
                variant={doneCount === totalCount ? "default" : "secondary"}
                className="text-xs"
              >
                {doneCount}/{totalCount} done
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pb-4 px-4 space-y-4">
          {report.whatWorked && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <ThumbsUp className="h-3.5 w-3.5" />
                What worked
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {report.whatWorked}
              </p>
            </div>
          )}

          {report.whatBroke && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                What broke / confused players
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {report.whatBroke}
              </p>
            </div>
          )}

          {report.actionItems && report.actionItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                Action items
                <span className="text-muted-foreground font-normal">
                  — click "→ Task" to create a design problem
                </span>
              </div>
              <ul className="space-y-1.5">
                {report.actionItems.map((item, idx) => (
                  <ActionItemRow
                    key={idx}
                    item={item}
                    idx={idx}
                    projectId={projectId}
                    reportId={report.id}
                    allItems={report.actionItems ?? []}
                    onUpdated={onUpdated}
                  />
                ))}
              </ul>
            </div>
          )}

          {!report.whatWorked && !report.whatBroke && (!report.actionItems || report.actionItems.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No details recorded.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface PlaytestReportsProps {
  projectId: number;
}

export function PlaytestReports({ projectId }: PlaytestReportsProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: REPORTS_KEY(projectId),
    queryFn: () => fetchReports(projectId),
    enabled: !!projectId,
  });

  const createMut = useMutation({
    mutationFn: (body: CreatePlaytestReportBody) => createReport(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY(projectId) });
      setShowForm(false);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: REPORTS_KEY(projectId) });

  const sorted = (reports ?? []).slice().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const avgRating = sorted.length
    ? sorted.reduce((acc, r) => acc + (r.rating ?? 0), 0) / sorted.filter((r) => r.rating != null).length || null
    : null;
  const totalActionItems = sorted.reduce((acc, r) => acc + (r.actionItems?.length ?? 0), 0);
  const openActionItems = sorted.reduce(
    (acc, r) => acc + (r.actionItems?.filter((i) => !i.done).length ?? 0),
    0,
  );
  const totalAttendees = sorted.reduce((acc, r) => acc + (r.attendees?.length ?? 0), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Playtest Reports</h2>
          <p className="text-sm text-muted-foreground">
            Log session feedback, ratings, and action items from each playtest.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Log session
        </Button>
      </div>
      {sorted.length > 0 && (
        <div className="flex items-center gap-6 px-6 py-2 border-b border-border bg-muted/30 shrink-0 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{sorted.length}</span>
            {sorted.length === 1 ? "session" : "sessions"}
          </span>
          {avgRating != null && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span className="font-medium text-foreground">{avgRating.toFixed(1)}</span>
              avg rating
            </span>
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{totalAttendees}</span>
            attendees
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{openActionItems}</span>
            {openActionItems === 1 ? "open action" : "open actions"}
            {totalActionItems > 0 && (
              <span className="text-xs text-muted-foreground/70">/ {totalActionItems}</span>
            )}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {showForm && (
          <Card className="border-primary/40">
            <CardContent className="pt-4">
              <h3 className="font-medium text-sm mb-4">New playtest report</h3>
              <ReportForm
                onSubmit={(form) => createMut.mutate(formToBody(form))}
                onCancel={() => setShowForm(false)}
                isSubmitting={createMut.isPending}
              />
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="bg-muted rounded-full p-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No playtest reports yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                After each session, log what worked, what broke, and your next steps.
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowForm(true)} className="gap-1.5 mt-2">
              <Plus className="h-4 w-4" />
              Log your first session
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                projectId={projectId}
                onDeleted={invalidate}
                onUpdated={invalidate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
