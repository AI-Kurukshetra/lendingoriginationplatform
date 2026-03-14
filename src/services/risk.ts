import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function evaluateRisk({
  tenantId,
  creditScore,
}: {
  tenantId: string;
  creditScore: number;
}) {
  const supabase = createSupabaseAdmin();
  const { data: rules } = await supabase
    .from("risk_rules")
    .select("id, name, weight, min_score, max_score")
    .eq("tenant_id", tenantId);

  const matching = rules?.find(
    (rule) => creditScore >= rule.min_score && creditScore <= rule.max_score
  );

  if (!matching) {
    return { score: 0, band: "unrated" };
  }

  return { score: matching.weight, band: matching.name };
}
