import { Card } from "@/components/ui/card";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";

export default async function DashboardPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: applications } = await supabase
    .from("loan_applications")
    .select("id, status", { count: "exact" })
    .eq("tenant_id", member.tenant_id);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, status", { count: "exact" })
    .eq("tenant_id", member.tenant_id)
    .eq("status", "open");

  const { data: approvals } = await supabase
    .from("approvals")
    .select("id", { count: "exact" })
    .eq("tenant_id", member.tenant_id)
    .eq("status", "approved");

  const totalApps = applications?.length ?? 0;
  const openTasks = tasks?.length ?? 0;
  const approved = approvals?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Overview</h1>
        <p className="text-sm text-muted">
          Real-time health of your origination funnel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Active Applications</p>
          <p className="text-3xl font-semibold">{totalApps}</p>
          <p className="text-xs text-muted">Across all channels</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Open Tasks</p>
          <p className="text-3xl font-semibold">{openTasks}</p>
          <p className="text-xs text-muted">Underwriting + compliance</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Approved Loans</p>
          <p className="text-3xl font-semibold">{approved}</p>
          <p className="text-xs text-muted">Last 30 days</p>
        </Card>
      </div>
    </div>
  );
}

