import { useMemo, useState } from "react";
import {
  useListRules, useCreateRule, useUpdateRule, useDeleteRule,
  useAiGenerateRules, useAiEnhanceRule, getListRulesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Edit2, Trash2, Wand2, FileText, Sparkles, Loader2, Copy,
  ChevronDown, ChevronRight, Search,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Rule } from "@workspace/api-client-react";
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

const COLLAPSE_THRESHOLD = 240;

export function Rules({ projectId }: RulesProps) {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useListRules(projectId);
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const aiGenerate = useAiGenerateRules();
  const enhanceRule = useAiEnhanceRule();
  const { toast } = useToast();

  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [aiPrompt, setAiPrompt] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "", category: "", priority: 0 });

  const errMsg = (err: unknown) => err instanceof Error ? err.message : String(err);

  const handleCreate = async () => {
    if (!formData.title || !formData.content) return;
    try {
      await createRule.mutateAsync({ projectId, data: formData });
      setIsCreateOpen(false);
      setFormData({ title: "", content: "", category: "", priority: 0 });
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
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
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
      toast({ title: "Rule updated" });
    } catch (err) {
      toast({ title: "Could not update rule", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRule.mutateAsync({ projectId, ruleId: id });
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
      toast({ title: "Rule deleted" });
    } catch (err) {
      toast({ title: "Could not delete rule", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    try {
      await aiGenerate.mutateAsync({ projectId, data: { prompt: aiPrompt, count: 3 } });
      setAiPrompt("");
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
      toast({ title: "AI rules generated" });
    } catch (err) {
      toast({ title: "AI generate failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleEnhance = async (ruleId: number) => {
    setEnhancingId(ruleId);
    try {
      await enhanceRule.mutateAsync({ projectId, ruleId });
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
      toast({ title: "Rule enhanced", description: "AI tightened the wording." });
    } catch (err) {
      toast({
        title: "Enhance failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setEnhancingId(null);
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
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
      toast({ title: "Rule duplicated" });
    } catch (err) {
      toast({
        title: "Duplicate failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setDuplicatingId(null);
    }
  };

  const openEdit = (rule: Rule) => {
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

  // ── Categories present in the data, in addition to the canonical list ──
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

  return (
    <div className="space-y-6 pb-8">
      {/* AI Generate + Add */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="bg-primary/5 p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-[280px]">
            <Wand2 className="h-5 w-5 text-primary shrink-0" />
            <Input
              placeholder="e.g. combat resolution mechanics…"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="bg-background flex-1 max-w-lg"
              onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
              data-testid="rules-ai-prompt"
            />
            <Button onClick={handleAiGenerate} disabled={!aiPrompt || aiGenerate.isPending} data-testid="rules-ai-generate">
              {aiGenerate.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</>
              )}
            </Button>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                onClick={() => setFormData({ title: "", content: "", category: "movement", priority: 1 })}
                data-testid="rules-add-button"
              >
                <Plus className="h-4 w-4 mr-2" /> Add rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add rule</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Content *</Label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="min-h-[120px]" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category || "movement"} onValueChange={(v) => setFormData({ ...formData, category: v })}>
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
              </div>
              <DialogFooter><Button onClick={handleCreate} disabled={!formData.title || !formData.content}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter row */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
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
            All <span className="opacity-60">({rules?.length ?? 0})</span>
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
      </Card>

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
          {sortedRules.map((rule) => {
            const meta = catMeta(rule.category);
            const isExpanded = expandedIds.has(rule.id);
            const content = rule.content || "";
            const isLong = content.length > COLLAPSE_THRESHOLD;
            const display = !isExpanded && isLong ? content.slice(0, COLLAPSE_THRESHOLD).trimEnd() + "…" : content;

            return (
              <Card
                key={rule.id}
                className="bg-card border-border overflow-hidden transition-shadow hover:shadow-md hover:shadow-black/20 group"
                data-testid={`rule-card-${rule.id}`}
              >
                {/* colored top accent stripe */}
                <div className={`h-0.5 w-full ${meta.dot} opacity-70`} />

                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-semibold leading-tight">{rule.title}</CardTitle>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.text} ${meta.border}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <PriorityDots value={rule.priority || 0} />
                        <span>Priority {rule.priority || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => handleEnhance(rule.id)}
                        disabled={enhancingId === rule.id}
                        title="AI Enhance"
                        data-testid={`enhance-rule-${rule.id}`}
                      >
                        {enhancingId === rule.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => handleDuplicate(rule)}
                        disabled={duplicatingId === rule.id}
                        title="Duplicate"
                        data-testid={`duplicate-rule-${rule.id}`}
                      >
                        {duplicatingId === rule.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => openEdit(rule)}
                        title="Edit"
                        data-testid={`edit-rule-${rule.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                        onClick={() => handleDelete(rule.id)}
                        title="Delete"
                        data-testid={`delete-rule-${rule.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{display}</div>
                  {isLong && (
                    <button
                      onClick={() => toggleExpand(rule.id)}
                      className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                      data-testid={`expand-rule-${rule.id}`}
                    >
                      {isExpanded ? <><ChevronDown className="h-3 w-3" /> Show less</> : <><ChevronRight className="h-3 w-3" /> Show more</>}
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRuleId} onOpenChange={(o) => !o && setEditRuleId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit rule</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
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
          </div>
          <DialogFooter><Button onClick={handleUpdate} disabled={!formData.title || !formData.content}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
