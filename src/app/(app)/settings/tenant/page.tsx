import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateTenant } from "@/app/actions/tenant";
import { BorrowerInviteForm } from "@/components/forms/borrower-invite-form";

export default async function TenantSettingsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, branding")
    .eq("id", member.tenant_id)
    .maybeSingle();

  async function handleUpdateTenant(formData: FormData) {
    "use server";
    await updateTenant(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenant Settings</h1>
        <p className="text-sm text-muted">Configure branding for borrower experiences.</p>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-2" action={handleUpdateTenant}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Tenant name</label>
            <Input name="name" defaultValue={tenant?.name ?? ""} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Primary color</label>
            <Input name="primary" defaultValue={tenant?.branding?.primary ?? "#0ea5a4"} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Secondary color</label>
            <Input name="secondary" defaultValue={tenant?.branding?.secondary ?? "#f97316"} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Save branding</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Borrower Invites</h3>
        <p className="text-sm text-muted">Generate a secure invite link for borrowers.</p>
        <div className="mt-4">
          <BorrowerInviteForm />
        </div>
      </Card>
    </div>
  );
}

