"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

export function StatusStream({
  applicationId,
  initialEvents,
}: {
  applicationId: string;
  initialEvents: { id: string; status: string; note: string | null; created_at: string }[];
}) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`status-events-${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "application_status_events",
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          const newEvent = payload.new as {
            id: string;
            status: string;
            note: string | null;
            created_at: string;
          };
          setEvents((prev) => [newEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId]);

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-2xl border border-border bg-[var(--surface)] p-3">
          <div className="flex items-center justify-between">
            <Badge
              tone={
                event.status === "approved"
                  ? "success"
                  : event.status === "rejected"
                  ? "danger"
                  : "warning"
              }
            >
              {event.status}
            </Badge>
            <span className="text-xs text-muted">
              {new Date(event.created_at).toLocaleString()}
            </span>
          </div>
          {event.note ? <p className="mt-2 text-xs text-muted">{event.note}</p> : null}
        </div>
      ))}
    </div>
  );
}
