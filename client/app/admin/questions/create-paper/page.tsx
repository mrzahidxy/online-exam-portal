"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPaper } from "@/lib/paper-service";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

const formatDateTimeInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const defaultStartDate = formatDateTimeInput(
  new Date(Date.now() + 60 * 60 * 1000)
);
const defaultEndDate = formatDateTimeInput(
  new Date(Date.now() + 2 * 60 * 60 * 1000)
);

export default function CreatePaperPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMinutes: 60,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    earlySubmissionRestrictionMinutes: 0,
    status: "DRAFT",
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        earlySubmissionRestrictionMinutes: Number(
          form.earlySubmissionRestrictionMinutes
        ),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };

      const { payload: createdPaper, message } = await createPaper(payload);
      const paperId =
        createdPaper?.id ??
        (createdPaper as any)?.paperId ??
        (createdPaper as any)?.data?.id ??
        (createdPaper as any)?.data?.paperId;

      toast({
        title: "Paper created",
        description:
          message ||
          (paperId ? `New paper id: ${paperId}` : "Paper saved successfully."),
      });

      if (paperId) {
        router.push(`/admin/questions/create-question?paperId=${paperId}`);
      }
    } catch (error: any) {
      const description =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create paper. Please try again.";
      toast({
        title: "Creation failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Create Question Paper" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Step 1
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              Paper details
            </h1>
            <p className="text-sm text-muted-foreground">
              Save the paper, then add questions in the next step.
            </p>
          </div>
          <Link href="/admin/questions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to list
            </Button>
          </Link>
        </div>

        <Card className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Paper Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Midterm Assessment"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Short note for students (shows on the paper)."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="earlySubmissionRestrictionMinutes">
                  Early Submission Restriction (minutes)
                </Label>
                <Input
                  id="earlySubmissionRestrictionMinutes"
                  type="number"
                  min={0}
                  value={form.earlySubmissionRestrictionMinutes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      earlySubmissionRestrictionMinutes: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[240px_1fr] md:items-end">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Draft" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save and continue
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
