import { backendApiFetch } from "@/lib/api-client";

export type AdminSubscriptionStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";

export interface AdminSubscription {
  id: string;
  tenantName?: string;
  planCode: string;
  status: AdminSubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface StudentSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  mockPaperLimit: number;
  periodDays: number;
  isActive: boolean;
  provider: string | null;
  providerPriceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSubscription {
  id?: string;
  student?: {
    id: string;
    name: string;
    email: string;
    schoolCode: string | null;
  };
  status: AdminSubscriptionStatus;
  plan: {
    id: string;
    code: string;
    name: string;
  } | null;
  mockPaperLimit: number;
  mockPaperUsed: number;
  remaining: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export type UpdateAdminSubscriptionPayload = Partial<Pick<AdminSubscription, "status" | "currentPeriodEnd">>;

export type UpsertStudentSubscriptionPayload = {
  status?: AdminSubscriptionStatus;
  mockPaperLimit?: number;
  currentPeriodStart?: string;
  currentPeriodEnd: string;
};

export type StudentSubscriptionPlanPayload = {
  code: string;
  name: string;
  mockPaperLimit: number;
  periodDays?: number;
  isActive?: boolean;
  provider?: string | null;
  providerPriceId?: string | null;
};

const unwrap = <T>(res: { success: boolean; data?: T; error?: string }, fallback: string) => {
  if (!res.success || res.data === undefined) throw new Error(res.error || fallback);
  return res.data;
};

export async function fetchAdminSubscriptions() {
  return unwrap(await backendApiFetch<AdminSubscription[]>("/admin/subscriptions"), "Unable to load subscriptions");
}

export async function fetchAdminSubscription(subscriptionId: string) {
  return unwrap(await backendApiFetch<AdminSubscription>(`/admin/subscriptions/${subscriptionId}`), "Unable to load subscription");
}

export async function updateAdminSubscription(subscriptionId: string, payload: UpdateAdminSubscriptionPayload) {
  return unwrap(
    await backendApiFetch<AdminSubscription>(`/admin/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
    "Unable to update subscription",
  );
}

export async function fetchStudentSubscriptionPlans() {
  return unwrap(await backendApiFetch<StudentSubscriptionPlan[]>("/admin/subscriptions/plans"), "Unable to load plans");
}

export async function createStudentSubscriptionPlan(payload: StudentSubscriptionPlanPayload) {
  return unwrap(
    await backendApiFetch<StudentSubscriptionPlan>("/admin/subscriptions/plans", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Unable to create plan",
  );
}

export async function updateStudentSubscriptionPlan(planId: string, payload: Partial<StudentSubscriptionPlanPayload>) {
  return unwrap(
    await backendApiFetch<StudentSubscriptionPlan>(`/admin/subscriptions/plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
    "Unable to update plan",
  );
}

export async function deleteStudentSubscriptionPlan(planId: string) {
  return unwrap(await backendApiFetch<{ id: string }>(`/admin/subscriptions/plans/${planId}`, { method: "DELETE" }), "Unable to delete plan");
}

export async function fetchStudentSubscriptions() {
  return unwrap(await backendApiFetch<StudentSubscription[]>("/admin/subscriptions/students"), "Unable to load subscribed users");
}

export async function upsertStudentSubscription(studentId: string, payload: UpsertStudentSubscriptionPayload) {
  return unwrap(
    await backendApiFetch<StudentSubscription>(`/admin/subscriptions/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Unable to save user subscription",
  );
}

export async function resetStudentSubscriptionUsage(studentId: string) {
  return unwrap(
    await backendApiFetch<StudentSubscription>(`/admin/subscriptions/students/${studentId}/reset-usage`, { method: "POST" }),
    "Unable to reset user usage",
  );
}
