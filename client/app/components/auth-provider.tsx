"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAccessBlocked, useAuthStore } from "@/lib/auth-store";
import { useShallow } from "zustand/react/shallow";

const BlockedAccess = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold mb-2">Access unavailable</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { checkAuth, isAuthenticated, user, isLoading } = useAuthStore(
    useShallow((state) => ({
      checkAuth: state.checkAuth,
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      isLoading: state.isLoading,
    })),
  );
  const hasCheckedAuth = useRef(false);
  const [authChecked, setAuthChecked] = useState(false);

  const isProtectedRoute = pathname.startsWith("/admin") || pathname.startsWith("/student");

  useEffect(() => {
    if (!isProtectedRoute) {
      hasCheckedAuth.current = false;
      setAuthChecked(false);
      return;
    }

    if (!isAuthenticated && !isLoading && !hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      checkAuth().finally(() => setAuthChecked(true));
    } else if (isAuthenticated) {
      setAuthChecked(true);
    }
  }, [isProtectedRoute, isAuthenticated, checkAuth, isLoading]);

  useEffect(() => {
    if (isProtectedRoute && authChecked && !isAuthenticated && !isLoading) {
      router.replace("/auth/login");
    }
  }, [isProtectedRoute, authChecked, isAuthenticated, isLoading, router]);

  if (isProtectedRoute && (isLoading || (!isAuthenticated && !authChecked))) {
    return <BlockedAccess message="Checking your access..." />;
  }

  if (isProtectedRoute && user && isAccessBlocked(user)) {
    return <BlockedAccess message="Your organization, subscription, or membership is not active. Please contact your organizer." />;
  }

  if (pathname.startsWith("/admin") && user?.membership?.role !== "OWNER") {
    return <BlockedAccess message="Owner access is required for this area." />;
  }

  if (pathname.startsWith("/student") && user?.membership?.role !== "STUDENT") {
    return <BlockedAccess message="Student access is required for this area." />;
  }

  return <>{children}</>;
}
