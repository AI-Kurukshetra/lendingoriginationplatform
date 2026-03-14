import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CompliancePage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: checks } = await supabase
    .from("compliance_checks")
    .select("id, rule, status, application_id, created_at")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance Center</h1>
        <p className="text-sm text-muted">Monitor regulatory checks and exceptions.</p>
      </div>

      <Card>
        <div className="space-y-3 text-sm">
          {checks?.map((check) => (
            <div key={check.id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{check.rule}</p>
                <p className="text-xs text-muted">Application {check.application_id.slice(0, 8)}</p>
              </div>
              <Badge tone={check.status === "pass" ? "success" : "warning"}>{check.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

