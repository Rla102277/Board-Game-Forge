import { useMemo, useState } from "react";
import {
  useGetSnapshotRules,
  useListRules,
  useListSnapshots,
  getListSnapshotsQueryKey,
  getGetSnapshotRulesQueryKey,
  getListRulesQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, Pencil, GitCompare } from "lucide-react";

const CURRENT_OPTION_VALUE = "__current__";

interface DiffRule {
  title: string;
  content: string;
  category: string | null;
  section: string | null;
  displayOrder: number;
}

interface SnapshotRulesDiffDialogProps {
  projectId: number;
  baseSnapshotId: number;
  baseSnapshotName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SnapshotRulesDiffDialog({
  projectId,
  baseSnapshotId,
  baseSnapshotName,
  open,
  onOpenChange,
}: SnapshotRulesDiffDialogProps) {
  // The "right" side of the diff. Defaults to "current" — the live project state,
  // which is the most useful question: "what changed since this snapshot?"
  const [compareTo, setCompareTo] = useState<string>(CURRENT_OPTION_VALUE);

  const { data: snapshots } = useListSnapshots(projectId, {
    query: {
      enabled: open,
      queryKey: getListSnapshotsQueryKey(projectId),
    },
  });

  const baseQuery = useGetSnapshotRules(projectId, baseSnapshotId, {
    query: {
      enabled: open,
      queryKey: getGetSnapshotRulesQueryKey(projectId, baseSnapshotId),
    },
  });

  const compareSnapshotId =
    compareTo === CURRENT_OPTION_VALUE ? null : Number(compareTo);

  const compareSnapshotQuery = useGetSnapshotRules(
    projectId,
    compareSnapshotId ?? 0,
    {
      query: {
        enabled: open && compareSnapshotId !== null,
        queryKey: getGetSnapshotRulesQueryKey(projectId, compareSnapshotId ?? 0),
      },
    },
  );

  const liveRulesQuery = useListRules(projectId, {
    query: {
      enabled: open && compareTo === CURRENT_OPTION_VALUE,
      queryKey: getListRulesQueryKey(projectId),
    },
  });

  const baseRules: DiffRule[] | null = useMemo(
    () => (baseQuery.data?.rules ? baseQuery.data.rules.map(toDiffRule) : null),
    [baseQuery.data],
  );

  const compareRules: DiffRule[] | null = useMemo(() => {
    if (compareTo === CURRENT_OPTION_VALUE) {
      const live = liveRulesQuery.data;
      if (!live) return null;
      return live.map(toDiffRule);
    }
    return compareSnapshotQuery.data?.rules
      ? compareSnapshotQuery.data.rules.map(toDiffRule)
      : null;
  }, [compareTo, liveRulesQuery.data, compareSnapshotQuery.data]);

  const compareLabel =
    compareTo === CURRENT_OPTION_VALUE
      ? "Current (live)"
      : snapshots?.find((s) => s.id === Number(compareTo))?.name ?? "snapshot";

  const isLoading =
    baseQuery.isLoading ||
    (compareTo === CURRENT_OPTION_VALUE
      ? liveRulesQuery.isLoading
      : compareSnapshotQuery.isLoading);

  const otherSnapshots = (snapshots ?? []).filter((s) => s.id !== baseSnapshotId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Compare rules
          </DialogTitle>
          <DialogDescription>
            See what's been added, removed, or changed in your rulebook between
            two versions. Rules are matched by title.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm border rounded-md p-3 bg-muted/30">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              From
            </div>
            <div className="font-medium truncate" title={baseSnapshotName}>
              {baseSnapshotName}
            </div>
          </div>
          <div className="text-muted-foreground hidden sm:block">→</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              To
            </div>
            <Select value={compareTo} onValueChange={setCompareTo}>
              <SelectTrigger
                className="h-9"
                data-testid="compare-target-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CURRENT_OPTION_VALUE}>
                  Current (live)
                </SelectItem>
                {otherSnapshots.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading || !baseRules || !compareRules ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <DiffBody
              fromRules={baseRules}
              toRules={compareRules}
              fromLabel={baseSnapshotName}
              toLabel={compareLabel}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function toDiffRule(r: {
  title: string;
  content: string;
  category?: string | null;
  section?: string | null;
  displayOrder?: number;
}): DiffRule {
  return {
    title: r.title,
    content: r.content,
    category: r.category ?? null,
    section: r.section ?? null,
    displayOrder: r.displayOrder ?? 0,
  };
}

function normalizeKey(title: string): string {
  return title.trim().toLowerCase();
}

interface DiffBodyProps {
  fromRules: DiffRule[];
  toRules: DiffRule[];
  fromLabel: string;
  toLabel: string;
}

function DiffBody({ fromRules, toRules, fromLabel, toLabel }: DiffBodyProps) {
  const fromMap = new Map<string, DiffRule>();
  for (const r of fromRules) {
    const key = normalizeKey(r.title);
    if (key) fromMap.set(key, r);
  }
  const toMap = new Map<string, DiffRule>();
  for (const r of toRules) {
    const key = normalizeKey(r.title);
    if (key) toMap.set(key, r);
  }

  const added: DiffRule[] = [];
  const removed: DiffRule[] = [];
  const modified: Array<{ from: DiffRule; to: DiffRule }> = [];
  const unchangedCount = { value: 0 };

  // Walk "to" first to keep added in display order of the new state.
  for (const [key, to] of toMap) {
    const from = fromMap.get(key);
    if (!from) {
      added.push(to);
    } else if (
      from.content.trim() !== to.content.trim() ||
      (from.category ?? "") !== (to.category ?? "") ||
      (from.section ?? "") !== (to.section ?? "")
    ) {
      modified.push({ from, to });
    } else {
      unchangedCount.value += 1;
    }
  }
  for (const [key, from] of fromMap) {
    if (!toMap.has(key)) removed.push(from);
  }

  const hasAnyChanges =
    added.length > 0 || removed.length > 0 || modified.length > 0;

  if (!hasAnyChanges) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No rule changes between these versions.
        <div className="text-xs mt-1">
          {unchangedCount.value} rule{unchangedCount.value === 1 ? "" : "s"} are
          identical.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2" data-testid="snapshot-rules-diff-body">
      <div className="flex flex-wrap gap-2 text-xs">
        {added.length > 0 && (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-300 border-green-500/30"
          >
            + {added.length} added
          </Badge>
        )}
        {removed.length > 0 && (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-300 border-red-500/30"
          >
            − {removed.length} removed
          </Badge>
        )}
        {modified.length > 0 && (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-300 border-amber-500/30"
          >
            ~ {modified.length} modified
          </Badge>
        )}
        {unchangedCount.value > 0 && (
          <Badge variant="outline" className="text-muted-foreground">
            {unchangedCount.value} unchanged
          </Badge>
        )}
      </div>

      {added.length > 0 && (
        <DiffSection
          title={`Added in "${toLabel}"`}
          icon={<Plus className="h-3.5 w-3.5 text-green-400" />}
        >
          {added.map((r) => (
            <RuleCard
              key={`added-${r.title}`}
              rule={r}
              accent="green"
              testId="diff-rule-added"
            />
          ))}
        </DiffSection>
      )}

      {removed.length > 0 && (
        <DiffSection
          title={`Removed since "${fromLabel}"`}
          icon={<Minus className="h-3.5 w-3.5 text-red-400" />}
        >
          {removed.map((r) => (
            <RuleCard
              key={`removed-${r.title}`}
              rule={r}
              accent="red"
              testId="diff-rule-removed"
            />
          ))}
        </DiffSection>
      )}

      {modified.length > 0 && (
        <DiffSection
          title="Changed"
          icon={<Pencil className="h-3.5 w-3.5 text-amber-400" />}
        >
          {modified.map(({ from, to }) => (
            <ModifiedRuleCard
              key={`mod-${to.title}`}
              from={from}
              to={to}
              fromLabel={fromLabel}
              toLabel={toLabel}
            />
          ))}
        </DiffSection>
      )}
    </div>
  );
}

function DiffSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon}
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const ACCENT_CLASSES = {
  green:
    "border-green-500/30 bg-green-500/5",
  red: "border-red-500/30 bg-red-500/5",
  amber: "border-amber-500/30 bg-amber-500/5",
} as const;

function RuleCard({
  rule,
  accent,
  testId,
}: {
  rule: DiffRule;
  accent: keyof typeof ACCENT_CLASSES;
  testId?: string;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${ACCENT_CLASSES[accent]}`}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="font-medium text-sm">{rule.title}</span>
        {rule.category && (
          <Badge variant="outline" className="text-[10px]">
            {rule.category}
          </Badge>
        )}
        {rule.section && (
          <span className="text-[10px] text-muted-foreground">
            in {rule.section}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {rule.content || <em className="opacity-60">(empty)</em>}
      </p>
    </div>
  );
}

function ModifiedRuleCard({
  from,
  to,
  fromLabel,
  toLabel,
}: {
  from: DiffRule;
  to: DiffRule;
  fromLabel: string;
  toLabel: string;
}) {
  // Guard against pathologically large rule bodies. The LCS table is O(m*n)
  // memory; a 2000-line rule is ~32MB and can jank/crash the tab. Above the
  // threshold we fall back to side-by-side text without per-line diff.
  const MAX_DIFF_LINES = 500;
  const MAX_DIFF_CHARS = 20_000;
  const fromLineCount = from.content.split("\n").length;
  const toLineCount = to.content.split("\n").length;
  const tooLarge =
    fromLineCount + toLineCount > MAX_DIFF_LINES ||
    from.content.length + to.content.length > MAX_DIFF_CHARS;

  const lines = tooLarge ? null : lineDiff(from.content, to.content);

  return (
    <div
      className={`rounded-md border p-3 ${ACCENT_CLASSES.amber}`}
      data-testid="diff-rule-modified"
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="font-medium text-sm">{to.title}</span>
        {to.category && (
          <Badge variant="outline" className="text-[10px]">
            {to.category}
          </Badge>
        )}
        {(from.category ?? "") !== (to.category ?? "") && (
          <span className="text-[10px] text-amber-300">
            (was: {from.category ?? "uncategorized"})
          </span>
        )}
      </div>
      {tooLarge ? (
        <div className="space-y-2">
          <div className="text-[11px] text-muted-foreground italic">
            Content changed (too large to diff inline). Showing both versions.
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed bg-red-500/5 border border-red-500/20 rounded p-2 overflow-x-auto max-h-64 overflow-y-auto">
              <div className="text-[10px] text-red-300 mb-1">
                − {fromLabel}
              </div>
              {from.content}
            </pre>
            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed bg-green-500/5 border border-green-500/20 rounded p-2 overflow-x-auto max-h-64 overflow-y-auto">
              <div className="text-[10px] text-green-300 mb-1">
                + {toLabel}
              </div>
              {to.content}
            </pre>
          </div>
        </div>
      ) : (
        <>
      <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed bg-background/50 rounded p-2 overflow-x-auto">
        {lines!.length === 0 ? (
          <span className="text-muted-foreground italic">(content empty)</span>
        ) : (
          lines!.map((l, i) => (
            <div
              key={i}
              className={
                l.kind === "add"
                  ? "text-green-300 bg-green-500/10"
                  : l.kind === "del"
                    ? "text-red-300 bg-red-500/10 line-through decoration-red-300/40"
                    : "text-muted-foreground"
              }
            >
              <span className="opacity-50 select-none mr-2">
                {l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}
              </span>
              {l.text || " "}
            </div>
          ))
        )}
      </pre>
      <div className="text-[10px] text-muted-foreground mt-1.5 flex gap-3">
        <span>
          <span className="text-red-300">−</span> {fromLabel}
        </span>
        <span>
          <span className="text-green-300">+</span> {toLabel}
        </span>
      </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny LCS-based line diff. Good enough for paragraph-sized rule bodies; we
// don't pull in a diff library for this.

interface DiffLine {
  kind: "ctx" | "add" | "del";
  text: string;
}

function lineDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const m = aLines.length;
  const n = bLines.length;

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) {
        dp[i]![j] = dp[i + 1]![j + 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) {
      out.push({ kind: "ctx", text: aLines[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: "del", text: aLines[i]! });
      i++;
    } else {
      out.push({ kind: "add", text: bLines[j]! });
      j++;
    }
  }
  while (i < m) out.push({ kind: "del", text: aLines[i++]! });
  while (j < n) out.push({ kind: "add", text: bLines[j++]! });
  return out;
}
