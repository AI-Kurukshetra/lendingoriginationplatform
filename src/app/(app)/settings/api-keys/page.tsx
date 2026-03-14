import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ApiKeyForm } from "@/components/forms/api-key-form";

export default async function ApiKeysPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, created_at, active")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-muted">Provision partner integrations securely.</p>
      </div>

      <Card>
        <ApiKeyForm />
      </Card>

      <Card>
        <div className="space-y-3 text-sm">
          {keys?.map((key) => (
            <div key={key.id} className="flex items-center justify-between">
              <span className="font-semibold">{key.name}</span>
              <span className="text-xs text-muted">
                {key.active ? "Active" : "Inactive"} • {new Date(key.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
