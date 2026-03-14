import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cancelJobRun, runJobNow, seedJobs } from "@/app/actions/jobs";

export default async function JobsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, name, schedule, active")
    .eq("tenant_id", member.tenant_id);

  const { data: runs } = await supabase
    .from("job_runs")
    .select("id, status, started_at, finished_at, job_id")
    .eq("tenant_id", member.tenant_id)
    .order("started_at", { ascending: false })
    .limit(10);

  const jobNameById = new Map((jobs ?? []).map((job) => [job.id, job.name]));

  async function handleSeedJobs() {
    "use server";
    await seedJobs();
  }

  async function handleRunJobNow(formData: FormData) {
    "use server";
    await runJobNow(formData);
  }

  async function handleCancelRun(formData: FormData) {
    "use server";
    await cancelJobRun(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Batch Processing</h1>
        <p className="text-sm text-muted">Trigger scheduled back-office jobs.</p>
      </div>

      <Card>
        <p className="mb-3 text-xs text-muted">Document OCR processes files from the application Documents section that are in <code>uploaded</code> status.</p>
        <div className="flex flex-wrap items-center gap-3">
          <form action={handleSeedJobs}>
            <Button type="submit" variant="secondary">Seed default jobs</Button>
          </form>
          <form action={handleRunJobNow}>
            <input type="hidden" name="jobName" value="daily-credit-pull" />
            <Button type="submit">Run daily credit pull</Button>
          </form>
          <form action={handleRunJobNow}>
            <input type="hidden" name="jobName" value="document-ocr" />
            <Button type="submit" variant="secondary">Run document OCR</Button>
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

      <Card>
        <h3 className="mb-3 text-sm font-semibold">Recent Runs</h3>
        {runs?.length ? (
          <div className="space-y-2 text-sm">
            {runs.map((run) => {
              const isRunning = run.status === "running" || run.status === "cancel_requested";
              const tone =
                run.status === "completed"
                  ? "success"
                  : run.status === "failed"
                  ? "danger"
                  : run.status === "cancelled"
                  ? "warning"
                  : "warning";

              return (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{jobNameById.get(run.job_id) ?? run.job_id}</p>
                    <p className="text-xs text-muted">
                      {run.started_at ? new Date(run.started_at).toLocaleString() : "n/a"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={tone}>{run.status}</Badge>
                    <form action={handleCancelRun}>
                      <input type="hidden" name="runId" value={run.id} />
                      <Button type="submit" size="sm" variant="danger" disabled={!isRunning}>
                        {isRunning ? "Stop" : "Stopped"}
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">No job runs yet.</p>
        )}
      </Card>
    </div>
  );
}
