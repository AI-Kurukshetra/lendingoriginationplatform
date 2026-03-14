"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";
import { runMockKyc } from "@/services/kyc";
import { mockCreditReport } from "@/services/integrations";
import { evaluateDecision } from "@/services/decisioning";
import { runComplianceChecks } from "@/services/compliance";
import { startWorkflow } from "@/services/workflow";
import { enqueueNotification } from "@/services/notifications";
import { logAudit } from "@/services/audit";
import { calculatePricing } from "@/services/pricing";
import { evaluateRisk } from "@/services/risk";
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
  const channel = String(formData.get("channel") || "web");
  const loanProductId = String(formData.get("loanProductId") || "");
  const state = String(formData.get("state") || "");
  const idNumber = String(formData.get("idNumber") || "");

  if (!firstName || !lastName || !requestedAmount || !requestedTerm || !loanProductId) {
    return { error: "Missing required fields." };
  }

  const supabase = await createSupabaseServer();

  const { data: borrower, error: borrowerError } = await supabase
    .from("borrowers")
    .insert({
      tenant_id: member.tenant_id,
      first_name: firstName,
      last_name: lastName,
      phone,
      kyc_status: "pending",
    })
    .select("id")
    .single();

  if (borrowerError) {
    return { error: borrowerError.message };
  }

  const { data: product } = await supabase
    .from("loan_products")
    .select("base_rate")
    .eq("id", loanProductId)
    .maybeSingle();

  const pricingRate = calculatePricing({
    baseRate: product?.base_rate ?? 8.5,
    creditScore: null,
    requestedAmount,
  });

  const { data: application, error: appError } = await supabase
    .from("loan_applications")
    .insert({
      tenant_id: member.tenant_id,
      borrower_id: borrower.id,
      loan_product_id: loanProductId,
      channel,
      status: "submitted",
      requested_amount: requestedAmount,
      requested_term_months: requestedTerm,
      data: {
        annualIncome,
        pricingRate,
        state,
        idNumber,
      },
    })
    .select("id")
    .single();

  if (appError) {
    return { error: appError.message };
  }

  await supabase.from("application_status_events").insert({
    tenant_id: member.tenant_id,
    application_id: application.id,
    status: "submitted",
    created_by: user.id,
    note: "Application submitted",
  });

  const kyc = runMockKyc({ firstName, lastName, idNumber });
  await supabase.from("identity_verifications").insert({
    tenant_id: member.tenant_id,
    application_id: application.id,
    provider: kyc.provider,
    result: kyc.result,
    payload: kyc.payload,
  });

  await supabase
    .from("borrowers")
    .update({ kyc_status: kyc.result })
    .eq("id", borrower.id);

  const credit = mockCreditReport({ annualIncome, requestedAmount });
  await supabase.from("credit_reports").insert({
    tenant_id: member.tenant_id,
    application_id: application.id,
    provider: credit.provider,
    score: credit.score,
    report: credit.report,
  });

  const decision = evaluateDecision({
    creditScore: credit.score,
    annualIncome,
    requestedAmount,
  });

  const risk = await evaluateRisk({ tenantId: member.tenant_id, creditScore: credit.score });
  await supabase.from("risk_assessments").insert({
    tenant_id: member.tenant_id,
    application_id: application.id,
    score: risk.score,
    band: risk.band,
  });

  await supabase.from("credit_decisions").insert({
    tenant_id: member.tenant_id,
    application_id: application.id,
    decision: decision.decision,
    reason: decision.reason,
    rules_snapshot: {
      creditScore: credit.score,
      annualIncome,
      requestedAmount,
      riskBand: risk.band,
    },
  });

  const complianceChecks = runComplianceChecks({ requestedAmount, state });
  if (complianceChecks.length > 0) {
    await supabase.from("compliance_checks").insert(
      complianceChecks.map((check) => ({
        tenant_id: member.tenant_id,
        application_id: application.id,
        rule: check.rule,
        status: check.status,
        detail: check.detail,
      }))
    );
  }

  await startWorkflow({ tenantId: member.tenant_id, applicationId: application.id });

  const newStatus = decision.decision === "approved"
    ? "approved"
    : decision.decision === "rejected"
    ? "rejected"
    : "manual_review";

  await supabase
    .from("loan_applications")
    .update({ status: newStatus })
    .eq("id", application.id);

  await supabase.from("application_status_events").insert({
    tenant_id: member.tenant_id,
    application_id: application.id,
    status: newStatus,
    created_by: user.id,
    note: `Decision: ${decision.reason}`,
  });

  await enqueueNotification({
    tenantId: member.tenant_id,
    userId: user.id,
    channel: "email",
    payload: {
      subject: "Application update",
      message: `Your application is now ${newStatus}`,
    },
  });

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    action: "application.created",
    entity: "loan_applications",
    entityId: application.id,
    payload: { status: newStatus },
  });

  revalidatePath("/dashboard");
  revalidatePath("/applications");
  redirect(`/applications/${application.id}`);
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
