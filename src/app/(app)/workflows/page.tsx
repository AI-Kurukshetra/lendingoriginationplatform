import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { seedWorkflow } from "@/app/actions/workflows";

export default async function WorkflowsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name, active")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false });

  async function handleSeedWorkflow() {
    "use server";
    await seedWorkflow();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Underwriting Workflows</h1>
        <p className="text-sm text-muted">Automate routing and approvals.</p>
      </div>

      <Card>
        <form action={handleSeedWorkflow}>
          <Button type="submit">Create default workflow</Button>
        </form>
      </Card>

      <Card>
        <div className="space-y-3 text-sm">
          {workflows?.map((workflow) => (
            <div key={workflow.id} className="flex items-center justify-between">
              <span className="font-semibold">{workflow.name}</span>
              <span className="text-xs text-muted">{workflow.active ? "Active" : "Inactive"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

