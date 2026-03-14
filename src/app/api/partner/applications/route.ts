import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { hashApiKey } from "@/lib/crypto";
import { getApiUsageCount } from "@/services/rate-limit";

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

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = Number(process.env.PARTNER_RATE_LIMIT ?? DEFAULT_LIMIT);
  const count = await getApiUsageCount({ tenantId: auth.tenantId, windowSeconds: 60 });
  if (count >= rateLimit) {
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

  const rateLimit = Number(process.env.PARTNER_RATE_LIMIT ?? DEFAULT_LIMIT);
  const count = await getApiUsageCount({ tenantId: auth.tenantId, windowSeconds: 60 });
  if (count >= rateLimit) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const supabase = createSupabaseAdmin();

  const { data: borrower } = await supabase
    .from("borrowers")
    .insert({
      tenant_id: auth.tenantId,
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone,
      kyc_status: "pending",
    })
    .select("id")
    .single();

  const { data: application } = await supabase
    .from("loan_applications")
    .insert({
      tenant_id: auth.tenantId,
      borrower_id: borrower?.id,
      loan_product_id: body.loanProductId,
      channel: "partner",
      status: "submitted",
      requested_amount: body.requestedAmount,
      requested_term_months: body.requestedTermMonths,
      data: body.data ?? {},
    })
    .select("id")
    .single();

  await supabase.from("api_usage").insert({
    tenant_id: auth.tenantId,
    api_key_id: auth.keyId,
    endpoint: "/partner/applications",
    status: 201,
  });

  return NextResponse.json({ application }, { status: 201 });
}
