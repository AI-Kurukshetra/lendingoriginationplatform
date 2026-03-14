import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchCreditReport } from "@/services/integrations";
import { evaluateDecision } from "@/services/decisioning";

async function isCancellationRequested(runId: string) {
  const supabase = createSupabaseAdmin();
  const { data: run } = await supabase
    .from("job_runs")
    .select("status")
    .eq("id", runId)
    .maybeSingle();

  return run?.status === "cancel_requested";
}

async function runDailyCreditPull(tenantId: string, runId: string) {
  const supabase = createSupabaseAdmin();
  const { data: applications } = await supabase
    .from("loan_applications")
    .select("id, requested_amount, data")
    .eq("tenant_id", tenantId)
    .in("status", ["submitted", "manual_review"])
    .limit(50);

  for (const app of applications ?? []) {
    if (await isCancellationRequested(runId)) {
      return { cancelled: true };
    }

    const annualIncome = Number((app.data as Record<string, unknown>)?.annualIncome ?? 0);
    const requestedAmount = Number(app.requested_amount ?? 0);
    const credit = await fetchCreditReport({ tenantId, annualIncome, requestedAmount });

    await supabase.from("credit_reports").insert({
      tenant_id: tenantId,
      application_id: app.id,
      provider: credit.provider,
      score: credit.score,
      report: credit.report,
    });

    const decision = await evaluateDecision({
      tenantId,
      creditScore: credit.score,
      annualIncome,
      requestedAmount,
    });

    await supabase
      .from("loan_applications")
      .update({ status: decision.decision })
      .eq("id", app.id);

    await supabase.from("application_status_events").insert({
      tenant_id: tenantId,
      application_id: app.id,
      status: decision.decision,
      note: `Batch decision update: ${decision.reason}`,
    });
  }

  return { cancelled: false };
}

async function runDocumentOcr(tenantId: string, runId: string) {
  const supabase = createSupabaseAdmin();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, kind")
    .eq("tenant_id", tenantId)
    .eq("status", "uploaded")
    .limit(100);

  for (const doc of documents ?? []) {
    if (await isCancellationRequested(runId)) {
      return { cancelled: true };
    }

    await supabase.from("document_extractions").insert({
      tenant_id: tenantId,
      document_id: doc.id,
      extracted: {
        summary: `OCR extraction for ${doc.kind}`,
        fields: { confidence: 0.91 },
      },
    });

    await supabase
      .from("documents")
      .update({ status: "processed" })
      .eq("id", doc.id);
  }

  return { cancelled: false };
}

export async function runJob(tenantId: string, jobName: string) {
  const supabase = createSupabaseAdmin();
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", jobName)
    .maybeSingle();

  if (!job) {
    return { status: "skipped" as const };
  }

  const { data: run } = await supabase
    .from("job_runs")
    .insert({
      tenant_id: tenantId,
      job_id: job.id,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const runId = run?.id ?? "";

  try {
    let cancelled = false;

    if (jobName === "daily-credit-pull") {
      const result = await runDailyCreditPull(tenantId, runId);
      cancelled = result.cancelled;
    }

    if (jobName === "document-ocr") {
      const result = await runDocumentOcr(tenantId, runId);
      cancelled = result.cancelled;
    }

    await supabase
      .from("job_runs")
      .update({
        status: cancelled ? "cancelled" : "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return { status: cancelled ? "cancelled" : "completed" };
  } catch {
    await supabase
      .from("job_runs")
      .update({ status: "failed", finished_at: new Date().toISOString() })
      .eq("id", runId);

    return { status: "failed" };
  }
}
