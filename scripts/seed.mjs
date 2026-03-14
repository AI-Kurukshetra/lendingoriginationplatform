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

async function ensureUser(email, password, fullName) {
  const { data: list } = await supabase.auth.admin.listUsers({ email });
  const existing = list?.users?.[0];
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

  await supabase.from("workflows")
    .insert({
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
  const invite = await seedInvite(tenant.id);
  await seedBorrowerApp(tenant.id, borrowerUser.id);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
