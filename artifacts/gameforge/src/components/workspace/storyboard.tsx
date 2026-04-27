import { useState } from "react";
import { useListStoryboardNodes, useCreateStoryboardNode, useUpdateStoryboardNode, useDeleteStoryboardNode, getListStoryboardNodesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, MapPin, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  { value: "idea", label: "Idea", color: "bg-slate-500" },
  { value: "in-progress", label: "In Progress", color: "bg-amber-500" },
  { value: "tested", label: "Tested", color: "bg-blue-500" },
  { value: "approved", label: "Approved", color: "bg-emerald-500" },
];

const NODE_TYPES = ["idea", "mechanic", "phase", "card", "rule", "art"];

export function Storyboard({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: nodes, isLoading } = useListStoryboardNodes(projectId);
  const createNode = useCreateStoryboardNode();
  const updateNode = useUpdateStoryboardNode();
  const deleteNode = useDeleteStoryboardNode();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", content: "", nodeType: "idea", status: "idea" });

  const refresh = () => qc.invalidateQueries({ queryKey: getListStoryboardNodesQueryKey(projectId) });

  const openCreate = () => { setEditing(null); setForm({ title: "", content: "", nodeType: "idea", status: "idea" }); setOpen(true); };
  const openEdit = (id: number) => {
    const n = nodes?.find(x => x.id === id); if (!n) return;
    setEditing(id);
    setForm({ title: n.title, content: n.content || "", nodeType: n.nodeType, status: n.status });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.title.trim()) return;
    try {
      if (editing) await updateNode.mutateAsync({ projectId, nodeId: editing, data: form });
      else await createNode.mutateAsync({ projectId, data: form });
      setOpen(false); refresh();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    try { await deleteNode.mutateAsync({ projectId, nodeId: id }); refresh(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const moveStatus = async (id: number, status: string) => {
    try { await updateNode.mutateAsync({ projectId, nodeId: id, data: { status } }); refresh(); }
    catch { toast({ title: "Update failed", variant: "destructive" }); }
  };

  const byStatus = (status: string) => nodes?.filter(n => n.status === status) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" /> Storyboard</h2>
          <p className="text-muted-foreground text-sm mt-1">Visualize the design pipeline kanban-style.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Card</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{STATUSES.map(s => <Skeleton key={s.value} className="h-96" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map(s => (
            <div key={s.value} className="bg-muted/30 border border-border rounded-lg p-3 flex flex-col min-h-[400px]">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`h-2 w-2 rounded-full ${s.color}`} />
                <h3 className="font-semibold text-sm">{s.label}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{byStatus(s.value).length}</span>
              </div>
              <div className="space-y-2 flex-1">
                {byStatus(s.value).map(n => (
                  <Card key={n.id} className="bg-card group">
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm leading-tight">{n.title}</CardTitle>
                        <div className="flex opacity-0 group-hover:opacity-100 -mr-1 -mt-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(n.id)}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(n.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">{n.nodeType}</div>
                      {n.content && <p className="text-xs text-muted-foreground line-clamp-3">{n.content}</p>}
                      <Select value={n.status} onValueChange={(v) => moveStatus(n.id, v)}>
                        <SelectTrigger className="h-7 mt-3 text-xs"><GripVertical className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
                {byStatus(s.value).length === 0 && <div className="text-xs text-muted-foreground text-center italic py-4">No cards</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} storyboard card</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required autoFocus /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.nodeType} onValueChange={v => setForm({...form, nodeType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NODE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
