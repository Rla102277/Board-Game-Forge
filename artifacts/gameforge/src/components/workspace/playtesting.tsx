import { useState } from "react";
import { useListPlaytestSessions, useCreatePlaytestSession, useDeletePlaytestSession, useGetPlaytestShareLink, useListPlaytestFeedback, getListPlaytestSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Calendar, Star, Link as LinkIcon, Copy, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export function Playtesting({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: sessions, isLoading } = useListPlaytestSessions(projectId);
  const { data: shareLink } = useGetPlaytestShareLink(projectId);
  const { data: feedback } = useListPlaytestFeedback(projectId);
  const createSession = useCreatePlaytestSession();
  const deleteSession = useDeletePlaytestSession();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ playerCount: 2, durationMinutes: 60, rating: 4, notes: "", positives: "", issues: "", suggestions: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: getListPlaytestSessionsQueryKey(projectId) });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSession.mutateAsync({ projectId, data: form });
      setOpen(false);
      setForm({ playerCount: 2, durationMinutes: 60, rating: 4, notes: "", positives: "", issues: "", suggestions: "" });
      refresh();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    try { await deleteSession.mutateAsync({ projectId, sessionId: id }); refresh(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const copyLink = () => {
    if (!shareLink?.url) return;
    navigator.clipboard.writeText(window.location.origin + shareLink.url);
    toast({ title: "Link copied" });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Playtesting</h2>
          <p className="text-muted-foreground text-sm mt-1">Log sessions and collect public feedback.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Log Session</Button>
      </div>

      {shareLink?.url && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-lg"><LinkIcon className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">Public feedback link</div>
              <div className="text-xs text-muted-foreground truncate font-mono">{window.location.origin}{shareLink.url}</div>
            </div>
            <Button size="sm" variant="outline" onClick={copyLink} className="gap-2"><Copy className="h-3.5 w-3.5" /> Copy</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sessions ({sessions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="feedback">Public feedback ({feedback?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
          ) : !sessions?.length ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground mb-4">No playtest sessions yet.</p>
              <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Log Session</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <Card key={s.id} className="bg-card border-card-border group">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(s.date), "MMM d, yyyy")}</span>
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{s.playerCount} players</span>
                          {s.durationMinutes && <span>{s.durationMinutes} min</span>}
                          {s.rating && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />{s.rating}/5</span>}
                        </div>
                        {s.positives && <div className="text-sm mb-1"><span className="text-emerald-500 font-medium">+ </span>{s.positives}</div>}
                        {s.issues && <div className="text-sm mb-1"><span className="text-red-500 font-medium">! </span>{s.issues}</div>}
                        {s.suggestions && <div className="text-sm mb-1"><span className="text-blue-400 font-medium">→ </span>{s.suggestions}</div>}
                        {s.notes && <p className="text-sm text-muted-foreground mt-2">{s.notes}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          {!feedback?.length ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No public feedback yet. Share the link above with playtesters.
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map(f => (
                <Card key={f.id} className="bg-card border-card-border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div>
                        <div className="font-medium">{f.respondentName || "Anonymous"}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(f.createdAt), "MMM d, yyyy")}</div>
                      </div>
                      <div className="flex gap-3 text-xs">
                        {f.funScore != null && <div>Fun: <span className="font-bold">{f.funScore}</span></div>}
                        {f.balanceScore != null && <div>Balance: <span className="font-bold">{f.balanceScore}</span></div>}
                        {f.clarityScore != null && <div>Clarity: <span className="font-bold">{f.clarityScore}</span></div>}
                      </div>
                    </div>
                    {f.whatWorked && <p className="text-sm mb-1"><span className="text-emerald-500 font-medium">Worked: </span>{f.whatWorked}</p>}
                    {f.whatDidNot && <p className="text-sm mb-1"><span className="text-red-500 font-medium">Didn't: </span>{f.whatDidNot}</p>}
                    {f.suggestions && <p className="text-sm"><span className="text-blue-400 font-medium">Suggestion: </span>{f.suggestions}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log playtest session</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Players</Label><Input type="number" min={1} value={form.playerCount} onChange={e => setForm({...form, playerCount: parseInt(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min={0} value={form.durationMinutes} onChange={e => setForm({...form, durationMinutes: parseInt(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Rating</Label><Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm({...form, rating: parseInt(e.target.value) || 0})} /></div>
            </div>
            <div className="space-y-2"><Label>What worked</Label><Textarea rows={2} value={form.positives} onChange={e => setForm({...form, positives: e.target.value})} /></div>
            <div className="space-y-2"><Label>Issues</Label><Textarea rows={2} value={form.issues} onChange={e => setForm({...form, issues: e.target.value})} /></div>
            <div className="space-y-2"><Label>Suggestions</Label><Textarea rows={2} value={form.suggestions} onChange={e => setForm({...form, suggestions: e.target.value})} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
