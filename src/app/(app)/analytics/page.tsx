import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: applications } = await supabase
    .from("loan_applications")
    .select("id, status, created_at")
    .eq("tenant_id", member.tenant_id);

  const stats = applications?.reduce(
    (acc, app) => {
      acc.total += 1;
      acc.byStatus[app.status] = (acc.byStatus[app.status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} as Record<string, number> }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Analytics</h1>
        <p className="text-sm text-muted">Conversion and bottleneck signals.</p>
      </div>

      <Card>
        <p className="text-xs text-muted">Total applications</p>
        <p className="text-3xl font-semibold">{stats?.total ?? 0}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(stats?.byStatus ?? {}).map(([status, count]) => (
          <Card key={status}>
            <p className="text-xs text-muted">{status}</p>
            <p className="text-2xl font-semibold">{count}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

