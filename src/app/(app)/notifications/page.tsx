import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sendTestNotification } from "@/app/actions/notifications";

export default async function NotificationsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, channel, status, payload, created_at")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false })
    .limit(20);

  async function handleSendTest() {
    "use server";
    await sendTestNotification();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Communication Hub</h1>
        <p className="text-sm text-muted">Track borrower updates across channels.</p>
      </div>

      <Card>
        <form action={handleSendTest}>
          <Button type="submit" variant="secondary">Send test notification</Button>
        </form>
      </Card>

      <Card>
        {notifications?.length ? (
          <div className="space-y-3 text-sm">
            {notifications?.map((note) => (
              <div key={note.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{String(note.payload?.subject ?? "Notification")}</p>
                  <p className="text-xs text-muted">{note.channel}</p>
                  <p className="text-xs text-muted">{String(note.payload?.deliveryReason ?? "n/a")}</p>
                </div>
                <Badge tone={note.status === "sent" ? "success" : "warning"}>{note.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No notifications yet.</p>
        )}
      </Card>
    </div>
  );
}
