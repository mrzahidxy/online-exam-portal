"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchPaper, updatePaper } from "@/lib/paper-service"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft } from "lucide-react"

const formatDateTimeInput = (date: Date | string) => {
  const parsed = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(parsed.getTime())) return ""
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const defaultStartDate = formatDateTimeInput(new Date(Date.now() + 60 * 60 * 1000))
const defaultEndDate = formatDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000))

export default function EditPaperPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const paperId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMinutes: 60,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    earlySubmissionRestrictionMinutes: 0,
    status: "DRAFT",
  })

  useEffect(() => {
    const loadPaper = async () => {
      if (!paperId) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const { payload: paper } = await fetchPaper(paperId)
        setForm({
          title: paper.title ?? "",
          description: paper.description ?? "",
          durationMinutes: paper.durationMinutes ?? 60,
          startDate: paper.startDate ? formatDateTimeInput(paper.startDate) || defaultStartDate : defaultStartDate,
          endDate: paper.endDate ? formatDateTimeInput(paper.endDate) || defaultEndDate : defaultEndDate,
          earlySubmissionRestrictionMinutes: paper.earlySubmissionRestrictionMinutes ?? 0,
          status: paper.status ?? "DRAFT",
        })
      } catch (error: any) {
        const description = error?.response?.data?.message || error?.message || "Unable to load paper."
        toast({
          title: "Load failed",
          description,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPaper()
  }, [paperId, toast])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!paperId) return

    setIsSubmitting(true)

    try {
      const payload = {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        earlySubmissionRestrictionMinutes: Number(form.earlySubmissionRestrictionMinutes),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      }

      const { message } = await updatePaper(paperId, payload)

      toast({
        title: "Paper updated",
        description: message || "Changes saved successfully.",
      })
    } catch (error: any) {
      const description = error?.response?.data?.message || error?.message || "Unable to update paper. Please try again."
      toast({
        title: "Update failed",
        description,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Edit Question Paper" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Update paper</p>
            <h1 className="text-2xl font-bold text-foreground">Paper details</h1>
            <p className="text-sm text-muted-foreground">Edit the paper, then adjust questions separately.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/questions">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to list
              </Button>
            </Link>
            {paperId && (
              <Link href={`/admin/questions/create-question?paperId=${paperId}`}>
                <Button variant="outline" size="sm">Edit questions</Button>
              </Link>
            )}
          </div>
        </div>

        <Card className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Paper Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Midterm Assessment"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short note for students (shows on the paper)."
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="earlySubmissionRestrictionMinutes">Early Submission Restriction (minutes)</Label>
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
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[240px_1fr] md:items-end">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
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
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  )
}
