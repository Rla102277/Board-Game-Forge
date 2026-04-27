import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, Redirect } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Gamepad2, Plus, Sparkles, ArrowRight, Users, ChevronDown,
  LogOut, Shield, User as UserIcon, Folder, Crown, Trash2,
  Loader2, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  workspacesApi,
  type Workspace, type WorkspaceDetail,
} from "@/lib/workspaces-api";
import { MembersDialog } from "@/components/workspace/members-dialog";
import { AiProvidersDialog } from "@/components/workspace/ai-providers-dialog";
import { format } from "date-fns";

interface Template {
  key: string;
  title: string;
  desc: string;
  emoji: string;
}

const TEMPLATES: Template[] = [
  { key: "strategy",        title: "Strategy",         desc: "Engine-building, deep decisions",  emoji: "♟️" },
  { key: "party",           title: "Party",            desc: "Loud, social, 20 minutes",         emoji: "🎉" },
  { key: "cooperative",     title: "Cooperative",      desc: "All vs the game",                  emoji: "🤝" },
  { key: "deck-builder",    title: "Deck-builder",     desc: "Craft a custom card engine",       emoji: "🃏" },
  { key: "roll-and-write",  title: "Roll-and-write",   desc: "Shared dice, personal sheets",     emoji: "🎲" },
  { key: "worker-placement",title: "Worker placement", desc: "Pick spots, gather, build",        emoji: "🏗️" },
  { key: "tile-laying",     title: "Tile-laying",      desc: "Spatial puzzles, patterns",        emoji: "🧩" },
  { key: "social-deduction",title: "Social deduction", desc: "Hidden roles, social bluffing",    emoji: "🎭" },
];

function useWorkspacesList() {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    try {
      const list = await workspacesApi.list();
      setWorkspaces(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  useEffect(() => { reload(); }, []);
  return { workspaces, error, reload };
}

export default function WorkspaceHome() {
  const params = useParams<{ workspaceSlug?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();

  const { workspaces, reload: reloadWorkspaces } = useWorkspacesList();
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [aiProvidersOpen, setAiProvidersOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const slug = params?.workspaceSlug;

  // If we landed on "/" with no slug, redirect to first workspace.
  const fallbackSlug = useMemo(() => workspaces?.[0]?.slug, [workspaces]);

  useEffect(() => {
    if (!slug) return;
    setDetailLoading(true);
    workspacesApi
      .detail(slug)
      .then((d) => setDetail(d))
      .catch((e) => toast({ title: "Workspace error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }))
      .finally(() => setDetailLoading(false));
  }, [slug, toast]);

  if (!slug && fallbackSlug) {
    return <Redirect to={`/${fallbackSlug}`} replace />;
  }
  if (!slug) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
        <div className="text-muted-foreground">Loading workspaces…</div>
      </div>
    );
  }

  const reloadDetail = async () => {
    try {
      const d = await workspacesApi.detail(slug);
      setDetail(d);
    } catch (err) {
      toast({ title: "Reload failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const generateFrom = async (templateKey: string | null) => {
    setGenerating(templateKey ?? "prompt");
    try {
      const out = await workspacesApi.generate(slug, {
        prompt: prompt.trim() || undefined,
        template: templateKey ?? undefined,
      });
      toast({ title: "Game generated", description: out.project.name });
      setLocation(`/${out.workspaceSlug}/${out.project.slug ?? out.project.id}`);
    } catch (err) {
      toast({ title: "Could not generate", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const createBlankProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    try {
      const out = await workspacesApi.createProject(slug, { name: createName.trim() });
      setCreateOpen(false);
      setCreateName("");
      setLocation(`/${out.workspaceSlug}/${out.project.slug ?? out.project.id}`);
    } catch (err) {
      toast({ title: "Could not create project", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const ws = await workspacesApi.create({ name: newWsName.trim() });
      setNewWsOpen(false);
      setNewWsName("");
      await reloadWorkspaces();
      setLocation(`/${ws.slug}`);
    } catch (err) {
      toast({ title: "Could not create workspace", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const deleteProject = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/projects/${confirmDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      setConfirmDelete(null);
      await reloadDetail();
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const ws = detail?.workspace;
  const canManage = detail?.role === "owner" || detail?.role === "admin";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href={`/${slug}`} className="flex items-center gap-2 font-bold text-lg" data-testid="brand-link">
            <Gamepad2 className="h-6 w-6 text-primary" /> GameForge
          </Link>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="workspace-switcher">
                  <Folder className="h-4 w-4" /> {ws?.name ?? slug}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {(workspaces ?? []).map((w) => (
                  <DropdownMenuItem key={w.id} asChild>
                    <Link href={`/${w.slug}`} className="flex items-center gap-2">
                      {w.isPersonal === 1 ? <Crown className="h-3.5 w-3.5 text-amber-500" /> : <Folder className="h-3.5 w-3.5" />}
                      <span className="truncate flex-1">{w.name}</span>
                      {w.slug === slug && <span className="text-xs text-primary">●</span>}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setNewWsOpen(true)} data-testid="new-workspace-button">
                  <Plus className="h-4 w-4 mr-2" /> New workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" className="gap-2" onClick={() => setMembersOpen(true)} data-testid="open-members">
              <Users className="h-4 w-4" /> Members
              {detail?.members?.length ? (
                <Badge variant="secondary" className="ml-1">{detail.members.length}</Badge>
              ) : null}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full hover:ring-2 hover:ring-primary/40">
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="" className="h-9 w-9 rounded-full" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                      {(user?.firstName?.[0] || "U").toUpperCase()}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user?.firstName || "User"}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/account"><UserIcon className="h-4 w-4 mr-2" /> Account</Link></DropdownMenuItem>
                {canManage && (
                  <DropdownMenuItem onClick={() => setAiProvidersOpen(true)} data-testid="open-ai-providers">
                    <Sparkles className="h-4 w-4 mr-2" /> AI providers
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild><Link href="/admin"><Shield className="h-4 w-4 mr-2" /> Admin</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Hero / chat box */}
        <section className="space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              What game do you want to make today?
            </h1>
            <p className="text-muted-foreground text-lg">
              Describe it, or pick a template. We'll spin up a playable prototype with rules, components, and player roles in seconds.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-lg">
            <Textarea
              data-testid="generate-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A 2-4 player cooperative game where you're space cartographers mapping a fragile alien sector before it collapses. Push your luck, share resources, win together."
              className="min-h-[110px] border-0 bg-transparent text-base resize-none focus-visible:ring-0"
              disabled={Boolean(generating)}
            />
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="gap-2 text-muted-foreground" data-testid="open-blank-project">
                      <Plus className="h-4 w-4" /> Empty project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New empty project</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createBlankProject} className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="newName">Project name</Label>
                        <Input id="newName" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Cosmic Cartographers" autoFocus />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={!createName.trim()}>Create</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => generateFrom(null)}
                disabled={!prompt.trim() || Boolean(generating)}
                data-testid="generate-from-prompt"
              >
                {generating === "prompt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Templates */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Start from a template</h2>
              <p className="text-sm text-muted-foreground">One click → a complete prototype with rules, entities, and roles.</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wand2 className="h-3.5 w-3.5" /> Powered by GameForge AI</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => generateFrom(t.key)}
                disabled={Boolean(generating)}
                data-testid={`template-${t.key}`}
                className="text-left rounded-xl border bg-card hover:border-primary/60 hover:bg-card/80 p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{t.emoji}</div>
                  {generating === t.key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="font-medium mt-3">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Existing projects */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Your projects</h2>
          {detailLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : detail?.projects?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {detail.projects.map((p) => {
                const target = `/${slug}/${p.slug ?? p.id}`;
                return (
                  <Card key={p.id} className="hover:border-primary/40 transition-colors group" data-testid={`project-card-${p.id}`}>
                    <CardContent className="p-4 flex flex-col gap-3 h-full">
                      <Link href={target} className="block flex-1">
                        <div className="font-semibold truncate">{p.name}</div>
                        {p.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</div>}
                        <div className="flex flex-wrap gap-1 mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {p.gameType && <span className="px-1.5 py-0.5 rounded bg-secondary">{p.gameType}</span>}
                          {p.genre && <span className="px-1.5 py-0.5 rounded bg-secondary">{p.genre}</span>}
                          {p.playerCount && <span className="px-1.5 py-0.5 rounded bg-secondary">{p.playerCount}</span>}
                        </div>
                      </Link>
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                        <span>{format(new Date(p.updatedAt), "MMM d")}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => setConfirmDelete({ id: p.id, name: p.name })}
                          data-testid={`project-delete-${p.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border-dashed border-2 p-10 text-center text-muted-foreground">
              No projects yet. Describe a game above or pick a template to get started.
            </div>
          )}
        </section>

        {/* Members */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Members</h2>
            <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
              <UserIcon className="h-4 w-4 mr-1.5" /> Manage
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail?.members?.map((m) => {
              const display = m.user
                ? [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.email
                : m.invitedEmail;
              return (
                <div key={m.id} className="inline-flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 text-sm">
                  <Avatar className="h-6 w-6">
                    {m.user?.imageUrl && <AvatarImage src={m.user.imageUrl} alt="" />}
                    <AvatarFallback className="text-[10px]">{((display?.[0]) || "?").toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[180px]">{display}</span>
                  {m.status === "pending" && <Badge variant="outline" className="text-[10px]">pending</Badge>}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <AiProvidersDialog
        open={aiProvidersOpen}
        onOpenChange={setAiProvidersOpen}
        workspaceSlug={slug}
      />

      <MembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        workspaceSlug={slug}
        members={detail?.members ?? []}
        canManage={canManage}
        onChanged={reloadDetail}
      />

      <Dialog open={newWsOpen} onOpenChange={setNewWsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New workspace</DialogTitle></DialogHeader>
          <form onSubmit={createWorkspace} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input id="ws-name" value={newWsName} onChange={(e) => setNewWsName(e.target.value)} autoFocus placeholder="Acme Games" data-testid="new-ws-name" />
              <div className="text-xs text-muted-foreground">A workspace is a place to share projects with teammates.</div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewWsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!newWsName.trim()} data-testid="create-workspace-submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" and all its rules, entities, players, and notes will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
