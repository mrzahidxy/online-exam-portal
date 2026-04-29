import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api-client"
import type { User } from "@/types"

export default async function ProfilePage() {
  const profile = await apiFetch<User>("/api/auth/me")
  const user = profile.success
    ? profile.data
    : {
        id: "unknown",
        name: "Demo User",
        email: "demo@example.com",
        role: "student",
      }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Profile</p>
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">User ID</p>
            <p className="font-semibold text-foreground break-all">{user.id}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">Role</p>
            <p className="font-semibold text-foreground capitalize">{user.role}</p>
          </div>
        </div>
        {!profile.success && (
          <p className="text-xs text-muted-foreground">Profile is demo-only until backend wiring is added.</p>
        )}
      </Card>
    </div>
  )
}
