import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { runJobNow, seedJobs } from "@/app/actions/jobs";

export default async function JobsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, name, schedule, active")
    .eq("tenant_id", member.tenant_id);

  async function handleSeedJobs() {
    "use server";
    await seedJobs();
  }

  async function handleRunJobNow(formData: FormData) {
    "use server";
    await runJobNow(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Batch Processing</h1>
        <p className="text-sm text-muted">Trigger scheduled back-office jobs.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <form action={handleSeedJobs}>
            <Button type="submit" variant="secondary">Seed default jobs</Button>
          </form>
          <form action={handleRunJobNow}>
            <input type="hidden" name="jobName" value="daily-credit-pull" />
            <Button type="submit">Run daily credit pull</Button>
          </form>
        </div>
      </Card>

      <Card>
        <div className="space-y-3 text-sm">
          {jobs?.map((job) => (
            <div key={job.id} className="flex items-center justify-between">
              <span className="font-semibold">{job.name}</span>
              <span className="text-xs text-muted">{job.schedule ?? "manual"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

