"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { useAccessRequestMutations, useAccessRequests } from "@/hooks/queries/useAccessRequests"

interface AccessRequestsProps {
  paperId?: string;
}

export default function AccessRequests({ paperId }: AccessRequestsProps) {
  const { data, isLoading, isError, error } = useAccessRequests(paperId);
  const { update } = useAccessRequestMutations();
  const requests = Array.isArray(data) ? data : [];

  return (
    <Card className="shadow-none border-border">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
        Access Requests
      </div>
      {(isLoading || isError || requests.length === 0) && (
        <div className="p-3 text-xs">
          {isLoading && <p className="text-muted-foreground">Loading access requests...</p>}
          {isError && (
            <p className="text-destructive">
              Failed to load access requests: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          )}
          {!isLoading && !isError && requests.length === 0 && (
            <p className="text-muted-foreground">No access requests yet.</p>
          )}
        </div>
      )}
      {!isLoading && !isError && requests.length > 0 && (
        <div className="divide-y divide-border/70">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-2.5 flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex-1 space-y-0.5">
                <p className="font-semibold text-foreground text-sm leading-tight">
                  {request.student.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{request.student.email}</p>
                <p className="text-[11px] text-muted-foreground">{request.paper.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  Requested: {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                    request.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : request.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {request.status}
                </span>
                {request.status === 'PENDING' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[12px] gap-1"
                      onClick={() => update.mutate({ id: request.id, status: 'APPROVED' })}
                      disabled={update.isPending}
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[12px] gap-1"
                      onClick={() => update.mutate({ id: request.id, status: 'REJECTED' })}
                      disabled={update.isPending}
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
