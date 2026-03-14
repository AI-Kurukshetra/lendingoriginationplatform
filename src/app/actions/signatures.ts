"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function sendSignature(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const applicationId = String(formData.get("applicationId") || "");
  if (!applicationId) return { error: "Missing application" };

  const supabase = await createSupabaseServer();
  await supabase.from("signature_requests").insert({
    tenant_id: member.tenant_id,
    application_id: applicationId,
    provider: "mock-signature",
    status: "sent",
  });

  revalidatePath(`/applications/${applicationId}`);
  return { success: true };
}
