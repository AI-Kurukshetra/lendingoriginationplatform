export function evaluateDecision(input: {
  creditScore?: number | null;
  annualIncome?: number | null;
  requestedAmount?: number | null;
}) {
  const score = input.creditScore ?? 0;
  const income = input.annualIncome ?? 0;
  const amount = input.requestedAmount ?? 0;

  if (score >= 720 && income >= amount * 1.5) {
    return { decision: "approved", reason: "Meets automated approval criteria" } as const;
  }

  if (score < 620) {
    return { decision: "rejected", reason: "Credit score below threshold" } as const;
  }

  return { decision: "manual_review", reason: "Requires underwriter review" } as const;
}
