-- Extensions
create extension if not exists "pgcrypto";

-- Tenants
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','loan_officer','underwriter','compliance','ops','support')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- Borrowers
create table if not exists borrowers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text,
  dob date,
  kyc_status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Loan products
create table if not exists loan_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  type text not null check (type in ('personal','mortgage','auto','business','other')),
  min_amount numeric not null,
  max_amount numeric not null,
  min_term_months int not null,
  max_term_months int not null,
  base_rate numeric not null,
  eligibility jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pricing_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  loan_product_id uuid not null references loan_products(id) on delete cascade,
  rule jsonb not null,
  created_at timestamptz not null default now()
);

-- Applications
create table if not exists loan_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  borrower_id uuid not null references borrowers(id) on delete cascade,
  loan_product_id uuid references loan_products(id) on delete set null,
  channel text not null check (channel in ('web','mobile','partner','pos','api')),
  status text not null default 'draft',
  requested_amount numeric,
  requested_term_months int,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applications_tenant_status on loan_applications(tenant_id, status);

create table if not exists application_status_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Identity + credit
create table if not exists identity_verifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  provider text not null,
  result text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists credit_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  provider text not null,
  score int,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists credit_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected','manual_review')),
  reason text,
  rules_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  kind text not null,
  file_path text not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now()
);

create table if not exists document_extractions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  extracted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Workflow + tasks
create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  definition jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  workflow_id uuid references workflows(id) on delete set null,
  application_id uuid not null references loan_applications(id) on delete cascade,
  status text not null default 'running',
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  title text not null,
  status text not null default 'open',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  approved_by uuid references auth.users(id) on delete set null,
  status text not null check (status in ('approved','rejected','pending')),
  note text,
  created_at timestamptz not null default now()
);

-- Signatures
create table if not exists signature_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  provider text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel text not null check (channel in ('email','sms','push')),
  name text not null,
  template text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  channel text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- API management
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  hashed_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hashed_key)
);

create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  api_key_id uuid not null references api_keys(id) on delete cascade,
  endpoint text not null,
  status int not null,
  created_at timestamptz not null default now()
);

-- Compliance + audit
create table if not exists compliance_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  rule text not null,
  status text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Batch processing
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  schedule text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists job_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  status text not null,
  started_at timestamptz,
  finished_at timestamptz
);

-- Properties + collateral + payments
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  address text,
  value numeric
);

create table if not exists collateral (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  type text,
  value numeric
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  amount numeric not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  amount numeric not null,
  kind text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table profiles enable row level security;
alter table borrowers enable row level security;
alter table loan_products enable row level security;
alter table loan_applications enable row level security;
alter table application_status_events enable row level security;
alter table identity_verifications enable row level security;
alter table credit_reports enable row level security;
alter table credit_decisions enable row level security;
alter table documents enable row level security;
alter table document_extractions enable row level security;
alter table workflows enable row level security;
alter table workflow_runs enable row level security;
alter table tasks enable row level security;
alter table approvals enable row level security;
alter table signature_requests enable row level security;
alter table notifications enable row level security;
alter table compliance_checks enable row level security;
alter table audit_logs enable row level security;
alter table api_keys enable row level security;
alter table api_usage enable row level security;
alter table jobs enable row level security;
alter table job_runs enable row level security;

-- Tenants: authenticated users can read, create
create policy "tenants_read_auth" on tenants for select using (auth.uid() is not null);
create policy "tenants_insert_auth" on tenants for insert with check (auth.uid() is not null);

-- Tenant members
create policy "tenant_members_read" on tenant_members for select using (user_id = auth.uid());
create policy "tenant_members_insert_self" on tenant_members for insert with check (user_id = auth.uid());

-- Profiles
create policy "profiles_read" on profiles for select using (id = auth.uid());
create policy "profiles_upsert" on profiles for insert with check (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- Borrowers (tenant staff + borrower self)
create policy "borrowers_tenant" on borrowers for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));
create policy "borrower_self_access" on borrowers for select using (user_id = auth.uid());
create policy "borrower_insert_self" on borrowers for insert with check (user_id = auth.uid());

-- Loan products (tenant members and borrowers)
create policy "loan_products_tenant" on loan_products for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));
create policy "loan_products_read_active" on loan_products for select using (active = true);

-- Tenant isolation
create policy "tenant_isolation_applications" on loan_applications for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_events" on application_status_events for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_documents" on documents for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_credit" on credit_reports for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_decisions" on credit_decisions for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_identity" on identity_verifications for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_workflows" on workflows for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_tasks" on tasks for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_approvals" on approvals for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_notifications" on notifications for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_compliance" on compliance_checks for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_audit" on audit_logs for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_api_keys" on api_keys for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_api_usage" on api_usage for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_jobs" on jobs for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "tenant_isolation_job_runs" on job_runs for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

-- Borrower can view their applications
create policy "borrower_application_read" on loan_applications for select
  using (borrower_id in (select id from borrowers where user_id = auth.uid()));

create policy "borrower_status_read" on application_status_events for select
  using (application_id in (select id from loan_applications where borrower_id in (select id from borrowers where user_id = auth.uid())));

create policy "borrower_documents_read" on documents for select
  using (application_id in (select id from loan_applications where borrower_id in (select id from borrowers where user_id = auth.uid())));

-- Borrower invites
create table if not exists borrower_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  token text not null unique,
  email text,
  status text not null default 'pending',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table borrower_invites enable row level security;

create policy "borrower_invites_tenant" on borrower_invites for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));
