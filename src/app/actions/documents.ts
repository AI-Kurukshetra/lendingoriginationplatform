"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";
import { logAudit } from "@/services/audit";
import { revalidatePath } from "next/cache";

export async function uploadDocument(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const applicationId = String(formData.get("applicationId") || "");
  const kind = String(formData.get("kind") || "");
  const file = formData.get("file") as File | null;

  if (!applicationId || !file || !kind) {
    return { error: "Missing required fields." };
  }

  const supabase = await createSupabaseServer();
  const filePath = `${member.tenant_id}/${applicationId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: document, error: docError } = await supabase
    .from("documents")
    .insert({
      tenant_id: member.tenant_id,
      application_id: applicationId,
      kind,
      file_path: filePath,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (docError) {
    return { error: docError.message };
  }

  await supabase.from("document_extractions").insert({
    tenant_id: member.tenant_id,
    document_id: document.id,
    extracted: {
      summary: "Mock extraction complete",
      fields: { applicant: "Auto-filled" },
    },
  });

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    action: "document.uploaded",
    entity: "documents",
    entityId: document.id,
    payload: { kind },
  });

  revalidatePath(`/applications/${applicationId}`);
  return { success: true };
}
