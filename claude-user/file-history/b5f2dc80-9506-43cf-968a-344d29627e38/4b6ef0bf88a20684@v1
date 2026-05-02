import { useState } from "react";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote, useAiEnhanceNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, StickyNote, Pin, Sparkles, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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

export function Notes({ projectId }: NotesProps) {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useListNotes(projectId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const enhanceNote = useAiEnhanceNote();
  const { toast } = useToast();
  const [enhancingId, setEnhancingId] = useState<number | null>(null);

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

  const [formData, setFormData] = useState({ title: "", content: "", color: "default", pinned: false });

  const isFormOpen = showAdd || editNoteId !== null;
  const isEditing = editNoteId !== null;

  const closeForm = () => {
    setShowAdd(false);
    setEditNoteId(null);
    setFormData({ title: "", content: "", color: "default", pinned: false });
  };

  const handleCreate = async () => {
    if (!formData.content) return;
    await createNote.mutateAsync({ projectId, data: formData });
    closeForm();
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
  };

  const handleUpdate = async () => {
    if (!editNoteId || !formData.content) return;
    await updateNote.mutateAsync({ projectId, noteId: editNoteId, data: formData });
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

  const openAdd = () => {
    setEditNoteId(null);
    setFormData({ title: "", content: "", color: "default", pinned: false });
    setShowAdd(true);
  };

  const openEdit = (note: Note) => {
    setShowAdd(false);
    setFormData({
      title: note.title || "",
      content: note.content || "",
      color: note.color || "default",
      pinned: note.pinned
    });
    setEditNoteId(note.id);
  };

  const sortedNotes = notes ? [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }) : [];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h2 className="text-xl font-bold">Design Notes</h2>
        {!isFormOpen && (
          <Button onClick={openAdd} data-testid="add-note-button">
            <Plus className="h-4 w-4 mr-2" /> Add Note
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card className="bg-card border-primary/40" data-testid="note-form-panel">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{isEditing ? "Edit Note" : "Add Note"}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Title (optional)</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Combat Ideas" autoFocus /></div>
            <div className="space-y-2"><Label>Content *</Label><Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="min-h-[120px]" /></div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
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
            return (
              <Card key={note.id} className={`${colorDef.bg} ${colorDef.border} overflow-hidden relative group transition-all hover:-translate-y-1 hover:shadow-lg shadow-black/20`}>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
