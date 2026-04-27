import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe, useGetAiSettings, useUpdateAiSettings, getGetAiSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Shield, LogOut, User as UserIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic Claude (default)" },
  { value: "openai", label: "OpenAI GPT" },
  { value: "gemini", label: "Google Gemini" },
  { value: "xai", label: "xAI Grok" },
];

export default function Account() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me, isLoading } = useGetMe();
  const { data: aiSettings } = useGetAiSettings();
  const updateAi = useUpdateAiSettings();
  const [provider, setProvider] = useState<string>("anthropic");

  useEffect(() => {
    if (aiSettings?.provider) setProvider(aiSettings.provider);
  }, [aiSettings?.provider]);

  const saveProvider = async (next: string) => {
    setProvider(next);
    try {
      await updateAi.mutateAsync({ data: { provider: next } });
      qc.invalidateQueries({ queryKey: getGetAiSettingsQueryKey() });
      toast({ title: "Updated", description: "Preferred AI provider saved." });
    } catch {
      toast({ title: "Failed", description: "Could not update provider.", variant: "destructive" });
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
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI preferences</CardTitle>
              <CardDescription>Pick the model family used for structured ideation. Narrative and image generation always use the best provider for the job.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Preferred provider</Label>
                <Select value={provider} onValueChange={saveProvider}>
                  <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
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
