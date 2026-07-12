"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminHeader } from "@/components/admin-header";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAdminSubscriptions,
  fetchStudentSubscriptions,
  resetStudentSubscriptionUsage,
  upsertStudentSubscription,
  type AdminSubscriptionStatus,
  type StudentSubscription,
} from "@/lib/admin-subscription-service";

const statuses: AdminSubscriptionStatus[] = ["TRIAL", "ACTIVE", "CANCELLED", "EXPIRED"];
const dateInput = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const displayDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "-");
const toIsoDate = (value: string) => new Date(value).toISOString();

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const adminQuery = useQuery({ queryKey: ["admin-subscriptions"], queryFn: fetchAdminSubscriptions });
  const usersQuery = useQuery({ queryKey: ["student-subscriptions"], queryFn: fetchStudentSubscriptions });
  const adminSubscriptions = adminQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userForm, setUserForm] = useState({ status: "ACTIVE" as AdminSubscriptionStatus, mockPaperLimit: 20, currentPeriodEnd: "" });
  const selectedUser = useMemo(() => users.find((item) => item.student?.id === selectedUserId) ?? null, [users, selectedUserId]);

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["student-subscriptions"] });
  const showError = (title: string) => (error: unknown) => toast({ title, description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });

  const openUserDialog = (subscription: StudentSubscription) => {
    if (!subscription.student?.id) return;
    setSelectedUserId(subscription.student.id);
    setUserForm({ status: subscription.status, mockPaperLimit: subscription.mockPaperLimit, currentPeriodEnd: dateInput(subscription.currentPeriodEnd) });
    setUserDialogOpen(true);
  };

  const saveUserMutation = useMutation({
    mutationFn: () => upsertStudentSubscription(selectedUser!.student!.id, { status: userForm.status, mockPaperLimit: userForm.mockPaperLimit, currentPeriodEnd: toIsoDate(userForm.currentPeriodEnd) }),
    onSuccess: () => { toast({ title: "Student access updated", variant: "success" }); setUserDialogOpen(false); invalidateUsers(); },
    onError: showError("Update failed"),
  });

  const resetUserMutation = useMutation({ mutationFn: resetStudentSubscriptionUsage, onSuccess: () => { toast({ title: "Usage reset", variant: "success" }); invalidateUsers(); }, onError: showError("Reset failed") });
  return <div className="min-h-screen bg-muted/40"><AdminHeader title="Subscriptions" />
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="space-y-3"><div><h2 className="text-xl font-semibold">Owner subscription</h2><p className="text-sm text-muted-foreground">Read-only details for the organizer account. Subscription changes are managed directly in the database.</p></div>
        {adminQuery.isLoading && <Card className="p-6 text-sm text-muted-foreground">Loading owner subscription...</Card>}
        {adminQuery.isError && <Card className="p-6 text-sm text-destructive">Unable to load owner subscription.</Card>}
        {adminSubscriptions.map((subscription) => <Card key={subscription.id} className="p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">Owner account</p><p className="mt-1 font-medium">{subscription.tenantName || "Current organizer"}</p></div><div><p className="text-xs text-muted-foreground">Plan</p><p className="mt-1 font-medium">{subscription.planCode}</p></div><div><p className="text-xs text-muted-foreground">Status</p><Badge className="mt-1" variant="outline">{subscription.status}</Badge></div><div><p className="text-xs text-muted-foreground">Subscription period</p><p className="mt-1 font-medium">{displayDate(subscription.currentPeriodStart)} - {displayDate(subscription.currentPeriodEnd)}</p></div></div></Card>)}
        {!adminQuery.isLoading && !adminQuery.isError && adminSubscriptions.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No owner subscription found.</Card>}
      </section>

      <section className="space-y-3"><div><h2 className="text-xl font-semibold">Student access</h2><p className="text-sm text-muted-foreground">Every student uses the fixed mock-paper access plan. Adjust only their status, quota, and expiry.</p></div>
        {usersQuery.isLoading && <Card className="p-6 text-sm text-muted-foreground">Loading students...</Card>}
        {usersQuery.isError && <Card className="p-6 text-sm text-destructive">Failed to load students.</Card>}
        {users.length > 0 && <Card className="overflow-x-auto p-0"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/60 text-left"><th className="p-3">User</th><th className="p-3">Email</th><th className="p-3">Access</th><th className="p-3">Status</th><th className="p-3">Usage</th><th className="p-3">Period</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{users.map((subscription) => { const studentId = subscription.student?.id; return <tr key={subscription.id || studentId} className="border-b last:border-0"><td className="p-3 font-medium">{subscription.student?.name || "-"}</td><td className="p-3">{subscription.student?.email || "-"}</td><td className="p-3">{subscription.plan?.name || "Fixed Mock Paper Access"}</td><td className="p-3"><Badge variant="outline">{subscription.status}</Badge></td><td className="p-3">{subscription.mockPaperUsed} / {subscription.mockPaperLimit}</td><td className="p-3">{displayDate(subscription.currentPeriodStart)} - {displayDate(subscription.currentPeriodEnd)}</td><td className="p-3 text-right"><Button size="sm" variant="outline" disabled={!studentId} onClick={() => openUserDialog(subscription)}>Manage</Button></td></tr>; })}</tbody></table></Card>}
        {!usersQuery.isLoading && users.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No students found.</Card>}
      </section>
    </main>

    <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}><DialogContent><DialogHeader><DialogTitle>Manage {selectedUser?.student?.name}</DialogTitle><DialogDescription>Fixed Mock Paper Access</DialogDescription></DialogHeader><div className="space-y-3"><div><Label>Status</Label><Select value={userForm.status} onValueChange={(status) => setUserForm((form) => ({ ...form, status: status as AdminSubscriptionStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Mock-paper limit</Label><Input type="number" min={0} value={userForm.mockPaperLimit} onChange={(event) => setUserForm((form) => ({ ...form, mockPaperLimit: Number(event.target.value) }))} /></div><div><Label>Period end</Label><Input type="date" value={userForm.currentPeriodEnd} onChange={(event) => setUserForm((form) => ({ ...form, currentPeriodEnd: event.target.value }))} /></div></div></div><DialogFooter className="flex-wrap"><Button variant="outline" onClick={() => setUserDialogOpen(false)}>Close</Button><Button variant="outline" disabled={resetUserMutation.isPending || !selectedUser?.student?.id} onClick={() => selectedUser?.student?.id && resetUserMutation.mutate(selectedUser.student.id)}>Reset usage</Button><Button disabled={saveUserMutation.isPending || !userForm.currentPeriodEnd} onClick={() => saveUserMutation.mutate()}>{saveUserMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
