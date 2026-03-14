import { Card } from "@/components/ui/card";
import { requireTenantMember } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const defaultProviders = [
  { key: "credit-bureau", name: "Credit Bureau", description: "Credit score and report data." },
  { key: "bank-verification", name: "Bank Verification", description: "Account balance and cashflow checks." },
  { key: "employment-verification", name: "Employment Verification", description: "Employer and tenure verification." },
  { key: "kyc", name: "Identity / KYC", description: "Document and identity verification." },
];

export default async function IntegrationsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: connections } = await supabase
    .from("integration_connections")
    .select("provider, status, last_synced_at")
    .eq("tenant_id", member.tenant_id);

  const byProvider = new Map((connections ?? []).map((item) => [item.provider, item]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted">Manage third-party data connections.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {defaultProviders.map((provider) => {
          const connection = byProvider.get(provider.key);
          return (
            <Card key={provider.key}>
              <h3 className="text-lg font-semibold">{provider.name}</h3>
              <p className="text-sm text-muted">{provider.description}</p>
              <p className="mt-3 text-xs text-muted">Status: {connection?.status ?? "mock"}</p>
              <p className="text-xs text-muted">
                Last sync: {connection?.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : "Never"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
