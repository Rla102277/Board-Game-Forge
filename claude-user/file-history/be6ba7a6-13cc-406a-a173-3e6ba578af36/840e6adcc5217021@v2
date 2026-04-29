import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Gamepad2, Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { workspacesApi } from "@/lib/workspaces-api";
import { Link } from "wouter";

interface WorkspacePreview {
  id: number;
  name: string;
  slug: string;
  memberCount: number;
}

export default function JoinWorkspace() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { isSignedIn, isLoaded } = useUser();

  const [preview, setPreview] = useState<WorkspacePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    workspacesApi.previewJoin(code)
      .then(setPreview)
      .catch((err) => setPreviewError(err instanceof Error ? err.message : String(err)));
  }, [code]);

  const join = async () => {
    if (!code) return;
    setJoining(true);
    setJoinError(null);
    try {
      const result = await workspacesApi.joinByCode(code);
      setJoined(true);
      setTimeout(() => setLocation(`/${result.slug}`), 1200);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : String(err));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-6 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-base">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Gamepad2 className="h-4 w-4" />
          </div>
          GameForge
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-4">
          {!preview && !previewError && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Loading workspace…</p>
            </div>
          )}

          {previewError && (
            <Card className="border-destructive/40">
              <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="font-semibold">Invalid invite link</p>
                <p className="text-sm text-muted-foreground">{previewError}</p>
                <Link href="/">
                  <Button variant="outline" className="mt-2">Go home</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {preview && !joined && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="text-center space-y-1">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                    <Gamepad2 className="h-7 w-7" />
                  </div>
                  <h1 className="text-xl font-bold">{preview.name}</h1>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {preview.memberCount} {preview.memberCount === 1 ? "member" : "members"}
                  </p>
                </div>

                {!isLoaded ? (
                  <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : !isSignedIn ? (
                  <div className="space-y-2">
                    <p className="text-sm text-center text-muted-foreground">Sign in to join this workspace.</p>
                    <Link href={`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`}>
                      <Button className="w-full">Sign in to join</Button>
                    </Link>
                    <Link href={`/sign-up?redirect_url=${encodeURIComponent(window.location.pathname)}`}>
                      <Button variant="outline" className="w-full">Create account</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {joinError && (
                      <p className="text-sm text-destructive text-center">{joinError}</p>
                    )}
                    <Button className="w-full" onClick={join} disabled={joining}>
                      {joining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining…</> : `Join ${preview.name}`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {joined && (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-semibold">You joined {preview?.name}!</p>
                <p className="text-sm text-muted-foreground">Redirecting to workspace…</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
