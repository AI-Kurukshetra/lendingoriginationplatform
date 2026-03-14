import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Channel = "email" | "sms" | "push";

async function dispatchEmail(payload: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const to = String(payload.to ?? "");

  if (!apiKey || !from || !to) {
    return { delivered: false, reason: "missing_email_provider_config" };
  }

  const subject = String(payload.subject ?? "Notification");
  const message = String(payload.message ?? "");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text: message }),
  });

  if (!response.ok) {
    return { delivered: false, reason: `email_provider_error_${response.status}` };
  }

  return { delivered: true as const };
}

async function dispatchNotification(
  channel: Channel,
  payload: Record<string, unknown>
): Promise<{ delivered: boolean; reason?: string }> {
  if (channel === "email") {
    return dispatchEmail(payload);
  }

  // SMS/Push are queued for provider workers.
  return { delivered: false, reason: "provider_not_configured" };
}

export async function enqueueNotification({
  tenantId,
  userId,
  channel,
  payload,
}: {
  tenantId: string;
  userId?: string | null;
  channel: Channel;
  payload: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdmin();

  const { data: created, error } = await supabase
    .from("notifications")
    .insert({
      tenant_id: tenantId,
      user_id: userId ?? null,
      channel,
      status: "queued",
      payload,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { success: false, error: error?.message ?? "Failed to queue notification" };
  }

  const delivery = await dispatchNotification(channel, payload);

  await supabase
    .from("notifications")
    .update({
      status: delivery.delivered ? "sent" : "queued",
      payload: {
        ...payload,
        lastDeliveryAttemptAt: new Date().toISOString(),
        deliveryReason: delivery.reason ?? "sent",
      },
    })
    .eq("id", created.id);

  return { success: true, notificationId: created.id, delivered: delivery.delivered };
}
