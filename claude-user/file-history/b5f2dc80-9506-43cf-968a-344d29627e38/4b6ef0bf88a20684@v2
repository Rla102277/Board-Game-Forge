import { useState, useMemo } from "react";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote, useAiEnhanceNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, StickyNote, Pin, Sparkles, Loader2, X, BookOpen, Clock, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Note } from "@workspace/api-client-react";

interface NotesProps {
  projectId: number;
}

const COLORS = [
  { bg: "bg-yellow-900/30", border: "border-yellow-700/50", text: "text-yellow-100", value: "yellow" },
  { bg: "bg-blue-900/30", border: "border-blue-700/50", text: "text-blue-100", value: "blue" },
  { bg: "bg-green-900/30", border: "border-green-700/50", text: "text-green-100", value: "green" },
  { bg: "bg-pink-900/30", border: "border-pink-700/50", text: "text-pink-100", value: "pink" },
  { bg: "bg-card", border: "border-border", text: "text-foreground", value: "default" },
];

function apiBase(): string {
  return (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL.replace(/\/$/, "");
}

interface ParsedTopic {
  tag: string;
  links: number[];
}

function parseNoteTopic(raw: string | null | undefined): ParsedTopic {
  if (!raw) return { tag: "", links: [] };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { tag: String(parsed.tag ?? ""), links: Array.isArray(parsed.links) ? parsed.links : [] };
    }
  } catch {}
  return { tag: raw, links: [] };
}

function serializeNoteTopic(tag: string, links: number[]): string | undefined {
  if (links.length === 0 && !tag) return undefined;
  if (links.length === 0) return tag;
  return JSON.stringify({ tag, links });
}

export function Notes({ projectId }: NotesProps) {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useListNotes(projectId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const enhanceNote = useAiEnhanceNote();
  const { toast } = useToast();
  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [digestOpen, setDigestOpen] = useState(false);

  const digestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase()}/api/projects/${projectId}/notes/digest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Digest failed" }));
        throw new Error(err.error ?? "Digest failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
      toast({ title: "Digest created", description: "AI synthesis added as a pinned note." });
    },
    onError: (err) => {
      toast({ title: "Digest failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    },
  });

  const handleEnhance = async (noteId: number) => {
    setEnhancingId(noteId);
    try {
      await enhanceNote.mutateAsync({ projectId, noteId });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
      toast({ title: "Note enhanced", description: "AI tightened the writing." });
    } catch (err) {
      toast({ title: "Enhance failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setEnhancingId(null);
    }
  };

  const [showAdd, setShowAdd] = useState(false);
  const [editNoteId, setEditNoteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: "default",
    pinned: false,
    lookAtLater: false,
    topicTag: "",
    linkedNoteIds: [] as number[],
  });

  const isFormOpen = showAdd || editNoteId !== null;
  const isEditing = editNoteId !== null;

  const closeForm = () => {
    setShowAdd(false);
    setEditNoteId(null);
    setFormData({ title: "", content: "", color: "default", pinned: false, lookAtLater: false, topicTag: "", linkedNoteIds: [] });
  };

  const buildSaveData = () => {
    const topic = serializeNoteTopic(formData.topicTag, formData.linkedNoteIds);
    return {
      title: formData.title,
      content: formData.content,
      color: formData.color,
      pinned: formData.pinned,
      lookAtLater: formData.lookAtLater,
      ...(topic !== undefined ? { topic } : {}),
    };
  };

  const handleCreate = async () => {
    if (!formData.content) return;
    await createNote.mutateAsync({ projectId, data: buildSaveData() });
    closeForm();
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
  };

  const handleUpdate = async () => {
    if (!editNoteId || !formData.content) return;
    await updateNote.mutateAsync({ projectId, noteId: editNoteId, data: buildSaveData() });
    closeForm();
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
  };

  const handleDelete = async (id: number) => {
    await deleteNote.mutateAsync({ projectId, noteId: id });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
  };

  const togglePin = async (note: Note) => {
    await updateNote.mutateAsync({ projectId, noteId: note.id, data: { pinned: !note.pinned } });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
  };

  const toggleLookAtLater = async (note: Note) => {
    await updateNote.mutateAsync({ projectId, noteId: note.id, data: { lookAtLater: !note.lookAtLater } });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
  };

  const openAdd = () => {
    setEditNoteId(null);
    setFormData({ title: "", content: "", color: "default", pinned: false, lookAtLater: false, topicTag: "", linkedNoteIds: [] });
    setShowAdd(true);
  };

  const openEdit = (note: Note) => {
    setShowAdd(false);
    const { tag, links } = parseNoteTopic(note.topic);
    setFormData({
      title: note.title || "",
      content: note.content || "",
      color: note.color || "default",
      pinned: note.pinned,
      lookAtLater: note.lookAtLater,
      topicTag: tag,
      linkedNoteIds: links,
    });
    setEditNoteId(note.id);
  };

  const toggleLinkedNote = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      linkedNoteIds: prev.linkedNoteIds.includes(id)
        ? prev.linkedNoteIds.filter((x) => x !== id)
        : [...prev.linkedNoteIds, id],
    }));
  };

  const sortedNotes = notes ? [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }) : [];

  const noteMap = useMemo(() => {
    const m = new Map<number, Note>();
    notes?.forEach((n) => m.set(n.id, n));
    return m;
  }, [notes]);

  const lookAtLaterCount = notes?.filter((n) => n.lookAtLater && !n.pinned).length ?? 0;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Design Notes</h2>
          {lookAtLaterCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1 text-amber-400 border-amber-500/30 bg-amber-500/10">
              <Clock className="h-3 w-3" />
              {lookAtLaterCount} flagged
            </Badge>
          )}
        </div>
        {!isFormOpen && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDigestOpen((v) => !v)}
              className={digestOpen ? "bg-muted" : ""}
            >
              <BookOpen className="h-4 w-4 mr-1.5" /> AI Digest
            </Button>
            <Button onClick={openAdd} data-testid="add-note-button">
              <Plus className="h-4 w-4 mr-2" /> Add Note
            </Button>
          </div>
        )}
      </div>

      {digestOpen && (
        <div className="border border-blue-500/30 bg-blue-500/5 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm">AI Design Digest</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Synthesize all notes into a pinned summary: key themes, open tensions, next steps, and quick wins.
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDigestOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => digestMutation.mutate()}
            disabled={digestMutation.isPending || (notes?.length ?? 0) === 0}
            className="w-full sm:w-auto"
          >
            {digestMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Digest ({notes?.length ?? 0} notes)</>
            )}
          </Button>
        </div>
      )}

      {isFormOpen && (
        <Card className="bg-card border-primary/40" data-testid="note-form-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{isEditing ? "Edit Note" : "Add Note"}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Title (optional)</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Combat Ideas" autoFocus /></div>
            <div className="space-y-2"><Label>Content *</Label><Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="min-h-[120px]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Topic / Tag</Label>
                <Input
                  value={formData.topicTag}
                  onChange={(e) => setFormData({ ...formData, topicTag: e.target.value })}
                  placeholder="e.g. combat, economy"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 pt-1">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${c.bg} ${c.border} ${formData.color === c.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                      onClick={() => setFormData({...formData, color: c.value})}
                    />
                  ))}
                </div>
              </div>
            </div>
            {notes && notes.filter((n) => n.id !== editNoteId).length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> See Also (related notes)</Label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {notes.filter((n) => n.id !== editNoteId).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => toggleLinkedNote(n.id)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors truncate max-w-[180px] ${
                        formData.linkedNoteIds.includes(n.id)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {n.title || n.content?.slice(0, 30) || "Untitled"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.lookAtLater}
                  onChange={(e) => setFormData({ ...formData, lookAtLater: e.target.checked })}
                  className="rounded"
                />
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Flag for later
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button onClick={isEditing ? handleUpdate : handleCreate} disabled={!formData.content}>
                {isEditing ? "Save Changes" : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : notes?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <StickyNote className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No notes yet</h3>
          <p className="text-muted-foreground mt-1">Jot down quick ideas, feedback, or concepts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {sortedNotes.map(note => {
            const colorDef = COLORS.find(c => c.value === note.color) || COLORS[4];
            const { tag, links } = parseNoteTopic(note.topic);
            const linkedNotes = links.map((id) => noteMap.get(id)).filter(Boolean) as Note[];
            return (
              <Card key={note.id} className={`${colorDef.bg} ${colorDef.border} overflow-hidden relative group transition-all hover:-translate-y-1 hover:shadow-lg shadow-black/20 ${note.lookAtLater ? "ring-1 ring-amber-500/40" : ""}`}>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${colorDef.text} hover:bg-black/20`}
                    onClick={() => handleEnhance(note.id)}
                    disabled={enhancingId === note.id}
                    title="AI Enhance"
                    data-testid={`enhance-note-${note.id}`}
                  >
                    {enhancingId === note.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${colorDef.text} hover:bg-black/20 ${note.lookAtLater ? "opacity-100" : ""}`}
                    onClick={() => toggleLookAtLater(note)}
                    title="Flag for later"
                  >
                    <Clock className={`h-3 w-3 ${note.lookAtLater ? "text-amber-400 fill-amber-400/30" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className={`h-7 w-7 ${colorDef.text} hover:bg-black/20`} onClick={() => togglePin(note)}>
                    <Pin className={`h-3 w-3 ${note.pinned ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className={`h-7 w-7 ${colorDef.text} hover:bg-black/20`} onClick={() => openEdit(note)}><Edit2 className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className={`h-7 w-7 ${colorDef.text} hover:bg-black/20 hover:text-red-400`} onClick={() => handleDelete(note.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                {note.pinned && <div className="absolute top-3 right-3 opacity-100 group-hover:opacity-0 transition-opacity"><Pin className={`h-3 w-3 ${colorDef.text} fill-current`} /></div>}

                {note.title && (
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className={`text-base pr-6 ${colorDef.text}`}>{note.title}</CardTitle>
                  </CardHeader>
                )}
                <CardContent className={`px-4 pb-4 ${note.title ? 'pt-0' : 'pt-4'} ${colorDef.text}`}>
                  <div className="text-sm whitespace-pre-wrap opacity-90">{note.content}</div>
                  {(tag || linkedNotes.length > 0) && (
                    <div className="mt-3 space-y-1.5">
                      {tag && (
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border opacity-70 ${colorDef.border}`}>
                          #{tag}
                        </span>
                      )}
                      {linkedNotes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className={`text-[10px] opacity-60 ${colorDef.text} flex items-center gap-0.5`}>
                            <Link2 className="h-2.5 w-2.5" /> See also:
                          </span>
                          {linkedNotes.map((ln) => (
                            <button
                              key={ln.id}
                              onClick={() => openEdit(ln)}
                              className={`text-[10px] underline opacity-70 hover:opacity-100 truncate max-w-[100px] ${colorDef.text}`}
                            >
                              {ln.title || ln.content?.slice(0, 20) || "Untitled"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
