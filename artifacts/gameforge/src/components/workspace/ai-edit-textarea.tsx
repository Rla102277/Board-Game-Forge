import { useRef, useState } from "react";
import { useAiTextEdit } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowUp, ArrowDown, RefreshCw, Plus, Zap, FileText, Loader2, Wand2, Undo2,
} from "lucide-react";

type Action = "shorter" | "longer" | "rephrase" | "vivid" | "punchy" | "formal";

const ACTIONS: { id: Action; label: string; Icon: typeof ArrowUp }[] = [
  { id: "shorter",  label: "Shorter",   Icon: ArrowUp },
  { id: "longer",   label: "Longer",    Icon: ArrowDown },
  { id: "rephrase", label: "Rephrase",  Icon: RefreshCw },
  { id: "vivid",    label: "More Vivid",Icon: Plus },
  { id: "punchy",   label: "Punchy",    Icon: Zap },
  { id: "formal",   label: "Formal",    Icon: FileText },
];

interface AiEditTextareaProps {
  projectId: number;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  contextLabel?: string;
  testId?: string;
  /** Called whenever the AI rewrites the text (so the parent can mark dirty / save). */
  onAiRewrite?: (next: string) => void;
}

export function AiEditTextarea({
  projectId,
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  contextLabel,
  testId,
  onAiRewrite,
}: AiEditTextareaProps) {
  const { toast } = useToast();
  const aiTextEdit = useAiTextEdit();
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  const undoRef = useRef<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const trimmedLen = value.trim().length;

  const runAction = async (action: Action) => {
    if (trimmedLen === 0) {
      toast({ title: "Add some text first", description: "There's nothing to rewrite yet.", variant: "destructive" });
      return;
    }
    setBusyAction(action);
    const previous = value;
    try {
      const res = await aiTextEdit.mutateAsync({
        projectId,
        data: { text: value, action, ...(contextLabel ? { contextLabel } : {}) },
      });
      const rewritten = (res?.rewritten || "").trim();
      if (!rewritten) {
        toast({ title: "AI returned nothing usable", variant: "destructive" });
        return;
      }
      undoRef.current = previous;
      setCanUndo(true);
      onChange(rewritten);
      onAiRewrite?.(rewritten);
    } catch (err) {
      toast({
        title: "AI edit failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const undo = () => {
    if (undoRef.current === null) return;
    const prev = undoRef.current;
    undoRef.current = null;
    setCanUndo(false);
    onChange(prev);
    onAiRewrite?.(prev);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <Textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (canUndo) {
            undoRef.current = null;
            setCanUndo(false);
          }
        }}
        placeholder={placeholder}
        rows={rows}
        className={className}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1 mr-1">
          <Wand2 className="h-3 w-3 text-primary" /> AI:
        </span>
        {ACTIONS.map(({ id, label, Icon }) => {
          const busy = busyAction === id;
          const disabled = busyAction !== null || trimmedLen === 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => runAction(id)}
              disabled={disabled}
              data-testid={testId ? `${testId}-action-${id}` : undefined}
              className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md border border-border bg-background text-muted-foreground hover:text-white hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {label}
            </button>
          );
        })}
        {canUndo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs ml-auto text-muted-foreground hover:text-white"
            onClick={undo}
            data-testid={testId ? `${testId}-undo` : undefined}
          >
            <Undo2 className="h-3 w-3 mr-1" /> Undo AI edit
          </Button>
        )}
      </div>
    </div>
  );
}
