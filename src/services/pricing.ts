import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface PricingInput {
  tenantId: string;
  loanProductId?: string | null;
  baseRate: number;
  creditScore?: number | null;
  requestedAmount?: number | null;
  riskBand?: string | null;
  requestedTermMonths?: number | null;
}

export async function calculatePricing(input: PricingInput) {
  const score = input.creditScore ?? 0;
  const amount = input.requestedAmount ?? 0;
  const term = input.requestedTermMonths ?? 0;

  let rate = Number(input.baseRate);

  const supabase = createSupabaseAdmin();
  if (input.loanProductId) {
    const { data: rules } = await supabase
      .from("pricing_rules")
      .select("rule")
      .eq("tenant_id", input.tenantId)
      .eq("loan_product_id", input.loanProductId);

    for (const row of rules ?? []) {
      const rule = (row.rule ?? {}) as {
        minCreditScore?: number;
        maxCreditScore?: number;
        minAmount?: number;
        maxAmount?: number;
        minTermMonths?: number;
        maxTermMonths?: number;
        riskBand?: string;
        adjustmentBps?: number;
        adjustmentPct?: number;
      };

      const scoreOk = (rule.minCreditScore == null || score >= rule.minCreditScore)
        && (rule.maxCreditScore == null || score <= rule.maxCreditScore);
      const amountOk = (rule.minAmount == null || amount >= rule.minAmount)
        && (rule.maxAmount == null || amount <= rule.maxAmount);
      const termOk = (rule.minTermMonths == null || term >= rule.minTermMonths)
        && (rule.maxTermMonths == null || term <= rule.maxTermMonths);
      const riskOk = !rule.riskBand || rule.riskBand === input.riskBand;

      if (!scoreOk || !amountOk || !termOk || !riskOk) {
        continue;
      }

      if (typeof rule.adjustmentBps === "number") {
        rate += rule.adjustmentBps / 100;
      }
      if (typeof rule.adjustmentPct === "number") {
        rate += rule.adjustmentPct;
      }
    }
  }

  // Fallback if no rules were configured.
  if (score >= 720) rate -= 0.5;
  if (amount > 40000) rate += 0.35;
  if (input.riskBand === "high") rate += 0.75;

  return Number(rate.toFixed(2));
}
