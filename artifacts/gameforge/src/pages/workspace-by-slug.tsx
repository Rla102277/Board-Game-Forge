import { useEffect, useState } from "react";
import { useParams, Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Workspace from "@/pages/workspace";
import { workspacesApi, type WorkspaceProject } from "@/lib/workspaces-api";
import { getGetProjectQueryKey } from "@workspace/api-client-react";

export default function WorkspaceBySlug() {
  const params = useParams<{ workspaceSlug: string; projectSlug: string }>();
  const queryClient = useQueryClient();
  const [resolvedId, setResolvedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolvedId(null);
    setError(null);
    workspacesApi
      .resolveProject(params.workspaceSlug, params.projectSlug)
      .then((p: WorkspaceProject) => {
        if (!cancelled) {
          queryClient.setQueryData(getGetProjectQueryKey(p.id), p);
          setResolvedId(p.id);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [params.workspaceSlug, params.projectSlug, queryClient]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Project not found</h2>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <Button asChild variant="outline"><Link href={`/${params.workspaceSlug}`}>Back to workspace</Link></Button>
        </div>
      </div>
    );
  }

  if (resolvedId === null) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  return <Workspace key={resolvedId} projectId={resolvedId} />;
}

export function WorkspaceHomeRedirect() {
  // back-compat: /p/:projectId — keep working
  return <Redirect to="/" />;
}
