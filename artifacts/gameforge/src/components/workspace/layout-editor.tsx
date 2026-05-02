import { useState, useCallback } from "react";
import { useGetProject } from "@workspace/api-client-react";
import { useDesignerArtifact } from "@/hooks/use-designer-artifact";
import { Grid3X3, Plus, Trash2, Move, ZoomIn, ZoomOut, Eye, Layers, Square, Circle, Hexagon, Diamond, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: "board" | "deck" | "discard" | "player-area" | "resource" | "custom";
  label: string;
}

interface LayoutState {
  zones: Zone[];
  gridSize: number;
  width: number;
  height: number;
  showGrid: boolean;
}

const STORAGE = (pid: number) => `gameforge.layout.${pid}`;
const COLORS = ["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#10b981","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e","#78716c"];

function makeDefault(): LayoutState {
  return { zones: [
    { id: crypto.randomUUID(), name: "Main Board", x: 2, y: 2, w: 8, h: 6, color: "#3b82f6", type: "board", label: "Board" },
    { id: crypto.randomUUID(), name: "Draw Deck", x: 11, y: 2, w: 2, h: 3, color: "#22c55e", type: "deck", label: "Deck" },
    { id: crypto.randomUUID(), name: "Discard", x: 11, y: 6, w: 2, h: 2, color: "#ef4444", type: "discard", label: "Discard" },
  ], gridSize: 40, width: 16, height: 10, showGrid: true };
}

export function LayoutEditor({ projectId }: { projectId: number }) {
  const { state, setState: persist } = useDesignerArtifact<LayoutState>(
    projectId, "layout", makeDefault, STORAGE,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const addZone = () => {
    const z: Zone = { id: crypto.randomUUID(), name: "New Zone", x: 1, y: 1, w: 3, h: 2, color: COLORS[state.zones.length % COLORS.length], type: "custom", label: "Zone" };
    persist({ ...state, zones: [...state.zones, z] }); setSelected(z.id);
  };
  const updateZone = (id: string, u: Partial<Zone>) => persist({ ...state, zones: state.zones.map(z => z.id === id ? { ...z, ...u } : z) });
  const removeZone = (id: string) => { persist({ ...state, zones: state.zones.filter(z => z.id !== id) }); if (selected === id) setSelected(null); };

  const handleMouseDown = (e: React.MouseEvent, zid: string) => {
    const rect = (e.currentTarget as HTMLElement).closest(".layout-canvas")?.getBoundingClientRect();
    if (!rect) return;
    const z = state.zones.find(x => x.id === zid); if (!z) return;
    setDragging(zid);
    setDragOffset({ x: (e.clientX - rect.left) / zoom - z.x * state.gridSize, y: (e.clientY - rect.top) / zoom - z.y * state.gridSize });
    setSelected(zid);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const z = state.zones.find(x => x.id === dragging); if (!z) return;
    const nx = Math.round(((e.clientX - rect.left) / zoom - dragOffset.x) / state.gridSize);
    const ny = Math.round(((e.clientY - rect.top) / zoom - dragOffset.y) / state.gridSize);
    if (nx !== z.x || ny !== z.y) updateZone(dragging, { x: Math.max(0, nx), y: Math.max(0, ny) });
  }, [dragging, dragOffset, zoom, state.gridSize, state.zones]);

  const handleMouseUp = () => setDragging(null);

  const sel = state.zones.find(z => z.id === selected);

  return (
    <div className="space-y-4 max-w-6xl">
      <div><h2 className="text-2xl font-bold flex items-center gap-2"><Grid3X3 className="h-6 w-6 text-primary" /> Board & Component Layout</h2><p className="text-muted-foreground text-sm mt-1">Spatial grid editor for zones and component placement.</p></div>
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline">{state.zones.length} zones</Badge>
        <Badge variant="outline">{state.width}×{state.height} grid</Badge>
        <Button size="sm" variant="outline" onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} className="gap-1 h-8"><ZoomOut className="h-3.5 w-3.5"/></Button>
        <span className="text-xs text-muted-foreground font-mono">{Math.round(zoom*100)}%</span>
        <Button size="sm" variant="outline" onClick={()=>setZoom(z=>Math.min(2,z+0.25))} className="gap-1 h-8"><ZoomIn className="h-3.5 w-3.5"/></Button>
        <Button size="sm" variant="outline" onClick={()=>persist({...state,showGrid:!state.showGrid})} className="gap-1 h-8"><Grid3X3 className="h-3.5 w-3.5"/> {state.showGrid?"Hide":"Show"}</Button>
        <Button size="sm" onClick={addZone} className="gap-1 h-8"><Plus className="h-3.5 w-3.5"/> Zone</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="overflow-auto p-4 layout-canvas" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="relative inline-block" style={{ width: state.width * state.gridSize * zoom, height: state.height * state.gridSize * zoom }}>
            <div className="absolute inset-0 border border-dashed border-border rounded" style={{ backgroundSize: `${state.gridSize*zoom}px ${state.gridSize*zoom}px`, backgroundImage: state.showGrid ? `linear-gradient(to right, hsl(var(--border)/.3) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/.3) 1px, transparent 1px)` : "none" }} />
            {state.zones.map(z => (
              <div key={z.id} onMouseDown={e=>handleMouseDown(e,z.id)} className={`absolute rounded-md border-2 cursor-move select-none flex items-center justify-center text-xs font-medium text-white shadow-sm transition-shadow ${selected===z.id?"ring-2 ring-primary shadow-lg":"hover:shadow-md"}`}
                style={{ left: z.x*state.gridSize*zoom, top: z.y*state.gridSize*zoom, width: z.w*state.gridSize*zoom, height: z.h*state.gridSize*zoom, backgroundColor: z.color+"cc", borderColor: z.color }}>
                {z.label}
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          {sel ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between">{sel.name}<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>removeZone(sel.id)}><Trash2 className="h-3.5 w-3.5"/></Button></CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={sel.name} onChange={e=>updateZone(sel.id,{name:e.target.value})} className="h-8 text-sm"/></div>
                <div className="space-y-1"><Label className="text-xs">Label</Label><Input value={sel.label} onChange={e=>updateZone(sel.id,{label:e.target.value})} className="h-8 text-sm"/></div>
                <div className="space-y-1"><Label className="text-xs">Type</Label><Select value={sel.type} onValueChange={v=>updateZone(sel.id,{type:v as any})}><SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger><SelectContent>{["board","deck","discard","player-area","resource","custom"].map(t=><SelectItem key={t} value={t}>{t.replace("-"," ")}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">X</Label><Input type="number" min={0} value={sel.x} onChange={e=>updateZone(sel.id,{x:parseInt(e.target.value)||0})} className="h-8 text-sm"/></div>
                  <div className="space-y-1"><Label className="text-xs">Y</Label><Input type="number" min={0} value={sel.y} onChange={e=>updateZone(sel.id,{y:parseInt(e.target.value)||0})} className="h-8 text-sm"/></div>
                  <div className="space-y-1"><Label className="text-xs">W</Label><Input type="number" min={1} value={sel.w} onChange={e=>updateZone(sel.id,{w:parseInt(e.target.value)||1})} className="h-8 text-sm"/></div>
                  <div className="space-y-1"><Label className="text-xs">H</Label><Input type="number" min={1} value={sel.h} onChange={e=>updateZone(sel.id,{h:parseInt(e.target.value)||1})} className="h-8 text-sm"/></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Color</Label><div className="flex flex-wrap gap-1">{COLORS.map(c=><button key={c} onClick={()=>updateZone(sel.id,{color:c})} className={`w-6 h-6 rounded-full border-2 ${sel.color===c?"border-primary ring-1 ring-primary":"border-transparent"}`} style={{backgroundColor:c}}/>)}</div></div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">Select a zone on the canvas to edit.</div>
          )}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Canvas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">Width (cells)</Label><Input type="number" min={4} value={state.width} onChange={e=>persist({...state,width:parseInt(e.target.value)||8})} className="h-8 text-sm"/></div>
                <div className="space-y-1"><Label className="text-xs">Height (cells)</Label><Input type="number" min={4} value={state.height} onChange={e=>persist({...state,height:parseInt(e.target.value)||6})} className="h-8 text-sm"/></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Grid Size (px)</Label><Input type="number" min={20} max={100} value={state.gridSize} onChange={e=>persist({...state,gridSize:parseInt(e.target.value)||40})} className="h-8 text-sm"/></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
