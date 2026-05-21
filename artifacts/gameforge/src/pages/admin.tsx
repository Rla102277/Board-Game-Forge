import { Link, Redirect } from "wouter";
import { useGetMe, useListAdminUsers, useUpdateAdminUser, useDeleteAdminUser, getListAdminUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Shield, Trash2, ShieldOff, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { OrganizationDashboard } from "@/components/admin/org-dashboard";

export default function Admin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const { data: users, isLoading } = useListAdminUsers();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  if (me && me.role !== "admin") return <Redirect to="/" />;

  const refresh = () => qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });

  const setRole = async (userId: number, role: "admin" | "member") => {
    try {
      await updateUser.mutateAsync({ userId, data: { role } });
      refresh();
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (pendingDelete === null) return;
    try {
      await deleteUser.mutateAsync({ userId: pendingDelete });
      setPendingDelete(null);
      refresh();
      toast({ title: "User removed" });
    } catch {
      toast({ title: "Failed to remove user", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link href="/account">
          <Button variant="ghost" size="sm" className="mb-6 gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to account
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2"><Shield className="h-7 w-7 text-primary" /> Admin console</h1>
        <p className="text-muted-foreground mb-8">Manage GameForge user access, roles, and platform analytics.</p>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Users ({users?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <OrganizationDashboard />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users ({users?.length ?? 0})</CardTitle>
                <CardDescription>The first user to sign up is automatically the administrator.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !users?.length ? (
                  <div className="p-8 text-center text-muted-foreground">No users yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {users.map(u => (
                      <div key={u.id} className="p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User #${u.id}`}</div>
                          <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                        </div>
                        <Select value={u.role} onValueChange={(v) => setRole(u.id, v as "admin" | "member")} disabled={u.id === me?.id}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={u.id === me?.id}
                          onClick={() => setPendingDelete(u.id)}
                          className="text-destructive hover:text-destructive"
                          title="Remove user"
                        >
                          {u.id === me?.id ? <ShieldOff className="h-4 w-4 opacity-30" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this user?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access to GameForge. Their projects will remain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
