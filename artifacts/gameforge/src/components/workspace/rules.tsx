import { useEffect, useMemo, useState } from "react";
import {
  useListRules, useCreateRule, useUpdateRule, useDeleteRule,
  useAiGenerateRules, useAiEnhanceRule, useConflictCheckRules, getListRulesQueryKey,
  useListRuleEntities, useGetProject,
  type Rule,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Edit2, Trash2, Wand2, FileText, Sparkles, Loader2, Copy,
  ChevronDown, ChevronRight, Search, Check, X, Info, AlertTriangle,
  Lightbulb, RefreshCw, ShieldAlert,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RulesProps {
  projectId: number;
}

const CATEGORIES = ["movement", "combat", "economy", "turn_structure", "variant"] as const;

const CATEGORY_META: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  movement:        { label: "Movement",       bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30",   dot: "bg-blue-400" },
  combat:          { label: "Combat",         bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  economy:         { label: "Economy",        bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/30",  dot: "bg-amber-400" },
  turn_structure:  { label: "Turn Structure", bg: "bg-slate-500/15",  text: "text-slate-400",  border: "border-slate-500/30",  dot: "bg-slate-400" },
  variant:         { label: "Variant",        bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
};

const catMeta = (cat?: string | null) => {
  const key = (cat ?? "").toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_META[key] ?? {
    label: cat || "uncategorized",
    bg: "bg-primary/15",
    text: "text-primary",
    border: "border-primary/30",
    dot: "bg-primary",
  };
};

function PriorityDots({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(5, value || 0));
  return (
    <div className="flex items-center gap-0.5" title={`Priority ${safe}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= safe ? "bg-primary" : "bg-border"}`}
        />
      ))}
    </div>
  );
}

type AIEnhance = {
  rewrittenContent: string;
  improvedTitle: string;
  designNotes?: string;
  edgeCases?: string;
  narrativeApplied?: boolean;
  relatedRuleSuggestions?: { title: string; content: string; category: string }[];
};

const COLLAPSE_THRESHOLD = 240;

export function Rules({ projectId }: RulesProps) {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useListRules(projectId);
  const { data: project } = useGetProject(projectId);
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const aiGenerate = useAiGenerateRules();
  const conflictCheck = useConflictCheckRules();
  const { toast } = useToast();

  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [narrativeRuleIds, setNarrativeRuleIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`gameforge:narrative-rule-ids:${projectId}`);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch { return new Set(); }
  });
  const [narrativeEnhanceRuleIds, setNarrativeEnhanceRuleIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`gameforge:narrative-enhance-rule-ids:${projectId}`);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem(`gameforge:narrative-rule-ids:${projectId}`, JSON.stringify([...narrativeRuleIds])); }
    catch { /* quota exceeded – ignore */ }
  }, [narrativeRuleIds, projectId]);

  useEffect(() => {
    try { localStorage.setItem(`gameforge:narrative-enhance-rule-ids:${projectId}`, JSON.stringify([...narrativeEnhanceRuleIds])); }
    catch { /* quota exceeded – ignore */ }
  }, [narrativeEnhanceRuleIds, projectId]);

  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConflictsOpen, setIsConflictsOpen] = useState(false);
  const [conflictReport, setConflictReport] = useState<{
    summary: string;
    conflicts: Array<{ ruleIds: number[]; severity: string; description: string; suggestion?: string }>;
  } | null>(null);
  const [editRuleId, setEditRuleId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "", category: "", priority: 0 });

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });

  const handleCreate = async () => {
    if (!formData.title || !formData.content) return;
    try {
      await createRule.mutateAsync({ projectId, data: formData });
      setIsCreateOpen(false);
      setFormData({ title: "", content: "", category: "", priority: 0 });
      refresh();
      toast({ title: "Rule created" });
    } catch (err) {
      toast({ title: "Could not create rule", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editRuleId || !formData.title || !formData.content) return;
    try {
      await updateRule.mutateAsync({ projectId, ruleId: editRuleId, data: formData });
      setEditRuleId(null);
      setFormData({ title: "", content: "", category: "", priority: 0 });
      refresh();
      toast({ title: "Rule updated" });
    } catch (err) {
      toast({ title: "Could not update rule", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRule.mutateAsync({ projectId, ruleId: id });
      refresh();
      toast({ title: "Rule deleted" });
    } catch (err) {
      toast({ title: "Could not delete rule", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    try {
      const result = await aiGenerate.mutateAsync({ projectId, data: { prompt: aiPrompt, count: 3 } });
      setAiPrompt("");
      setIsAiOpen(false);
      refresh();
      if (result.narrativeApplied) {
        setNarrativeRuleIds((prev) => new Set([...prev, ...result.items.map((r) => r.id)]));
      }
      toast({
        title: result.narrativeApplied
          ? "AI rules generated · Narrative applied"
          : "AI rules generated",
        description: result.narrativeApplied
          ? "Rules are grounded in your game's narrative."
          : undefined,
      });
    } catch (err) {
      toast({ title: "AI generate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const closeForms = () => {
    setIsAiOpen(false);
    setIsCreateOpen(false);
    setEditRuleId(null);
    setFormData({ title: "", content: "", category: "", priority: 0 });
  };

  const openCreate = () => {
    setEditRuleId(null);
    setIsAiOpen(false);
    setFormData({ title: "", content: "", category: "movement", priority: 1 });
    setIsCreateOpen(true);
  };

  const openAi = () => {
    setIsCreateOpen(false);
    setEditRuleId(null);
    setIsAiOpen(true);
  };

  const isFormPanelOpen = isAiOpen || isCreateOpen || editRuleId !== null;

  const handleConflictCheck = async () => {
    setIsConflictsOpen(true);
    setConflictReport(null);
    try {
      const report = await conflictCheck.mutateAsync({ projectId });
      setConflictReport(report);
    } catch (err) {
      toast({ title: "Conflict check failed", description: errMsg(err), variant: "destructive" });
      setIsConflictsOpen(false);
    }
  };

  const handleDuplicate = async (rule: Rule) => {
    setDuplicatingId(rule.id);
    try {
      await createRule.mutateAsync({
        projectId,
        data: {
          title: `${rule.title} (Copy)`,
          content: rule.content,
          category: rule.category || "",
          priority: rule.priority || 0,
        },
      });
      refresh();
      toast({ title: "Rule duplicated" });
    } catch (err) {
      toast({ title: "Duplicate failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setDuplicatingId(null);
    }
  };

  const openEdit = (rule: Rule) => {
    setIsAiOpen(false);
    setIsCreateOpen(false);
    setFormData({
      title: rule.title,
      content: rule.content,
      category: rule.category || "",
      priority: rule.priority || 0,
    });
    setEditRuleId(rule.id);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allCategories = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    (rules ?? []).forEach((r) => { if (r.category) set.add(r.category.toLowerCase().replace(/\s+/g, "_")); });
    return [...set];
  }, [rules]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    (rules ?? []).forEach((r) => {
      const key = (r.category ?? "").toLowerCase().replace(/\s+/g, "_") || "uncategorized";
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }, [rules]);

  const sortedRules = useMemo(() => {
    if (!rules) return [];
    let list = [...rules];
    if (categoryFilter !== "all") {
      list = list.filter((r) => (r.category ?? "").toLowerCase().replace(/\s+/g, "_") === categoryFilter);
    }
    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        (r.content || "").toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => {
      if ((a.priority ?? 0) !== (b.priority ?? 0)) return (b.priority ?? 0) - (a.priority ?? 0);
      return (a.category || "").localeCompare(b.category || "");
    });
  }, [rules, filter, categoryFilter]);

  const totalRules = rules?.length ?? 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold leading-tight">Rules Library</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {totalRules} {totalRules === 1 ? "rule" : "rules"} · click <span className="text-primary font-medium">AI</span> on any card to enhance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleConflictCheck}
            disabled={conflictCheck.isPending}
            className="gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
            data-testid="rules-conflicts-button"
          >
            {conflictCheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Conflicts
          </Button>
          {!isFormPanelOpen && (
            <>
              <Button
                onClick={openAi}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="rules-ai-generate"
              >
                <Sparkles className="h-4 w-4" /> AI Generate
              </Button>
              <Button
                onClick={openCreate}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="rules-add-button"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Inline AI Generate panel */}
      {isAiOpen && (
        <Card className="bg-card border-primary/40" data-testid="rules-ai-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Generate rules with AI</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Describe the kind of rules you want — the AI will draft them using your project's narrative seed as context.</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForms}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {project?.narrative && (
              <div className="rounded-md bg-violet-500/10 border border-violet-500/20 px-3 py-2 text-xs text-violet-300 flex gap-2 items-start">
                <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-violet-400" />
                <span className="line-clamp-2 italic">
                  {project.narrative.length > 120 ? project.narrative.slice(0, 120) + "…" : project.narrative}
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rules-ai-prompt">What kind of rules?</Label>
              <Input
                id="rules-ai-prompt"
                placeholder="e.g. combat resolution mechanics…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                data-testid="rules-ai-prompt"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForms}>Cancel</Button>
              <Button onClick={handleAiGenerate} disabled={!aiPrompt || aiGenerate.isPending} className="gap-1.5">
                {aiGenerate.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline Add / Edit Rule panel */}
      {(isCreateOpen || editRuleId !== null) && (
        <Card className="bg-card border-primary/40" data-testid="rules-form-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{editRuleId !== null ? "Edit rule" : "Add rule"}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForms}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} autoFocus /></div>
            <div className="space-y-2"><Label>Content *</Label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="min-h-[120px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={(formData.category || "movement").toLowerCase()} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{catMeta(c).label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority (0–5)</Label>
                <Input type="number" min={0} max={5} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Math.max(0, Math.min(5, parseInt(e.target.value) || 0)) })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForms}>Cancel</Button>
              <Button
                onClick={editRuleId !== null ? handleUpdate : handleCreate}
                disabled={!formData.title || !formData.content}
              >
                {editRuleId !== null ? "Save changes" : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter rules…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-background h-8 pl-8 text-sm"
            data-testid="rules-search"
          />
        </div>
        <button
          onClick={() => setCategoryFilter("all")}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
            categoryFilter === "all"
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-background text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          All <span className="opacity-60">({totalRules})</span>
        </button>
        {allCategories.map((c) => {
          const meta = catMeta(c);
          const isActive = categoryFilter === c;
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
                isActive ? `${meta.bg} ${meta.text} ${meta.border}` : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
              <span className="opacity-60">({counts[c] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !rules || rules.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No rules yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">Generate rules with AI or add them manually.</p>
        </div>
      ) : sortedRules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
          <p className="text-muted-foreground text-sm">No rules match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              projectId={projectId}
              isExpanded={expandedIds.has(rule.id)}
              onToggle={() => toggleExpand(rule.id)}
              onEdit={() => openEdit(rule)}
              onDuplicate={() => handleDuplicate(rule)}
              onDelete={() => handleDelete(rule.id)}
              isDuplicating={duplicatingId === rule.id}
              onUpdated={refresh}
              isNarrativeGrounded={narrativeRuleIds.has(rule.id)}
              onNarrativeEnhanced={(id) =>
                setNarrativeEnhanceRuleIds((prev) => new Set([...prev, id]))
              }
              isNarrativeEnhanced={narrativeEnhanceRuleIds.has(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Conflicts Dialog */}
      <Dialog open={isConflictsOpen} onOpenChange={setIsConflictsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" /> Rule conflicts
            </DialogTitle>
            <DialogDescription>The AI scans every rule for contradictions, ambiguities, and overlaps.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto" data-testid="conflicts-report">
            {conflictCheck.isPending || !conflictReport ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Scanning rules…
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground/90">{conflictReport.summary}</p>
                {conflictReport.conflicts.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
                    <Check className="h-4 w-4" /> No conflicts found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conflictReport.conflicts.map((c, i) => {
                      const sev = c.severity?.toLowerCase();
                      const sevBg =
                        sev === "high"   ? "border-red-500/40 bg-red-500/5" :
                        sev === "medium" ? "border-amber-500/40 bg-amber-500/5" :
                                           "border-slate-500/40 bg-slate-500/5";
                      const sevText =
                        sev === "high"   ? "text-red-400" :
                        sev === "medium" ? "text-amber-400" :
                                           "text-slate-400";
                      return (
                        <div key={i} className={`rounded-md border p-3 space-y-2 ${sevBg}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${sevText}`}>{c.severity}</span>
                              {c.ruleIds?.length > 0 && (
                                <span className="text-[11px] text-muted-foreground">Rules: {c.ruleIds.join(", ")}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-foreground/90">{c.description}</p>
                          {c.suggestion && (
                            <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 italic">
                              <span className="text-primary font-semibold not-italic">Suggestion:</span> {c.suggestion}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConflictsOpen(false)}>Close</Button>
            <Button
              onClick={handleConflictCheck}
              disabled={conflictCheck.isPending}
              className="gap-1.5"
            >
              {conflictCheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Re-scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Linked entities for a rule ────────────────────────────────────────────────
const ENTITY_TYPE_COLORS: Record<string, string> = {
  Card:"bg-violet-500/15 text-violet-300 border-violet-500/30",
  Deck:"bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  Token:"bg-amber-500/15 text-amber-300 border-amber-500/30",
  Die:"bg-red-500/15 text-red-300 border-red-500/30",
  Tile:"bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Meeple:"bg-blue-500/15 text-blue-300 border-blue-500/30",
  Board:"bg-slate-500/15 text-slate-300 border-slate-500/30",
  Location:"bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Faction:"bg-purple-500/15 text-purple-300 border-purple-500/30",
  Event:"bg-orange-500/15 text-orange-300 border-orange-500/30",
  Resource:"bg-teal-500/15 text-teal-300 border-teal-500/30",
  Ability:"bg-pink-500/15 text-pink-300 border-pink-500/30",
};
function LinkedEntitiesBar({ projectId, ruleId }: { projectId: number; ruleId: number }) {
  const { data: ents } = useListRuleEntities(projectId, ruleId);
  if (!ents || ents.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Governs:</span>
      {ents.map((e) => (
        <span key={e.id} className={`text-[10px] font-medium border rounded px-1.5 py-0.5 ${ENTITY_TYPE_COLORS[e.type] ?? "bg-primary/15 text-primary border-primary/30"}`}>
          {e.name}
        </span>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Rule Card — header, expand/collapse, AI Enhance preview with designer notes
// ════════════════════════════════════════════════════════════════════════════
function RuleCard({
  rule, projectId, isExpanded, onToggle, onEdit, onDuplicate, onDelete, isDuplicating, onUpdated,
  isNarrativeGrounded, isNarrativeEnhanced, onNarrativeEnhanced,
}: {
  rule: Rule;
  projectId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDuplicating: boolean;
  onUpdated: () => void;
  isNarrativeGrounded?: boolean;
  isNarrativeEnhanced?: boolean;
  onNarrativeEnhanced?: (ruleId: number) => void;
}) {
  const queryClient = useQueryClient();
  const updateRule = useUpdateRule();
  const createRule = useCreateRule();
  const enhanceRule = useAiEnhanceRule();
  const { toast } = useToast();

  const [showEnhance, setShowEnhance] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhance, setEnhance] = useState<AIEnhance | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  const meta = catMeta(rule.category);
  const content = rule.content || "";
  const isLong = content.length > COLLAPSE_THRESHOLD;
  const display = !isExpanded && isLong ? content.slice(0, COLLAPSE_THRESHOLD).trimEnd() + "…" : content;

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const handleEnhance = async () => {
    setIsEnhancing(true);
    setEnhance(null);
    setShowEnhance(true);
    try {
      const raw = await enhanceRule.mutateAsync({ projectId, ruleId: rule.id }) as Partial<AIEnhance> | null;
      const safeRelated = Array.isArray(raw?.relatedRuleSuggestions)
        ? raw!.relatedRuleSuggestions.filter((s): s is { title: string; content: string; category: string } =>
            !!s &&
            typeof s === "object" &&
            typeof s.title === "string" &&
            typeof s.content === "string",
          ).map((s) => ({
            title: s.title,
            content: s.content,
            category: typeof s.category === "string" ? s.category : "movement",
          }))
        : [];
      const data: AIEnhance = {
        rewrittenContent: typeof raw?.rewrittenContent === "string" ? raw.rewrittenContent : "",
        improvedTitle: typeof raw?.improvedTitle === "string" ? raw.improvedTitle : rule.title,
        designNotes: typeof raw?.designNotes === "string" ? raw.designNotes : undefined,
        edgeCases: typeof raw?.edgeCases === "string" ? raw.edgeCases : undefined,
        narrativeApplied: raw?.narrativeApplied === true,
        relatedRuleSuggestions: safeRelated,
      };
      if (!data.rewrittenContent) {
        toast({
          title: "AI returned no usable rewrite",
          description: "Try regenerating with a different model.",
          variant: "destructive",
        });
        setShowEnhance(false);
      } else {
        if (data.narrativeApplied) onNarrativeEnhanced?.(rule.id);
        setEnhance(data);
      }
    } catch {
      toast({
        title: "AI enhance failed",
        description: "Could not reach the server.",
        variant: "destructive",
      });
      setShowEnhance(false);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApply = async () => {
    if (!enhance) return;
    setApplying(true);
    try {
      await updateRule.mutateAsync({
        projectId,
        ruleId: rule.id,
        data: {
          title: enhance.improvedTitle || rule.title,
          content: enhance.rewrittenContent,
          ...(enhance.designNotes ? { designNotes: enhance.designNotes } : {}),
          ...(enhance.edgeCases ? { edgeCases: enhance.edgeCases } : {}),
        },
      });
      setApplied(true);
      onUpdated();
      toast({ title: "Rewrite applied" });
      setTimeout(() => {
        setShowEnhance(false);
        setApplied(false);
        setEnhance(null);
      }, 1200);
    } catch (err) {
      toast({ title: "Apply failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleAddSuggestion = async (s: { title: string; content: string; category: string }, idx: number) => {
    setAddingIdx(idx);
    try {
      await createRule.mutateAsync({
        projectId,
        data: { title: s.title, content: s.content, category: s.category, priority: 1 },
      });
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
      toast({ title: `Added "${s.title}"` });
    } catch (err) {
      toast({ title: "Could not add rule", description: errMsg(err), variant: "destructive" });
    } finally {
      setAddingIdx(null);
    }
  };

  return (
    <Card
      className="bg-card border-border overflow-hidden transition-shadow hover:shadow-md hover:shadow-black/20 group"
      data-testid={`rule-card-${rule.id}`}
    >
      {/* colored top accent stripe */}
      <div className={`h-0.5 w-full ${meta.dot} opacity-70`} />

      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
        <button
          className="flex-1 min-w-0 text-left"
          onClick={onToggle}
          data-testid={`expand-rule-${rule.id}`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className="text-base font-semibold leading-tight text-white">{rule.title}</span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.text} ${meta.border}`}>
              {meta.label}
            </span>
            {(isNarrativeGrounded || isNarrativeEnhanced) && (
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30 flex items-center gap-1"
                title="This rule was created or enhanced using your game's narrative seed"
                data-testid={`narrative-badge-${rule.id}`}
              >
                <Sparkles className="h-2.5 w-2.5" />
                Narrative
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground pl-5">
            <PriorityDots value={rule.priority || 0} />
            <span>Priority {rule.priority || 0}</span>
          </div>
        </button>

        <div className="flex gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs h-8 px-2 gap-1 ${showEnhance ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
            onClick={handleEnhance}
            disabled={isEnhancing}
            title="AI Enhance"
            data-testid={`enhance-rule-${rule.id}`}
          >
            {isEnhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            AI
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={onDuplicate}
            disabled={isDuplicating}
            title="Duplicate"
            data-testid={`duplicate-rule-${rule.id}`}
          >
            {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={onEdit}
            title="Edit"
            data-testid={`edit-rule-${rule.id}`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
            onClick={onDelete}
            title="Delete"
            data-testid={`delete-rule-${rule.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="pt-0 pb-3 pl-9">
        <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{display}</div>
        {isLong && (
          <button
            onClick={onToggle}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            {isExpanded ? <><ChevronDown className="h-3 w-3" /> Show less</> : <><ChevronRight className="h-3 w-3" /> Show more</>}
          </button>
        )}

        {isExpanded && <LinkedEntitiesBar projectId={projectId} ruleId={rule.id} />}

        {isExpanded && (rule.designNotes || rule.edgeCases) && (
          <div
            className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3"
            data-testid={`rule-meta-${rule.id}`}
          >
            {rule.designNotes && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3 h-3" /> Designer's Notes
                </p>
                <p
                  className="text-xs text-muted-foreground leading-relaxed bg-background/40 border border-border/50 rounded p-2.5 whitespace-pre-wrap"
                  data-testid={`rule-design-notes-${rule.id}`}
                >
                  {rule.designNotes}
                </p>
              </div>
            )}
            {rule.edgeCases && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Edge Cases
                </p>
                <p
                  className="text-xs text-muted-foreground leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded p-2.5 whitespace-pre-wrap"
                  data-testid={`rule-edge-cases-${rule.id}`}
                >
                  {rule.edgeCases}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* AI Enhance Panel */}
      {showEnhance && (
        <div className="border-t border-border bg-primary/5 px-5 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-primary flex-1">AI Enhancement</p>
            {enhance?.narrativeApplied && !isEnhancing && (
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30 flex items-center gap-1"
                title="Narrative seed was used in this enhancement"
                data-testid={`enhance-narrative-badge-${rule.id}`}
              >
                <Sparkles className="h-2.5 w-2.5" />
                Narrative
              </span>
            )}
            {isEnhancing && <span className="text-xs text-muted-foreground">Analyzing rule…</span>}
            <button
              onClick={() => { setShowEnhance(false); setEnhance(null); }}
              className="text-muted-foreground hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isEnhancing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Enhancing rule…
            </div>
          )}

          {enhance && !isEnhancing && (
            <div className="space-y-3" data-testid={`enhance-panel-${rule.id}`}>
              {/* Rewritten content */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rewritten Rule</p>
                {enhance.improvedTitle && enhance.improvedTitle !== rule.title && (
                  <p className="text-xs font-semibold text-white">→ {enhance.improvedTitle}</p>
                )}
                <p className="text-sm text-foreground/90 leading-relaxed bg-background/50 border border-border rounded-md p-3 whitespace-pre-wrap">
                  {enhance.rewrittenContent}
                </p>
              </div>

              {/* Designer's notes & Edge cases */}
              {(enhance.designNotes || enhance.edgeCases) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {enhance.designNotes && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Info className="w-3 h-3" /> Designer's Notes
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed bg-background/40 border border-border/50 rounded p-2.5">
                        {enhance.designNotes}
                      </p>
                    </div>
                  )}
                  {enhance.edgeCases && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Edge Cases
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded p-2.5">
                        {enhance.edgeCases}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Related rule suggestions */}
              {enhance.relatedRuleSuggestions && enhance.relatedRuleSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Suggested Related Rules
                  </p>
                  <div className="space-y-1.5">
                    {enhance.relatedRuleSuggestions.map((s, i) => {
                      const sm = catMeta(s.category);
                      return (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded border border-border bg-muted/10">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <p className="text-xs font-medium text-white">{s.title}</p>
                              <Badge variant="outline" className={`text-[10px] ${sm.bg} ${sm.text} ${sm.border}`}>
                                {sm.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.content}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddSuggestion(s, i)}
                            disabled={addingIdx === i}
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 shrink-0 gap-1"
                            data-testid={`add-suggestion-${rule.id}-${i}`}
                          >
                            {addingIdx === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Apply / Regenerate / Dismiss */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={applying || applied}
                  className="bg-primary text-primary-foreground gap-1.5"
                  data-testid={`apply-enhance-${rule.id}`}
                >
                  {applied
                    ? <><Check className="w-3.5 h-3.5" />Applied!</>
                    : applying
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Applying…</>
                    : <><Wand2 className="w-3.5 h-3.5" />Apply Rewrite</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  className="border-border text-muted-foreground hover:text-white gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowEnhance(false); setEnhance(null); }}
                  className="text-muted-foreground hover:text-white ml-auto"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
