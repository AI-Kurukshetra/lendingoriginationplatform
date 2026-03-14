import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";

function hoursBetween(start: string, end: string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
}

export default async function AnalyticsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: applications } = await supabase
    .from("loan_applications")
    .select("id, status, created_at")
    .eq("tenant_id", member.tenant_id);

  const { data: events } = await supabase
    .from("application_status_events")
    .select("application_id, status, created_at")
    .eq("tenant_id", member.tenant_id)
    .in("status", ["approved", "rejected", "manual_review"])
    .order("created_at", { ascending: true });

  const stats = applications?.reduce(
    (acc, app) => {
      acc.total += 1;
      acc.byStatus[app.status] = (acc.byStatus[app.status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} as Record<string, number> }
  );

  const approved = stats?.byStatus.approved ?? 0;
  const conversionRate = stats?.total ? (approved / stats.total) * 100 : 0;

  const firstDecisionByApp = new Map<string, string>();
  for (const event of events ?? []) {
    if (!firstDecisionByApp.has(event.application_id)) {
      firstDecisionByApp.set(event.application_id, event.created_at);
    }
  }

  const durations = (applications ?? [])
    .map((app) => {
      const decidedAt = firstDecisionByApp.get(app.id);
      if (!decidedAt) return null;
      return hoursBetween(app.created_at, decidedAt);
    })
    .filter((value): value is number => value != null);

  const avgDecisionHours = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : 0;

  const manualReview = stats?.byStatus.manual_review ?? 0;
  const bottleneckRate = stats?.total ? (manualReview / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Analytics</h1>
        <p className="text-sm text-muted">Conversion and bottleneck signals.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Total applications</p>
          <p className="text-3xl font-semibold">{stats?.total ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Approval conversion</p>
          <p className="text-3xl font-semibold">{conversionRate.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Avg. time to decision</p>
          <p className="text-3xl font-semibold">{avgDecisionHours.toFixed(1)}h</p>
        </Card>
      </div>

      <Card>
        <p className="text-xs text-muted">Manual review bottleneck rate</p>
        <p className="text-2xl font-semibold">{bottleneckRate.toFixed(1)}%</p>
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
