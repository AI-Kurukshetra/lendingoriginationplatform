"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";
import { enqueueNotification } from "@/services/notifications";
import { logAudit } from "@/services/audit";
import { originateApplication } from "@/services/origination";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createApplication(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) {
    return { error: "No tenant membership found." };
  }

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const annualIncome = Number(formData.get("annualIncome") || 0);
  const requestedAmount = Number(formData.get("requestedAmount") || 0);
  const requestedTerm = Number(formData.get("requestedTerm") || 0);
  const channel = String(formData.get("channel") || "web") as "web" | "mobile" | "partner" | "pos" | "api";
  const loanProductId = String(formData.get("loanProductId") || "");
  const state = String(formData.get("state") || "");
  const idNumber = String(formData.get("idNumber") || "");

  if (!firstName || !lastName || !requestedAmount || !requestedTerm || !loanProductId) {
    return { error: "Missing required fields." };
  }

  const result = await originateApplication({
    tenantId: member.tenant_id,
    actorUserId: user.id,
    borrower: { firstName, lastName, phone },
    request: {
      requestedAmount,
      requestedTermMonths: requestedTerm,
      loanProductId,
      channel,
      annualIncome,
      state,
      idNumber,
      borrowerEmail: user.email,
    },
  });

  if (result.error || !result.applicationId) {
    return { error: result.error ?? "Failed to create application" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/applications");
  redirect(`/applications/${result.applicationId}`);
}

export async function updateApplicationStatus(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const applicationId = String(formData.get("applicationId") || "");
  const status = String(formData.get("status") || "");
  const note = String(formData.get("note") || "");

  if (!applicationId || !status) {
    return { error: "Missing application or status." };
  }

  const supabase = await createSupabaseServer();
  await supabase
    .from("loan_applications")
    .update({ status })
    .eq("id", applicationId)
    .eq("tenant_id", member.tenant_id);

  await supabase.from("application_status_events").insert({
    tenant_id: member.tenant_id,
    application_id: applicationId,
    status,
    note,
    created_by: user.id,
  });

  await enqueueNotification({
    tenantId: member.tenant_id,
    userId: user.id,
    channel: "email",
    payload: {
      to: user.email ?? "",
      subject: "Application update",
      message: `Application status changed to ${status}`,
    },
  });

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    action: "application.status_updated",
    entity: "loan_applications",
    entityId: applicationId,
    payload: { status, note },
  });

  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath(`/applications/${applicationId}`);
  return { success: true };
}
