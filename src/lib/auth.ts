import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Role = "admin" | "loan_officer" | "underwriter" | "compliance" | "ops" | "support";

export async function getUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getTenantMember(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("id, tenant_id, role, tenants(name, slug, branding)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function requireTenantMember() {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) {
    redirect("/portal");
  }
  return { user, member };
}

export async function requireRole(roles: Role[]) {
  const { user, member } = await requireTenantMember();
  if (!roles.includes(member.role as Role)) {
    redirect("/dashboard");
  }
  return { user, member };
}

export async function getBorrowerByUser(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("borrowers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
