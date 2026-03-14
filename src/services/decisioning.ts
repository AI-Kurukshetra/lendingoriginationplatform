import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type DecisionOutcome = "approved" | "rejected" | "manual_review";

export async function evaluateDecision(input: {
  tenantId: string;
  creditScore?: number | null;
  annualIncome?: number | null;
  requestedAmount?: number | null;
}) {
  const score = input.creditScore ?? 0;
  const income = input.annualIncome ?? 0;
  const amount = input.requestedAmount ?? 0;
  const incomeRatio = amount > 0 ? income / amount : 0;

  const supabase = createSupabaseAdmin();
  const { data: rules } = await supabase
    .from("decision_rules")
    .select("id, name, min_credit_score, max_credit_score, min_income_ratio, max_amount, decision, reason, priority")
    .eq("tenant_id", input.tenantId)
    .eq("active", true)
    .order("priority", { ascending: true });

  const matchedRule = rules?.find((rule) => {
    const minScoreOk = rule.min_credit_score == null || score >= rule.min_credit_score;
    const maxScoreOk = rule.max_credit_score == null || score <= rule.max_credit_score;
    const incomeRatioOk = rule.min_income_ratio == null || incomeRatio >= Number(rule.min_income_ratio);
    const maxAmountOk = rule.max_amount == null || amount <= Number(rule.max_amount);
    return minScoreOk && maxScoreOk && incomeRatioOk && maxAmountOk;
  });

  if (matchedRule) {
    return {
      decision: matchedRule.decision as DecisionOutcome,
      reason: matchedRule.reason,
      rule: {
        id: matchedRule.id,
        name: matchedRule.name,
        priority: matchedRule.priority,
      },
      metrics: {
        creditScore: score,
        incomeRatio,
      },
    };
  }

  // Safe default if tenant has no custom rules configured.
  if (score >= 720 && incomeRatio >= 1.5) {
    return {
      decision: "approved" as const,
      reason: "Meets automated approval criteria",
      rule: { id: null, name: "default-approval", priority: 999 },
      metrics: { creditScore: score, incomeRatio },
    };
  }

  if (score < 620) {
    return {
      decision: "rejected" as const,
      reason: "Credit score below threshold",
      rule: { id: null, name: "default-rejection", priority: 999 },
      metrics: { creditScore: score, incomeRatio },
    };
  }

  return {
    decision: "manual_review" as const,
    reason: "Requires underwriter review",
    rule: { id: null, name: "default-manual-review", priority: 999 },
    metrics: { creditScore: score, incomeRatio },
  };
}
