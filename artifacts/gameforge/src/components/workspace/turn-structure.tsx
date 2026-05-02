import { useState, useEffect } from "react";
import { useGetProject } from "@workspace/api-client-react";
import { useDesignerArtifact } from "@/hooks/use-designer-artifact";
import {
  Clock, Plus, Trash2, GripVertical, ChevronRight, ChevronDown,
  GitBranch, Layers, ArrowRight, Play, Zap, AlertTriangle,
  Users, Dice5, Save, RotateCcw, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TurnPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  type: "sequential" | "parallel" | "conditional" | "loop";
  durationEstimate?: number; // minutes
  playerCountOverride?: Record<number, { active: boolean; durationEstimate: number; notes: string }>;
  condition?: string; // for conditional phases: "if has resources"
  parallelGroups?: string[]; // for parallel: ["all players simultaneously"]
  loopCondition?: string; // for loop: "until no more cards"
  actions: PhaseAction[];
}

export interface PhaseAction {
  id: string;
  name: string;
  description: string;
  optional: boolean;
  repeatable: boolean;
  cost?: string;
  effect?: string;
}

export interface TurnStructure {
  phases: TurnPhase[];
  globalNotes: string;
  turnOrderType: "clockwise" | "simultaneous" | "role-based" | "bidding" | "draft";
  firstPlayerRule: string;
  roundEndTrigger: string;
  gameEndTrigger: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = (projectId: number) => `gameforge.turn-structure.${projectId}`;

const PHASE_TYPE_META: Record<TurnPhase["type"], { label: string; color: string; icon: typeof Clock }> = {
  sequential: { label: "Sequential", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: ArrowRight },
  parallel: { label: "Parallel", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: Layers },
  conditional: { label: "Conditional", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: GitBranch },
  loop: { label: "Loop", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: RotateCcw },
};

const DEFAULT_STRUCTURE = (): TurnStructure => ({
  phases: [
    {
      id: crypto.randomUUID(),
      name: "Setup",
      description: "Place board, distribute starting components, determine first player.",
      order: 0,
      type: "sequential",
      durationEstimate: 5,
      actions: [
        { id: crypto.randomUUID(), name: "Place board", description: "Put the main board in the center", optional: false, repeatable: false },
        { id: crypto.randomUUID(), name: "Distribute cards", description: "Each player gets starting hand", optional: false, repeatable: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Action Phase",
      description: "Players take turns performing actions.",
      order: 1,
      type: "sequential",
      durationEstimate: 10,
      actions: [
        { id: crypto.randomUUID(), name: "Play a card", description: "Play one card from hand to the table", optional: false, repeatable: false },
        { id: crypto.randomUUID(), name: "Draw cards", description: "Draw up to hand limit", optional: false, repeatable: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Resolution",
      description: "Resolve any pending effects and check end conditions.",
      order: 2,
      type: "sequential",
      durationEstimate: 2,
      actions: [
        { id: crypto.randomUUID(), name: "Check win condition", description: "If any player meets the win condition, game ends", optional: false, repeatable: false },
      ],
    },
  ],
  globalNotes: "",
  turnOrderType: "clockwise",
  firstPlayerRule: "Last winner goes first, or choose randomly for first game.",
  roundEndTrigger: "All players have taken their turn.",
  gameEndTrigger: "A player reaches the target score or all victory cards are claimed.",
});

// ── Component ────────────────────────────────────────────────────────────────

export function TurnStructureVisualizer({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const { data: project } = useGetProject(projectId);
  const { state: structure, setState: persist } = useDesignerArtifact<TurnStructure>(
    projectId, "turn-structure", DEFAULT_STRUCTURE, STORAGE_KEY,
  );
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [playerCounts, setPlayerCounts] = useState<number[]>([2, 3, 4]);

  // Derive player counts from project data
  useEffect(() => {
    if (project?.playerCount) {
      const match = project.playerCount.match(/(\d+)(?:\s*-\s*(\d+))?/);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = match[2] ? parseInt(match[2], 10) : min;
        const counts: number[] = [];
        for (let i = min; i <= max; i++) counts.push(i);
        setPlayerCounts(counts);
      }
    }
  }, [project?.playerCount]);

  const addPhase = () => {
    const newPhase: TurnPhase = {
      id: crypto.randomUUID(),
      name: "New Phase",
      description: "",
      order: structure.phases.length,
      type: "sequential",
      durationEstimate: 5,
      actions: [],
    };
    persist({ ...structure, phases: [...structure.phases, newPhase] });
    setExpandedPhaseId(newPhase.id);
  };

  const updatePhase = (phaseId: string, updates: Partial<TurnPhase>) => {
    persist({
      ...structure,
      phases: structure.phases.map(p => p.id === phaseId ? { ...p, ...updates } : p),
    });
  };

  const removePhase = (phaseId: string) => {
    persist({
      ...structure,
      phases: structure.phases.filter(p => p.id !== phaseId).map((p, i) => ({ ...p, order: i })),
    });
    if (expandedPhaseId === phaseId) setExpandedPhaseId(null);
  };

  const movePhase = (phaseId: string, direction: -1 | 1) => {
    const idx = structure.phases.findIndex(p => p.id === phaseId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= structure.phases.length) return;
    const phases = [...structure.phases];
    [phases[idx], phases[newIdx]] = [phases[newIdx], phases[idx]];
    persist({
      ...structure,
      phases: phases.map((p, i) => ({ ...p, order: i })),
    });
  };

  const addAction = (phaseId: string) => {
    const action: PhaseAction = {
      id: crypto.randomUUID(),
      name: "New Action",
      description: "",
      optional: false,
      repeatable: false,
    };
    persist({
      ...structure,
      phases: structure.phases.map(p =>
        p.id === phaseId ? { ...p, actions: [...p.actions, action] } : p
      ),
    });
    setEditingActionId(action.id);
  };

  const updateAction = (phaseId: string, actionId: string, updates: Partial<PhaseAction>) => {
    persist({
      ...structure,
      phases: structure.phases.map(p =>
        p.id === phaseId
          ? { ...p, actions: p.actions.map(a => a.id === actionId ? { ...a, ...updates } : a) }
          : p
      ),
    });
  };

  const removeAction = (phaseId: string, actionId: string) => {
    persist({
      ...structure,
      phases: structure.phases.map(p =>
        p.id === phaseId
          ? { ...p, actions: p.actions.filter(a => a.id !== actionId) }
          : p
      ),
    });
  };

  const setPlayerCountOverride = (phaseId: string, count: number, override: { active: boolean; durationEstimate: number; notes: string }) => {
    persist({
      ...structure,
      phases: structure.phases.map(p =>
        p.id === phaseId
          ? { ...p, playerCountOverride: { ...p.playerCountOverride, [count]: override } }
          : p
      ),
    });
  };

  const exportToSimulator = () => {
    const exportData = {
      turnStructure: structure,
      playerCounts,
      totalEstimatedDuration: structure.phases.reduce((sum, p) => sum + (p.durationEstimate || 0), 0),
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast({ title: "Turn structure copied", description: "Exported as JSON for simulator use." });
  };

  const totalDuration = structure.phases.reduce((sum, p) => sum + (p.durationEstimate || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" /> Turn Structure
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Model your game's turn phases, actions, and branching logic. Feeds into the simulator.
        </p>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global Turn Settings</CardTitle>
          <CardDescription>How turns flow across the entire game.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Turn Order</Label>
              <Select value={structure.turnOrderType} onValueChange={(v) => persist({ ...structure, turnOrderType: v as TurnStructure["turnOrderType"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clockwise">Clockwise</SelectItem>
                  <SelectItem value="simultaneous">Simultaneous</SelectItem>
                  <SelectItem value="role-based">Role-Based</SelectItem>
                  <SelectItem value="bidding">Bid for Order</SelectItem>
                  <SelectItem value="draft">Draft Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>First Player Rule</Label>
              <Input value={structure.firstPlayerRule} onChange={e => persist({ ...structure, firstPlayerRule: e.target.value })} placeholder="How is first player determined?" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Round End Trigger</Label>
              <Input value={structure.roundEndTrigger} onChange={e => persist({ ...structure, roundEndTrigger: e.target.value })} placeholder="What ends a round?" />
            </div>
            <div className="space-y-2">
              <Label>Game End Trigger</Label>
              <Input value={structure.gameEndTrigger} onChange={e => persist({ ...structure, gameEndTrigger: e.target.value })} placeholder="What ends the game?" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Global Notes</Label>
            <Textarea rows={2} value={structure.globalNotes} onChange={e => persist({ ...structure, globalNotes: e.target.value })} placeholder="Any special turn structure notes..." />
          </div>
        </CardContent>
      </Card>

      {/* Phase Timeline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Phases</h3>
          <Badge variant="outline" className="font-mono">{structure.phases.length} phases</Badge>
          <Badge variant="outline" className="font-mono">~{totalDuration} min/round</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToSimulator} className="gap-2">
            <Zap className="h-4 w-4" /> Export to Simulator
          </Button>
          <Button size="sm" onClick={addPhase} className="gap-2">
            <Plus className="h-4 w-4" /> Add Phase
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {structure.phases.map((phase, idx) => {
          const meta = PHASE_TYPE_META[phase.type];
          const TypeIcon = meta.icon;
          const isExpanded = expandedPhaseId === phase.id;

          return (
            <Card key={phase.id} className={`border-l-4 ${meta.color.split(" ")[2]}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${meta.color} gap-1`}>
                        <TypeIcon className="h-3 w-3" /> {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                      {phase.durationEstimate && (
                        <span className="text-xs text-muted-foreground">~{phase.durationEstimate} min</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={phase.name}
                        onChange={e => updatePhase(phase.id, { name: e.target.value })}
                        className="h-8 font-semibold text-base max-w-md"
                        placeholder="Phase name"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setExpandedPhaseId(isExpanded ? null : phase.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePhase(phase.id, -1)} disabled={idx === 0}>
                          <ArrowRight className="h-3 w-3 rotate-180" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Move up</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePhase(phase.id, 1)} disabled={idx === structure.phases.length - 1}>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Move down</TooltipContent>
                    </Tooltip>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePhase(phase.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={phase.description}
                      onChange={e => updatePhase(phase.id, { description: e.target.value })}
                      placeholder="What happens in this phase?"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Phase Type</Label>
                      <Select value={phase.type} onValueChange={(v) => updatePhase(phase.id, { type: v as TurnPhase["type"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sequential">Sequential</SelectItem>
                          <SelectItem value="parallel">Parallel</SelectItem>
                          <SelectItem value="conditional">Conditional</SelectItem>
                          <SelectItem value="loop">Loop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration Estimate (min)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={phase.durationEstimate || 0}
                        onChange={e => updatePhase(phase.id, { durationEstimate: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phase Order</Label>
                      <Input type="number" value={phase.order} disabled className="bg-muted" />
                    </div>
                  </div>

                  {phase.type === "conditional" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-amber-400" /> Condition
                      </Label>
                      <Input
                        value={phase.condition || ""}
                        onChange={e => updatePhase(phase.id, { condition: e.target.value })}
                        placeholder="e.g., 'If player has 5+ resources, skip to Resolution'"
                      />
                    </div>
                  )}

                  {phase.type === "loop" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-violet-400" /> Loop Until
                      </Label>
                      <Input
                        value={phase.loopCondition || ""}
                        onChange={e => updatePhase(phase.id, { loopCondition: e.target.value })}
                        placeholder="e.g., 'Until no cards remain in deck'"
                      />
                    </div>
                  )}

                  {phase.type === "parallel" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-400" /> Parallel Groups
                      </Label>
                      <Input
                        value={phase.parallelGroups?.join(", ") || ""}
                        onChange={e => updatePhase(phase.id, { parallelGroups: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                        placeholder="e.g., 'all players simultaneously, then AI phase'"
                      />
                    </div>
                  )}

                  {/* Player Count Overrides */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Player Count Scaling
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {playerCounts.map(count => {
                        const override = phase.playerCountOverride?.[count];
                        return (
                          <Card key={count} className="bg-muted/30">
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">{count} Players</CardTitle>
                                <Switch
                                  checked={override?.active ?? true}
                                  onCheckedChange={(checked) =>
                                    setPlayerCountOverride(phase.id, count, {
                                      active: checked,
                                      durationEstimate: override?.durationEstimate ?? phase.durationEstimate ?? 5,
                                      notes: override?.notes ?? "",
                                    })
                                  }
                                />
                              </div>
                            </CardHeader>
                            {(override?.active ?? true) && (
                              <CardContent className="p-3 pt-0 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-7 text-xs"
                                    value={override?.durationEstimate ?? phase.durationEstimate ?? 5}
                                    onChange={e =>
                                      setPlayerCountOverride(phase.id, count, {
                                        active: true,
                                        durationEstimate: parseInt(e.target.value) || 0,
                                        notes: override?.notes ?? "",
                                      })
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">min</span>
                                </div>
                                <Textarea
                                  className="text-xs min-h-[60px]"
                                  placeholder="Notes for this player count..."
                                  value={override?.notes ?? ""}
                                  onChange={e =>
                                    setPlayerCountOverride(phase.id, count, {
                                      active: true,
                                      durationEstimate: override?.durationEstimate ?? phase.durationEstimate ?? 5,
                                      notes: e.target.value,
                                    })
                                  }
                                />
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Actions in this Phase</Label>
                      <Button size="sm" variant="outline" onClick={() => addAction(phase.id)} className="gap-1 h-7">
                        <Plus className="h-3 w-3" /> Add Action
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {phase.actions.map((action) => (
                        <div key={action.id} className="flex items-start gap-2 bg-muted/30 rounded-lg p-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={action.name}
                                onChange={e => updateAction(phase.id, action.id, { name: e.target.value })}
                                className="h-7 text-sm font-medium"
                                placeholder="Action name"
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <Switch
                                  checked={action.optional}
                                  onCheckedChange={c => updateAction(phase.id, action.id, { optional: c })}
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Optional</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Switch
                                  checked={action.repeatable}
                                  onCheckedChange={c => updateAction(phase.id, action.id, { repeatable: c })}
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Repeatable</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive shrink-0"
                                onClick={() => removeAction(phase.id, action.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <Textarea
                              className="text-xs min-h-[40px]"
                              value={action.description}
                              onChange={e => updateAction(phase.id, action.id, { description: e.target.value })}
                              placeholder="Describe the action..."
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                className="h-7 text-xs"
                                value={action.cost || ""}
                                onChange={e => updateAction(phase.id, action.id, { cost: e.target.value })}
                                placeholder="Cost (e.g., '1 Action Point')"
                              />
                              <Input
                                className="h-7 text-xs"
                                value={action.effect || ""}
                                onChange={e => updateAction(phase.id, action.id, { effect: e.target.value })}
                                placeholder="Effect (e.g., 'Draw 2 cards')"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {phase.actions.length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                          No actions defined. Add actions to describe what players do in this phase.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Structure Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> {structure.phases.length} phases
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Play className="h-3 w-3" /> {structure.turnOrderType} turns
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> ~{totalDuration} min/round
            </Badge>
            {playerCounts.map(c => {
              const scaled = structure.phases.reduce((sum, p) => {
                const override = p.playerCountOverride?.[c];
                if (override && !override.active) return sum;
                return sum + (override?.durationEstimate ?? p.durationEstimate ?? 0);
              }, 0);
              return (
                <Badge key={c} variant="outline" className="gap-1">
                  <Users className="h-3 w-3" /> {c}P: ~{scaled} min
                </Badge>
              );
            })}
            {structure.phases.some(p => p.type === "conditional") && (
              <Badge variant="outline" className="gap-1 text-amber-400 border-amber-500/30">
                <GitBranch className="h-3 w-3" /> Has branches
              </Badge>
            )}
            {structure.phases.some(p => p.type === "loop") && (
              <Badge variant="outline" className="gap-1 text-violet-400 border-violet-500/30">
                <RotateCcw className="h-3 w-3" /> Has loops
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
