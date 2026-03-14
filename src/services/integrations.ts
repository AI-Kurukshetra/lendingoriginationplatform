export function mockCreditReport(payload: {
  annualIncome?: number;
  requestedAmount?: number;
}) {
  const score = payload.annualIncome && payload.annualIncome > 80000 ? 740 : 680;
  return {
    provider: "mock-credit-bureau",
    score,
    report: {
      score,
      utilization: 0.32,
      delinquencies: score > 700 ? 0 : 1,
    },
  };
}

export function mockBankVerification() {
  return {
    provider: "mock-bank",
    status: "verified",
    payload: { balance: 24000, avgBalance: 18000 },
  };
}

export function mockEmploymentVerification() {
  return {
    provider: "mock-employment",
    status: "verified",
    payload: { employer: "Contoso", tenureMonths: 28 },
  };
}
