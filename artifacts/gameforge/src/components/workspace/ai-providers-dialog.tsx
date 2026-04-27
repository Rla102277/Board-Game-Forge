import { useEffect, useState } from "react";
import { Loader2, KeyRound, Save, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  workspacesApi,
  type WorkspaceProviderName,
  type WorkspaceProviderSetting,
} from "@/lib/workspaces-api";

const PROVIDER_LABELS: Record<WorkspaceProviderName, { label: string; description: string }> = {
  anthropic: { label: "Anthropic", description: "Claude Sonnet 4.6, Haiku 4.5" },
  openai: { label: "OpenAI", description: "GPT-5.4, GPT-5 Mini" },
  gemini: { label: "Google Gemini", description: "Gemini 3 Pro / Flash" },
  openrouter: { label: "OpenRouter", description: "Grok, Perplexity, others" },
};

interface RowState extends WorkspaceProviderSetting {
  apiKeyDraft: string;
  showKey: boolean;
  saving: boolean;
}

export function AiProvidersDialog({
  open,
  onOpenChange,
  workspaceSlug,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceSlug: string;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<RowState[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    workspacesApi
      .listAiSettings(workspaceSlug)
      .then((settings) =>
        setRows(settings.map((s) => ({ ...s, apiKeyDraft: "", showKey: false, saving: false }))),
      )
      .catch((err) =>
        toast({
          title: "Could not load AI settings",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, [open, workspaceSlug, toast]);

  const updateRow = (provider: WorkspaceProviderName, patch: Partial<RowState>) => {
    setRows((cur) => (cur ? cur.map((r) => (r.provider === provider ? { ...r, ...patch } : r)) : cur));
  };

  const toggleEnabled = async (row: RowState, next: boolean) => {
    updateRow(row.provider, { enabled: next, saving: true });
    try {
      const updated = await workspacesApi.updateAiSetting(workspaceSlug, row.provider, { enabled: next });
      updateRow(row.provider, { ...updated, saving: false });
      toast({ title: `${PROVIDER_LABELS[row.provider].label} ${next ? "enabled" : "disabled"}` });
    } catch (err) {
      updateRow(row.provider, { enabled: !next, saving: false });
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const saveKey = async (row: RowState) => {
    if (!row.apiKeyDraft.trim()) return;
    updateRow(row.provider, { saving: true });
    try {
      const updated = await workspacesApi.updateAiSetting(workspaceSlug, row.provider, { apiKey: row.apiKeyDraft.trim() });
      updateRow(row.provider, { ...updated, apiKeyDraft: "", showKey: false, saving: false });
      toast({ title: `${PROVIDER_LABELS[row.provider].label} key saved` });
    } catch (err) {
      updateRow(row.provider, { saving: false });
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const clearKey = async (row: RowState) => {
    updateRow(row.provider, { saving: true });
    try {
      const updated = await workspacesApi.updateAiSetting(workspaceSlug, row.provider, { apiKey: null });
      updateRow(row.provider, { ...updated, apiKeyDraft: "", saving: false });
      toast({ title: `${PROVIDER_LABELS[row.provider].label} key removed — reverting to platform default` });
    } catch (err) {
      updateRow(row.provider, { saving: false });
      toast({
        title: "Clear failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> AI providers
          </DialogTitle>
          <DialogDescription>
            Enable or disable providers for this workspace. Optionally provide your own API key (BYOK) — keys are encrypted at rest.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            {rows?.map((row) => {
              const meta = PROVIDER_LABELS[row.provider];
              return (
                <div
                  key={row.provider}
                  className="border border-border rounded-lg p-3 space-y-3"
                  data-testid={`ai-provider-row-${row.provider}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{meta.label}</div>
                      <div className="text-xs text-muted-foreground">{meta.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {row.hasKey && (
                        <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">BYOK active</span>
                      )}
                      <Label htmlFor={`enabled-${row.provider}`} className="text-xs text-muted-foreground">
                        {row.enabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id={`enabled-${row.provider}`}
                        checked={row.enabled}
                        disabled={row.saving}
                        onCheckedChange={(v) => toggleEnabled(row, v)}
                        data-testid={`toggle-${row.provider}`}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={row.showKey ? "text" : "password"}
                        placeholder={row.hasKey ? "•••••••• (saved) — enter new to replace" : "Paste API key"}
                        value={row.apiKeyDraft}
                        onChange={(e) => updateRow(row.provider, { apiKeyDraft: e.target.value })}
                        data-testid={`apikey-${row.provider}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateRow(row.provider, { showKey: !row.showKey })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {row.showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveKey(row)}
                      disabled={!row.apiKeyDraft.trim() || row.saving}
                      data-testid={`save-key-${row.provider}`}
                      className="gap-1"
                    >
                      {row.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                    {row.hasKey && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clearKey(row)}
                        disabled={row.saving}
                        data-testid={`clear-key-${row.provider}`}
                        className="gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
