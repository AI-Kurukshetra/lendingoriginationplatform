import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { hashApiKey } from "@/lib/crypto";
import { getApiUsageCount } from "@/services/rate-limit";
import { originateApplication } from "@/services/origination";

const DEFAULT_LIMIT = 60;

async function authorize(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;
  const supabase = createSupabaseAdmin();
  const hashed = hashApiKey(apiKey);
  const { data: key } = await supabase
    .from("api_keys")
    .select("id, tenant_id, active")
    .eq("hashed_key", hashed)
    .maybeSingle();

  if (!key || !key.active) return null;
  return { keyId: key.id, tenantId: key.tenant_id };
}

async function applyRateLimit(tenantId: string) {
  const rateLimit = Number(process.env.PARTNER_RATE_LIMIT ?? DEFAULT_LIMIT);
  const count = await getApiUsageCount({ tenantId, windowSeconds: 60 });
  return { allowed: count < rateLimit };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await applyRateLimit(auth.tenantId);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();
  const { data: applications } = await supabase
    .from("loan_applications")
    .select("id, status, requested_amount, created_at")
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  await supabase.from("api_usage").insert({
    tenant_id: auth.tenantId,
    api_key_id: auth.keyId,
    endpoint: "/partner/applications",
    status: 200,
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await applyRateLimit(auth.tenantId);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const result = await originateApplication({
    tenantId: auth.tenantId,
    borrower: {
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      phone: String(body.phone ?? ""),
    },
    request: {
      requestedAmount: Number(body.requestedAmount ?? 0),
      requestedTermMonths: Number(body.requestedTermMonths ?? 0),
      loanProductId: String(body.loanProductId ?? ""),
      channel: "partner",
      annualIncome: Number(body.annualIncome ?? 0),
      state: String(body.state ?? ""),
      idNumber: String(body.idNumber ?? ""),
      borrowerEmail: String(body.email ?? ""),
    },
  });

  const supabase = createSupabaseAdmin();
  if (result.error || !result.applicationId) {
    await supabase.from("api_usage").insert({
      tenant_id: auth.tenantId,
      api_key_id: auth.keyId,
      endpoint: "/partner/applications",
      status: 400,
    });
    return NextResponse.json({ error: result.error ?? "Unable to create application" }, { status: 400 });
  }

  await supabase.from("api_usage").insert({
    tenant_id: auth.tenantId,
    api_key_id: auth.keyId,
    endpoint: "/partner/applications",
    status: 201,
  });

  return NextResponse.json(
    { application: { id: result.applicationId, status: result.decision } },
    { status: 201 }
  );
}
