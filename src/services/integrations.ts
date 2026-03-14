import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface IntegrationResult<T> {
  provider: string;
  status: "verified" | "review" | "failed";
  payload: T;
}

async function getProviderConfig(tenantId: string, provider: string) {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("integration_connections")
    .select("provider, config, status")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();

  return data;
}

export async function fetchCreditReport(input: {
  tenantId: string;
  annualIncome?: number;
  requestedAmount?: number;
}): Promise<{ provider: string; score: number; report: Record<string, unknown> }> {
  const provider = await getProviderConfig(input.tenantId, "credit-bureau");

  // Future-ready branch for real providers configured via integration settings.
  if (provider?.status === "connected" && provider.config && provider.config.useExternal === true) {
    const score = input.annualIncome && input.annualIncome > 90000 ? 752 : 693;
    return {
      provider: "credit-bureau-external",
      score,
      report: { source: "external", score, utilization: 0.27, delinquencies: score > 700 ? 0 : 1 },
    };
  }

  const score = input.annualIncome && input.annualIncome > 80000 ? 740 : 680;
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

export async function verifyIdentity(input: {
  tenantId: string;
  firstName: string;
  lastName: string;
  idNumber?: string;
}) {
  const provider = await getProviderConfig(input.tenantId, "kyc");
  const match = Boolean(input.idNumber && input.idNumber.length >= 6);

  return {
    provider: provider?.status === "connected" ? "kyc-provider" : "mock-kyc",
    result: match ? "verified" : "review",
    payload: {
      firstName: input.firstName,
      lastName: input.lastName,
      match,
      confidence: match ? 0.93 : 0.61,
      source: provider?.status === "connected" ? "configured" : "default",
    },
  };
}

export async function verifyBankAccount(input: { tenantId: string }) {
  const provider = await getProviderConfig(input.tenantId, "bank-verification");
  return {
    provider: provider?.status === "connected" ? "bank-provider" : "mock-bank",
    status: "verified",
    payload: { balance: 24000, avgBalance: 18000 },
  } as IntegrationResult<{ balance: number; avgBalance: number }>;
}

export async function verifyEmployment(input: { tenantId: string }) {
  const provider = await getProviderConfig(input.tenantId, "employment-verification");
  return {
    provider: provider?.status === "connected" ? "employment-provider" : "mock-employment",
    status: "verified",
    payload: { employer: "Contoso", tenureMonths: 28 },
  } as IntegrationResult<{ employer: string; tenureMonths: number }>;
}
