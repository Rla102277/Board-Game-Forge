import { useState } from "react";
import { useListResearch, useCreateResearch, useUpdateResearch, useDeleteResearch, useAiEnhanceResearch, getListResearchQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, ExternalLink, Edit2, Tag, BookOpen, Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Benchmark { id: string; game: string; publisher: string; year: string; price: string; players: string; weight: number; rating: number; pros: string[]; cons: string[]; notes: string; }
interface BenchState { benchmarks: Benchmark[]; }
const BENCH_STORAGE = (pid: number) => `gameforge.bench.${pid}`;
const BENCH_DEFAULT: Benchmark[] = [];
function loadBench(pid: number): BenchState { try { const r = localStorage.getItem(BENCH_STORAGE(pid)); if (r) return JSON.parse(r); } catch {} return { benchmarks: BENCH_DEFAULT }; }
function saveBench(pid: number, s: BenchState) { try { localStorage.setItem(BENCH_STORAGE(pid), JSON.stringify(s)); } catch {} }

function BenchmarkCard({ projectId }: { projectId: number }) {
  const [state, setState] = useState<BenchState>(() => loadBench(projectId));
  const persist = (n: BenchState) => { setState(n); saveBench(projectId, n); };
  const add = () => { const b: Benchmark = { id: crypto.randomUUID(), game: "", publisher: "", year: "", price: "", players: "", weight: 2.5, rating: 7.0, pros: [], cons: [], notes: "" }; persist({ ...state, benchmarks: [...state.benchmarks, b] }); };
  const upd = (id: string, u: Partial<Benchmark>) => persist({ ...state, benchmarks: state.benchmarks.map(b => b.id === id ? { ...b, ...u } : b) });
  const del = (id: string) => persist({ ...state, benchmarks: state.benchmarks.filter(b => b.id !== id) });
  return (
    <Card>
      <CardHeader className="pb-2 flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary"/> Reference Game Benchmarking</CardTitle><Button size="sm" onClick={add} className="gap-1"><Plus className="h-3 w-3"/> Add</Button></CardHeader>
      <CardContent className="space-y-3">
        {state.benchmarks.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Add competitive games to benchmark against.</div>}
        {state.benchmarks.map(b => (
          <div key={b.id} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Input className="h-8 text-sm flex-1 min-w-[140px]" value={b.game} onChange={e=>upd(b.id,{game:e.target.value})} placeholder="Game name"/>
              <Input className="h-8 text-sm w-32" value={b.publisher} onChange={e=>upd(b.id,{publisher:e.target.value})} placeholder="Publisher"/>
              <Input className="h-8 text-sm w-20" value={b.year} onChange={e=>upd(b.id,{year:e.target.value})} placeholder="Year"/>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={()=>del(b.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input className="h-8 text-sm w-24" value={b.players} onChange={e=>upd(b.id,{players:e.target.value})} placeholder="Players"/>
              <Input className="h-8 text-sm w-24" value={b.price} onChange={e=>upd(b.id,{price:e.target.value})} placeholder="Price"/>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Weight</span><Input type="number" step={0.1} className="h-8 text-sm w-20" value={b.weight} onChange={e=>upd(b.id,{weight:parseFloat(e.target.value)||0})}/></div>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Rating</span><Input type="number" step={0.1} className="h-8 text-sm w-20" value={b.rating} onChange={e=>upd(b.id,{rating:parseFloat(e.target.value)||0})}/></div>
            </div>
            <Textarea rows={2} className="text-sm" value={b.notes} onChange={e=>upd(b.id,{notes:e.target.value})} placeholder="Notes, USPs, differentiation..."/>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function Research({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListResearch(projectId);
  const createItem = useCreateResearch();
  const updateItem = useUpdateResearch();
  const deleteItem = useDeleteResearch();
  const enhanceItem = useAiEnhanceResearch();
  const [enhancingId, setEnhancingId] = useState<number | null>(null);

  const handleEnhance = async (researchId: number) => {
    setEnhancingId(researchId);
    try {
      await enhanceItem.mutateAsync({ projectId, researchId });
      qc.invalidateQueries({ queryKey: getListResearchQueryKey(projectId) });
      toast({ title: "Research enhanced", description: "AI improved the summary." });
    } catch (err) {
      toast({ title: "Enhance failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setEnhancingId(null);
    }
  };

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", source: "", content: "", tags: "" });

  const [showIngest, setShowIngest] = useState(false);
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestText, setIngestText] = useState("");
  const [ingesting, setIngesting] = useState(false);

  const isFormOpen = showAdd || editing !== null;

  const refresh = () => qc.invalidateQueries({ queryKey: getListResearchQueryKey(projectId) });
  const filtered = items?.filter(i => !search || (i.title + (i.content || "") + (i.tags || "")).toLowerCase().includes(search.toLowerCase()));

  const closeForm = () => {
    setShowAdd(false);
    setEditing(null);
    setForm({ title: "", source: "", content: "", tags: "" });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", source: "", content: "", tags: "" });
    setShowIngest(false);
    setShowAdd(true);
  };

  const openEdit = (id: number) => {
    const it = items?.find(i => i.id === id);
    if (!it) return;
    setShowAdd(false);
    setShowIngest(false);
    setEditing(id);
    setForm({ title: it.title, source: it.source || "", content: it.content || "", tags: it.tags || "" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      if (editing) {
        await updateItem.mutateAsync({ projectId, researchId: editing, data: form });
      } else {
        await createItem.mutateAsync({ projectId, data: form });
      }
      closeForm(); refresh();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
  };

  const removeItem = async (id: number) => {
    try { await deleteItem.mutateAsync({ projectId, researchId: id }); refresh(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const closeIngest = () => {
    setShowIngest(false);
    setIngestUrl("");
    setIngestText("");
  };

  const ingest = async () => {
    if (!ingestUrl && !ingestText) return;
    setIngesting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const prompt = ingestUrl
        ? `Summarize the source at this URL into a research note: ${ingestUrl}`
        : `Summarize the following text into a single research note:\n\n${ingestText}`;
      const res = await fetch(`${base}/api/projects/${projectId}/research/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, count: 1 }),
      });
      if (!res.ok) throw new Error("ingest failed");
      closeIngest();
      refresh();
      toast({ title: "Ingested", description: "AI summarized and added the source." });
    } catch { toast({ title: "Ingest failed", variant: "destructive" }); }
    finally { setIngesting(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Research</h2>
          <p className="text-muted-foreground text-sm mt-1">Capture inspirations, references, and design notes.</p>
        </div>
        <div className="flex gap-2">
          {!showIngest && !isFormOpen && (
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditing(null); setShowIngest(true); }} className="gap-2"><Sparkles className="h-4 w-4" /> AI Ingest</Button>
          )}
          {!isFormOpen && !showIngest && (
            <Button onClick={openCreate} className="gap-2" data-testid="add-research-button"><Plus className="h-4 w-4" /> Add Source</Button>
          )}
        </div>
      </div>

      {isFormOpen && (
        <Card className="bg-card border-primary/40" data-testid="research-form-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{editing ? "Edit research source" : "Add research source"}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required autoFocus /></div>
              <div className="space-y-2"><Label>Source URL or citation</Label><Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="https://..." /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea rows={5} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
              <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="combat, economy" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                <Button type="submit">{editing ? "Save" : "Add"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showIngest && (
        <Card className="bg-card border-primary/40" data-testid="research-ingest-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">AI Ingest</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Paste a URL or text and let AI summarize it into a research item.</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeIngest}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>URL</Label><Input value={ingestUrl} onChange={e => setIngestUrl(e.target.value)} placeholder="https://..." autoFocus /></div>
            <div className="text-center text-xs text-muted-foreground">— or —</div>
            <div className="space-y-2"><Label>Paste text</Label><Textarea rows={6} value={ingestText} onChange={e => setIngestText(e.target.value)} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeIngest}>Cancel</Button>
              <Button onClick={ingest} disabled={ingesting || (!ingestUrl && !ingestText)} className="gap-2">
                <Sparkles className="h-4 w-4" /> {ingesting ? "Ingesting..." : "Ingest"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <BenchmarkCard projectId={projectId} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div>
      ) : !filtered?.length ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground mb-4">{search ? "No matching sources." : "No research yet. Start capturing inspirations."}</p>
          {!search && !isFormOpen && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Source</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(it => (
            <Card key={it.id} className="bg-card border-card-border hover-elevate group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base line-clamp-1">{it.title}</CardTitle>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="AI Enhance"
                      onClick={() => handleEnhance(it.id)}
                      disabled={enhancingId === it.id}
                      data-testid={`enhance-research-${it.id}`}
                    >
                      {enhancingId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it.id)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {it.source && (
                  <CardDescription className="flex items-center gap-1 text-xs">
                    {it.source.startsWith("http") ? (
                      <a href={it.source} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 shrink-0" /> {it.source}
                      </a>
                    ) : <span className="truncate">{it.source}</span>}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {it.content && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{it.content}</p>}
                {it.tags && (
                  <div className="flex flex-wrap gap-1">
                    {it.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} className="text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" />{t}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
