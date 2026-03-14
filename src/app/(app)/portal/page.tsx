import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { goToInvite } from "@/app/actions/invites";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusStream } from "@/components/forms/status-stream";

export default async function BorrowerPortal() {
  const user = await requireUser();
  const supabase = await createSupabaseServer();

  const { data: borrower } = await supabase
    .from("borrowers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: applications } = borrower
    ? await supabase
        .from("loan_applications")
        .select("id, status, requested_amount, created_at")
        .eq("borrower_id", borrower.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: statusEvents } = applications?.[0]
    ? await supabase
        .from("application_status_events")
        .select("id, status, note, created_at")
        .eq("application_id", applications[0].id)
        .order("created_at", { ascending: false })
    : { data: [] };

  async function handleGoToInvite(formData: FormData) {
    "use server";
    await goToInvite(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Borrower Portal</h1>
        <p className="text-sm text-muted">Apply with your invite token and track progress.</p>
      </div>

      <Card>
        <form className="flex flex-wrap items-center gap-3" action={handleGoToInvite}>
          <Input name="token" placeholder="Paste invite token" className="min-w-[240px]" />
          <Button type="submit">Open invite</Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Recent activity</h3>
        {applications?.length ? (
          <div className="mt-4">
            <StatusStream applicationId={applications[0].id} initialEvents={statusEvents ?? []} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No applications yet.</p>
        )}
      </Card>
    </div>
  );
}
