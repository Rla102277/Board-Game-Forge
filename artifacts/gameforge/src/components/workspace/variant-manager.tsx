import { useState, useMemo } from "react";
import {
  useListEntityProperties, useCreateEntityProperty, useUpdateEntityProperty, useDeleteEntityProperty,
  getListEntityPropertiesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2 } from "lucide-react";

const VARIANT_PREFIX = "variant_";

interface VariantManagerProps {
  projectId: number;
  entityId: number;
  entityName: string;
}

export function VariantManager({ projectId, entityId, entityName }: VariantManagerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: props, isLoading } = useListEntityProperties(projectId, entityId);
  const createProp = useCreateEntityProperty();
  const updateProp = useUpdateEntityProperty();
  const deleteProp = useDeleteEntityProperty();

  const [newVariant, setNewVariant] = useState({ name: "", qty: "1" });
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const variants = useMemo(() => {
    if (!props) return [];
    return props
      .filter(p => p.name.startsWith(VARIANT_PREFIX))
      .map(p => ({
        id: p.id,
        name: p.name.slice(VARIANT_PREFIX.length),
        qty: p.defaultValue ?? 1,
        propName: p.name,
      }));
  }, [props]);

  const total = variants.reduce((sum, v) => sum + Number(v.qty), 0);

  const handleAdd = async () => {
    const name = newVariant.name.trim();
    if (!name) return;
    const propName = `${VARIANT_PREFIX}${name}`;
    if (variants.some(v => v.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Variant already exists", variant: "destructive" });
      return;
    }
    try {
      await createProp.mutateAsync({
        projectId, entityId,
        data: { name: propName, dataType: "number", defaultValue: Math.max(1, parseInt(newVariant.qty) || 1) },
      });
      setNewVariant({ name: "", qty: "1" });
      qc.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entityId) });
    } catch {
      toast({ title: "Could not add variant", variant: "destructive" });
    }
  };

  const handleUpdateQty = async (propId: number, propName: string, qty: number) => {
    setUpdatingId(propId);
    try {
      await updateProp.mutateAsync({
        projectId, entityId, propertyId: propId,
        data: { name: propName, dataType: "number", defaultValue: Math.max(1, qty) },
      });
      qc.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entityId) });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (propId: number) => {
    try {
      await deleteProp.mutateAsync({ projectId, entityId, propertyId: propId });
      qc.invalidateQueries({ queryKey: getListEntityPropertiesQueryKey(projectId, entityId) });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          🎨 Colour / Variant Sets
        </p>
        {total > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
            {total} {entityName}s total
          </span>
        )}
      </div>

      {variants.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Variant / Colour</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Quantity</th>
                <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-20">Share</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {variants.map(v => {
                const pct = total > 0 ? Math.round((Number(v.qty) / total) * 100) : 0;
                return (
                  <tr key={v.id} className="group">
                    <td className="px-3 py-1.5 font-medium text-white">{v.name}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={v.qty}
                        onChange={e => handleUpdateQty(v.id, v.propName, parseInt(e.target.value) || 1)}
                        className="h-6 w-16 text-xs bg-input"
                        disabled={updatingId === v.id}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 bg-muted/40 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-1">
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="bg-muted/10 border-t border-border">
                <td className="px-3 py-1 text-[10px] font-semibold text-muted-foreground">Total</td>
                <td className="px-3 py-1 text-[10px] font-mono font-semibold">{total}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Add variant row */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={newVariant.name}
            onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))}
            placeholder="Variant name (e.g. Blue, Red, Wild…)"
            className="h-7 text-xs bg-input"
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
          />
        </div>
        <div className="w-20 shrink-0">
          <Input
            type="number"
            min={1}
            value={newVariant.qty}
            onChange={e => setNewVariant(v => ({ ...v, qty: e.target.value }))}
            placeholder="Qty"
            className="h-7 text-xs bg-input"
          />
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!newVariant.name.trim() || createProp.isPending}
          className="h-7 text-xs gap-1 shrink-0"
        >
          {createProp.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
        </Button>
      </div>

      {variants.length === 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          e.g. add "Blue → 20", "Yellow → 20", "Red → 20" to model a tile set like Azul.
        </p>
      )}
    </div>
  );
}
