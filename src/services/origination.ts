import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { evaluateDecision } from "@/services/decisioning";
import { runComplianceChecks } from "@/services/compliance";
import { startWorkflow } from "@/services/workflow";
import { enqueueNotification } from "@/services/notifications";
import { logAudit } from "@/services/audit";
import { calculatePricing } from "@/services/pricing";
import { evaluateRisk } from "@/services/risk";
import { fetchCreditReport, verifyEmployment, verifyIdentity, verifyBankAccount } from "@/services/integrations";

export async function originateApplication(input: {
  tenantId: string;
  actorUserId?: string | null;
  borrowerUserId?: string | null;
  borrower: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  request: {
    requestedAmount: number;
    requestedTermMonths: number;
    loanProductId: string;
    channel: "web" | "mobile" | "partner" | "pos" | "api";
    annualIncome?: number;
    state?: string;
    idNumber?: string;
    borrowerEmail?: string;
  };
}) {
  const supabase = createSupabaseAdmin();

  let borrowerId = "";

  if (input.borrowerUserId) {
    const { data: existingBorrower } = await supabase
      .from("borrowers")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("user_id", input.borrowerUserId)
      .maybeSingle();

    borrowerId = existingBorrower?.id ?? "";
  }

  if (!borrowerId) {
    const { data: borrower, error: borrowerError } = await supabase
      .from("borrowers")
      .insert({
        tenant_id: input.tenantId,
        user_id: input.borrowerUserId ?? null,
        first_name: input.borrower.firstName,
        last_name: input.borrower.lastName,
        phone: input.borrower.phone ?? null,
        kyc_status: "pending",
      })
      .select("id")
      .single();

    if (borrowerError || !borrower) {
      return { error: borrowerError?.message ?? "Failed to create borrower" };
    }

    borrowerId = borrower.id;
  }

  const { data: product } = await supabase
    .from("loan_products")
    .select("base_rate")
    .eq("id", input.request.loanProductId)
    .maybeSingle();

  const preliminaryRisk = await evaluateRisk({ tenantId: input.tenantId, creditScore: 680 });

  const pricingRate = await calculatePricing({
    tenantId: input.tenantId,
    loanProductId: input.request.loanProductId,
    baseRate: Number(product?.base_rate ?? 8.5),
    creditScore: 680,
    requestedAmount: input.request.requestedAmount,
    requestedTermMonths: input.request.requestedTermMonths,
    riskBand: preliminaryRisk.band,
  });

  const { data: application, error: appError } = await supabase
    .from("loan_applications")
    .insert({
      tenant_id: input.tenantId,
      borrower_id: borrowerId,
      loan_product_id: input.request.loanProductId,
      channel: input.request.channel,
      status: "submitted",
      requested_amount: input.request.requestedAmount,
      requested_term_months: input.request.requestedTermMonths,
      data: {
        annualIncome: input.request.annualIncome ?? null,
        pricingRate,
        state: input.request.state ?? "",
        idNumber: input.request.idNumber ?? "",
      },
    })
    .select("id")
    .single();

  if (appError || !application) {
    return { error: appError?.message ?? "Failed to create application" };
  }

  await supabase.from("application_status_events").insert({
    tenant_id: input.tenantId,
    application_id: application.id,
    status: "submitted",
    created_by: input.actorUserId ?? null,
    note: "Application submitted",
  });

  const identity = await verifyIdentity({
    tenantId: input.tenantId,
    firstName: input.borrower.firstName,
    lastName: input.borrower.lastName,
    idNumber: input.request.idNumber,
  });

  await supabase.from("identity_verifications").insert({
    tenant_id: input.tenantId,
    application_id: application.id,
    provider: identity.provider,
    result: identity.result,
    payload: identity.payload,
  });

  await supabase
    .from("borrowers")
    .update({ kyc_status: identity.result })
    .eq("id", borrowerId);

  const [credit, bank, employment] = await Promise.all([
    fetchCreditReport({
      tenantId: input.tenantId,
      annualIncome: input.request.annualIncome,
      requestedAmount: input.request.requestedAmount,
    }),
    verifyBankAccount({ tenantId: input.tenantId }),
    verifyEmployment({ tenantId: input.tenantId }),
  ]);

  await supabase.from("credit_reports").insert({
    tenant_id: input.tenantId,
    application_id: application.id,
    provider: credit.provider,
    score: credit.score,
    report: {
      ...credit.report,
      bankVerification: bank,
      employmentVerification: employment,
    },
  });

  const risk = await evaluateRisk({ tenantId: input.tenantId, creditScore: credit.score });
  await supabase.from("risk_assessments").insert({
    tenant_id: input.tenantId,
    application_id: application.id,
    score: risk.score,
    band: risk.band,
  });

  const decision = await evaluateDecision({
    tenantId: input.tenantId,
    creditScore: credit.score,
    annualIncome: input.request.annualIncome,
    requestedAmount: input.request.requestedAmount,
  });

  await supabase.from("credit_decisions").insert({
    tenant_id: input.tenantId,
    application_id: application.id,
    decision: decision.decision,
    reason: decision.reason,
    rules_snapshot: {
      creditScore: credit.score,
      annualIncome: input.request.annualIncome,
      requestedAmount: input.request.requestedAmount,
      riskBand: risk.band,
      decisionRule: decision.rule,
      metrics: decision.metrics,
    },
  });

  const complianceChecks = await runComplianceChecks({
    tenantId: input.tenantId,
    requestedAmount: input.request.requestedAmount,
    state: input.request.state,
    apr: pricingRate,
  });

  if (complianceChecks.length > 0) {
    await supabase.from("compliance_checks").insert(
      complianceChecks.map((check) => ({
        tenant_id: input.tenantId,
        application_id: application.id,
        rule: check.rule,
        status: check.status,
        detail: check.detail,
      }))
    );
  }

  await startWorkflow({ tenantId: input.tenantId, applicationId: application.id });

  await supabase
    .from("loan_applications")
    .update({ status: decision.decision })
    .eq("id", application.id);

  await supabase.from("application_status_events").insert({
    tenant_id: input.tenantId,
    application_id: application.id,
    status: decision.decision,
    created_by: input.actorUserId ?? null,
    note: `Decision: ${decision.reason}`,
  });

  await enqueueNotification({
    tenantId: input.tenantId,
    userId: input.actorUserId ?? input.borrowerUserId ?? null,
    channel: "email",
    payload: {
      to: input.request.borrowerEmail ?? "",
      subject: "Application update",
      message: `Your application is now ${decision.decision}`,
    },
  });

  await logAudit({
    tenantId: input.tenantId,
    actorId: input.actorUserId ?? input.borrowerUserId ?? null,
    action: "application.originated",
    entity: "loan_applications",
    entityId: application.id,
    payload: {
      status: decision.decision,
      channel: input.request.channel,
      riskBand: risk.band,
    },
  });

  return {
    applicationId: application.id,
    decision: decision.decision,
  };
}
