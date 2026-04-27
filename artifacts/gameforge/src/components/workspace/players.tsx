import { useState } from "react";
import { useListPlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, useAiEnhancePlayer, getListPlayersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Users, Sparkles, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Player } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface PlayersProps {
  projectId: number;
}

export function Players({ projectId }: PlayersProps) {
  const queryClient = useQueryClient();
  const { data: players, isLoading } = useListPlayers(projectId);
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const enhancePlayer = useAiEnhancePlayer();
  const { toast } = useToast();
  const [enhancingId, setEnhancingId] = useState<number | null>(null);

  const handleEnhance = async (playerId: number) => {
    setEnhancingId(playerId);
    try {
      await enhancePlayer.mutateAsync({ projectId, playerId });
      queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
      toast({ title: "Player enhanced", description: "AI tightened the profile." });
    } catch (err) {
      toast({ title: "Enhance failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setEnhancingId(null);
    }
  };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPlayerId, setEditPlayerId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ name: "", role: "", description: "", strategy: "" });

  const handleCreate = async () => {
    if (!formData.name) return;
    await createPlayer.mutateAsync({ projectId, data: formData });
    setIsCreateOpen(false);
    setFormData({ name: "", role: "", description: "", strategy: "" });
    queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
  };

  const handleUpdate = async () => {
    if (!editPlayerId || !formData.name) return;
    await updatePlayer.mutateAsync({ projectId, playerId: editPlayerId, data: formData });
    setEditPlayerId(null);
    setFormData({ name: "", role: "", description: "", strategy: "" });
    queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
  };

  const handleDelete = async (id: number) => {
    await deletePlayer.mutateAsync({ projectId, playerId: id });
    queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(projectId) });
  };

  const openEdit = (player: Player) => {
    setFormData({
      name: player.name,
      role: player.role || "",
      description: player.description || "",
      strategy: player.strategy || ""
    });
    setEditPlayerId(player.id);
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Player Profiles</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData({ name: "", role: "", description: "", strategy: "" })}>
              <Plus className="h-4 w-4 mr-2" /> Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Player Profile</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Name/Persona *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. The Aggressor" /></div>
              <div className="space-y-2"><Label>Role</Label><Input value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="e.g. Attacker, Support" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="space-y-2"><Label>Typical Strategy</Label><Textarea value={formData.strategy} onChange={e => setFormData({...formData, strategy: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!formData.name}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : players?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No players yet</h3>
          <p className="text-muted-foreground mt-1">Define player profiles and their typical strategies.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players?.map(player => (
            <Card key={player.id} className="bg-card border-border overflow-hidden relative group">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-background/80 hover:bg-background"
                  onClick={() => handleEnhance(player.id)}
                  disabled={enhancingId === player.id}
                  title="AI Enhance"
                  data-testid={`enhance-player-${player.id}`}
                >
                  {enhancingId === player.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background" onClick={() => openEdit(player)}><Edit2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background hover:text-destructive" onClick={() => handleDelete(player.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 pr-16">
                  <CardTitle className="text-lg">{player.name}</CardTitle>
                  {player.role && <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded border border-primary/20">{player.role}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {player.description && (
                  <div className="text-sm text-muted-foreground">{player.description}</div>
                )}
                {player.strategy && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider">Strategy</div>
                    <div className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-1 bg-primary/5 rounded-r">
                      {player.strategy}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPlayerId} onOpenChange={o => !o && setEditPlayerId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Player Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Name/Persona *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Role</Label><Input value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div className="space-y-2"><Label>Typical Strategy</Label><Textarea value={formData.strategy} onChange={e => setFormData({...formData, strategy: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdate} disabled={!formData.name}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
