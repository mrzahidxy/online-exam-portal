import { backendApiFetch } from "@/lib/api-client";

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";

export interface SubscriptionSummary {
  status: SubscriptionStatus;
  planCode: string;
  mockPaperLimit: number;
  mockPaperUsed: number;
  remaining: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

interface StudentSubscriptionResponse {
  status: SubscriptionStatus;
  plan: { code: string; name: string } | null;
  mockPaperLimit: number;
  mockPaperUsed: number;
  remaining: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export async function fetchSubscriptionSummary() {
  const res = await backendApiFetch<StudentSubscriptionResponse>("/subscription/mock-paper");
  if (!res.success) {
    throw new Error(res.error || "Unable to load subscription");
  }

  return {
    ...res.data,
    planCode: res.data.plan?.name || res.data.plan?.code || "Mock Paper Access",
  } satisfies SubscriptionSummary;
}
