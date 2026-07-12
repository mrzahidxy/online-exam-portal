"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminHeader } from "@/components/admin-header";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createQuestionCategory, deleteQuestionCategory, fetchQuestionCategories, updateQuestionCategory, type QuestionCategory } from "@/lib/question-category-service";

const blank = { title: "", description: "" };
const date = (v?: string) => (v ? new Date(v).toLocaleDateString() : "—");

export default function AdminQuestionCategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error } = useQuery({ queryKey: ["question-categories"], queryFn: fetchQuestionCategories });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<QuestionCategory | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["question-categories"] });
  const createMutation = useMutation({ mutationFn: () => createQuestionCategory({ ...form, isActive: true }), onSuccess: () => { setForm(blank); toast({ title: "Category created", variant: "success" }); invalidate(); }, onError: (e) => toast({ title: "Create failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" }) });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => updateQuestionCategory(id, payload), onSuccess: () => { setEditing(null); toast({ title: "Category updated", variant: "success" }); invalidate(); }, onError: (e) => toast({ title: "Update failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" }) });
  const deleteMutation = useMutation({ mutationFn: deleteQuestionCategory, onSuccess: () => { toast({ title: "Category deleted", variant: "success" }); invalidate(); }, onError: (e) => toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" }) });

  const beginEdit = (cat: QuestionCategory) => setEditing({ ...cat });

  return <div className="min-h-screen bg-muted/40"><AdminHeader title="Question Categories" />
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <Card className="p-4"><h2 className="font-semibold mb-3">Create category</h2><div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"><div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div><div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div><div className="flex items-end"><Button size="sm" disabled={createMutation.isPending || !form.title.trim()} onClick={() => createMutation.mutate()}>{createMutation.isPending ? "Creating..." : "Create"}</Button></div></div></Card>
      {isLoading && <Card className="p-6 text-sm text-muted-foreground">Loading categories...</Card>}
      {isError && <Card className="p-6 text-sm text-destructive">Failed to load categories: {error instanceof Error ? error.message : "Unknown error"}</Card>}
      {!isLoading && !isError && data.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No question categories yet.</Card>}
      {data.length > 0 && <Card className="overflow-x-auto p-0"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/60 text-left"><th className="p-3">Title</th><th className="p-3">Description</th><th className="p-3">Status</th><th className="p-3">Questions</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{data.map((cat) => <tr key={cat.id} className="border-b last:border-0"><td className="p-3 font-medium">{cat.title}</td><td className="p-3 max-w-sm truncate">{cat.description || "—"}</td><td className="p-3"><Badge variant="outline">{cat.isActive ? "Active" : "Inactive"}</Badge></td><td className="p-3">{cat._count?.items ?? 0}</td><td className="p-3">{date(cat.createdAt)}</td><td className="p-3"><div className="flex justify-end gap-2"><Link href={`/admin/question-categories/${cat.id}`}><Button size="sm" variant="outline">Details</Button></Link><Button size="sm" variant="outline" onClick={() => beginEdit(cat)}>Edit</Button><Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: cat.id, payload: { isActive: !cat.isActive } })}>{cat.isActive ? "Deactivate" : "Activate"}</Button><AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={deleteMutation.isPending}>Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete category?</AlertDialogTitle><AlertDialogDescription>This removes “{cat.title}” from the category list.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(cat.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></td></tr>)}</tbody></table></Card>}
      {editing && <Card className="p-4"><h2 className="font-semibold mb-3">Edit category</h2><div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"><div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing((c) => c && ({ ...c, title: e.target.value }))} /></div><div><Label>Description</Label><Textarea className="min-h-9" value={editing.description || ""} onChange={(e) => setEditing((c) => c && ({ ...c, description: e.target.value }))} /></div><div className="flex items-end gap-2"><Button size="sm" disabled={updateMutation.isPending || !editing.title.trim()} onClick={() => updateMutation.mutate({ id: editing.id, payload: { title: editing.title, description: editing.description || null } })}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></div></Card>}
    </main></div>;
}
