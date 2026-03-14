"use server";

import { requireUser, getTenantMember } from "@/lib/auth";
import { enqueueNotification } from "@/services/notifications";

export async function sendTestNotification() {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  await enqueueNotification({
    tenantId: member.tenant_id,
    userId: user.id,
    channel: "email",
    payload: {
      subject: "Test notification",
      message: "This is a test notification from Communications hub.",
    },
  });

  return { success: true };
}
