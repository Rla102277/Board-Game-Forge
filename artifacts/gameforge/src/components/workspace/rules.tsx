import { useState } from "react";
import { useListRules, useCreateRule, useUpdateRule, useDeleteRule, useAiGenerateRules, getListRulesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Wand2, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Rule } from "@workspace/api-client-react";

interface RulesProps {
  projectId: number;
}

export function Rules({ projectId }: RulesProps) {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useListRules(projectId);
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const aiGenerate = useAiGenerateRules();

  const [aiPrompt, setAiPrompt] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ title: "", content: "", category: "", priority: 0 });

  const handleCreate = async () => {
    if (!formData.title || !formData.content) return;
    await createRule.mutateAsync({ projectId, data: formData });
    setIsCreateOpen(false);
    setFormData({ title: "", content: "", category: "", priority: 0 });
    queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
  };

  const handleUpdate = async () => {
    if (!editRuleId || !formData.title || !formData.content) return;
    await updateRule.mutateAsync({ projectId, ruleId: editRuleId, data: formData });
    setEditRuleId(null);
    setFormData({ title: "", content: "", category: "", priority: 0 });
    queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
  };

  const handleDelete = async (id: number) => {
    await deleteRule.mutateAsync({ projectId, ruleId: id });
    queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    await aiGenerate.mutateAsync({ projectId, data: { prompt: aiPrompt, count: 3 } });
    setAiPrompt("");
    queryClient.invalidateQueries({ queryKey: getListRulesQueryKey(projectId) });
  };

  const openEdit = (rule: Rule) => {
    setFormData({
      title: rule.title,
      content: rule.content,
      category: rule.category || "",
      priority: rule.priority || 0
    });
    setEditRuleId(rule.id);
  };

  const sortedRules = rules ? [...rules].sort((a, b) => {
    if (a.priority !== b.priority) return (b.priority || 0) - (a.priority || 0); // highest first
    return (a.category || "").localeCompare(b.category || "");
  }) : [];

  return (
    <div className="space-y-8 pb-8">
      <Card className="bg-card border-border overflow-hidden">
        <div className="bg-primary/5 p-4 border-b border-border flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <Input 
              placeholder="e.g. combat resolution mechanics..." 
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              className="bg-background max-w-lg"
              onKeyDown={e => e.key === "Enter" && handleAiGenerate()}
            />
            <Button onClick={handleAiGenerate} disabled={!aiPrompt || aiGenerate.isPending}>
              {aiGenerate.isPending ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setFormData({ title: "", content: "", category: "", priority: 0 })}>
                <Plus className="h-4 w-4 mr-2" /> Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Rule</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                <div className="space-y-2"><Label>Content *</Label><Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="min-h-[100px]" /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Combat, Setup" /></div>
                <div className="space-y-2"><Label>Priority</Label><Input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: parseInt(e.target.value) || 0})} /></div>
              </div>
              <DialogFooter><Button onClick={handleCreate} disabled={!formData.title || !formData.content}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : rules?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No rules yet</h3>
          <p className="text-muted-foreground mt-1">Generate rules with AI or add them manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRules.map(rule => (
            <Card key={rule.id} className="bg-card border-border overflow-hidden relative group">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background" onClick={() => openEdit(rule)}><Edit2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background hover:text-destructive" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{rule.title}</CardTitle>
                  {rule.category && <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded border border-primary/30">{rule.category}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{rule.content}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRuleId} onOpenChange={o => !o && setEditRuleId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Rule</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
            <div className="space-y-2"><Label>Content *</Label><Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="min-h-[100px]" /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} /></div>
            <div className="space-y-2"><Label>Priority</Label><Input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: parseInt(e.target.value) || 0})} /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdate} disabled={!formData.title || !formData.content}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
