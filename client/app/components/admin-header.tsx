"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

interface AdminHeaderProps {
  title?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AdminHeader({
  title = "e-Assessment Platform",
  activeTab,
  onTabChange,
}: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              A
            </div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user?.name || "Admin"}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1 text-sm">
          {[
            { href: "/admin/questions", label: "Assessments" },
            { href: "/admin/mock-papers", label: "Mock Papers" },
          ].map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 font-medium rounded-md transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {(pathname === "/admin/mock-papers" ||
          pathname.startsWith("/admin/mock-papers/") ||
          pathname.startsWith("/admin/subscriptions") ||
          pathname.startsWith("/admin/question-categories")) && (
          <nav
            aria-label="Mock paper administration"
            className="mt-2 flex flex-wrap gap-1 border-l-2 border-primary/30 pl-3 text-sm"
          >
            {[
              { href: "/admin/mock-papers", label: "Submissions" },
              { href: "/admin/subscriptions", label: "Subscriptions" },
              { href: "/admin/question-categories", label: "Categories" },
            ].map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {activeTab !== undefined && (
          <div className="flex gap-1">
            {["Question Builder", "Access Requests", "Review Answers"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange?.(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </header>
  );
}
