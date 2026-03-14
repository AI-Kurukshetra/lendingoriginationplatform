-- Configurable decisioning rules
create table if not exists decision_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  min_credit_score int,
  max_credit_score int,
  min_income_ratio numeric,
  max_amount numeric,
  decision text not null check (decision in ('approved','rejected','manual_review')),
  reason text not null,
  priority int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Configurable compliance rules
create table if not exists compliance_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  severity text not null check (severity in ('info','warning','critical')),
  definition jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

-- Integration connection settings
create table if not exists integration_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider text not null,
  status text not null default 'connected',
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

-- Signature provider configuration
create table if not exists signature_providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider text not null,
  status text not null default 'connected',
  webhook_secret text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index if not exists idx_decision_rules_tenant_priority on decision_rules(tenant_id, priority);
create index if not exists idx_compliance_rules_tenant_code on compliance_rules(tenant_id, code);

alter table decision_rules enable row level security;
alter table compliance_rules enable row level security;
alter table integration_connections enable row level security;
alter table signature_providers enable row level security;

create policy "decision_rules_tenant" on decision_rules for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "compliance_rules_tenant" on compliance_rules for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "integration_connections_tenant" on integration_connections for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));

create policy "signature_providers_tenant" on signature_providers for all
  using (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from tenant_members where user_id = auth.uid()));
