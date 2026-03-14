import { Card } from "@/components/ui/card";
import { requireTenantMember } from "@/lib/auth";

const providers = [
  { name: "Mock Credit Bureau", status: "connected", description: "Credit score and report data." },
  { name: "Mock Bank Verification", status: "connected", description: "Account balance and cashflow." },
  { name: "Mock Employment", status: "connected", description: "Employer and tenure verification." },
];

export default async function IntegrationsPage() {
  await requireTenantMember();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted">Manage third-party data connections.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.name}>
            <h3 className="text-lg font-semibold">{provider.name}</h3>
            <p className="text-sm text-muted">{provider.description}</p>
            <p className="mt-3 text-xs text-muted">Status: {provider.status}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
