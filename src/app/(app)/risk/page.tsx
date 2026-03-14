import { requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function RiskMatrixPage() {
  const { member } = await requireRole(["admin", "underwriter", "compliance"]);
  const supabase = await createSupabaseServer();

  const { data: rules } = await supabase
    .from("risk_rules")
    .select("id, name, weight, min_score, max_score")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Risk Assessment Matrix</h1>
        <p className="text-sm text-muted">Configure weighted scoring bands.</p>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-5" action="/api/risk/rules" method="post">
          <Input name="name" placeholder="Rule name" required />
          <Input name="minScore" type="number" placeholder="Min score" required />
          <Input name="maxScore" type="number" placeholder="Max score" required />
          <Input name="weight" type="number" step="0.1" placeholder="Weight" required />
          <Button type="submit">Add rule</Button>
        </form>
      </Card>

      <Card>
        <div className="space-y-2 text-sm">
          {rules?.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between">
              <span className="font-semibold">{rule.name}</span>
              <span className="text-xs text-muted">
                {rule.min_score}-{rule.max_score} • weight {rule.weight}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
