import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function runJob(tenantId: string, jobName: string) {
  const supabase = createSupabaseAdmin();
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", jobName)
    .maybeSingle();

  if (!job) {
    return { status: "skipped" };
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

  await supabase
    .from("job_runs")
    .update({ status: "completed", finished_at: new Date().toISOString() })
    .eq("id", run?.id ?? "");

  return { status: "completed" };
}
