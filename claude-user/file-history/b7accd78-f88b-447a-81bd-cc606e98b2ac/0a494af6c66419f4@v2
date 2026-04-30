import { useState } from "react";
import {
  useCreateEntity, useUpdateEntity, useDeleteEntity, useAiGenerateEntities,
  getListEntitiesQueryKey, type Entity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Sparkles, X, Download, Hash } from "lucide-react";

const CARD_SUBTYPES = ["Action", "Item", "Spell", "Event", "Quest", "Encounter", "Treasure", "Attack", "Defense", "Custom"];

function exportDeckCSV(deckName: string, cards: Entity[]) {
  const headers = ["Name", "Subtype", "Effect / Rules Text", "Flavor Text", "Designer Notes"];
  const rows = cards.map(c => [
    c.name,
    c.subtype ?? "",
    (c.description ?? "").replace(/"/g, '""'),
    (c.lore ?? "").replace(/"/g, '""'),
    (c.designNotes ?? "").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deckName.replace(/\W+/g, "_")}_cards.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface CardStudioProps {
  projectId: number;
  deck: Entity;
  cards: Entity[];
  onRefresh: () => void;
}

export function CardStudio({ projectId, deck, cards, onRefresh }: CardStudioProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const deleteEntity = useDeleteEntity();
  const aiGenerate = useAiGenerateEntities();

  type EditCell = { cardId: number; field: "name" | "description" | "lore" };
  const [editingCell, setEditingCell] = useState<EditCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [newCard, setNewCard] = useState({ name: "", subtype: "", description: "", lore: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  const startEdit = (cardId: number, field: EditCell["field"], value: string) => {
    setEditingCell({ cardId, field });
    setEditValue(value);
  };

  const commitEdit = async () => {
    if (!editingCell || saving) return;
    setSaving(true);
    try {
      await updateEntity.mutateAsync({
        projectId,
        entityId: editingCell.cardId,
        data: { [editingCell.field]: editValue || undefined } as Parameters<typeof updateEntity.mutateAsync>[0]["data"],
      });
      onRefresh();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleAddCard = async () => {
    if (!newCard.name.trim()) return;
    try {
      await createEntity.mutateAsync({
        projectId,
        data: {
          name: newCard.name.trim(),
          type: "Card",
          subtype: newCard.subtype || undefined,
          description: newCard.description || undefined,
          lore: newCard.lore || undefined,
          parentEntityId: deck.id,
        },
      });
      setNewCard({ name: "", subtype: "", description: "", lore: "" });
      setShowAddForm(false);
      onRefresh();
    } catch {
      toast({ title: "Could not add card", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from deck?`)) return;
    try {
      await deleteEntity.mutateAsync({ projectId, entityId: id });
      onRefresh();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    setGenerating(true);
    const beforeIds = new Set(cards.map(c => c.id));
    try {
      const fullPrompt = `Generate ${aiCount} cards for the deck "${deck.name}" (${deck.subtype ?? "custom deck"}). ${aiPrompt}. Each should be type "Card" with a clear name, subtype, rules-text description, and optional flavor text.`;
      await aiGenerate.mutateAsync({ projectId, data: { prompt: fullPrompt, count: aiCount } });
      // Refetch and auto-assign any new Card entities without a parent to this deck
      qc.invalidateQueries({ queryKey: getListEntitiesQueryKey(projectId) });
      await new Promise(r => setTimeout(r, 600));
      const freshKey = getListEntitiesQueryKey(projectId);
      const cached = qc.getQueryData<Entity[]>(freshKey) ?? [];
      const newCards = cached.filter(e => e.type === "Card" && !e.parentEntityId && !beforeIds.has(e.id));
      if (newCards.length > 0) {
        await Promise.all(newCards.map(c =>
          updateEntity.mutateAsync({ projectId, entityId: c.id, data: { parentEntityId: deck.id } })
        ));
      }
      setAiPrompt("");
      setShowAI(false);
      onRefresh();
      toast({ title: `${aiCount} cards generated and added to deck` });
    } catch (err) {
      toast({ title: "AI generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const CellText = ({ cardId, field, value, placeholder }: { cardId: number; field: EditCell["field"]; value: string; placeholder?: string }) => {
    const isEditing = editingCell?.cardId === cardId && editingCell.field === field;
    if (isEditing) {
      return (
        <Input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
          className="h-7 text-xs bg-input border-primary/40 px-2 w-full"
        />
      );
    }
    return (
      <div
        className="min-h-[28px] px-2 py-1 text-xs cursor-text rounded hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors truncate"
        onClick={() => startEdit(cardId, field, value)}
        title={value || placeholder}
      >
        {value || <span className="text-muted-foreground/30 italic">{placeholder ? `${placeholder}…` : "—"}</span>}
      </div>
    );
  };

  const subtypeCounts = cards.reduce<Record<string, number>>((acc, c) => {
    const k = c.subtype || "Uncategorized";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mt-3 border border-border/50 rounded-lg overflow-hidden bg-background/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10 border-b border-border/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-indigo-400" /> Cards in this deck
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{cards.length} total</span>
          {Object.entries(subtypeCounts).slice(0, 4).map(([k, c]) => (
            <span key={k} className="text-[10px] text-muted-foreground">{k}: {c}</span>
          ))}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary hover:bg-primary/10" onClick={() => { setShowAI(v => !v); setShowAddForm(false); }}>
            <Sparkles className="w-3 h-3" /> AI Generate
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => exportDeckCSV(deck.name, cards)} disabled={cards.length === 0}>
            <Download className="w-3 h-3" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setShowAddForm(v => !v); setShowAI(false); }}>
            <Plus className="w-3 h-3" /> Add card
          </Button>
        </div>
      </div>

      {/* AI Generate panel */}
      {showAI && (
        <div className="px-4 py-3 border-b border-border/40 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" /> Batch Generate Cards</p>
            <button onClick={() => setShowAI(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" /></button>
          </div>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAIGenerate(); }}
              placeholder={`e.g. "mix of attack, spell, and item cards for ${deck.name}"…`}
              className="h-8 text-xs bg-input flex-1"
            />
            <Select value={aiCount.toString()} onValueChange={v => setAiCount(parseInt(v))}>
              <SelectTrigger className="h-8 w-16 text-xs bg-input shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>{[3, 5, 8, 12, 20].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAIGenerate} disabled={!aiPrompt || generating} className="w-full h-7 text-xs gap-1.5">
            {generating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> Generate {aiCount} cards</>}
          </Button>
        </div>
      )}

      {/* Add card form */}
      {showAddForm && (
        <div className="px-4 py-3 border-b border-border/40 bg-card/50 space-y-2">
          <p className="text-xs font-medium text-white">New card</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Name *</Label>
              <Input
                value={newCard.name}
                onChange={e => setNewCard(c => ({ ...c, name: e.target.value }))}
                className="h-7 text-xs bg-input"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAddCard(); }}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Subtype</Label>
              <Select value={newCard.subtype || "__none__"} onValueChange={v => setNewCard(c => ({ ...c, subtype: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="h-7 text-xs bg-input"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {CARD_SUBTYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Effect / Rules text</Label>
            <Input
              value={newCard.description}
              onChange={e => setNewCard(c => ({ ...c, description: e.target.value }))}
              className="h-7 text-xs bg-input"
              placeholder="When played…"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Flavor text</Label>
            <Input
              value={newCard.lore}
              onChange={e => setNewCard(c => ({ ...c, lore: e.target.value }))}
              className="h-7 text-xs bg-input"
              placeholder="A brief narrative quote…"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCard} disabled={!newCard.name.trim() || createEntity.isPending} className="h-7 text-xs gap-1">
              {createEntity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add to deck
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Cards table */}
      {cards.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-muted-foreground">No cards yet — add manually or use AI Generate.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10">
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Name</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Subtype</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Effect / Rules Text</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Flavor Text</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {cards.map(card => (
                <tr key={card.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-1 py-0.5">
                    <CellText cardId={card.id} field="name" value={card.name} placeholder="Card name" />
                  </td>
                  <td className="px-1 py-0.5">
                    <Select
                      value={card.subtype ?? ""}
                      onValueChange={async v => {
                        try {
                          await updateEntity.mutateAsync({ projectId, entityId: card.id, data: { subtype: v || undefined } });
                          onRefresh();
                        } catch { toast({ title: "Update failed", variant: "destructive" }); }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:border-primary/20 hover:bg-primary/5 w-full">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        {CARD_SUBTYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-0.5">
                    <CellText cardId={card.id} field="description" value={card.description ?? ""} placeholder="effect text" />
                  </td>
                  <td className="px-1 py-0.5">
                    <CellText cardId={card.id} field="lore" value={card.lore ?? ""} placeholder="flavor text" />
                  </td>
                  <td className="px-1 py-0.5">
                    <button
                      onClick={() => handleDelete(card.id, card.name)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
