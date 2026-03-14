import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const tenantSlug = "northwind";
const tenantName = "Northwind Credit Union";

const adminEmail = "admin@northwind.demo";
const adminPassword = "AdminPass123!";
const borrowerEmail = "borrower@northwind.demo";
const borrowerPassword = "BorrowerPass123!";

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data?.users?.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (!data?.users?.length) break;
    page += 1;
  }
  return null;
}

async function ensureUser(email, password, fullName) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user;
}

async function ensureTenant() {
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("tenants")
    .insert({ name: tenantName, slug: tenantSlug, branding: { primary: "#0ea5a4" } })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

async function ensureTenantMember(tenantId, userId, role) {
  await supabase.from("tenant_members").upsert(
    { tenant_id: tenantId, user_id: userId, role },
    { onConflict: "tenant_id,user_id" }
  );
}

async function seedProducts(tenantId) {
  const { data: existing } = await supabase
    .from("loan_products")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (existing?.length) return;

  await supabase.from("loan_products").insert([
    {
      tenant_id: tenantId,
      name: "Personal Flex",
      type: "personal",
      min_amount: 2000,
      max_amount: 50000,
      min_term_months: 12,
      max_term_months: 60,
      base_rate: 8.5,
    },
    {
      tenant_id: tenantId,
      name: "Auto Accelerate",
      type: "auto",
      min_amount: 5000,
      max_amount: 75000,
      min_term_months: 24,
      max_term_months: 72,
      base_rate: 6.9,
    },
  ]);
}

async function seedWorkflow(tenantId) {
  const { data: existing } = await supabase
    .from("workflows")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (existing?.length) return;

  await supabase.from("workflows").insert({
    tenant_id: tenantId,
    name: "Standard underwriting",
    definition: {
      steps: [
        { name: "KYC", type: "identity" },
        { name: "Credit", type: "credit" },
        { name: "Underwriting", type: "manual" },
        { name: "Compliance", type: "compliance" },
        { name: "Signature", type: "signature" },
      ],
    },
    active: true,
  });
}

async function seedJobs(tenantId) {
  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (existing?.length) return;

  await supabase.from("jobs").insert([
    { tenant_id: tenantId, name: "daily-credit-pull", schedule: "0 2 * * *" },
    { tenant_id: tenantId, name: "document-ocr", schedule: "*/30 * * * *" },
  ]);
}

async function seedDecisionRules(tenantId) {
  const { data: existing } = await supabase
    .from("decision_rules")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);

  if (existing?.length) return;

  await supabase.from("decision_rules").insert([
    {
      tenant_id: tenantId,
      name: "Prime approval",
      min_credit_score: 730,
      min_income_ratio: 1.8,
      max_amount: 75000,
      decision: "approved",
      reason: "Prime score and strong income coverage",
      priority: 10,
    },
    {
      tenant_id: tenantId,
      name: "Subprime reject",
      max_credit_score: 599,
      decision: "rejected",
      reason: "Credit score too low",
      priority: 20,
    },
    {
      tenant_id: tenantId,
      name: "Default manual review",
      decision: "manual_review",
      reason: "Requires underwriter assessment",
      priority: 99,
    },
  ]);
}

async function seedComplianceRules(tenantId) {
  const { data: existing } = await supabase
    .from("compliance_rules")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);

  if (existing?.length) return;

  await supabase.from("compliance_rules").insert([
    {
      tenant_id: tenantId,
      code: "TILA_MAX_APR",
      name: "TILA APR threshold",
      severity: "critical",
      definition: { maxApr: 36, onMatchStatus: "pass", onMissStatus: "review" },
    },
    {
      tenant_id: tenantId,
      code: "HMDA_HIGH_BALANCE",
      name: "HMDA high balance review",
      severity: "warning",
      definition: { maxAmount: 50000, onMatchStatus: "pass", onMissStatus: "review" },
    },
    {
      tenant_id: tenantId,
      code: "RESPA_STATE_REQUIRED",
      name: "RESPA state disclosure",
      severity: "warning",
      definition: { states: ["CA", "TX", "NY", "FL"], onMatchStatus: "pass", onMissStatus: "review" },
    },
  ]);
}

async function seedIntegrationSettings(tenantId) {
  const providers = ["credit-bureau", "bank-verification", "employment-verification", "kyc"];
  for (const provider of providers) {
    await supabase.from("integration_connections").upsert(
      {
        tenant_id: tenantId,
        provider,
        status: "connected",
        config: { useExternal: false },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,provider" }
    );
  }

  await supabase.from("signature_providers").upsert(
    {
      tenant_id: tenantId,
      provider: "mock-signature",
      status: "connected",
      config: { mode: "sandbox" },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,provider" }
  );
}

async function seedPricingRules(tenantId) {
  const { data: products } = await supabase
    .from("loan_products")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(2);

  for (const product of products ?? []) {
    const { data: existing } = await supabase
      .from("pricing_rules")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("loan_product_id", product.id)
      .limit(1);

    if (existing?.length) continue;

    await supabase.from("pricing_rules").insert([
      {
        tenant_id: tenantId,
        loan_product_id: product.id,
        rule: { minCreditScore: 740, adjustmentBps: -25 },
      },
      {
        tenant_id: tenantId,
        loan_product_id: product.id,
        rule: { minAmount: 40000, adjustmentBps: 35 },
      },
      {
        tenant_id: tenantId,
        loan_product_id: product.id,
        rule: { riskBand: "high", adjustmentBps: 75 },
      },
    ]);
  }
}

async function seedInvite(tenantId) {
  const { data: existing } = await supabase
    .from("borrower_invites")
    .select("id, token")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (existing?.length) return existing[0];

  const token = crypto.randomBytes(16).toString("hex");
  const { data } = await supabase
    .from("borrower_invites")
    .insert({ tenant_id: tenantId, token, status: "pending" })
    .select("id, token")
    .single();
  return data;
}

async function seedBorrowerApp(tenantId, borrowerUserId) {
  const { data: borrower } = await supabase
    .from("borrowers")
    .select("id")
    .eq("user_id", borrowerUserId)
    .maybeSingle();

  const borrowerId = borrower?.id
    ? borrower.id
    : (
        await supabase
          .from("borrowers")
          .insert({
            tenant_id: tenantId,
            user_id: borrowerUserId,
            first_name: "Taylor",
            last_name: "Brooks",
            phone: "+1-555-0131",
            kyc_status: "verified",
          })
          .select("id")
          .single()
      ).data.id;

  const { data: existingApp } = await supabase
    .from("loan_applications")
    .select("id")
    .eq("borrower_id", borrowerId)
    .limit(1);
  if (existingApp?.length) return;

  const { data: product } = await supabase
    .from("loan_products")
    .select("id, base_rate")
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  const { data: application } = await supabase
    .from("loan_applications")
    .insert({
      tenant_id: tenantId,
      borrower_id: borrowerId,
      loan_product_id: product?.id,
      channel: "web",
      status: "manual_review",
      requested_amount: 25000,
      requested_term_months: 36,
      data: { annualIncome: 90000, pricingRate: product?.base_rate ?? 8.5, state: "CA" },
    })
    .select("id")
    .single();

  await supabase.from("application_status_events").insert({
    tenant_id: tenantId,
    application_id: application.id,
    status: "manual_review",
    note: "Seeded application",
  });

  await supabase.from("credit_reports").insert({
    tenant_id: tenantId,
    application_id: application.id,
    provider: "seed-credit",
    score: 702,
    report: { score: 702, utilization: 0.28 },
  });

  await supabase.from("credit_decisions").insert({
    tenant_id: tenantId,
    application_id: application.id,
    decision: "manual_review",
    reason: "Seeded decision",
    rules_snapshot: { creditScore: 702, annualIncome: 90000, requestedAmount: 25000 },
  });

  await supabase.from("compliance_checks").insert({
    tenant_id: tenantId,
    application_id: application.id,
    rule: "TILA_DISCLOSURE",
    status: "pass",
    detail: { aprDisclosed: true },
  });

  await supabase.from("tasks").insert([
    { tenant_id: tenantId, application_id: application.id, title: "Underwriting review", status: "open" },
    { tenant_id: tenantId, application_id: application.id, title: "Compliance review", status: "open" },
  ]);

  await supabase.from("signature_requests").insert({
    tenant_id: tenantId,
    application_id: application.id,
    provider: "seed-signature",
    status: "sent",
  });

  await supabase.from("notifications").insert({
    tenant_id: tenantId,
    channel: "email",
    status: "queued",
    payload: { subject: "Welcome", message: "Your application is in review" },
  });

  await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    action: "seed.completed",
    entity: "loan_applications",
    entity_id: application.id,
    payload: { source: "seed" },
  });
}

async function main() {
  const tenant = await ensureTenant();
  const adminUser = await ensureUser(adminEmail, adminPassword, "Northwind Admin");
  const borrowerUser = await ensureUser(borrowerEmail, borrowerPassword, "Taylor Brooks");

  await supabase.from("profiles").upsert({
    id: adminUser.id,
    full_name: "Northwind Admin",
    email: adminEmail,
  });

  await ensureTenantMember(tenant.id, adminUser.id, "admin");
  await seedProducts(tenant.id);
  await seedWorkflow(tenant.id);
  await seedJobs(tenant.id);
  await seedDecisionRules(tenant.id);
  await seedComplianceRules(tenant.id);
  await seedIntegrationSettings(tenant.id);
  await seedPricingRules(tenant.id);
  const invite = await seedInvite(tenant.id);
  await seedBorrowerApp(tenant.id, borrowerUser.id);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
