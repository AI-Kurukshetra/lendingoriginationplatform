create table if not exists risk_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  min_score int not null,
  max_score int not null,
  weight numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists risk_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references loan_applications(id) on delete cascade,
  score numeric not null,
  band text not null,
  created_at timestamptz not null default now()
);

alter table risk_rules enable row level security;
alter table risk_assessments enable row level security;

create policy "risk_rules_tenant" on risk_rules for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "risk_assessments_tenant" on risk_assessments for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));
