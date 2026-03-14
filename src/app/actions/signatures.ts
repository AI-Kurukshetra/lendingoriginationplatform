"use server";

import { requireUser, getTenantMember } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createSignatureRequest } from "@/services/signatures";
import { logAudit } from "@/services/audit";

export async function sendSignature(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const applicationId = String(formData.get("applicationId") || "");
  if (!applicationId) return { error: "Missing application" };

  const result = await createSignatureRequest({
    tenantId: member.tenant_id,
    applicationId,
    recipientEmail: user.email,
  });

  if (!result.success) {
    return { error: result.error ?? "Failed to send signature request" };
  }

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    action: "signature.requested",
    entity: "loan_applications",
    entityId: applicationId,
    payload: { provider: result.provider, signatureRequestId: result.signatureRequestId },
  });

  revalidatePath(`/applications/${applicationId}`);
  return { success: true };
}
