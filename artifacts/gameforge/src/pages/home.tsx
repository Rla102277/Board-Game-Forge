import { Link, useLocation } from "wouter";
import { Plus, LayoutDashboard, Activity, Gamepad2, Folder, Trash2, Settings, MoreVertical } from "lucide-react";
import { useState } from "react";
import { useListProjects, useGetDashboardSummary, useGetRecentActivity, useCreateProject, useDeleteProject, getListProjectsQueryKey, getGetDashboardSummaryQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

export default function Home() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({ name: "", description: "", gameType: "", genre: "", playerCount: "", targetDuration: "" });

  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.name) return;
    try {
      const proj = await createProject.mutateAsync({ data: createData });
      setIsCreateOpen(false);
      setCreateData({ name: "", description: "", gameType: "", genre: "", playerCount: "", targetDuration: "" });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      setLocation(`/p/${proj.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject.mutateAsync({ projectId: projectToDelete });
      setProjectToDelete(null);
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <div className="w-full max-w-6xl p-8 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center gap-3">
              <Gamepad2 className="h-10 w-10" /> GameForge
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">Your AI-powered board game design studio.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Start a new board game design project. You can change these details later.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={createData.name} onChange={e => setCreateData({ ...createData, name: e.target.value })} placeholder="e.g. Settlers of Catan" autoFocus required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={createData.description} onChange={e => setCreateData({ ...createData, description: e.target.value })} placeholder="A game about trading and building..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gameType">Game Type</Label>
                    <Input id="gameType" value={createData.gameType} onChange={e => setCreateData({ ...createData, gameType: e.target.value })} placeholder="e.g. Strategy" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Input id="genre" value={createData.genre} onChange={e => setCreateData({ ...createData, genre: e.target.value })} placeholder="e.g. Fantasy" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playerCount">Player Count</Label>
                    <Input id="playerCount" value={createData.playerCount} onChange={e => setCreateData({ ...createData, playerCount: e.target.value })} placeholder="e.g. 2-4" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetDuration">Duration</Label>
                    <Input id="targetDuration" value={createData.targetDuration} onChange={e => setCreateData({ ...createData, targetDuration: e.target.value })} placeholder="e.g. 60-90 mins" />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!createData.name || createProject.isPending}>
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Folder className="h-4 w-4" /> Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{summary?.projectCount || 0}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> Total Entities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{summary?.entityCount || 0}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Total Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{summary?.ruleCount || 0}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" /> Top Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-full" /> : (
                <div className="text-sm space-y-1">
                  {summary?.gameTypeBreakdown.slice(0, 2).map(t => (
                    <div key={t.gameType} className="flex justify-between">
                      <span className="text-muted-foreground">{t.gameType}</span>
                      <span className="font-medium">{t.count}</span>
                    </div>
                  ))}
                  {!summary?.gameTypeBreakdown.length && <span className="text-muted-foreground">None yet</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold border-b border-border pb-2">Your Projects</h2>
            {projectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="bg-card border-card-border hover:border-primary/50 transition-colors group relative flex flex-col h-full hover-elevate">
                    <Link href={`/p/${project.id}`} className="absolute inset-0 z-0" />
                    <CardHeader className="pb-2 relative z-10 flex-1">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg line-clamp-1 pr-8">{project.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project.id);
                            }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="line-clamp-2 mt-2 h-10">
                        {project.description || "No description provided."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-0 mt-auto">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-4">
                        {project.gameType && <span className="bg-muted/50 border border-border px-2 py-1 rounded-md">{project.gameType}</span>}
                        {project.genre && <span className="bg-muted/50 border border-border px-2 py-1 rounded-md">{project.genre}</span>}
                        {(!project.gameType && !project.genre) && <span className="opacity-0 px-2 py-1">placeholder</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
                <h3 className="text-lg font-medium">No projects yet</h3>
                <p className="text-muted-foreground mt-1 mb-6">Start designing your first board game today.</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Project
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b border-border pb-2">Recent Activity</h2>
            <Card className="bg-card border-card-border h-[calc(100%-3rem)]">
              <CardContent className="p-0">
                {activityLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : activity && activity.length > 0 ? (
                  <div className="divide-y divide-border">
                    {activity.map((ev) => (
                      <div key={ev.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                        <div className="mt-0.5 bg-primary/10 p-2 rounded-full text-primary">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none mb-1">{ev.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate max-w-[120px]">{ev.projectName}</span>
                            <span>•</span>
                            <span>{format(new Date(ev.createdAt), "MMM d, h:mm a")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No recent activity.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={!!projectToDelete} onOpenChange={(o) => !o && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all of its entities, rules, players, notes, and tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
