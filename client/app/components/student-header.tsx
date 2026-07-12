"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useAuthStore } from '@/lib/auth-store';

interface StudentHeaderProps {
  studentName?: string
  schoolCode?: string
}

export function StudentHeader({ studentName, schoolCode }: StudentHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const displayName = studentName || user?.name || 'Student';
  const displaySchoolCode = schoolCode || user?.schoolCode || 'N/A';

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-accent-foreground font-bold">
              S
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Student Portal
            </h1>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/assessments">Assessments</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/mock-papers">Mock Papers</Link>
              </Button>
            </nav>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground">
                School Code: {displaySchoolCode}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
