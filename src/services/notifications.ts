import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function enqueueNotification({
  tenantId,
  userId,
  channel,
  payload,
}: {
  tenantId: string;
  userId?: string | null;
  channel: "email" | "sms" | "push";
  payload: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdmin();
  await supabase.from("notifications").insert({
    tenant_id: tenantId,
    user_id: userId ?? null,
    channel,
    status: "queued",
    payload,
  });
}
