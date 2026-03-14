import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface WorkflowStep {
  name: string;
  type?: string;
  assigneeRole?: string;
  autoComplete?: boolean;
}

function titleForStep(step: WorkflowStep) {
  const type = (step.type ?? "manual").toLowerCase();
  if (type === "identity") return `${step.name} verification`;
  if (type === "credit") return `${step.name} check`;
  if (type === "compliance") return `${step.name} review`;
  if (type === "signature") return `${step.name} request`;
  return step.name;
}

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

  const workflowQuery = supabase
    .from("workflows")
    .select("id, name, definition")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: selectedWorkflow } = workflowId
    ? await supabase
        .from("workflows")
        .select("id, name, definition")
        .eq("tenant_id", tenantId)
        .eq("id", workflowId)
        .maybeSingle()
    : await workflowQuery.maybeSingle();

  const steps = Array.isArray((selectedWorkflow?.definition as { steps?: WorkflowStep[] } | null)?.steps)
    ? ((selectedWorkflow?.definition as { steps: WorkflowStep[] }).steps)
    : [];

  const { data: workflowRun } = await supabase
    .from("workflow_runs")
    .insert({
      tenant_id: tenantId,
      workflow_id: selectedWorkflow?.id ?? null,
      application_id: applicationId,
      status: "running",
    })
    .select("id")
    .single();

  const tasks = (steps.length > 0 ? steps : [
    { name: "Underwriting review", type: "manual" },
    { name: "Compliance review", type: "compliance" },
    { name: "Signature", type: "signature" },
  ]).map((step) => ({
    tenant_id: tenantId,
    application_id: applicationId,
    title: titleForStep(step),
    status: step.autoComplete ? "completed" : "open",
  }));

  await supabase.from("tasks").insert(tasks);

  return {
    id: workflowRun?.id ?? null,
    workflowName: selectedWorkflow?.name ?? "Default workflow",
    tasksCreated: tasks.length,
  };
}
