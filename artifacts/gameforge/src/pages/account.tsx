import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe, useGetAiSettings, useUpdateAiSettings, getGetAiSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Shield, LogOut, User as UserIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AVAILABLE_MODELS,
  FAMILY_LABELS,
  defaultModelOption,
  findModelOption,
  type ModelOption,
} from "@/lib/ai-models";

function modelKey(opt: { provider: string; model: string }) {
  return `${opt.provider}::${opt.model}`;
}

export default function Account() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me, isLoading } = useGetMe();
  const { data: aiSettings } = useGetAiSettings();
  const updateAi = useUpdateAiSettings();

  const initial = useMemo(
    () => findModelOption(aiSettings?.provider, aiSettings?.model) ?? defaultModelOption(),
    [aiSettings?.provider, aiSettings?.model],
  );
  const [selectedKey, setSelectedKey] = useState<string>(modelKey(initial));

  useEffect(() => {
    setSelectedKey(modelKey(initial));
  }, [initial]);

  const grouped = useMemo(() => {
    const map = new Map<ModelOption["family"], ModelOption[]>();
    for (const m of AVAILABLE_MODELS) {
      const arr = map.get(m.family) ?? [];
      arr.push(m);
      map.set(m.family, arr);
    }
    return Array.from(map.entries());
  }, []);

  const saveModel = async (key: string) => {
    setSelectedKey(key);
    const [provider, ...modelParts] = key.split("::");
    const model = modelParts.join("::");
    const opt = AVAILABLE_MODELS.find(m => m.provider === provider && m.model === model);
    if (!opt) return;
    try {
      await updateAi.mutateAsync({ data: { provider: opt.provider, model: opt.model } });
      qc.invalidateQueries({ queryKey: getGetAiSettingsQueryKey() });
      toast({ title: "Updated", description: `Now using ${opt.label}.` });
    } catch {
      toast({ title: "Failed", description: "Could not update model.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to projects
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-1">Account</h1>
        <p className="text-muted-foreground mb-8">Manage your profile, AI preferences, and access.</p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5" /> Profile</CardTitle>
              <CardDescription>Signed in via Clerk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <Skeleton className="h-20 w-full" /> : (
                <>
                  <div className="flex items-center gap-4">
                    {user?.imageUrl && <img src={user.imageUrl} alt="" className="h-14 w-14 rounded-full" />}
                    <div>
                      <div className="font-medium">{[me?.firstName, me?.lastName].filter(Boolean).join(" ") || user?.fullName || user?.primaryEmailAddress?.emailAddress}</div>
                      <div className="text-sm text-muted-foreground">{me?.email || user?.primaryEmailAddress?.emailAddress}</div>
                    </div>
                  </div>
                  {me?.role === "admin" && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-medium">
                      <Shield className="h-3 w-3" /> Administrator
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI model</CardTitle>
              <CardDescription>
                Pick the model used by GameForge AI for chat, ideation, and AI Enhance actions.
                Image generation always uses the best model for the job. Image and PDF kickstarter exports use Gamma separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-model">Model</Label>
                <Select value={selectedKey} onValueChange={saveModel}>
                  <SelectTrigger id="ai-model" data-testid="select-account-ai-model"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[420px]">
                    {grouped.map(([family, opts]) => (
                      <SelectGroup key={family}>
                        <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {FAMILY_LABELS[family]}
                        </SelectLabel>
                        {opts.map(opt => (
                          <SelectItem key={modelKey(opt)} value={modelKey(opt)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {me?.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Administration</CardTitle>
                <CardDescription>Manage all GameForge users.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin"><Button variant="secondary">Open admin console</Button></Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => signOut({ redirectUrl: "/" })} className="gap-2">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
