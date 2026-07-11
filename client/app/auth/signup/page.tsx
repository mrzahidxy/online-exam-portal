"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Users } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [registrationType, setRegistrationType] = useState<"ORGANIZER" | "STUDENT">("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerSlug, setOrganizerSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { register, isLoading } = useAuthStore();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await register(
        registrationType === "ORGANIZER"
          ? {
              registrationType,
              name,
              email,
              password,
              organizerName,
              organizerSlug: organizerSlug || undefined,
            }
          : {
              registrationType,
              name,
              email,
              password,
              organizerSlug,
            }
      );

      const user = useAuthStore.getState().user;
      if (user?.membership?.role === "OWNER") {
        router.push("/admin/papers");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          {registrationType === "ORGANIZER" ? (
            <Building2 className="w-12 h-12 text-primary mx-auto mb-3" />
          ) : (
            <Users className="w-12 h-12 text-primary mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm">
            Register an organization or join as a student
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button
            type="button"
            variant={registrationType === "ORGANIZER" ? "default" : "outline"}
            onClick={() => setRegistrationType("ORGANIZER")}
            disabled={isLoading}
          >
            Register an organization
          </Button>
          <Button
            type="button"
            variant={registrationType === "STUDENT" ? "default" : "outline"}
            onClick={() => setRegistrationType("STUDENT")}
            disabled={isLoading}
          >
            Join as a student
          </Button>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {registrationType === "ORGANIZER" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="organizerName">Organization name</Label>
                <Input
                  id="organizerName"
                  type="text"
                  placeholder="Acme School"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizerSlug">Organization slug (optional)</Label>
                <Input
                  id="organizerSlug"
                  type="text"
                  placeholder="acme-school"
                  value={organizerSlug}
                  onChange={(e) => setOrganizerSlug(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="organizerSlug">Organization slug or school code</Label>
              <Input
                id="organizerSlug"
                type="text"
                placeholder="acme-school"
                value={organizerSlug}
                onChange={(e) => setOrganizerSlug(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          )}

          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button type="button" variant="link" className="p-0 h-auto" onClick={() => router.push("/auth/login")}>
              Sign in
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
