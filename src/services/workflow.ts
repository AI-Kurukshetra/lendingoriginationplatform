import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function startWorkflow({
  tenantId,
  applicationId,
  workflowId,
}: {
  tenantId: string;
  applicationId: string;
  workflowId?: string | null;
}) {
  const supabase = createSupabaseAdmin();

  const { data: workflowRun } = await supabase
    .from("workflow_runs")
    .insert({
      tenant_id: tenantId,
      workflow_id: workflowId ?? null,
      application_id: applicationId,
      status: "running",
    })
    .select("id")
    .single();

  await supabase.from("tasks").insert([
    {
      tenant_id: tenantId,
      application_id: applicationId,
      title: "Underwriting review",
      status: "open",
    },
    {
      tenant_id: tenantId,
      application_id: applicationId,
      title: "Compliance review",
      status: "open",
    },
    {
      tenant_id: tenantId,
      application_id: applicationId,
      title: "Signature request",
      status: "open",
    },
  ]);

  return workflowRun;
}
