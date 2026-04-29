"use client"

import { useState } from "react"
import { Copy, RotateCcw, ShieldAlert, WandSparkles } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { backendApiFetch } from "@/lib/api-client"

type RotateUnlockResponse = {
  code: string
}

export default function AdminSecurityPage() {
  const [generatedCode, setGeneratedCode] = useState<string>("")
  const [isRotating, setIsRotating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  const handleRotate = async () => {
    setIsRotating(true)
    setError(null)
    setCopyMessage(null)

    try {
      const response = await backendApiFetch<RotateUnlockResponse>(
        "/security/exam-unlock/rotate",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      )

      if (!response.success) {
        setError(response.error || "Failed to generate a new admin code.")
        return
      }

      if (!response.data?.code) {
        setError("Failed to generate a new admin code.")
        return
      }

      setGeneratedCode(response.data.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate a new admin code.")
    } finally {
      setIsRotating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopyMessage("Code copied to clipboard.")
    } catch {
      setCopyMessage("Copy failed. Select the code manually.")
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <AdminHeader title="Security Code" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Exam Lock Code</h1>
            <p className="text-sm text-muted-foreground">
              Generate a new admin unlock code for the exam lockdown screen.
            </p>
          </div>
          <Button
            onClick={handleRotate}
            disabled={isRotating}
            className="gap-2 shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            {isRotating ? "Generating..." : "Rotate Code"}
          </Button>
        </div>

        <div className="grid gap-4">
          <Card className="p-5 border border-border/60 bg-background shadow-sm rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-base">Rotation behavior</h2>
                <p className="text-sm text-muted-foreground">
                  Rotating the code immediately invalidates the previous unlock code. The new code is shown
                  only after generation, and the server stores it hashed.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-border/60 bg-background shadow-sm rounded-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <WandSparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">Latest generated code</h2>
              </div>

              <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 min-h-20 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {generatedCode ? (
                    <>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">New unlock code</p>
                      <p className="mt-1 text-2xl font-semibold font-mono tracking-[0.2em]">{generatedCode}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Rotate the code to generate a new unlock code for the student lockdown screen.
                    </p>
                  )}
                </div>

                {generatedCode ? (
                  <Button variant="outline" onClick={handleCopy} className="gap-2 shrink-0">
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                ) : null}
              </div>

              {copyMessage ? (
                <p className="text-sm text-muted-foreground">{copyMessage}</p>
              ) : null}

              {error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
