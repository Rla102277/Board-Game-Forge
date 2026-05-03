import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Zap, ArrowRight } from "lucide-react";
import { useDesignerArtifact } from "@/hooks/use-designer-artifact";
import { useListProjectUsers } from "@/hooks/use-collaboration";
import { MONDAY_STATUS_LABEL, MONDAY_STATUS_BG, MONDAY_STATUS_ORDER } from "./status-pill";
import type { TaskStatus } from "@/lib/collaboration-types";

export type AutomationTarget = "assignees" | "user";

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { type: "status_change"; toStatus: TaskStatus | "any" };
  action: { type: "notify"; target: AutomationTarget; userId?: number };
}

interface Automations {
  rules: AutomationRule[];
}

const DEFAULT: Automations = { rules: [] };

const TEMPLATES: Array<Omit<AutomationRule, "id" | "enabled"> & { id?: string }> = [
  {
    name: "When status → Stuck, notify all assignees",
    trigger: { type: "status_change", toStatus: "blocked" },
    action: { type: "notify", target: "assignees" },
  },
  {
    name: "When status → Review, notify all assignees",
    trigger: { type: "status_change", toStatus: "review" },
    action: { type: "notify", target: "assignees" },
  },
  {
    name: "Whenever status changes, notify all assignees",
    trigger: { type: "status_change", toStatus: "any" },
    action: { type: "notify", target: "assignees" },
  },
];

interface Props {
  projectId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AutomationsDialog({ projectId, open, onOpenChange }: Props) {
  const { state, setState, isLoading } = useDesignerArtifact<Automations>(
    projectId,
    "tasks-automations",
    () => DEFAULT,
  );
  const { data: users } = useListProjectUsers(projectId);

  const [draft, setDraft] = useState<{
    name: string;
    toStatus: TaskStatus | "any";
    target: AutomationTarget;
    userId?: number;
  }>({
    name: "",
    toStatus: "done",
    target: "assignees",
  });

  const rules = state.rules ?? [];

  const update = (next: AutomationRule[]) => setState({ rules: next });

  const addRule = (r: Omit<AutomationRule, "id">) => {
    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    update([...rules, { ...r, id }]);
  };

  const handleAdd = () => {
    if (!draft.name.trim()) return;
    addRule({
      name: draft.name.trim(),
      enabled: true,
      trigger: { type: "status_change", toStatus: draft.toStatus },
      action: {
        type: "notify",
        target: draft.target,
        ...(draft.target === "user" ? { userId: draft.userId } : {}),
      },
    });
    setDraft({ name: "", toStatus: "done", target: "assignees" });
  };

  const userName = (id: number) => {
    const u = users?.find((x) => x.id === id);
    if (!u) return `User #${id}`;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User #${id}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Automations
          </DialogTitle>
          <DialogDescription>
            Trigger notifications when task status changes. Rules run on every project task.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading rules…</div>
        ) : (
          <div className="space-y-4">
            {/* Existing rules */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Active rules ({rules.length})
              </h3>
              {rules.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground text-center">
                  No automation rules yet. Try a template below.
                </Card>
              ) : (
                rules.map((r) => (
                  <Card key={r.id} className="p-3 flex items-start gap-3">
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) =>
                        update(rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>When status</span>
                        <ArrowRight className="h-3 w-3" />
                        {r.trigger.toStatus === "any" ? (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">any</span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-white text-[10px] font-bold ${
                              MONDAY_STATUS_BG[r.trigger.toStatus as TaskStatus] ?? "bg-gray-500"
                            }`}
                          >
                            {MONDAY_STATUS_LABEL[r.trigger.toStatus as TaskStatus] ?? r.trigger.toStatus}
                          </span>
                        )}
                        <span>· notify</span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-foreground">
                          {r.action.target === "assignees"
                            ? "all assignees"
                            : r.action.userId != null
                              ? userName(r.action.userId)
                              : "no user"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => update(rules.filter((x) => x.id !== r.id))}
                      title="Delete rule"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </Card>
                ))
              )}
            </div>

            {/* Templates */}
            {rules.length === 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick start
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      className="text-left p-2 border rounded-md hover:bg-muted/30 text-sm flex items-center justify-between gap-2"
                      onClick={() => addRule({ ...t, enabled: true })}
                    >
                      <span>{t.name}</span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom rule builder */}
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Build a custom rule
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Rule name (e.g. 'Notify when stuck')"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="sm:col-span-2 h-9 text-sm"
                />
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">When status →</label>
                  <Select
                    value={draft.toStatus}
                    onValueChange={(v) => setDraft({ ...draft, toStatus: v as TaskStatus | "any" })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any change</SelectItem>
                      {MONDAY_STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {MONDAY_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">Notify</label>
                  <Select
                    value={draft.target}
                    onValueChange={(v) => setDraft({ ...draft, target: v as AutomationTarget, userId: undefined })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignees">All assignees</SelectItem>
                      <SelectItem value="user">A specific user…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.target === "user" && (
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase text-muted-foreground">User</label>
                    <Select
                      value={draft.userId ? String(draft.userId) : ""}
                      onValueChange={(v) => setDraft({ ...draft, userId: Number(v) })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Pick a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {(users ?? []).map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User #${u.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={!draft.name.trim() || (draft.target === "user" && draft.userId == null)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add rule
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
