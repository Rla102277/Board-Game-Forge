/**
 * Workspace Admin Page
 * 
 * Workspace-level admin dashboard for managing workspace projects,
 * members, and viewing workspace-scoped analytics.
 * 
 * Accessible to workspace admins and owners.
 * Route: /w/:workspaceSlug/admin
 */
import { useParams, Link, Redirect } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { ChevronLeft, Building2, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationDashboard } from "@/components/admin/org-dashboard";
import { useToast } from "@/hooks/use-toast";
import { workspacesApi, type Workspace, type WorkspaceMember } from "@/lib/workspaces-api";

export default function WorkspaceAdmin() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { toast } = useToast();
  
  const { data: me, isLoading: meLoading } = useGetMe();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceSlug) return;
    setLoading(true);
    workspacesApi
      .detail(workspaceSlug)
      .then((detail) => {
        setWorkspace(detail.workspace);
        setMembers(detail.members);
      })
      .catch((err) => {
        toast({ 
          title: "Error loading workspace", 
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive" 
        });
      })
      .finally(() => setLoading(false));
  }, [workspaceSlug, toast]);

  const isLoading = meLoading || loading;

  // Check if user has workspace admin access
  const userMembership = members?.find((m: WorkspaceMember) => m.user?.id === me?.id);
  const canAdmin = userMembership?.role === "admin" || userMembership?.role === "owner";
  const isPlatformAdmin = me?.role === "admin";

  // Redirect if no access
  if (!isLoading && workspace && !canAdmin && !isPlatformAdmin) {
    return <Redirect to={`/w/${workspaceSlug}`} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Workspace not found</h1>
          <Link href="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/w/${workspaceSlug}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" /> 
              Back to {workspace.name}
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{workspace.name}</h1>
              <p className="text-sm text-muted-foreground">
                Studio Admin • {members?.length || 0} members
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isPlatformAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Platform Admin
                </Button>
              </Link>
            )}
            <Link href={`/w/${workspaceSlug}/settings`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Workspace Dashboard */}
        <OrganizationDashboard 
          workspaceId={workspace.id} 
          workspaceName={workspace.name}
        />
      </div>
    </div>
  );
}
