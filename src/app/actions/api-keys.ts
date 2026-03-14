"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser, getTenantMember } from "@/lib/auth";
import { generateApiKey, hashApiKey } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

export async function createApiKey(
  _: { error?: string; key?: string },
  formData: FormData
) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  const rawKey = generateApiKey();
  const hashedKey = hashApiKey(rawKey);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("api_keys").insert({
    tenant_id: member.tenant_id,
    name,
    hashed_key: hashedKey,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/api-keys");
  return { success: true, key: rawKey };
}
