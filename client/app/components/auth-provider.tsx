"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { checkAuth, isAuthenticated, user, isLoading } = useAuthStore();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    const isProtectedRoute =
      pathname.startsWith("/admin") || pathname.startsWith("/student");

    // Only check auth once on protected routes when not authenticated and not already loading
    if (
      isProtectedRoute &&
      !isAuthenticated &&
      !isLoading &&
      !hasCheckedAuth.current
    ) {
      hasCheckedAuth.current = true;
      checkAuth().finally(() => {
        hasCheckedAuth.current = false;
      });
    }

    // Reset check flag when leaving protected routes
    if (!isProtectedRoute) {
      hasCheckedAuth.current = false;
    }

    // Redirect if user is on wrong dashboard
    if (isAuthenticated && user) {
      const userRole = user.role.toLowerCase();

      if (userRole === "admin" && pathname.startsWith("/student")) {
        router.push("/admin/questions");
      } else if (userRole === "student" && pathname.startsWith("/admin")) {
        router.push("/student/assessments");
      }
    }
  }, [pathname, isAuthenticated, user, checkAuth, router, isLoading]);

  return <>{children}</>;
}
