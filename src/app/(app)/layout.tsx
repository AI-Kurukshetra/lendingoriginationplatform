import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const tenant = Array.isArray(member?.tenants) ? member?.tenants[0] : member?.tenants;

  return (
    <AppShell userName={profile?.full_name} tenantName={tenant?.name}>
      {children}
    </AppShell>
  );
}

