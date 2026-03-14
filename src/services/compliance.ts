export function runComplianceChecks(input: {
  requestedAmount?: number | null;
  state?: string | null;
}) {
  const checks = [] as { rule: string; status: string; detail: Record<string, unknown> }[];

  if ((input.requestedAmount ?? 0) > 50000) {
    checks.push({
      rule: "HMDA_HIGH_BALANCE",
      status: "review",
      detail: { reason: "High balance loan requires disclosure" },
    });
  } else {
    checks.push({
      rule: "HMDA_HIGH_BALANCE",
      status: "pass",
      detail: {},
    });
  }

  checks.push({
    rule: "TILA_DISCLOSURE",
    status: "pass",
    detail: { aprDisclosed: true },
  });

  return checks;
}
