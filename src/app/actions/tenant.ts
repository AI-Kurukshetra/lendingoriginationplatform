"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateTenant(formData: FormData) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const name = String(formData.get("name") || "").trim();
  const primary = String(formData.get("primary") || "").trim();
  const secondary = String(formData.get("secondary") || "").trim();

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      branding: {
        primary,
        secondary,
      },
    })
    .eq("id", member.tenant_id);

  if (error) return { error: error.message };

  revalidatePath("/settings/tenant");
  return { success: true };
}
