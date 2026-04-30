import { useState, useEffect } from "react";
import {
  useListEntityProperties, useCreateEntityProperty, useUpdateEntityProperty,
  getListEntityPropertiesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2 } from "lucide-react";

const QUICK_EMOJIS = ["⚔️","🛡️","💀","⭐","❓","🔥","❄️","⚡","🎯","💎","🌀","✨","💥","🌟","🏆","☠️","💫","🍀"];
const DEFAULT_FACES = ["1","2","3","4","5","6"];

interface DieFaceDesignerProps {
  projectId: number;
  entityId: number;
}

export function DieFaceDesigner({ projectId, entityId }: DieFaceDesignerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: props } = useListEntityProperties(projectId, entityId);
  const createProp = useCreateEntityProperty();
  const updateProp = useUpdateEntityProperty();

  const [faces, setFaces] = useState<string[]>(DEFAULT_FACES);
  const [saving, setSaving] = useState(false);
  const [lastInsertIdx, setLastInsertIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!props) return;
    const loaded = [...DEFAULT_FACES];
    let any = false;
    props.forEach(p => {
      const m = p.name.match(/^face_(\d)$/);
      if (m) {
        const i = parseInt(m[1]) - 1;
        if (i >= 0 && i < 6) {
          loaded[i] = p.textValue ?? (p.defaultValue != null ? String(p.defaultValue) : DEFAULT_FACES[i]);
          any = true;
        }
      }
    });
    if (any) setFaces(loaded);
  }, [props]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < 6; i++) {
        const propName = `face_${i + 1}`;
        const existing = props?.find(p => p.name === propName);
        const val = faces[i] ?? DEFAULT_FACES[i];
        if (existing) {
          await updateProp.mutateAsync({ projectId, entityId, propertyId: existing.id, data: { name: propName, dataType: "string", textValue: val } });
        } else {
          await createProp.mutateAsync({ projectId, entityId, data: { name: propName, dataType: "string", textValue: val } });
        }
      }
      qc.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entityId) });
      toast({ title: "Die faces saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setFace = (i: number, val: string) => setFaces(prev => { const next = [...prev]; next[i] = val; return next; });

  const insertEmoji = (emoji: string) => {
    if (lastInsertIdx !== null) {
      setFace(lastInsertIdx, emoji);
    } else {
      const emptyIdx = faces.findIndex(f => !f || /^\d+$/.test(f));
      if (emptyIdx >= 0) setFace(emptyIdx, emoji);
    }
  };

  const valueCounts = faces.reduce<Record<string, number>>((acc, f) => {
    acc[f] = (acc[f] || 0) + 1;
    return acc;
  }, {});

  const totalFaces = 6;
  const isDirty = faces.some((f, i) => {
    const existing = props?.find(p => p.name === `face_${i + 1}`);
    const saved = existing ? (existing.textValue ?? String(existing.defaultValue ?? DEFAULT_FACES[i])) : DEFAULT_FACES[i];
    return f !== saved;
  });

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          🎲 Die Faces
          <span className="font-normal normal-case tracking-normal text-muted-foreground/60">— enter numbers, text, or click emoji below</span>
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving || !isDirty} className="h-6 text-xs gap-1">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save faces
        </Button>
      </div>

      {/* 6-face grid */}
      <div className="grid grid-cols-3 gap-2">
        {faces.map((face, i) => (
          <div key={i} className="space-y-1">
            <p className="text-[10px] text-muted-foreground text-center">Face {i + 1}</p>
            <Input
              value={face}
              onChange={e => setFace(i, e.target.value)}
              onFocus={() => setLastInsertIdx(i)}
              className="h-10 text-center text-base font-bold bg-input border-border"
              maxLength={4}
            />
          </div>
        ))}
      </div>

      {/* Quick emoji insert */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground">Quick insert (click to add to focused face):</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              className="text-base hover:scale-125 transition-transform leading-none"
              title={e}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Probability distribution */}
      <div className="rounded-md bg-muted/10 border border-border/40 px-3 py-2 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Probability distribution</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(valueCounts).map(([v, c]) => (
            <div key={v} className="flex items-center gap-1.5">
              <span className="text-sm">{v}</span>
              <span className="text-[10px] text-muted-foreground">{c}/{totalFaces} ({Math.round(c / totalFaces * 100)}%)</span>
              <div className="h-1.5 w-12 bg-muted/40 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(c / totalFaces) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
