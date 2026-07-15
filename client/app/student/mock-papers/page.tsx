"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { StudentHeader } from "@/components/student-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { mockPaperService } from "@/lib/mock-paper-service";
import { fetchSubscriptionSummary, type SubscriptionSummary } from "@/lib/subscription-service";

const activeSubscriptionStatuses = new Set(["TRIAL", "ACTIVE"]);
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value: string) => dateFormatter.format(new Date(value));

function SubscriptionSummaryCard({
  subscription,
  isLoading,
  isError,
}: {
  subscription?: SubscriptionSummary;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading subscription...</p>;
  }

  if (isError || !subscription) {
    return <p className="text-sm text-destructive">Unable to load subscription.</p>;
  }

  const isActive = activeSubscriptionStatuses.has(subscription.status);
  const exhausted = subscription.remaining <= 0;
  const blocked = !isActive || exhausted;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{subscription.planCode}</Badge>
        <Badge variant={isActive ? "secondary" : "destructive"}>{subscription.status}</Badge>
      </div>
      <p className="font-medium text-foreground">
        {subscription.mockPaperUsed} of {subscription.mockPaperLimit} mock papers used
      </p>
      <p className={exhausted ? "text-destructive" : "text-muted-foreground"}>
        {subscription.remaining} remaining
      </p>
      <p className="text-muted-foreground">
        Renews or expires on {formatDate(subscription.currentPeriodEnd)}
      </p>
      {blocked && (
        <p className="text-sm text-destructive">
          {exhausted ? "Mock paper limit reached" : "Mock paper generation is blocked for this subscription."}
        </p>
      )}
    </div>
  );
}

export default function StudentMockPapersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const selectedCategorySet = useMemo(() => new Set(selectedCategoryIds), [selectedCategoryIds]);

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscriptionSummary,
  });

  const categoriesQuery = useQuery({
    queryKey: ["mock-paper-categories", "active"],
    queryFn: mockPaperService.listActiveCategories,
  });

  const mockPapersQuery = useQuery({
    queryKey: ["mock-papers"],
    queryFn: mockPaperService.listOwn,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return mockPaperService.generate(selectedCategoryIds);
    },
    onSuccess: async () => {
      setSelectedCategoryIds([]);
      toast({ title: "Mock paper generated", description: "Your mock paper is ready to attempt." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mock-papers"] }),
        queryClient.invalidateQueries({ queryKey: ["subscription"] }),
      ]);
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unable to generate mock paper",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (mockPaperId: string) => mockPaperService.archive(mockPaperId),
    onSuccess: async () => {
      toast({ title: "Mock paper archived", description: "You can generate a new mock paper now." });
      await queryClient.invalidateQueries({ queryKey: ["mock-papers"] });
    },
    onError: (error) => {
      toast({
        title: "Archive failed",
        description: error instanceof Error ? error.message : "Unable to archive mock paper",
        variant: "destructive",
      });
    },
  });

  const subscription = subscriptionQuery.data;
  const subscriptionActive = subscription ? activeSubscriptionStatuses.has(subscription.status) : false;
  const quotaExhausted = subscription ? subscription.remaining <= 0 : false;
  const generationBlocked = !subscriptionActive || quotaExhausted;

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mock Papers</h1>
            <p className="text-sm text-muted-foreground">Generate and attempt practice papers from your organization.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/student/assessments">Assessments</Link>
          </Button>
        </div>

        <Card className="p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Generate a mock paper</h2>
              <p className="text-sm text-muted-foreground">Select one or more active categories.</p>
            </div>
            <div className="min-w-[240px] rounded-lg border border-border p-4">
              <SubscriptionSummaryCard
                subscription={subscription}
                isLoading={subscriptionQuery.isLoading}
                isError={subscriptionQuery.isError}
              />
            </div>
          </div>

          {categoriesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading categories...</p>}
          {categoriesQuery.isError && <p className="text-sm text-destructive">Unable to load categories.</p>}
          {categoriesQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No active categories available.</p>}

          <div className="flex flex-wrap gap-2">
            {categoriesQuery.data?.map((category) => {
              const selected = selectedCategorySet.has(category.id);
              return (
                <Button
                  key={category.id}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => toggleCategory(category.id)}
                >
                  {category.title}
                  {typeof category._count?.items === "number" ? ` (${category._count.items})` : ""}
                </Button>
              );
            })}
          </div>

          {quotaExhausted && <p className="text-sm text-destructive">Mock paper limit reached.</p>}

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={
              generateMutation.isPending ||
              selectedCategoryIds.length === 0 ||
              subscriptionQuery.isLoading ||
              generationBlocked
            }
          >
            {generateMutation.isPending ? "Generating..." : "Generate Mock Paper"}
          </Button>
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">My mock papers</h2>
          {mockPapersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading mock papers...</p>}
          {mockPapersQuery.isError && <p className="text-sm text-destructive">Unable to load mock papers.</p>}
          {mockPapersQuery.data?.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">No mock papers yet.</Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockPapersQuery.data?.map((paper) => (
              <Card key={paper.id} className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{paper.title}</h3>
                      <Badge variant="secondary">{paper.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {paper._count?.items ?? 0} questions • Created {formatDate(paper.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {paper.status === "GENERATED" && (
                    <Button size="sm" asChild>
                      <Link href={`/student/mock-papers/${paper.id}`}>Attempt</Link>
                    </Button>
                  )}
                  {paper.status === "GENERATED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={archiveMutation.isPending}
                      onClick={() => archiveMutation.mutate(paper.id)}
                    >
                      Archive
                    </Button>
                  )}
                  {paper.submissions?.[0]?.id && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/student/mock-papers/feedback/${paper.submissions[0].id}`}>Feedback</Link>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
