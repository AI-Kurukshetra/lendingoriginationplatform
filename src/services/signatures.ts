import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function createSignatureRequest(input: {
  tenantId: string;
  applicationId: string;
  recipientEmail?: string | null;
}) {
  const supabase = createSupabaseAdmin();

  const { data: providerConfig } = await supabase
    .from("signature_providers")
    .select("provider, status")
    .eq("tenant_id", input.tenantId)
    .eq("status", "connected")
    .maybeSingle();

  const provider = providerConfig?.provider ?? "mock-signature";

  const { data: request, error } = await supabase
    .from("signature_requests")
    .insert({
      tenant_id: input.tenantId,
      application_id: input.applicationId,
      provider,
      status: "sent",
    })
    .select("id")
    .single();

  if (error || !request) {
    return { success: false, error: error?.message ?? "Failed to create signature request" };
  }

  return {
    success: true,
    signatureRequestId: request.id,
    provider,
    signingUrl: `/sign/mock/${request.id}`,
  };
}

export async function completeSignatureRequest(signatureRequestId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("signature_requests")
    .update({ status: "completed" })
    .eq("id", signatureRequestId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
