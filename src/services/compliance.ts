import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface ComplianceCheck {
  rule: string;
  status: "pass" | "review" | "fail";
  detail: Record<string, unknown>;
}

export async function runComplianceChecks(input: {
  tenantId: string;
  requestedAmount?: number | null;
  state?: string | null;
  apr?: number | null;
}) {
  const amount = input.requestedAmount ?? 0;
  const state = (input.state ?? "").toUpperCase();
  const apr = input.apr ?? null;

  const supabase = createSupabaseAdmin();
  const { data: tenantRules } = await supabase
    .from("compliance_rules")
    .select("code, definition, severity")
    .eq("tenant_id", input.tenantId)
    .eq("active", true);

  const checks: ComplianceCheck[] = [];

  for (const rule of tenantRules ?? []) {
    const definition = (rule.definition ?? {}) as {
      minAmount?: number;
      maxAmount?: number;
      states?: string[];
      maxApr?: number;
      onMatchStatus?: "pass" | "review" | "fail";
      onMissStatus?: "pass" | "review" | "fail";
    };

    const amountOk = (definition.minAmount == null || amount >= definition.minAmount)
      && (definition.maxAmount == null || amount <= definition.maxAmount);
    const stateOk = !definition.states || definition.states.length === 0 || definition.states.includes(state);
    const aprOk = definition.maxApr == null || (apr != null && apr <= definition.maxApr);
    const matched = amountOk && stateOk && aprOk;

    checks.push({
      rule: rule.code,
      status: matched ? (definition.onMatchStatus ?? "pass") : (definition.onMissStatus ?? "review"),
      detail: {
        severity: rule.severity,
        matched,
        amount,
        state,
        apr,
      },
    });
  }

  if (checks.length > 0) {
    return checks;
  }

  // Fallback baseline rule pack.
  checks.push({
    rule: "HMDA_HIGH_BALANCE",
    status: amount > 50000 ? "review" : "pass",
    detail: amount > 50000 ? { reason: "High balance loan requires disclosure" } : {},
  });

  checks.push({
    rule: "TILA_DISCLOSURE",
    status: "pass",
    detail: { aprDisclosed: apr != null },
  });

  checks.push({
    rule: "RESPA_STATE_CHECK",
    status: state ? "pass" : "review",
    detail: { stateProvided: Boolean(state) },
  });

  return checks;
}
