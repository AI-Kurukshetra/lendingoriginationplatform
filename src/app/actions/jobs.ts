"use server";

import { requireUser, getTenantMember } from "@/lib/auth";
import { runJob } from "@/services/jobs";
import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateJobViews() {
  revalidatePath("/jobs");
  revalidatePath("/applications");
}

export async function runJobNow(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const jobName = String(formData.get("jobName") || "");
  if (!jobName) return { error: "Missing job name." };

  const result = await runJob(member.tenant_id, jobName);
  revalidateJobViews();
  return { success: result.status === "completed", status: result.status };
}

export async function cancelJobRun(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const runId = String(formData.get("runId") || "");
  if (!runId) return { error: "Missing run id." };

  const supabase = await createSupabaseServer();
  const { data: run } = await supabase
    .from("job_runs")
    .select("id, status")
    .eq("id", runId)
    .eq("tenant_id", member.tenant_id)
    .maybeSingle();

  if (!run) {
    return { error: "Job run not found." };
  }

  if (run.status !== "running" && run.status !== "cancel_requested") {
    return { error: `Cannot cancel a ${run.status} job.` };
  }

  await supabase
    .from("job_runs")
    .update({ status: "cancel_requested" })
    .eq("id", runId)
    .eq("tenant_id", member.tenant_id);

  revalidateJobViews();
  return { success: true };
}

export async function seedJobs() {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const supabase = await createSupabaseServer();
  await supabase.from("jobs").insert([
    { tenant_id: member.tenant_id, name: "daily-credit-pull", schedule: "0 2 * * *" },
    { tenant_id: member.tenant_id, name: "document-ocr", schedule: "*/30 * * * *" },
  ]);

  revalidatePath("/jobs");
  return { success: true };
}
