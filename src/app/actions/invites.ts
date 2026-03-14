"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser, getTenantMember } from "@/lib/auth";
import { generateApiKey } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

export async function createBorrowerInvite(
  _: { error?: string; token?: string },
  formData: FormData
) {
  const user = await requireUser();
  const member = await getTenantMember(user.id);
  if (!member) return { error: "No tenant membership found." };

  const email = String(formData.get("email") || "").trim();
  const token = generateApiKey();

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("borrower_invites").insert({
    tenant_id: member.tenant_id,
    token,
    email: email || null,
    status: "pending",
  });

  if (error) return { error: error.message };
  revalidatePath("/settings/tenant");
  return { token };
}

export async function acceptBorrowerInvite(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get("token") || "");
  if (!token) return { error: "Missing token." };

  const admin = createSupabaseAdmin();
  const { data: invite, error } = await admin
    .from("borrower_invites")
    .select("id, tenant_id, status")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return { error: "Invite not found." };
  if (invite.status === "accepted") {
    redirect(`/portal/apply/${token}`);
  }

  await admin
    .from("borrower_invites")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  redirect(`/portal/apply/${token}`);
}

export async function goToInvite(formData: FormData) {
  const token = String(formData.get("token") || "").trim();
  if (!token) return { error: "Enter a token." };
  redirect(`/portal/invite/${token}`);
}
